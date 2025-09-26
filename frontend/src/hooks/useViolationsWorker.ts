import { useCallback, useEffect, useRef, useState } from 'react';
import { VesselData } from '@/types/vessel';
import { VesselViolations } from '@/lib/violations-engine';

interface WorkerProgress {
  processed: number;
  total: number;
  percentage: number;
}

interface WorkerError {
  message: string;
  stack?: string;
}

interface UseViolationsWorkerReturn {
  processViolations: (
    vessels: VesselData[],
    parkBoundaries: GeoJSON.FeatureCollection | null,
    bufferedBoundaries: GeoJSON.FeatureCollection | null,
    posidoniaData: GeoJSON.FeatureCollection | null,
    shoreline?: GeoJSON.FeatureCollection | null
  ) => void;
  violations: VesselViolations[];
  isProcessing: boolean;
  progress: WorkerProgress | null;
  error: WorkerError | null;
  clearError: () => void;
}

export function useViolationsWorker(): UseViolationsWorkerReturn {
  const workerRef = useRef<Worker | null>(null);
  const [violations, setViolations] = useState<VesselViolations[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<WorkerProgress | null>(null);
  const [error, setError] = useState<WorkerError | null>(null);

  // Initialize worker
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Always use blob worker for better reliability
      // This prevents issues with static file serving in different environments
      const createBlobWorker = () => {
        // Create worker from blob URL (more reliable than static files)
          const workerCode = `
            // Web Worker for processing vessel violations
            importScripts('https://unpkg.com/@turf/turf@7.2.0/turf.min.js');

            const ViolationSeverity = {
              LOW: "low", MEDIUM: "medium", HIGH: "high", CRITICAL: "critical"
            };

            const ViolationType = {
              ANCHORED_ON_POSIDONIA: "anchored_on_posidonia",
              IN_BUFFER_ZONE: "in_buffer_zone",
              EXCESSIVE_SPEED: "excessive_speed",
              TOO_CLOSE_TO_SHORE: "too_close_to_shore"
            };

            const DEFAULT_CONFIG = {
              bufferZoneDistance: 100, shoreProximityWarning: 100,
              speedLimitInPark: 5, anchoringSpeedThreshold: 0.5
            };

            class ViolationsWorker {
              constructor(config = {}) { this.config = { ...DEFAULT_CONFIG, ...config }; }

              detectViolations(vessel, parkBoundaries, bufferedBoundaries, posidoniaData, shoreline) {
                const violations = [];
                const vesselPoint = turf.point([vessel.longitude, vessel.latitude]);

                // Check posidonia violations
                if (posidoniaData?.features) {
                  for (const feature of posidoniaData.features) {
                    if (feature.geometry.type === "Polygon") {
                      const polygon = turf.polygon(feature.geometry.coordinates);
                      if (turf.booleanPointInPolygon(vesselPoint, polygon)) {
                        if ((vessel.vessel?.speed || 0) <= this.config.anchoringSpeedThreshold) {
                          violations.push({
                            type: ViolationType.ANCHORED_ON_POSIDONIA,
                            severity: ViolationSeverity.CRITICAL,
                            title: "Anchoring on Posidonia",
                            description: "Vessel is anchored on protected seagrass beds",
                            timestamp: new Date()
                          });
                        }
                        break;
                      }
                    }
                  }
                }

                // Check speed violations
                const speed = vessel.vessel?.speed || 0;
                if (speed > this.config.speedLimitInPark) {
                  violations.push({
                    type: ViolationType.EXCESSIVE_SPEED,
                    severity: ViolationSeverity.MEDIUM,
                    title: "Speed Violation",
                    description: \`Exceeding \${this.config.speedLimitInPark} knot speed limit\`,
                    actualSpeed: speed,
                    timestamp: new Date()
                  });
                }

                // Check buffer zone violations
                if (bufferedBoundaries?.features) {
                  for (const feature of bufferedBoundaries.features) {
                    if (feature.geometry && (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon")) {
                      try {
                        const turfFeature = turf.feature(feature.geometry);
                        if (turf.booleanPointInPolygon(vesselPoint, turfFeature)) {
                          violations.push({
                            type: ViolationType.IN_BUFFER_ZONE,
                            severity: ViolationSeverity.MEDIUM,
                            title: "Too Close to Shore",
                            description: \`Vessel is within \${this.config.bufferZoneDistance}m buffer zone\`,
                            timestamp: new Date()
                          });
                          break;
                        }
                      } catch (error) { continue; }
                    }
                  }
                }

                const maxSeverity = violations.length === 0 ? ViolationSeverity.LOW :
                  violations.reduce((max, v) => this.getSeverityLevel(v.severity) > this.getSeverityLevel(max) ? v.severity : max, ViolationSeverity.LOW);

                const primaryViolation = violations.length > 0 ?
                  violations.reduce((prev, curr) => this.getSeverityLevel(curr.severity) > this.getSeverityLevel(prev.severity) ? curr : prev) : undefined;

                return {
                  vessel, violations, maxSeverity, isWhitelisted: vessel.is_whitelisted || false, primaryViolation
                };
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

            const violationsWorker = new ViolationsWorker();

            self.onmessage = function(e) {
              try {
                const { type, data } = e.data;

                if (type === 'PROCESS_VIOLATIONS') {
                  const { vessels, parkBoundaries, bufferedBoundaries, posidoniaData, shoreline } = data;
                  const batchSize = 25;
                  const results = [];
                  let processedCount = 0;

                  self.postMessage({ type: 'PROGRESS', data: { processed: 0, total: vessels.length, percentage: 0 } });

                  for (let i = 0; i < vessels.length; i += batchSize) {
                    const batch = vessels.slice(i, i + batchSize);

                    const batchResults = batch.map(vessel => {
                      const violationResult = violationsWorker.detectViolations(vessel, parkBoundaries, bufferedBoundaries, posidoniaData, shoreline);
                      processedCount++;

                      const vesselWithAnalysis = {
                        ...vessel,
                        violations: violationResult.violations,
                        violationSeverity: violationResult.maxSeverity,
                        violationColor: violationsWorker.getVesselColor(violationResult)
                      };

                      return { ...violationResult, vessel: vesselWithAnalysis, violationColor: violationsWorker.getVesselColor(violationResult) };
                    });

                    results.push(...batchResults);

                    const percentage = Math.round((processedCount / vessels.length) * 100);
                    self.postMessage({ type: 'PROGRESS', data: { processed: processedCount, total: vessels.length, percentage: Math.min(percentage, 100) } });
                  }

                  self.postMessage({ type: 'VIOLATIONS_PROCESSED', data: results });
                }
              } catch (error) {
                self.postMessage({ type: 'ERROR', data: { message: error.message, stack: error.stack } });
              }
            };
          `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        return new Worker(workerUrl);
      };

      try {
        workerRef.current = createBlobWorker();

        workerRef.current.onmessage = (e) => {
          const { type, data } = e.data;

          switch (type) {
            case 'PROGRESS':
              setProgress(data);
              break;

            case 'VIOLATIONS_PROCESSED':
              setViolations(data);
              // Show completion briefly before hiding
              if (progress) {
                setProgress({
                  processed: progress.total,
                  total: progress.total,
                  percentage: 100
                });
              }
              setTimeout(() => {
                setIsProcessing(false);
                setProgress(null);
              }, 800);
              break;

            case 'ERROR':
              setError(data);
              setIsProcessing(false);
              setProgress(null);
              console.error('Worker error:', data);
              break;

            default:
              // Unknown worker message type
          }
        };

        workerRef.current.onerror = (error) => {
          setError({
            message: 'Worker error: ' + error.message,
            stack: error.filename + ':' + error.lineno
          });
          setIsProcessing(false);
          setProgress(null);
        };

      } catch (err) {
        console.error('Failed to create worker:', err);
        setError({
          message: 'Failed to initialize background processor: ' + (err as Error).message
        });
      }
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const processViolations = useCallback((
    vessels: VesselData[],
    parkBoundaries: GeoJSON.FeatureCollection | null,
    bufferedBoundaries: GeoJSON.FeatureCollection | null,
    posidoniaData: GeoJSON.FeatureCollection | null,
    shoreline?: GeoJSON.FeatureCollection | null
  ) => {
    if (!workerRef.current) {
      setError({
        message: 'Worker not available. Background processing disabled.'
      });
      return;
    }

    if (!vessels || vessels.length === 0) {
      setViolations([]);
      setIsProcessing(false);
      setProgress(null);
      return;
    }

    setIsProcessing(true);
    setProgress({ processed: 0, total: vessels.length, percentage: 0 });
    setError(null);

    // Small delay to ensure UI updates before processing starts
    setTimeout(() => {
      if (workerRef.current) {
        workerRef.current.postMessage({
          type: 'PROCESS_VIOLATIONS',
          data: {
            vessels,
            parkBoundaries,
            bufferedBoundaries,
            posidoniaData,
            shoreline
          }
        });
      } else {
        console.error('Worker not available when trying to process');
        setIsProcessing(false);
        setProgress(null);
      }
    }, 100);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    processViolations,
    violations,
    isProcessing,
    progress,
    error,
    clearError
  };
}