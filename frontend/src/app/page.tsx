"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { VesselData, VesselHistoryResponse } from "@/types/vessel";
import Header, { ViolationFilter } from "@/components/Header/Header";
import Legend from "@/components/Legend/Legend";
import MapComponent, { useMapLayers } from "@/components/Map/Map";
import ViolationsPanel from "@/components/ViolationsPanel/ViolationsPanel";
import ViolationsEngine, {
  ViolationSeverity,
  type VesselViolations,
} from "@/lib/violations-engine";
import MaritimeLoader from "@/components/MaritimeLoader/MaritimeLoader";
import { useViolationsWorker } from "@/hooks/useViolationsWorker";
import ProcessingIndicator from "@/components/ProcessingIndicator/ProcessingIndicator";
import { MdWarning } from "react-icons/md";

export default function Home() {
  const [vessels, setVessels] = useState<VesselData[]>([]);
  const [parkBoundaries, setParkBoundaries] =
    useState<GeoJSON.FeatureCollection | null>(null);
  const [bufferedBoundaries, setBufferedBoundaries] =
    useState<GeoJSON.FeatureCollection | null>(null);
  const [posidoniaData, setPosidoniaData] =
    useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [violationsPanelOpen, setViolationsPanelOpen] = useState(false);
  const [trackingVessel, setTrackingVessel] = useState<{
    uuid: string;
    name: string;
  } | null>(null);
  const [violationFilter, setViolationFilter] =
    useState<ViolationFilter>("all");
  const mapRef = useRef<mapboxgl.Map | null>(null);

  // Layer visibility state
  const [layerVisibility, setLayerVisibility] = useState<
    Record<string, boolean>
  >({
    vessels: true,
    "posidonia-healthy": true,
    "posidonia-degraded": true,
    "posidonia-dead": true,
    "posidonia-standard": true,
    "park-boundaries": true,
    "buffer-zone": true,
  });

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  // Progressive data fetching - non-blocking
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Starting progressive data fetch...");

        // Start with a soft loading state that doesn't block UI
        setLoading(true);
        setError(null);

        // Fetch critical data first (boundaries) in parallel
        const boundariesPromise = fetch(`${API_BASE_URL}/api/park-boundaries`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data) {
              setParkBoundaries(data);
              console.log("Park boundaries loaded");
            }
          })
          .catch((err) => console.error("Boundaries error:", err));

        const bufferedPromise = fetch(`${API_BASE_URL}/api/buffered-boundaries`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data) {
              setBufferedBoundaries(data);
              console.log(
                "Buffered boundaries loaded:",
                data.features?.length,
                "features"
              );
            }
          })
          .catch((err) => console.error("Buffered error:", err));

        // Load boundaries first, then vessels
        await Promise.allSettled([boundariesPromise, bufferedPromise]);

        // Map is now ready, remove loading state to unblock UI
        setLoading(false);

        // Fetch vessels asynchronously without blocking
        console.log(
          "Fetching vessels from:",
          `${API_BASE_URL}/api/vessels/in-park`
        );
        fetch(`${API_BASE_URL}/api/vessels/in-park`)
          .then((res) => {
            console.log("Vessel response status:", res.status);
            return res.ok ? res.json() : { vessels_in_park: [] };
          })
          .then((data) => {
            const vessels = data.vessels_in_park || [];
            console.log(
              `Loaded ${vessels.length} vessels`,
              vessels.slice(0, 2)
            );
            setVessels(Array.isArray(vessels) ? vessels : []);
          })
          .catch((err) => {
            console.error("Vessels error:", err);
            setVessels([]);
          });
      } catch (err) {
        console.error("Critical error:", err);
        setError("Failed to load map data. Please refresh.");
        setLoading(false);
      }
    };

    fetchData();
  }, [API_BASE_URL]);

  // Load posidonia data
  useEffect(() => {
    const fetchPosidoniaData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/posidonia`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.type === "FeatureCollection" && data.features) {
            setPosidoniaData(data);
          }
        }
      } catch (err) {
        console.error("Failed to load posidonia data:", err);
      }
    };

    fetchPosidoniaData();
  }, [API_BASE_URL]);

  // Initialize violations engine (fallback for non-worker environments)
  const violationsEngine = useMemo(() => new ViolationsEngine(), []);

  // Initialize Web Worker for background processing
  const {
    processViolations,
    violations: workerViolations,
    isProcessing,
    progress,
    error: workerError,
    clearError,
  } = useViolationsWorker();

  // Skip violations detection during initial load or if data is not ready
  const shouldDetectViolations = useMemo(() => {
    return !loading && vessels.length > 0 && parkBoundaries !== null;
  }, [loading, vessels.length, parkBoundaries]);

  // Trigger Web Worker processing when data changes
  useEffect(() => {
    if (shouldDetectViolations && Array.isArray(vessels) && parkBoundaries) {
      console.log(
        "Starting violation processing for",
        vessels.length,
        "vessels"
      );
      processViolations(
        vessels,
        parkBoundaries,
        bufferedBoundaries,
        posidoniaData,
        null // shoreline data - can be added later
      );
    } else {
      console.log("Skipping violation processing:", {
        shouldDetectViolations,
        vesselsLength: vessels?.length,
        hasParkBoundaries: !!parkBoundaries,
      });
    }
  }, [
    shouldDetectViolations,
    vessels,
    parkBoundaries,
    bufferedBoundaries,
    posidoniaData,
    processViolations,
  ]);

  // Use worker violations if available, otherwise use fallback
  const vesselViolations: VesselViolations[] = useMemo(() => {
    if (workerViolations.length > 0) {
      return workerViolations;
    }

    // Fallback for when worker is not available or hasn't processed yet
    if (!shouldDetectViolations || !Array.isArray(vessels)) return [];

    if (!parkBoundaries)
      return vessels.map((v) => ({
        vessel: v,
        violations: [],
        maxSeverity: ViolationSeverity.LOW,
        isWhitelisted: v.is_whitelisted || false,
      }));

    // Only use synchronous processing as fallback for small datasets
    if (vessels.length <= 10) {
      return vessels.map((vessel) => {
        return violationsEngine.detectViolations(
          vessel,
          parkBoundaries,
          bufferedBoundaries,
          posidoniaData,
          null
        );
      });
    }

    return [];
  }, [
    workerViolations,
    shouldDetectViolations,
    vessels,
    violationsEngine,
    parkBoundaries,
    bufferedBoundaries,
    posidoniaData,
  ]);

  // Enhanced vessels - always show all vessels with violation data when available
  const enhancedVessels = useMemo(() => {
    // Always return vessels array if we have it
    if (!Array.isArray(vessels) || vessels.length === 0) return [];

    // If we have violation data, merge it with vessels
    if (vesselViolations.length > 0) {
      // Create a map of violations by vessel UUID for quick lookup
      const violationsMap = new Map(
        vesselViolations.map((vv) => [vv.vessel.vessel.uuid, vv])
      );

      return vessels.map((vessel) => {
        const violationData = violationsMap.get(vessel.vessel.uuid);

        if (violationData) {
          const hasBufferViolation = violationData.violations.some(
            (v) => v.type === "in_buffer_zone"
          );
          const hasPosidoniaViolation = violationData.violations.some(
            (v) => v.type === "anchored_on_posidonia"
          );
          const isInPark =
            violationData.violations.some(
              (v) =>
                v.type === "excessive_speed" || v.type === "in_restricted_area"
            ) ||
            vessel.is_in_park ||
            false;

          return {
            ...vessel,
            is_in_buffer_zone: hasBufferViolation,
            is_in_park: isInPark,
            is_anchored_on_posidonia: hasPosidoniaViolation,
            violations: violationData.violations || [],
            violationSeverity: violationData.maxSeverity,
            violationColor:
              (violationData as VesselViolations & { violationColor?: string })
                .violationColor ||
              violationsEngine.getVesselColor(violationData),
          };
        }

        // Return vessel as-is if no violation data
        return {
          ...vessel,
          violations: [],
          violationSeverity: undefined,
          violationColor: undefined,
        };
      });
    }

    // If no violations processed yet, just return vessels as-is
    return vessels;
  }, [vessels, vesselViolations, violationsEngine]);

  // Filtered vessels based on violation filter
  const filteredVessels = useMemo(() => {
    if (violationFilter === "all") return enhancedVessels;

    return enhancedVessels.filter((vessel) => {
      const hasViolations = vessel.violations && vessel.violations.length > 0;
      const violationSeverity = vessel.violationSeverity;

      switch (violationFilter) {
        case "violations-only":
          return hasViolations;
        case "critical":
          return violationSeverity === "critical";
        case "high":
          return violationSeverity === "high";
        case "medium":
          return violationSeverity === "medium";
        case "low":
          return violationSeverity === "low";
        case "no-violations":
          return !hasViolations;
        default:
          return true;
      }
    });
  }, [enhancedVessels, violationFilter]);

  const refreshData = () => {
    window.location.reload();
  };

  const handleMapReady = useCallback((map: mapboxgl.Map) => {
    mapRef.current = map;
    setMapLoading(false);
  }, []);

  const handleVesselClick = useCallback((vessel: VesselData) => {
    if (mapRef.current) {
      // Zoom to vessel with smooth animation
      mapRef.current.flyTo({
        center: [vessel.longitude, vessel.latitude],
        zoom: 16,
        duration: 2000,
      });
    }
    // Close violations panel when vessel is clicked
    setViolationsPanelOpen(false);
  }, []);

  const closeViolationsPanel = useCallback(() => {
    setViolationsPanelOpen(false);
  }, []);

  const handleTrackHistory = useCallback(
    async (vesselUuid: string, vesselName: string) => {
      try {
        setTrackingVessel({ uuid: vesselUuid, name: vesselName });
        // Close violations panel when tracking vessel
        setViolationsPanelOpen(false);

        // Fetch vessel history from the last 7 days (no limit for full data)
        const response = await fetch(
          `${API_BASE_URL}/api/vessels/${vesselUuid}/history`
        );

        if (response.ok) {
          const historyData: VesselHistoryResponse = await response.json();

          if (
            historyData.history &&
            historyData.history.length > 0 &&
            mapRef.current
          ) {
            // Create path coordinates from history
            const coordinates = historyData.history.map((entry) => [
              entry.longitude,
              entry.latitude,
            ]);

            // Remove existing track if any
            if (mapRef.current.getSource("vessel-track")) {
              mapRef.current.removeLayer("vessel-track-line");
              mapRef.current.removeLayer("vessel-track-points");
              mapRef.current.removeSource("vessel-track");
            }

            // Add vessel track source and layers
            mapRef.current.addSource("vessel-track", {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {
                  vessel_name: vesselName,
                  vessel_uuid: vesselUuid,
                },
                geometry: {
                  type: "LineString",
                  coordinates: coordinates,
                },
              },
            });

            // Add track line
            mapRef.current.addLayer({
              id: "vessel-track-line",
              type: "line",
              source: "vessel-track",
              layout: {
                "line-join": "round",
                "line-cap": "round",
              },
              paint: {
                "line-color": "#3b82f6",
                "line-width": 3,
                "line-opacity": 0.8,
              },
            });

            // Add track points
            mapRef.current.addSource("vessel-track-points", {
              type: "geojson",
              data: {
                type: "FeatureCollection",
                features: historyData.history.map((entry, index) => ({
                  type: "Feature",
                  properties: {
                    timestamp: entry.timestamp,
                    speed: entry.speed,
                    is_start: index === historyData.history.length - 1,
                    is_end: index === 0,
                  },
                  geometry: {
                    type: "Point",
                    coordinates: [entry.longitude, entry.latitude],
                  },
                })),
              },
            });

            mapRef.current.addLayer({
              id: "vessel-track-points",
              type: "circle",
              source: "vessel-track-points",
              paint: {
                "circle-radius": [
                  "case",
                  ["get", "is_start"],
                  8,
                  ["get", "is_end"],
                  6,
                  4,
                ],
                "circle-color": [
                  "case",
                  ["get", "is_start"],
                  "#10b981", // Green for start (oldest)
                  ["get", "is_end"],
                  "#ef4444", // Red for end (newest)
                  "#3b82f6", // Blue for intermediate points
                ],
                "circle-opacity": 0.8,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
              },
            });

            // Fit map to track bounds
            const bounds = new mapboxgl.LngLatBounds();
            coordinates.forEach((coord) =>
              bounds.extend(coord as [number, number])
            );
            mapRef.current.fitBounds(bounds, { padding: 50 });

            // Add popup for track points
            mapRef.current.on("click", "vessel-track-points", (e) => {
              const features = e.features;
              if (features && features.length > 0) {
                const feature = features[0];
                const props = feature.properties;

                new mapboxgl.Popup()
                  .setLngLat(e.lngLat)
                  .setHTML(
                    `
                  <div style="padding: 10px; background: rgba(0, 0, 0, 0.8); border-radius: 8px; color: white;">
                    <strong>${vesselName}</strong><br/>
                    <small>Time: ${new Date(
                      props?.timestamp
                    ).toLocaleString()}</small><br/>
                    <small>Speed: ${props?.speed} kts</small><br/>
                    <small>${
                      props?.is_start
                        ? "🟢 Track Start"
                        : props?.is_end
                        ? "🔴 Latest Position"
                        : "🔵 Track Point"
                    }</small>
                  </div>
                `
                  )
                  .addTo(mapRef.current!);
              }
            });

            // Keep the tracking vessel state for the header
            // Don't clear it here since we want to show the clear button
            alert(
              `Tracking history loaded for ${vesselName} (${historyData.count} positions)`
            );
          } else {
            alert(`No tracking history found for ${vesselName}`);
            setTrackingVessel(null);
          }
        } else {
          alert(`Failed to fetch tracking history for ${vesselName}`);
          setTrackingVessel(null);
        }
      } catch (error) {
        console.error("Error fetching vessel history:", error);
        alert(`Error loading tracking history for ${vesselName}`);
        setTrackingVessel(null);
      }
    },
    [API_BASE_URL]
  );

  const clearVesselTrack = useCallback(() => {
    if (mapRef.current && mapRef.current.getSource("vessel-track")) {
      mapRef.current.removeLayer("vessel-track-line");
      mapRef.current.removeLayer("vessel-track-points");
      mapRef.current.removeSource("vessel-track");
      mapRef.current.removeSource("vessel-track-points");
    }
    setTrackingVessel(null);
  }, []);

  const generateBufferViolations = useCallback(() => {
    // Open the violations panel to show real buffer zone violations
    setViolationsPanelOpen(true);
  }, []);

  // Handle layer visibility toggle
  const handleLayerToggle = useCallback((layerId: string, visible: boolean) => {
    setLayerVisibility((prev) => ({
      ...prev,
      [layerId]: visible,
    }));
  }, []);

  // Get map layers data - must be called before any conditional returns
  const mapLayers = useMapLayers(layerVisibility);

  // Memoize vessel calculations to prevent expensive recalculations
  const vesselStats = useMemo(() => {
    if (!Array.isArray(filteredVessels)) {
      return { vesselsInBuffer: 0, vesselsInPark: 0 };
    }

    return {
      vesselsInBuffer: filteredVessels.filter(
        (v) => v.is_in_buffer_zone && !v.is_whitelisted
      ).length,
      vesselsInPark: filteredVessels.filter((v) => v.is_in_park).length,
    };
  }, [filteredVessels]);

  if (error) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{
          background:
            "linear-gradient(135deg, #86efac 0%, #10b981 25%, #059669 75%, #1e3a8a 100%)",
        }}
      >
        <div className="text-center glass-heavy p-8 rounded-xl shadow-2xl max-w-md mx-4">
          <MdWarning className="text-white text-6xl mb-4 drop-shadow-lg" />
          <p className="text-white mb-6 font-medium text-shadow">{error}</p>
          <button
            onClick={refreshData}
            className="px-6 py-2 glass-ocean rounded-xl text-white font-medium transition-all duration-200 hover:bg-white/30 text-shadow-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen flex flex-col relative isolate overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)",
      }}
    >
      {/* Loading overlay */}
      {(loading || mapLoading) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/20 p-4">
          <div className="text-center glass-heavy p-6 sm:p-8 lg:p-12 rounded-2xl shadow-3xl max-w-xs sm:max-w-lg mx-4">
            <MaritimeLoader
              message="Initializing Maritime Sentinel"
              size="lg"
            />

            <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 mt-4 sm:mt-8">
              <div className="flex items-center justify-center space-x-2 text-white/90">
                <div
                  className="w-2 h-2 bg-white rounded-full animate-pulse"
                  style={{ animationDelay: "0s" }}
                ></div>
                <span className="text-xs sm:text-sm font-medium text-shadow-sm">
                  Loading park boundaries...
                </span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-white/90">
                <div
                  className="w-2 h-2 bg-white rounded-full animate-pulse"
                  style={{ animationDelay: "0.5s" }}
                ></div>
                <span className="text-xs sm:text-sm font-medium text-shadow-sm">
                  Mapping posidonia seagrass...
                </span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-white/90">
                <div
                  className="w-2 h-2 bg-white rounded-full animate-pulse"
                  style={{ animationDelay: "1s" }}
                ></div>
                <span className="text-xs sm:text-sm font-medium text-shadow-sm">
                  {mapLoading
                    ? "Initializing map..."
                    : "Finding park rule violations..."}
                </span>
              </div>
            </div>

            <p className="text-white/80 text-sm text-shadow-sm">
              Preparing La Maddalena National Park monitoring system
            </p>
          </div>
        </div>
      )}

      {/* Processing indicator for background violation processing */}
      <ProcessingIndicator
        isProcessing={isProcessing}
        progress={progress}
        error={workerError}
        onClearError={clearError}
      />

      <Header
        vesselCount={
          Array.isArray(filteredVessels) ? filteredVessels.length : 0
        }
        vesselsInBuffer={vesselStats.vesselsInBuffer}
        onClearTrack={clearVesselTrack}
        trackingVessel={trackingVessel}
        onGenerateBufferViolations={generateBufferViolations}
        violationFilter={violationFilter}
        onViolationFilterChange={setViolationFilter}
      />

      <MapComponent
        vessels={filteredVessels}
        parkBoundaries={parkBoundaries}
        bufferedBoundaries={bufferedBoundaries}
        loading={loading}
        onMapReady={handleMapReady}
        layerVisibility={layerVisibility}
        onLayerToggle={handleLayerToggle}
      />

      <Legend
        layers={mapLayers}
        onLayerToggle={handleLayerToggle}
        showToggleControls={true}
      />

      <ViolationsPanel
        vessels={filteredVessels}
        isOpen={violationsPanelOpen}
        onClose={closeViolationsPanel}
        onVesselClick={handleVesselClick}
        onTrackHistory={handleTrackHistory}
      />
    </div>
  );
}
