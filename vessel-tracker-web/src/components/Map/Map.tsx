"use client";

import { useRef, useCallback } from "react";
import { motion } from "framer-motion";
import Map, {
  Layer,
  Source,
  NavigationControl,
  MapRef,
} from "react-map-gl/mapbox";
import mapboxgl from "mapbox-gl";
import { VesselData } from "@/types/vessel";
import {
  MapPopupControl,
  VesselProperties,
} from "@/components/MapPopup/MapPopup";

interface MapProps {
  vessels: VesselData[];
  parkBoundaries: GeoJSON.FeatureCollection | null;
  bufferedBoundaries?: GeoJSON.FeatureCollection | null;
  loading: boolean;
  onMapReady?: (map: mapboxgl.Map) => void;
}

export default function MapComponent({
  vessels,
  parkBoundaries,
  bufferedBoundaries,
  loading,
  onMapReady,
}: MapProps) {
  const mapRef = useRef<MapRef>(null);

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  // Generate vessel GeoJSON data
  const vesselGeoJSON = {
    type: "FeatureCollection" as const,
    features:
      Array.isArray(vessels) && vessels.length > 0
        ? vessels.map((vessel) => ({
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: [vessel.longitude, vessel.latitude],
            },
            properties: {
              name: vessel.vessel.name,
              isInPark: vessel.is_in_park,
              isInBufferZone: vessel.is_in_buffer_zone || false,
              mmsi: vessel.vessel.mmsi,
              type: vessel.vessel.type,
              typeSpecific: vessel.vessel.type_specific,
              countryIso: vessel.vessel.country_iso,
              imo: vessel.vessel.imo,
              speed: vessel.vessel.speed,
              course: vessel.vessel.course,
              heading: vessel.vessel.heading,
              destination: vessel.vessel.destination,
              distance: vessel.vessel.distance,
              timestamp: vessel.timestamp,
            },
          }))
        : [],
  };

  // Handle map load
  const onMapLoad = useCallback(() => {
    console.log("Map loaded successfully");
    if (onMapReady && mapRef.current) {
      onMapReady(mapRef.current.getMap());
    }
  }, [onMapReady]);

  // Handle map clicks to detect vessel clicks
  const onMapClick = useCallback((event: mapboxgl.MapMouseEvent) => {
    const features = event.target.queryRenderedFeatures(event.point, {
      layers: ["vessels-circle"],
    });

    if (features && features.length > 0) {
      const feature = features[0];
      const properties = feature.properties;

      if (!properties) return;

      const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [
        number,
        number
      ];
      MapPopupControl.createVesselPopup(
        mapRef.current!.getMap(),
        [coordinates[0], coordinates[1]],
        properties as unknown as VesselProperties
      );
    } else {
      // Clicked on background: close any open popup
      MapPopupControl.closeVesselPopup();
    }
  }, []);

  // Handle cursor changes for vessel hovers
  const onMouseMove = useCallback((event: mapboxgl.MapMouseEvent) => {
    const features = event.target.queryRenderedFeatures(event.point, {
      layers: ["vessels-circle"],
    });

    if (features && features.length > 0) {
      event.target.getCanvas().style.cursor = "pointer";
    } else {
      event.target.getCanvas().style.cursor = "";
    }
  }, []);

  return (
    <div className="map-container">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="map"
      >
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{
            longitude: 9.4167,
            latitude: 41.2167,
            zoom: 10,
          }}
          style={{ width: "100%", height: "100%" }}
          mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
          onLoad={onMapLoad}
          onClick={onMapClick}
          onMouseMove={onMouseMove}
        >
          {/* Navigation Controls */}
          <NavigationControl position="bottom-right" />

          {/* Buffered Boundaries */}
          {bufferedBoundaries && (
            <Source id="buffered-boundaries" type="geojson" data={bufferedBoundaries}>
              <Layer
                id="buffered-fill"
                type="fill"
                paint={{
                  "fill-color": "#ffa500",
                  "fill-opacity": 0.15,
                }}
              />
              <Layer
                id="buffered-outline"
                type="line"
                paint={{
                  "line-color": "#ffa500",
                  "line-width": 2,
                  "line-dasharray": [2, 2],
                }}
              />
            </Source>
          )}

          {/* Park Boundaries */}
          {parkBoundaries && (
            <Source id="park-boundaries" type="geojson" data={parkBoundaries}>
              <Layer
                id="park-fill"
                type="fill"
                paint={{
                  "fill-color": "#00ff00",
                  "fill-opacity": 0.2,
                }}
              />
              <Layer
                id="park-outline"
                type="line"
                paint={{
                  "line-color": "#00ff00",
                  "line-width": 2,
                }}
              />
            </Source>
          )}

          {/* Vessel Markers */}
          {vesselGeoJSON.features.length > 0 && (
            <Source id="vessels" type="geojson" data={vesselGeoJSON}>
              <Layer
                id="vessels-circle"
                type="circle"
                paint={{
                  "circle-radius": 8,
                  "circle-color": [
                    "case",
                    ["get", "isInPark"],
                    "#ff0000",
                    ["get", "isInBufferZone"],
                    "#ffa500",
                    "#0000ff",
                  ],
                  "circle-stroke-color": "#ffffff",
                  "circle-stroke-width": 2,
                }}
              />
              <Layer
                id="vessels-labels"
                type="symbol"
                layout={{
                  "text-field": ["get", "name"],
                  "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
                  "text-offset": [0, -2],
                  "text-anchor": "bottom",
                  "text-size": 12,
                }}
                paint={{
                  "text-color": [
                    "case",
                    ["get", "isInPark"],
                    "#ff0000",
                    ["get", "isInBufferZone"],
                    "#ffa500",
                    "#0000ff",
                  ],
                  "text-halo-color": "#ffffff",
                  "text-halo-width": 1,
                }}
              />
            </Source>
          )}
        </Map>
      </motion.div>

      {/* Loading Overlay */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="map-loading-overlay"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="map-loading-content"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="map-spinner"
            />
            <p className="map-loading-text">Loading vessel data...</p>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
