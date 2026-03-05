'''
Imports
'''
from shapely import Polygon, Point, MultiPolygon, GeometryCollection, from_geojson, to_geojson
import math as m
import geopandas as gpd
import os
import csv
import folium
import json
import time
from datetime import date, datetime
import numpy as np


'''
OpenMeteo API Related
'''
import openmeteo_requests

import requests_cache
from retry_requests import retry

ANCHOR_COORDS_MAX:int = int(8)
ANCHORED_SPEED_THRESH:float = float(1.0)
ANCHOR_ANGULAR_TOLERANCE:float = float(3.0)
ANCHOR_POLYGON_LEN:float = float(0.0001) # ~10m Maybe update w/ weather/depth
TIMEZONE_OFFSET:int = 9 #NOTE: Change to timezone offset to Italy time

WINDSPEED_LOWER_CUTOFF:float = float(0.0) # 0 km/h
WINDSPEED_UPPER_CUTOFF:float = float(100.0) # 100 km/h
RADIUS_MAX:float = float(0.0003) # ~30m
RADIUS_MIN:float = float(0.00005) # ~5m

def kml_to_gdf(kml_path: str) -> gpd.geodataframe.GeoDataFrame:
  kml_path = kml_path.replace('\\ ', ' ')
  return gpd.read_file(kml_path, driver='KML')

gdf = kml_to_gdf("posidonia-maddalena.kml")
POSIDONIA_BOUNDS:GeometryCollection = GeometryCollection(gdf.geometry.tolist())
curr_date:str
curr_hour:int
curr_min:int = 0


#Wind API
wind_cache_session = requests_cache.CachedSession('.cache', expire_after = 3600)
wind_retry_session = retry(wind_cache_session, retries = 5, backoff_factor = 0.2)
wind_openmeteo = openmeteo_requests.Client(session = wind_retry_session)
wind_url = "https://api.open-meteo.com/v1/forecast"

#Ocean Current API
ocurrent_cache_session = requests_cache.CachedSession('.cache', expire_after = 3600)
ocurrent_retry_session = retry(ocurrent_cache_session, retries = 5, backoff_factor = 0.2)
ocurrent_openmeteo = openmeteo_requests.Client(session = ocurrent_retry_session)
ocurrent_url = "https://marine-api.open-meteo.com/v1/marine"


vessels_dict: dict[str, list[str] | tuple[int, tuple[float, float], float, Polygon]] = {
    "uuids" : []
    # "example" : (min, (lon, lat), radius, Multipolygon)
}

output_dict: dict[str, list[str] | tuple[tuple[float, float], float]] = {
    "uuids" : []
    # "example" : [((lon0, lat0), confidence0), ((lon1, lat1), confidence1), ..]
}

def get_ocean_current(coord: tuple[float,float])->dict[str, np.float32]: 
    params:dict[str, float | list[str] | str | int] = {
        "latitude": coord[1],
	    "longitude": coord[0],
	    "hourly": ["ocean_current_velocity", "ocean_current_direction"],
	    "timezone": "Europe/Berlin",
	    "past_days": 1,
	    "forecast_days": 1,
    }
    responses = ocurrent_openmeteo.weather_api(ocurrent_url, params=params)
    response = responses[0]
    hourly = response.Hourly()
    hourly_ocean_current_velocity = hourly.Variables(0).ValuesAsNumpy()
    hourly_ocean_current_direction = hourly.Variables(1).ValuesAsNumpy()
    retdict:dict[str, np.float32] = {
        "ocean_current_velocity" : hourly_ocean_current_velocity[24 + curr_hour],
        "ocean_current_direction" : hourly_ocean_current_direction[24 + curr_hour]
    }
    return retdict


def get_wind(coord: tuple[float,float])->dict[str, np.float32]:
    params:dict[str, float | list[str] | str | int] = {
	"latitude": coord[1],
	"longitude": coord[0],
	"hourly": ["wind_speed_10m", "wind_direction_10m"],
	"timezone": "Europe/Berlin",
	"past_days": 1,
	"forecast_days": 1,
    }
    responses = wind_openmeteo.weather_api(wind_url, params=params)
    response = responses[0]

    hourly = response.Hourly()
    hourly_wind_speed_10m = hourly.Variables(0).ValuesAsNumpy()
    hourly_wind_direction_10m = hourly.Variables(1).ValuesAsNumpy()
    retdict:dict[str, np.float32] = {
        "wind_speed_10m" : hourly_wind_speed_10m[24 + curr_hour],
        "wind_direction_10m" : hourly_wind_direction_10m[24 + curr_hour]
    }
    return retdict

def update_time()->None:
    global curr_date
    curr_date = date.today().strftime("%Y-%m-%d")
    global curr_hour
    curr_hour = (datetime.now().hour + TIMEZONE_OFFSET)%24
    global curr_min
    curr_min = (datetime.now().minute)
    return

def meteo_to_json(path: str, oceancurrent: dict, wind: dict)->None:
    oceancurrent["ocean_current_velocity"] = float(oceancurrent["ocean_current_velocity"])
    oceancurrent["ocean_current_direction"] = float(oceancurrent["ocean_current_direction"])
    wind["wind_speed_10m"] = float(wind["wind_speed_10m"])
    wind["wind_direction_10m"] = float(wind["wind_direction_10m"])
    

    with open(path, "w", encoding="utf-8") as f:
        json.dump([oceancurrent, wind], f, indent = 4, ensure_ascii=False)

def update_anchor_polygon(anchor_polygon: Polygon | None, coord: tuple[float, float], radius: float) -> Polygon | None:
    if(anchor_polygon is None):
        return Point.buffer(Point(coord), radius)
    
    circle: Polygon = Point.buffer(Point(coord), radius)
    area: Polygon = anchor_polygon.intersection(circle)
    if(isinstance(area, Polygon)):
        if(area.is_empty):
            return None
        return area
    return None

def get_radius(windspeed: float) -> float:
    # [WINDSPEED_LOWER_CUTOFF, WINDSPEED_UPPER_CUTOFF] \mapsto [RADIUS_MIN, RADIUS_MAX] linearly
    global WINDSPEED_LOWER_CUTOFF, WINDSPEED_UPPER_CUTOFF, RADIUS_MIN, RADIUS_MAX
    if(windspeed < WINDSPEED_LOWER_CUTOFF): windspeed = WINDSPEED_LOWER_CUTOFF
    if(windspeed > WINDSPEED_UPPER_CUTOFF): windspeed = WINDSPEED_UPPER_CUTOFF
    return (RADIUS_MAX - RADIUS_MIN)/(WINDSPEED_UPPER_CUTOFF - WINDSPEED_LOWER_CUTOFF)*windspeed + RADIUS_MIN
    
def get_confidence(anchor_area: Polygon | None) -> float:
    global POSIDONIA_BOUNDS
    if anchor_area is None:
        return float(0.0)
    
    return anchor_area.intersection(POSIDONIA_BOUNDS).area / anchor_area.area

def anchor_detect_tick(uuid: str, coords: tuple[float, float] | list[float, float], speed: float) -> None:
    global curr_min
    update_time()

    global vessels_dict, output_dict
    if(uuid in vessels_dict["uuids"]):

        #Comment line below to remove time restriction
        if abs(vessels_dict[uuid][0] - curr_min < 14): return

        wind = get_wind(coords)
        windspeed = float(wind["wind_speed_10m"])
        radius = get_radius(windspeed)

        if(speed > ANCHORED_SPEED_THRESH):
            min = curr_min
            vessels_dict[uuid] = (min, coords, radius, None)
            output_dict[uuid].append((coords, 0.0))    
        else:
            min = curr_min
            _, _, _, poly = vessels_dict[uuid]
            newpoly = update_anchor_polygon(poly, coords, radius)
            vessels_dict[uuid] = (min, coords, radius, newpoly)
            output_dict[uuid].append((coords, get_confidence(newpoly)))



    else:
        wind = get_wind(coords)
        windspeed = float(wind["wind_speed_10m"])
        radius = get_radius(windspeed)

        vessels_dict["uuids"].append(uuid)
        output_dict["uuids"].append(uuid)
        output_dict[uuid] = []

        if(speed > ANCHORED_SPEED_THRESH):
            min = curr_min
            vessels_dict[uuid] = (min, coords, radius, None)
            output_dict[uuid].append((coords, 0.0))
        
        else:
            poly = update_anchor_polygon(None, coords, radius)
            min = curr_min
            vessels_dict[uuid] = (min, coords, radius, poly)
            output_dict[uuid].append((coords, get_confidence(poly)))

    with open("vessel_anchor_confidences.json", "w", encoding="utf-8") as f:
        json.dump(output_dict, f, indent = 4, ensure_ascii=False)
    
    with open("anchor_areas.json", "w", encoding="utf-8") as f:
        _, _, _, polygon = vessels_dict[uuid]
        json.dump(to_geojson(polygon), f, indent = 4, ensure_ascii=False)

    return
    
        


'''

DEMO

'''

def unpack_csv(filename: str)->list[list[str]]:
    '''
    unpack_csv->list[list[str]]

    @filename: name of csv file in local directory

    returns rows[cols] of csv
    '''
    cwd: str = os.getcwd()
    filepath: str = cwd+'/'+filename
    data: list[list[str]] = []
    firstrow: bool = True
    with open(file=filepath, mode='r') as file:
        csv_reader = csv.reader(file)
        for row in csv_reader:
            if firstrow:
                firstrow = False
            else:
                data.append(row)
    return data


def vessel_info(vessel_data: list[str])->tuple[str, list[tuple[float,float]],list[float]]:
    '''
    vessel_info: tuple

    @vessel_data: Row from unpacked csv

    Returns vessel_uuid, list of coords (lat,lon), list of speeds
    '''
    vessel_uuid: str = vessel_data[0]

    coords_raw: list[str] = vessel_data[2].replace("{","").replace("}","").replace(" ","").split(",")
    coords: list[tuple[float,float]] = []
    for i in range(int(len(coords_raw)/2)):
        coords.append((float(coords_raw[2*i]), float(coords_raw[2*i+1])))

    speeds_raw: str = vessel_data[3].replace("{","").replace("}","").replace(" ","")
    speeds: list[float] = [float(speed) for speed in speeds_raw.split(",")]
    return (vessel_uuid, coords, speeds)

example_vessels = {
    "uuids": ["1", "2", "3", "4"],
    "1": [((9.383, 41.312), 0.01), ((9.384, 41.313), 0.2), ((9.382, 41.311), 5.0)],
    "2": [((9.356, 41.320), 0.01), ((9.357, 41.333), 0.2), ((9.360, 41.325), 0.1), ((9.365, 41.333), 10)],
    "3": [((9.383, 41.312), 0.01), ((9.383, 41.311), 0.01), ((9.383, 41.312), 0.01), ((9.383, 41.312), 0.01), ((9.383, 41.312), 0.01), ((9.383, 41.312), 0.01)],
    "4": [((9.383, 41.312), 5.0), ((9.383, 41.312), 0.01), ((9.383, 41.312), 0.01), ((9.383, 41.312), 5.0), ((9.383, 41.312), 0.01), ((9.383, 41.312), 0.01)]
}

for uuid in example_vessels["uuids"]:
    for (coord, speed) in example_vessels[uuid]:
        anchor_detect_tick(uuid, coord, speed)
