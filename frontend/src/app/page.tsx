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
import NotificationContainer from "@/components/NotificationContainer/NotificationContainer";
import { useNotifications } from "@/hooks/useNotifications";
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

  // Notification system
  const { notifications, addNotification, removeNotification } = useNotifications();

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

  const handleShowPreviousPositions = useCallback(
    async (vesselUuid: string, vesselName: string) => {
      try {
        setTrackingVessel({ uuid: vesselUuid, name: vesselName });
        // Close violations panel when tracking vessel
        setViolationsPanelOpen(false);

        // Fetch previous positions from the last 7 days
        const response = await fetch(
          `${API_BASE_URL}/api/vessels/${vesselUuid}/previous-positions?limit=50`
        );

        if (response.ok) {
          const positionData = await response.json();

          if (
            positionData.previous_positions &&
            positionData.previous_positions.length > 0 &&
            mapRef.current
          ) {
            // Create coordinates for previous positions (markers only, no lines)
            const coordinates = positionData.previous_positions.map((entry: any) => [
              entry.longitude,
              entry.latitude,
            ]);

            // Remove existing previous positions if any
            if (mapRef.current.getSource("previous-positions")) {
              mapRef.current.removeLayer("previous-positions-markers");
              mapRef.current.removeSource("previous-positions");
            }

            // Add previous positions source (markers only, no line connections)
            mapRef.current.addSource("previous-positions", {
              type: "geojson",
              data: {
                type: "FeatureCollection",
                features: positionData.previous_positions.map((entry: any, index: number) => ({
                  type: "Feature",
                  properties: {
                    timestamp: entry.timestamp,
                    speed: entry.speed,
                    is_start: index === positionData.previous_positions.length - 1,
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
              id: "previous-positions-markers",
              type: "circle",
              source: "previous-positions",
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
                  "#10b981", // Green for oldest position
                  ["get", "is_end"],
                  "#ef4444", // Red for most recent position
                  "#3b82f6", // Blue for intermediate positions
                ],
                "circle-opacity": 0.8,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
              },
            });

            // Fit map to show all previous positions
            const bounds = new mapboxgl.LngLatBounds();
            coordinates.forEach((coord: [number, number]) =>
              bounds.extend(coord)
            );
            mapRef.current.fitBounds(bounds, { padding: 50 });

            // Add popup for previous position markers
            mapRef.current.on("click", "previous-positions-markers", (e) => {
              const features = e.features;
              if (features && features.length > 0) {
                const feature = features[0];
                const props = feature.properties;

                const popup = new mapboxgl.Popup({
                  closeButton: true,
                  closeOnClick: false,
                  className: 'vessel-popup'
                })
                  .setLngLat(e.lngLat)
                  .setHTML(
                    `
                  <div class="bg-white/95 backdrop-blur-lg rounded-xl p-4 shadow-2xl border border-white/20 min-w-[250px]">
                    <div class="flex items-center gap-3 mb-3">
                      <div class="w-3 h-3 rounded-full ${
                        props?.is_start
                          ? "bg-green-500"
                          : props?.is_end
                          ? "bg-red-500"
                          : "bg-blue-500"
                      }"></div>
                      <h3 class="font-semibold text-gray-900">${vesselName}</h3>
                    </div>

                    <div class="space-y-2 text-sm">
                      <div class="flex justify-between">
                        <span class="text-gray-600">Time:</span>
                        <span class="font-medium text-gray-900">${new Date(
                          props?.timestamp
                        ).toLocaleString()}</span>
                      </div>

                      ${props?.speed ? `
                      <div class="flex justify-between">
                        <span class="text-gray-600">Speed:</span>
                        <span class="font-medium text-gray-900">${props.speed} kts</span>
                      </div>
                      ` : ''}

                      <div class="pt-2 border-t border-gray-200">
                        <span class="text-xs font-medium ${
                          props?.is_start
                            ? "text-green-700"
                            : props?.is_end
                            ? "text-red-700"
                            : "text-blue-700"
                        }">
                          ${
                            props?.is_start
                              ? "🟢 Oldest Position"
                              : props?.is_end
                              ? "🔴 Latest Position"
                              : "🔵 Previous Position"
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                `
                  )
                  .addTo(mapRef.current!);

                // Auto-close after 10 seconds
                setTimeout(() => {
                  if (popup.isOpen()) {
                    popup.remove();
                  }
                }, 10000);
              }
            });

            // Keep the tracking vessel state for the header
            // Don't clear it here since we want to show the clear button
            addNotification({
              type: "success",
              title: "Previous Positions Loaded",
              message: `${vesselName} - ${positionData.count} positions displayed`,
              duration: 4000,
            });
          } else {
            addNotification({
              type: "info",
              title: "No Previous Positions",
              message: `No previous positions found for ${vesselName}`,
              duration: 3000,
            });
            setTrackingVessel(null);
          }
        } else {
          addNotification({
            type: "error",
            title: "Failed to Load Previous Positions",
            message: `Could not fetch previous positions for ${vesselName}`,
            duration: 4000,
          });
          setTrackingVessel(null);
        }
      } catch (error) {
        console.error("Error fetching previous positions:", error);
        addNotification({
          type: "error",
          title: "Error Loading Previous Positions",
          message: `Error loading tracking history for ${vesselName}`,
          duration: 4000,
        });
        setTrackingVessel(null);
      }
    },
    [API_BASE_URL, addNotification]
  );

  const handleTrackVessel = useCallback(
    async (vesselUuid: string, vesselName: string) => {
      try {
        setTrackingVessel({ uuid: vesselUuid, name: vesselName });
        // Close violations panel when tracking vessel
        setViolationsPanelOpen(false);

        // Fetch historical data from Datalastic API (last 7 days by default)
        const response = await fetch(
          `${API_BASE_URL}/api/vessels/historical-data?uuid=${vesselUuid}&days=7&limit=100`
        );

        if (response.ok) {
          const historyData: VesselHistoryResponse = await response.json();

          if (
            historyData.positions &&
            historyData.positions.length > 0 &&
            mapRef.current
          ) {
            // Create coordinates from Datalastic historical data
            const coordinates = historyData.positions.map((position) => [
              position.longitude,
              position.latitude,
            ]);

            // Remove existing track if any
            if (mapRef.current.getSource("vessel-track")) {
              mapRef.current.removeLayer("vessel-track-markers");
              mapRef.current.removeSource("vessel-track");
            }

            // Add vessel track source (markers only, no line connections)
            mapRef.current.addSource("vessel-track", {
              type: "geojson",
              data: {
                type: "FeatureCollection",
                features: historyData.positions.map((position, index) => ({
                  type: "Feature",
                  properties: {
                    timestamp: position.timestamp,
                    speed: position.speed,
                    course: position.course,
                    heading: position.heading,
                    destination: position.destination,
                    is_start: index === historyData.positions.length - 1,
                    is_end: index === 0,
                  },
                  geometry: {
                    type: "Point",
                    coordinates: [position.longitude, position.latitude],
                  },
                })),
              },
            });

            mapRef.current.addLayer({
              id: "vessel-track-markers",
              type: "circle",
              source: "vessel-track",
              paint: {
                "circle-radius": [
                  "case",
                  ["get", "is_start"],
                  9,
                  ["get", "is_end"],
                  7,
                  5,
                ],
                "circle-color": [
                  "case",
                  ["get", "is_start"],
                  "#8b5cf6", // Purple for oldest position
                  ["get", "is_end"],
                  "#f59e0b", // Orange for most recent position
                  "#06b6d4", // Cyan for intermediate positions
                ],
                "circle-opacity": 0.9,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
              },
            });

            // Fit map to show all track positions
            const bounds = new mapboxgl.LngLatBounds();
            coordinates.forEach((coord: [number, number]) =>
              bounds.extend(coord)
            );
            mapRef.current.fitBounds(bounds, { padding: 50 });

            // Add popup for track markers
            mapRef.current.on("click", "vessel-track-markers", (e) => {
              const features = e.features;
              if (features && features.length > 0) {
                const feature = features[0];
                const props = feature.properties;

                new mapboxgl.Popup()
                  .setLngLat(e.lngLat)
                  .setHTML(
                    `
                  <div style="padding: 12px; background: rgba(0, 0, 0, 0.85); border-radius: 8px; color: white; font-family: system-ui;">
                    <strong style="color: #f59e0b;">${vesselName}</strong><br/>
                    <small><strong>Time:</strong> ${new Date(
                      props?.timestamp
                    ).toLocaleString()}</small><br/>
                    <small><strong>Speed:</strong> ${props?.speed || 'N/A'} kts</small><br/>
                    <small><strong>Course:</strong> ${props?.course || 'N/A'}°</small><br/>
                    <small><strong>Destination:</strong> ${props?.destination || 'N/A'}</small><br/>
                    <small style="color: ${
                      props?.is_start
                        ? "#8b5cf6"
                        : props?.is_end
                        ? "#f59e0b"
                        : "#06b6d4"
                    };">${
                      props?.is_start
                        ? "🟣 Historical Start"
                        : props?.is_end
                        ? "🟠 Latest Tracked"
                        : "🔵 Track Point"
                    }</small>
                  </div>
                `
                  )
                  .addTo(mapRef.current!);
              }
            });

            addNotification({
              type: "success",
              title: "Vessel Track Loaded",
              message: `${vesselName} - ${historyData.positions.length} positions from Datalastic API`,
              duration: 4000,
            });
          } else {
            addNotification({
              type: "info",
              title: "No Tracking History",
              message: `No tracking history found for ${vesselName}`,
              duration: 3000,
            });
            setTrackingVessel(null);
          }
        } else {
          addNotification({
            type: "error",
            title: "Failed to Load Vessel Track",
            message: `Could not fetch tracking history for ${vesselName}`,
            duration: 4000,
          });
          setTrackingVessel(null);
        }
      } catch (error) {
        console.error("Error fetching vessel track:", error);
        addNotification({
          type: "error",
          title: "Error Loading Vessel Track",
          message: `Error loading vessel track for ${vesselName}`,
          duration: 4000,
        });
        setTrackingVessel(null);
      }
    },
    [API_BASE_URL, addNotification]
  );

  const clearVesselTrack = useCallback(() => {
    if (mapRef.current) {
      // Clear previous positions
      if (mapRef.current.getSource("previous-positions")) {
        mapRef.current.removeLayer("previous-positions-markers");
        mapRef.current.removeSource("previous-positions");
      }
      // Clear vessel track
      if (mapRef.current.getSource("vessel-track")) {
        mapRef.current.removeLayer("vessel-track-markers");
        mapRef.current.removeSource("vessel-track");
      }
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
        onShowPreviousPositions={handleShowPreviousPositions}
        onTrackVessel={handleTrackVessel}
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
        onShowPreviousPositions={handleShowPreviousPositions}
        onTrackVessel={handleTrackVessel}
      />

      {/* Notification System */}
      <NotificationContainer
        notifications={notifications}
        onRemoveNotification={removeNotification}
      />
    </div>
  );
}
