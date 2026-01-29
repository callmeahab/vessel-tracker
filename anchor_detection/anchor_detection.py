'''
Imports
'''
from shapely import Polygon, LineString, intersection_all, MultiPolygon
import math as m
import os
import csv
import random

'''
Global Defs
    ANCHOR_COORDS_MAX: number of anchored coordinates that are remembered
    ANCHORED_SPEED_THRESH: threshold for which below vessel is tried as anchored
    ANCHOR_ANGULAR_TOLERANCE: 1/2 of apex angle for anchor triangle area
    ANCHOR_POLYGON_LEN: how far anchor triangle area is drawn out
    MAX_NUM_VESSELS: maximum number of vessels allowed to be stored at once
'''
ANCHOR_COORDS_MAX:int = int(8)
ANCHORED_SPEED_THRESH:float = float(0.01)
ANCHOR_ANGULAR_TOLERANCE:float = float(3.0)
ANCHOR_POLYGON_LEN:float = float(0.001) # ~100m Maybe update w/ weather/depth
MAX_NUM_VESSELS:int = int(0xFFF)


POSIDONIA_BOUNDS = MultiPolygon() #Set this to posidonia boundaries

'''
Helper functions
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

def anchor_polygon(origin: tuple[float,float], angle: float) -> Polygon:
    '''
    anchor_polygon->Polygon:

    @origin: Location of vessel

    @angle: Angle of vessel

    Generates isoceles triangle from origin
    '''
    theta1:float = m.pi/180*(angle+ANCHOR_ANGULAR_TOLERANCE)
    theta2:float = m.pi/180*(angle-ANCHOR_ANGULAR_TOLERANCE)
    coord1:tuple[float,float] = ((origin[0]+ANCHOR_POLYGON_LEN*m.cos(theta1)), (origin[1]+ANCHOR_POLYGON_LEN*m.sin(theta1)))
    coord2:tuple[float,float] = ((origin[0]+ANCHOR_POLYGON_LEN*m.cos(theta2)), (origin[1]+ANCHOR_POLYGON_LEN*m.sin(theta2)))
    return Polygon([origin, coord1, coord2])

def anchor_dragging(lines: list[tuple[float, float, float]], dragging: bool = False) -> bool:
    '''
    anchor_dragging: bool

    @lines: Stored info for each anchor coordinate used to generate lines of form [(coordx, cooordy, angle),...]

    @dragging: Debug quick exit value

    Checks if anchor dragging by drawing lines and finding intersection

    TODO: Fix function
    '''
    if dragging:
        return dragging
    
    ls: list[LineString] = []
    for line in lines:
        angle = m.pi/180*line[2]
        origin: tuple[float,float] = (line[0],line[1])
        end: tuple[float, float] = (line[0]+ANCHOR_POLYGON_LEN*m.cos(angle), line[1]+ANCHOR_POLYGON_LEN*m.sin(angle))
        ls.append(LineString([origin, end]))


    retval: bool = intersection_all(ls).is_empty #TOOD: fix. Isn't working as intended
    return retval
    


class coordlist:
    '''
    coordlist class - Circular buffer for coordinate list

    Attributes:

    @buff: List of coordinates + angle of form [(coordx, coordy, angle),...]
    @size: Size of buffer. Default to ANCHOR_COORDS_MAX
    @idx: Next index to populate

    Functions:

    append: Insert new coordinate + angle in buffer
    clear: Reset buffer and set idx to 0
    '''
    buff: list[tuple[float,float,float]] = []
    size: int
    idx: int

    def __init__(self, size: int = ANCHOR_COORDS_MAX) -> None:
        self.size = size
        self.buff = [(0.0,0.0,0.0)]*self.size
        self.idx = 0
        return

    def append(self, coord: tuple[float,float], angle: float) -> None:
        self.buff[self.idx] = (coord[0],coord[1],angle)
        if(self.idx == self.size - 1):
            self.idx = 0
        else:
            self.idx += 1
        return
    
    def clear(self) -> None:
        self.buff = [(0.0,0.0,0.0)]*self.size
        self.idx = 0
        return

class vessel:
    '''
    Vessel class

    Attributes:

    @id: Vessel UUID
    
    @coordinate: Current coordinate

    @anchor_coordinates: coordlist of anchor coordinates. Clears when determined non-anchored

    @speed: Current speed of vessel

    @angle: Current angle of boat

    @anchor_area: Current best anchor location. Clears when next location doesn't intersect

    @dragging area: TODO

    @anchor_dragging: True if dragging, false otherwise

    Functions:

    update: Updates vessel with new info and does all relevant calculations
    '''
    id: str
    coordinate = tuple[float, float]
    anchor_coordinates: coordlist
    speed: float
    angle: float
    anchor_area: Polygon
    dragging_area: Polygon
    anchor_dragging: bool # TODO: Implement
    on_posidonia: bool

    def __init__(self, uuid:str = "N/A") -> None:
        self.id = uuid
        self.coordinate = (0.0, 0.0)
        self.anchor_coordinates = coordlist()
        self.speed = -1.0
        self.angle = 0.0
        self.anchor_area = Polygon()
        self.anchor_dragging = False
        self.on_posidonia = False
        return

    def on_posidonia_helper(self, posidonia_boundary: MultiPolygon)->bool:
        if posidonia_boundary.is_empty:
            return False
        
        return self.anchor_area.intersection(posidonia_boundary).area/self.anchor_area.area > 0.9

    def update(self, coordinate: tuple[float,float], speed: float, angle: float) -> None:
        self.coordinate = coordinate
        self.speed = speed
        self.angle = angle

        if (self.speed <= ANCHORED_SPEED_THRESH):
            self.anchor_coordinates.append(coordinate, angle)
            if(self.anchor_coordinates.idx == 1): # First polygon case..
                self.anchor_area = anchor_polygon(self.coordinate, self.angle)
            else:
                self.anchor_area = (self.anchor_area).intersection(anchor_polygon(self.coordinate, self.angle))
                self.anchor_dragging = anchor_dragging(self.anchor_coordinates.buff[0:self.anchor_coordinates.idx])
                self.on_posidonia = self.on_posidonia_helper(POSIDONIA_BOUNDS)

            
            if self.anchor_area.is_empty:
                self.anchor_dragging = False
                self.anchor_coordinates.clear()
                self.on_posidonia = False
        
        else: #No longer possible for anchored
            self.anchor_area = Polygon()
            self.anchor_coordinates.clear()
            self.anchor_dragging = False
            self.on_posidonia = False

                
        return

    

class vessel_list:
    '''
    vessel_list class: List of vessels
    
    Attributes:
    @vessel_list: Actual list of vessels
    @empty_indeces: Which indeces in the list can be populated
    @size: Size of list

    '''

    v_list: list[vessel] = []
    empty_indeces: list[int] = []
    size: int = MAX_NUM_VESSELS

    def __init__(self, size:int = MAX_NUM_VESSELS) -> None:
        for i in range(size):
            print(i)
            self.empty_indeces.append(i)
            self.v_list.append(vessel())

    def insert_next(self, boat:vessel)->bool:
        if(len(self.empty_indeces) == 0):
            return False
        
        idx:int = self.empty_indeces.pop(0)
        self.v_list[idx] = boat
        return True
    
    def delete_vessel(self, uuid:str) -> bool:
        idx: int = 0
        for boat in self.v_list: #Can be optimized if sorted list
            if boat.id == uuid:
                self.empty_indeces.append(idx)
                self.v_list[idx] = vessel()
                return True
            idx += 1
        return False
        



def demo():
    data = unpack_csv("data.csv")
    print("here")
    ships = vessel_list()
    print("here2")
    cnt: int = 0
    for datum in data:
        print("Boat #",cnt)
        cnt+=1
        (uuid, coords, speeds) = vessel_info(datum)
        
        #Generate a bunch of random angles
        angles:list[float] = []
        for i in range(len(coords)):
            angles.append(random.uniform(0,360))

        ship = vessel(uuid)
        ships.insert_next(ship)

        for idx,_ in enumerate(coords):
            ship.update(coords[idx], speeds[idx], angles[idx])


    while(True):
        idx_str:str = input("Enter idx #:")
        if(idx_str == "exit" or idx_str == "EXIT"):
            break

        idx:int = int(idx_str)
        print("Boat #",idx_str,":")
        print("UUID: ",ships.v_list[idx].id)
        print("Current Coordinate: ",ships.v_list[idx].coordinate)
        print("Current Speed: ",ships.v_list[idx].speed)
        print("Anchor area: ",ships.v_list[idx].anchor_area)
        print("\n\n")

    return



def hello_world(arg:str = "print")->bool:
    if arg == "print":
        print("Hello world")
        return True
    else:
        return False
    
def main():
    #retval:bool = hello_world("print")
    #return int(not retval)

    demo()

main()