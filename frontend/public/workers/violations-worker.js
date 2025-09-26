// Web Worker for processing vessel violations
// This prevents UI blocking during heavy geospatial calculations

// Import Turf.js for geospatial operations (using CDN in worker)
importScripts('https://unpkg.com/@turf/turf@7.2.0/turf.min.js');

// Violation severity levels
const ViolationSeverity = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical"
};

// Violation types
const ViolationType = {
  ANCHORED_ON_POSIDONIA: "anchored_on_posidonia",
  IN_BUFFER_ZONE: "in_buffer_zone",
  IN_RESTRICTED_AREA: "in_restricted_area",
  EXCESSIVE_SPEED: "excessive_speed",
  TOO_CLOSE_TO_SHORE: "too_close_to_shore",
  IN_NO_ANCHOR_ZONE: "in_no_anchor_zone",
  NEAR_PROTECTED_SPECIES: "near_protected_species"
};

// Default configuration
const DEFAULT_CONFIG = {
  bufferZoneDistance: 100,
  shoreProximityWarning: 100,
  speedLimitInPark: 5,
  anchoringSpeedThreshold: 0.5,
  posidoniaProximityWarning: 50
};

class ViolationsWorker {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  detectViolations(vessel, parkBoundaries, bufferedBoundaries, posidoniaData, shoreline) {
    const violations = [];
    const vesselPoint = turf.point([vessel.longitude, vessel.latitude]);

    // Perform spatial analysis
    const spatialAnalysis = this.performSpatialAnalysis(
      vesselPoint,
      vessel.vessel.speed || 0,
      parkBoundaries,
      bufferedBoundaries,
      posidoniaData
    );

    // Check posidonia violations
    const posidoniaViolations = this.checkPosidoniaViolations(
      vesselPoint,
      vessel.vessel.speed || 0,
      posidoniaData
    );
    violations.push(...posidoniaViolations);

    // Check speed violations
    const speedViolation = this.checkSpeedViolation(vessel.vessel.speed || 0, true);
    if (speedViolation) violations.push(speedViolation);

    // Check buffer zone violations
    const bufferViolation = this.checkBufferZoneViolation(vesselPoint, bufferedBoundaries);
    if (bufferViolation) violations.push(bufferViolation);

    // Check shore proximity if shoreline data available
    if (shoreline) {
      const shoreViolation = this.checkShoreProximity(vesselPoint, shoreline);
      if (shoreViolation) violations.push(shoreViolation);
    }

    // Determine max severity
    const maxSeverity = this.getMaxSeverity(violations);

    // Get primary violation
    const primaryViolation = violations.length > 0
      ? violations.reduce((prev, curr) =>
          this.getSeverityLevel(curr.severity) > this.getSeverityLevel(prev.severity)
            ? curr : prev)
      : undefined;

    return {
      vessel,
      violations,
      maxSeverity,
      isWhitelisted: vessel.is_whitelisted || false,
      primaryViolation,
      // Include spatial analysis results for consistent display
      spatialAnalysis
    };
  }

  performSpatialAnalysis(vesselPoint, speed, parkBoundaries, bufferedBoundaries, posidoniaData) {
    const result = {
      isOverPosidonia: false,
      posidoniaFeature: null,
      distanceToNearestPosidonia: Infinity,
      isInBufferZone: false,
      isInPark: false,
      isNearPosidonia: false
    };

    try {
      // Check if vessel is in park boundaries
      if (parkBoundaries && parkBoundaries.features) {
        for (const feature of parkBoundaries.features) {
          if (feature.geometry &&
              (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon")) {
            try {
              const turfFeature = turf.feature(feature.geometry);
              if (turf.booleanPointInPolygon(vesselPoint, turfFeature)) {
                result.isInPark = true;
                break;
              }
            } catch (error) {
              console.debug("Park boundary check failed:", error);
            }
          }
        }
      }

      // Check if vessel is in buffer zone
      if (bufferedBoundaries && bufferedBoundaries.features) {
        console.log(`Checking buffer zone for vessel at [${vesselPoint.geometry.coordinates}], isInPark: ${result.isInPark}`);
        for (const feature of bufferedBoundaries.features) {
          if (feature.geometry &&
              (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon")) {
            try {
              const turfFeature = turf.feature(feature.geometry);
              const isInBuffer = turf.booleanPointInPolygon(vesselPoint, turfFeature);
              console.log(`Buffer zone check result: ${isInBuffer}`);

              if (isInBuffer) {
                result.isInBufferZone = true;
                console.log("Vessel detected in buffer zone!");
                break;
              }
            } catch (error) {
              console.debug("Buffer boundary check failed:", error);
            }
          }
        }
      } else {
        console.log(`Buffer check skipped - bufferedBoundaries: ${!!bufferedBoundaries}, features: ${bufferedBoundaries?.features?.length || 0}`);
      }

      // Check posidonia violations (only if data is available)
      if (posidoniaData && posidoniaData.features) {
        for (const feature of posidoniaData.features) {
          if (feature.geometry.type === "Polygon") {
            const polygon = turf.polygon(feature.geometry.coordinates);

            // Check if point is inside polygon
            if (turf.booleanPointInPolygon(vesselPoint, polygon)) {
              // Only consider it a violation if vessel is anchored (low speed)
              if (speed <= this.config.anchoringSpeedThreshold) {
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
              console.debug("Distance calculation failed:", distanceError);
            }
          }
        }
      }

      // Set isNearPosidonia flag
      result.isNearPosidonia = result.distanceToNearestPosidonia < 100;

    } catch (error) {
      console.warn("Error in spatial analysis:", error);
    }

    return result;
  }

  checkBufferZoneViolation(vesselPoint, bufferedBoundaries) {
    if (!bufferedBoundaries || !bufferedBoundaries.features) {
      console.log("No buffered boundaries provided to worker for violation check");
      return null;
    }

    console.log(`Checking buffer zone VIOLATION for vessel at [${vesselPoint.geometry.coordinates}], buffer features: ${bufferedBoundaries.features.length}`);

    for (const feature of bufferedBoundaries.features) {
      if (feature.geometry &&
          (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon")) {
        try {
          const turfFeature = turf.feature(feature.geometry);
          const isInBuffer = turf.booleanPointInPolygon(vesselPoint, turfFeature);

          console.log(`Vessel buffer VIOLATION check result: ${isInBuffer}`);

          if (isInBuffer) {
            console.log("🚨 Buffer zone VIOLATION detected!");
            return {
              type: ViolationType.IN_BUFFER_ZONE,
              severity: ViolationSeverity.MEDIUM,
              title: "Too Close to Shore",
              description: `Vessel is within ${this.config.bufferZoneDistance}m buffer zone - too close to protected shoreline`,
              icon: "shore-warning",
              color: "#f59e0b",
              distance: this.config.bufferZoneDistance,
              timestamp: new Date()
            };
          }
        } catch (error) {
          console.error("Buffer zone violation check failed:", error);
        }
      }
    }
    console.log("No buffer zone violation detected for this vessel");
    return null;
  }

  checkPosidoniaViolations(vesselPoint, speed, posidoniaData) {
    const violations = [];
    if (!posidoniaData || !posidoniaData.features) return violations;

    for (const feature of posidoniaData.features) {
      if (feature.geometry.type === "Polygon") {
        try {
          const polygon = turf.polygon(feature.geometry.coordinates);

          if (turf.booleanPointInPolygon(vesselPoint, polygon)) {
            if (speed <= this.config.anchoringSpeedThreshold) {
              violations.push({
                type: ViolationType.ANCHORED_ON_POSIDONIA,
                severity: ViolationSeverity.CRITICAL,
                title: "Anchoring on Posidonia",
                description: "Vessel is anchored on protected seagrass beds",
                icon: "anchor-ban",
                color: "#dc2626",
                actualSpeed: speed,
                timestamp: new Date()
              });
            }
            break;
          }
        } catch (error) {
          console.debug("Posidonia check failed:", error);
          continue;
        }
      }
    }
    return violations;
  }

  checkSpeedViolation(speed, isInPark) {
    if (speed <= this.config.speedLimitInPark) return null;

    return {
      type: ViolationType.EXCESSIVE_SPEED,
      severity: ViolationSeverity.MEDIUM,
      title: "Speed Violation",
      description: `Exceeding ${this.config.speedLimitInPark} knot speed limit in park`,
      icon: "speed",
      color: "#f59e0b",
      speedLimit: this.config.speedLimitInPark,
      actualSpeed: speed,
      timestamp: new Date()
    };
  }

  checkShoreProximity(vesselPoint, shoreline) {
    let minDistance = Infinity;

    for (const feature of shoreline.features) {
      if (feature.geometry.type === "LineString" || feature.geometry.type === "MultiLineString") {
        const distance = turf.pointToLineDistance(
          vesselPoint,
          feature,
          { units: "meters" }
        );
        minDistance = Math.min(minDistance, distance);
      }
    }

    if (minDistance < this.config.shoreProximityWarning) {
      return {
        type: ViolationType.TOO_CLOSE_TO_SHORE,
        severity: ViolationSeverity.HIGH,
        title: "Too Close to Shore",
        description: `Vessel is only ${Math.round(minDistance)}m from shore`,
        icon: "shore-warning",
        color: "#ef4444",
        distance: Math.round(minDistance),
        timestamp: new Date()
      };
    }
    return null;
  }

  getMaxSeverity(violations) {
    if (violations.length === 0) return ViolationSeverity.LOW;

    const severityLevels = violations.map(v => this.getSeverityLevel(v.severity));
    const maxLevel = Math.max(...severityLevels);

    return this.getSeverityFromLevel(maxLevel);
  }

  getSeverityLevel(severity) {
    switch (severity) {
      case ViolationSeverity.LOW: return 1;
      case ViolationSeverity.MEDIUM: return 2;
      case ViolationSeverity.HIGH: return 3;
      case ViolationSeverity.CRITICAL: return 4;
      default: return 0;
    }
  }

  getSeverityFromLevel(level) {
    switch (level) {
      case 1: return ViolationSeverity.LOW;
      case 2: return ViolationSeverity.MEDIUM;
      case 3: return ViolationSeverity.HIGH;
      case 4: return ViolationSeverity.CRITICAL;
      default: return ViolationSeverity.LOW;
    }
  }

  getVesselColor(violations) {
    if (violations.violations.length === 0) return "#86efac";

    switch (violations.maxSeverity) {
      case ViolationSeverity.CRITICAL: return "#dc2626";
      case ViolationSeverity.HIGH: return "#ef4444";
      case ViolationSeverity.MEDIUM: return "#f59e0b";
      case ViolationSeverity.LOW: return "#10b981";
      default: return "#86efac";
    }
  }
}

// Worker instance
console.log('Initializing violations worker...');
console.log('Turf.js available:', typeof turf !== 'undefined');

let violationsWorker;
try {
  violationsWorker = new ViolationsWorker();
  console.log('Violations worker initialized successfully');
} catch (error) {
  console.error('Failed to initialize violations worker:', error);
  throw error;
}

// Handle messages from main thread
self.onmessage = async function(e) {
  console.log('Worker received message:', e.data?.type);

  try {
    const { type, data } = e.data;

    switch (type) {
      case 'PROCESS_VIOLATIONS':
        console.log('Processing violations case reached');
        const { vessels, parkBoundaries, bufferedBoundaries, posidoniaData, shoreline } = data;

        console.log('Worker received data:', {
          vesselsCount: vessels?.length || 0,
          parkBoundariesFeatures: parkBoundaries?.features?.length || 0,
          bufferedBoundariesFeatures: bufferedBoundaries?.features?.length || 0,
          posidoniaDataFeatures: posidoniaData?.features?.length || 0,
          shorelineFeatures: shoreline?.features?.length || 0
        });

        // Process vessels in batches to prevent blocking
        const batchSize = 25; // Smaller batches for smoother progress updates
        const results = [];
        let processedCount = 0;

        // Send initial progress
        self.postMessage({
          type: 'PROGRESS',
          data: {
            processed: 0,
            total: vessels.length,
            percentage: 0
          }
        });

        for (let i = 0; i < vessels.length; i += batchSize) {
          const batch = vessels.slice(i, i + batchSize);

          const batchResults = batch.map(vessel => {
            const violationResult = violationsWorker.detectViolations(
              vessel,
              parkBoundaries,
              bufferedBoundaries,
              posidoniaData,
              shoreline
            );

            processedCount++;

            // Merge spatial analysis results into vessel properties for map display
            const vesselWithAnalysis = {
              ...vessel,
              // Add spatial analysis results to vessel properties for map
              isInPark: violationResult.spatialAnalysis.isInPark,
              isInBufferZone: violationResult.spatialAnalysis.isInBufferZone,
              isAnchoredOnPosidonia: violationResult.spatialAnalysis.isOverPosidonia,
              distanceToNearestPosidonia: violationResult.spatialAnalysis.distanceToNearestPosidonia,
              isNearPosidonia: violationResult.spatialAnalysis.isNearPosidonia,
              // Add violations data
              violations: violationResult.violations,
              violationSeverity: violationResult.maxSeverity,
              violationColor: violationsWorker.getVesselColor(violationResult)
            };

            return {
              ...violationResult,
              vessel: vesselWithAnalysis,
              violationColor: violationsWorker.getVesselColor(violationResult)
            };
          });

          results.push(...batchResults);

          // Post progress update after each batch
          const percentage = Math.round((processedCount / vessels.length) * 100);
          self.postMessage({
            type: 'PROGRESS',
            data: {
              processed: processedCount,
              total: vessels.length,
              percentage: Math.min(percentage, 100) // Ensure we never exceed 100%
            }
          });

          // Small yield to prevent blocking the worker thread completely
          if (i + batchSize < vessels.length) {
            await new Promise(resolve => setTimeout(resolve, 1));
          }
        }

        // Send final results
        self.postMessage({
          type: 'VIOLATIONS_PROCESSED',
          data: results
        });
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      data: {
        message: error.message,
        stack: error.stack
      }
    });
  }
};