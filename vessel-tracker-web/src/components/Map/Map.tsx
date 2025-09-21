"use client";

import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import Map, {
  Layer,
  Source,
  NavigationControl,
  MapRef,
} from "react-map-gl/mapbox";
import mapboxgl from "mapbox-gl";
import * as turf from "@turf/turf";
import { VesselData } from "@/types/vessel";
import {
  MapPopupControl,
  VesselProperties,
} from "@/components/MapPopup/MapPopup";

function debounce<TArgs extends unknown[], TReturn>(
  func: (...args: TArgs) => TReturn,
  wait: number
): (...args: TArgs) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: TArgs) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      // Use spread to invoke without altering this
      func(...args);
    }, wait);
  };
}

export interface LayerConfig {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
  visible: boolean;
  type: "vessels" | "posidonia" | "boundaries";
  subLayers?: string[];
}

interface MapProps {
  vessels: VesselData[];
  parkBoundaries: GeoJSON.FeatureCollection | null;
  bufferedBoundaries?: GeoJSON.FeatureCollection | null;
  loading: boolean;
  onMapReady?: (map: mapboxgl.Map) => void;
  layerVisibility?: Record<string, boolean>;
  onLayerToggle?: (layerId: string, visible: boolean) => void;
}

// Export the legend layers configuration for use by parent components
export function useMapLayers(
  layerVisibility: Record<string, boolean>
): LayerConfig[] {
  return useMemo(
    () => [
      {
        id: "vessels",
        name: "Vessels",
        color: "#0ea5e9",
        icon: "⛵",
        description: "All tracked vessels in the area",
        visible: layerVisibility.vessels,
        type: "vessels",
        subLayers: ["vessels-circle", "vessels-labels"],
      },
      {
        id: "posidonia-healthy",
        name: "Healthy Posidonia",
        color: "#10b981",
        icon: "🌿",
        description: "Thriving seagrass beds",
        visible: layerVisibility["posidonia-healthy"],
        type: "posidonia",
      },
      {
        id: "posidonia-degraded",
        name: "Degraded Posidonia",
        color: "#f59e0b",
        icon: "⚠️",
        description: "Damaged seagrass areas",
        visible: layerVisibility["posidonia-degraded"],
        type: "posidonia",
      },
      {
        id: "posidonia-dead",
        name: "Dead Matte",
        color: "#059669",
        icon: "💀",
        description: "Former seagrass bed remains",
        visible: layerVisibility["posidonia-dead"],
        type: "posidonia",
      },
      {
        id: "posidonia-standard",
        name: "Standard Posidonia",
        color: "#7dd3fc",
        icon: "🌱",
        description: "Standard seagrass beds on rocky substrate",
        visible: layerVisibility["posidonia-standard"],
        type: "posidonia",
        subLayers: ["posidonia-standard-fill", "posidonia-standard-outline"],
      },
      {
        id: "park-boundaries",
        name: "Park Boundaries",
        color: "#10b981",
        icon: "🌳",
        description: "Protected marine park area",
        visible: layerVisibility["park-boundaries"],
        type: "boundaries",
        subLayers: ["park-fill", "park-outline"],
      },
      {
        id: "buffer-zone",
        name: "Buffer Zone",
        color: "#f59e0b",
        icon: "⚡",
        description: "150m buffer around park",
        visible: layerVisibility["buffer-zone"],
        type: "boundaries",
        subLayers: ["buffered-fill", "buffered-outline"],
      },
    ],
    [layerVisibility]
  );
}

export default function MapComponent({
  vessels,
  parkBoundaries,
  bufferedBoundaries,
  loading,
  onMapReady,
  layerVisibility: externalLayerVisibility,
}: MapProps) {
  const mapRef = useRef<MapRef>(null);
  const [posidoniaData, setPosidoniaData] =
    useState<GeoJSON.FeatureCollection | null>(null);

  // Layer visibility state (use external or internal)
  const [internalLayerVisibility] = useState<Record<string, boolean>>({
    vessels: true,
    "posidonia-healthy": true,
    "posidonia-degraded": true,
    "posidonia-dead": true,
    "posidonia-standard": true,
    "park-boundaries": true,
    "buffer-zone": true,
  });

  const layerVisibility = externalLayerVisibility || internalLayerVisibility;

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  // Legend configuration is provided via useMapLayers(); no local legend list needed here.

  // Handle layer visibility toggle is managed externally; internal updates occur via updateLayerVisibility effect.

  // Optimized layer visibility updates - batch operations and use throttling
  const updateLayerVisibility = useMemo(
    () =>
      debounce((visibility: Record<string, boolean>) => {
        if (!mapRef.current) return;

        const map = mapRef.current.getMap();

        // Batch all layer updates together
        requestAnimationFrame(() => {
          const layerMappings = {
            vessels: ["vessels-circle", "vessels-labels"],
            "posidonia-healthy": [
              "posidonia-healthy-fill",
              "posidonia-healthy-outline",
            ],
            "posidonia-degraded": [
              "posidonia-degraded-fill",
              "posidonia-degraded-outline",
            ],
            "posidonia-dead": ["posidonia-dead-fill", "posidonia-dead-outline"],
            "posidonia-standard": [
              "posidonia-standard-fill",
              "posidonia-standard-outline",
            ],
            "park-boundaries": ["park-fill", "park-outline"],
            "buffer-zone": ["buffered-fill", "buffered-outline"],
          } as const;

          Object.entries(visibility).forEach(([layerId, visible]) => {
            const subLayers =
              layerMappings[layerId as keyof typeof layerMappings];
            if (subLayers) {
              subLayers.forEach((subLayerId) => {
                if (map.getLayer(subLayerId)) {
                  map.setLayoutProperty(
                    subLayerId,
                    "visibility",
                    visible ? "visible" : "none"
                  );
                }
              });
            }
          });
        });
      }, 16),
    []
  ); // 16ms debounce for 60fps

  useEffect(() => {
    updateLayerVisibility(layerVisibility);
  }, [layerVisibility, updateLayerVisibility]);

  // Load posidonia data
  useEffect(() => {
    const API_BASE_URL =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    fetch(`${API_BASE_URL}/api/posidonia`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.type === "FeatureCollection" && data.features) {
          setPosidoniaData(data);
        } else {
          console.warn("Invalid posidonia GeoJSON data received:", data);
        }
      })
      .catch((err) => console.error("Failed to load posidonia data:", err));
  }, []);

  // Comprehensive spatial analysis using Turf.js
  const analyzeVesselPosition = useCallback(
    (lat: number, lon: number, speed: number | null) => {
      const result = {
        isOverPosidonia: false,
        posidoniaFeature: null as GeoJSON.Feature | null,
        distanceToNearestPosidonia: Infinity,
        isInBufferZone: false,
        isInPark: false,
      };

      try {
        const vesselPoint = turf.point([lon, lat]);

        // Check if vessel is in park boundaries
        if (parkBoundaries && parkBoundaries.features) {
          for (const feature of parkBoundaries.features) {
            if (
              feature.geometry &&
              (feature.geometry.type === "Polygon" ||
                feature.geometry.type === "MultiPolygon")
            ) {
              try {
                if (
                  turf.booleanPointInPolygon(
                    vesselPoint,
                    feature as GeoJSON.Feature<
                      GeoJSON.Polygon | GeoJSON.MultiPolygon
                    >
                  )
                ) {
                  result.isInPark = true;
                  break;
                }
              } catch (error) {
                console.debug("Park boundary check failed for feature:", error);
              }
            }
          }
        }

        // Check if vessel is in buffer zone (but not in park - buffer zone is outside park)
        if (
          bufferedBoundaries &&
          bufferedBoundaries.features &&
          !result.isInPark
        ) {
          for (const feature of bufferedBoundaries.features) {
            if (
              feature.geometry &&
              (feature.geometry.type === "Polygon" ||
                feature.geometry.type === "MultiPolygon")
            ) {
              try {
                if (
                  turf.booleanPointInPolygon(
                    vesselPoint,
                    feature as GeoJSON.Feature<
                      GeoJSON.Polygon | GeoJSON.MultiPolygon
                    >
                  )
                ) {
                  result.isInBufferZone = true;
                  break;
                }
              } catch (error) {
                console.debug(
                  "Buffer boundary check failed for feature:",
                  error
                );
              }
            }
          }
        }

        // Check posidonia violations (only if data is available)
        if (posidoniaData && posidoniaData.features) {
          for (const feature of posidoniaData.features) {
            if (feature.geometry.type === "Polygon") {
              const polygon = turf.polygon(feature.geometry.coordinates);

              // Check if point is inside polygon
              if (turf.booleanPointInPolygon(vesselPoint, polygon)) {
                // Only consider it a violation if vessel is anchored (low speed)
                if (speed !== null && speed <= 0.5) {
                  result.isOverPosidonia = true;
                  result.posidoniaFeature = feature;
                  result.distanceToNearestPosidonia = 0;
                  break;
                }
              }

              // Calculate distance to polygon for nearby analysis
              try {
                const distance = turf.distance(
                  vesselPoint,
                  turf.centerOfMass(polygon),
                  { units: "meters" }
                );
                if (distance < result.distanceToNearestPosidonia) {
                  result.distanceToNearestPosidonia = distance;
                }
              } catch (distanceError) {
                // Distance calculation can fail for complex geometries, continue
                console.debug(
                  "Distance calculation failed for feature:",
                  distanceError
                );
              }
            }
          }
        }
      } catch (error) {
        console.warn("Error in spatial analysis:", error);
      }

      return result;
    },
    [posidoniaData, parkBoundaries, bufferedBoundaries]
  );

  // Remove the old isOverPosidonia function since we're using analyzeVesselPosition directly

  // Memoize vessel GeoJSON data to prevent expensive recalculations
  const vesselGeoJSON = useMemo(() => {
    if (!Array.isArray(vessels) || vessels.length === 0) {
      return {
        type: "FeatureCollection" as const,
        features: [],
      };
    }

    return {
      type: "FeatureCollection" as const,
      features: vessels.map((vessel) => {
        const spatialAnalysis = analyzeVesselPosition(
          vessel.latitude,
          vessel.longitude,
          vessel.vessel.speed ?? null
        );

        return {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [vessel.longitude, vessel.latitude],
          },
          properties: {
            name: vessel.vessel.name,
            isInPark: spatialAnalysis.isInPark,
            isInBufferZone: spatialAnalysis.isInBufferZone,
            isAnchoredOnPosidonia: spatialAnalysis.isOverPosidonia,
            distanceToNearestPosidonia:
              spatialAnalysis.distanceToNearestPosidonia,
            isNearPosidonia: spatialAnalysis.distanceToNearestPosidonia < 100, // Within 100m
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
        };
      }),
    };
  }, [vessels, analyzeVesselPosition]);

  // Handle map load
  const onMapLoad = useCallback(() => {
    console.log("Map loaded successfully");
    if (onMapReady && mapRef.current) {
      onMapReady(mapRef.current.getMap());
    }

    // Apply initial visibility settings after a short delay to ensure layers are ready
    setTimeout(() => {
      if (mapRef.current) {
        const map = mapRef.current.getMap();
        Object.entries(layerVisibility).forEach(([layerId, visible]) => {
          switch (layerId) {
            case "vessels":
              ["vessels-circle", "vessels-labels"].forEach((subLayerId) => {
                if (map.getLayer(subLayerId)) {
                  map.setLayoutProperty(
                    subLayerId,
                    "visibility",
                    visible ? "visible" : "none"
                  );
                }
              });
              break;

            case "posidonia-healthy":
              ["posidonia-healthy-fill", "posidonia-healthy-outline"].forEach(
                (subLayerId) => {
                  if (map.getLayer(subLayerId)) {
                    map.setLayoutProperty(
                      subLayerId,
                      "visibility",
                      visible ? "visible" : "none"
                    );
                  }
                }
              );
              break;

            case "posidonia-degraded":
              ["posidonia-degraded-fill", "posidonia-degraded-outline"].forEach(
                (subLayerId) => {
                  if (map.getLayer(subLayerId)) {
                    map.setLayoutProperty(
                      subLayerId,
                      "visibility",
                      visible ? "visible" : "none"
                    );
                  }
                }
              );
              break;

            case "posidonia-dead":
              ["posidonia-dead-fill", "posidonia-dead-outline"].forEach(
                (subLayerId) => {
                  if (map.getLayer(subLayerId)) {
                    map.setLayoutProperty(
                      subLayerId,
                      "visibility",
                      visible ? "visible" : "none"
                    );
                  }
                }
              );
              break;

            case "posidonia-standard":
              ["posidonia-standard-fill", "posidonia-standard-outline"].forEach(
                (subLayerId) => {
                  if (map.getLayer(subLayerId)) {
                    map.setLayoutProperty(
                      subLayerId,
                      "visibility",
                      visible ? "visible" : "none"
                    );
                  }
                }
              );
              break;

            case "park-boundaries":
              ["park-fill", "park-outline"].forEach((subLayerId) => {
                if (map.getLayer(subLayerId)) {
                  map.setLayoutProperty(
                    subLayerId,
                    "visibility",
                    visible ? "visible" : "none"
                  );
                }
              });
              break;

            case "buffer-zone":
              ["buffered-fill", "buffered-outline"].forEach((subLayerId) => {
                if (map.getLayer(subLayerId)) {
                  map.setLayoutProperty(
                    subLayerId,
                    "visibility",
                    visible ? "visible" : "none"
                  );
                }
              });
              break;
          }
        });
      }
    }, 500); // Wait for layers to be fully initialized
  }, [onMapReady, layerVisibility]);

  // Handle map clicks to detect vessel and posidonia clicks
  const onMapClick = useCallback((event: mapboxgl.MapMouseEvent) => {
    // Check for vessel clicks first
    const vesselFeatures = event.target.queryRenderedFeatures(event.point, {
      layers: ["vessels-circle"],
    });

    if (vesselFeatures && vesselFeatures.length > 0) {
      const feature = vesselFeatures[0];
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
      return;
    }

    // Check for posidonia bed clicks
    const posidoniaFeatures = event.target.queryRenderedFeatures(event.point, {
      layers: [
        "posidonia-healthy-fill",
        "posidonia-degraded-fill",
        "posidonia-dead-fill",
        "posidonia-standard-fill",
      ],
    });

    if (posidoniaFeatures && posidoniaFeatures.length > 0) {
      const feature = posidoniaFeatures[0];
      const properties = feature.properties;

      if (!properties) return;

      // Get centroid of clicked polygon for popup placement
      const geometry = feature.geometry as GeoJSON.Polygon;
      const coordinates = geometry.coordinates[0];
      const centroid = calculatePolygonCentroid(coordinates);

      MapPopupControl.createPosidoniaPopup(
        mapRef.current!.getMap(),
        centroid,
        properties
      );
      return;
    }

    // Clicked on background: close any open popup
    MapPopupControl.closeVesselPopup();
  }, []);

  // Helper function to calculate polygon centroid
  const calculatePolygonCentroid = (
    coordinates: number[][]
  ): [number, number] => {
    let sumLat = 0;
    let sumLon = 0;
    const count = coordinates.length;

    for (const coord of coordinates) {
      sumLon += coord[0];
      sumLat += coord[1];
    }

    return [sumLon / count, sumLat / count];
  };

  // Handle cursor changes for vessel and posidonia hovers
  const onMouseMove = useCallback((event: mapboxgl.MapMouseEvent) => {
    const vesselFeatures = event.target.queryRenderedFeatures(event.point, {
      layers: ["vessels-circle"],
    });

    const posidoniaFeatures = event.target.queryRenderedFeatures(event.point, {
      layers: [
        "posidonia-healthy-fill",
        "posidonia-degraded-fill",
        "posidonia-dead-fill",
        "posidonia-standard-fill",
      ],
    });

    if (
      (vesselFeatures && vesselFeatures.length > 0) ||
      (posidoniaFeatures && posidoniaFeatures.length > 0)
    ) {
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

          {/* Buffered Boundaries - Rendered first (bottom layer) */}
          {bufferedBoundaries && (
            <Source
              id="buffered-boundaries"
              type="geojson"
              data={bufferedBoundaries}
            >
              <Layer
                id="buffered-fill"
                type="fill"
                layout={{
                  visibility: layerVisibility["buffer-zone"]
                    ? "visible"
                    : "none",
                }}
                paint={{
                  "fill-color": "#f59e0b",
                  "fill-opacity": 0.15,
                }}
              />
              <Layer
                id="buffered-outline"
                type="line"
                layout={{
                  visibility: layerVisibility["buffer-zone"]
                    ? "visible"
                    : "none",
                }}
                paint={{
                  "line-color": "#f59e0b",
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
                layout={{
                  visibility: layerVisibility["park-boundaries"]
                    ? "visible"
                    : "none",
                }}
                paint={{
                  "fill-color": "#10b981",
                  "fill-opacity": 0.2,
                }}
              />
              <Layer
                id="park-outline"
                type="line"
                layout={{
                  visibility: layerVisibility["park-boundaries"]
                    ? "visible"
                    : "none",
                }}
                paint={{
                  "line-color": "#10b981",
                  "line-width": 2,
                }}
              />
            </Source>
          )}

          {/* Posidonia Beds Layers - Middle layers */}
          {posidoniaData && (
            <>
              {/* Healthy Posidonia */}
              <Source
                id="posidonia-healthy-source"
                type="geojson"
                data={{
                  type: "FeatureCollection",
                  features: posidoniaData.features.filter(
                    (f) => f.properties?.classification === "healthy"
                  ),
                }}
              >
                <Layer
                  id="posidonia-healthy-fill"
                  type="fill"
                  layout={{
                    visibility: layerVisibility["posidonia-healthy"]
                      ? "visible"
                      : "none",
                  }}
                  paint={{
                    "fill-color": "#10b981",
                    "fill-opacity": 0.7,
                  }}
                />
                <Layer
                  id="posidonia-healthy-outline"
                  type="line"
                  layout={{
                    visibility: layerVisibility["posidonia-healthy"]
                      ? "visible"
                      : "none",
                  }}
                  paint={{
                    "line-color": "#059669",
                    "line-width": 2,
                  }}
                />
              </Source>

              {/* Degraded Posidonia */}
              <Source
                id="posidonia-degraded-source"
                type="geojson"
                data={{
                  type: "FeatureCollection",
                  features: posidoniaData.features.filter(
                    (f) => f.properties?.classification === "degraded"
                  ),
                }}
              >
                <Layer
                  id="posidonia-degraded-fill"
                  type="fill"
                  layout={{
                    visibility: layerVisibility["posidonia-degraded"]
                      ? "visible"
                      : "none",
                  }}
                  paint={{
                    "fill-color": "#f59e0b",
                    "fill-opacity": 0.6,
                  }}
                />
                <Layer
                  id="posidonia-degraded-outline"
                  type="line"
                  layout={{
                    visibility: layerVisibility["posidonia-degraded"]
                      ? "visible"
                      : "none",
                  }}
                  paint={{
                    "line-color": "#DC143C",
                    "line-width": 2,
                  }}
                />
              </Source>

              {/* Dead Posidonia */}
              <Source
                id="posidonia-dead-source"
                type="geojson"
                data={{
                  type: "FeatureCollection",
                  features: posidoniaData.features.filter(
                    (f) => f.properties?.classification === "dead"
                  ),
                }}
              >
                <Layer
                  id="posidonia-dead-fill"
                  type="fill"
                  layout={{
                    visibility: layerVisibility["posidonia-dead"]
                      ? "visible"
                      : "none",
                  }}
                  paint={{
                    "fill-color": "#059669",
                    "fill-opacity": 0.5,
                  }}
                />
                <Layer
                  id="posidonia-dead-outline"
                  type="line"
                  layout={{
                    visibility: layerVisibility["posidonia-dead"]
                      ? "visible"
                      : "none",
                  }}
                  paint={{
                    "line-color": "#654321",
                    "line-width": 2,
                  }}
                />
              </Source>

              {/* Standard/Unknown Posidonia */}
              <Source
                id="posidonia-standard-source"
                type="geojson"
                data={{
                  type: "FeatureCollection",
                  features: posidoniaData.features.filter(
                    (f) =>
                      !f.properties?.classification ||
                      f.properties?.classification === "standard"
                  ),
                }}
              >
                <Layer
                  id="posidonia-standard-fill"
                  type="fill"
                  layout={{
                    visibility: layerVisibility["posidonia-standard"]
                      ? "visible"
                      : "none",
                  }}
                  paint={{
                    "fill-color": "#7dd3fc",
                    "fill-opacity": 0.6,
                  }}
                />
                <Layer
                  id="posidonia-standard-outline"
                  type="line"
                  layout={{
                    visibility: layerVisibility["posidonia-standard"]
                      ? "visible"
                      : "none",
                  }}
                  paint={{
                    "line-color": "#059669",
                    "line-width": 2,
                  }}
                />
              </Source>
            </>
          )}

          {/* Vessel Markers - Rendered last to ensure they appear on top */}
          {vesselGeoJSON.features.length > 0 && (
            <Source
              key="vessels-top-layer"
              id="vessels"
              type="geojson"
              data={vesselGeoJSON}
            >
              <Layer
                id="vessels-circle"
                type="circle"
                layout={{
                  visibility: layerVisibility.vessels ? "visible" : "none",
                }}
                paint={{
                  "circle-radius": 10,
                  "circle-color": [
                    "case",
                    ["has", "violationColor"],
                    ["get", "violationColor"],
                    [
                      "case",
                      ["get", "isAnchoredOnPosidonia"],
                      "#10b981",
                      ["get", "isInPark"],
                      "#0ea5e9",
                      ["get", "isInBufferZone"],
                      "#f59e0b",
                      "#7dd3fc",
                    ]
                  ],
                  "circle-stroke-color": "#ffffff",
                  "circle-stroke-width": 3,
                }}
              />
              <Layer
                id="vessels-labels"
                type="symbol"
                layout={{
                  visibility: layerVisibility.vessels ? "visible" : "none",
                  "text-field": ["get", "name"],
                  "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
                  "text-offset": [0, -2.5],
                  "text-anchor": "bottom",
                  "text-size": 13,
                }}
                paint={{
                  "text-color": [
                    "case",
                    ["has", "violationColor"],
                    ["get", "violationColor"],
                    [
                      "case",
                      ["get", "isAnchoredOnPosidonia"],
                      "#10b981",
                      ["get", "isInPark"],
                      "#059669",
                      ["get", "isInBufferZone"],
                      "#f59e0b",
                      "#7dd3fc",
                    ]
                  ],
                  "text-halo-color": "#000000",
                  "text-halo-width": 2,
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
