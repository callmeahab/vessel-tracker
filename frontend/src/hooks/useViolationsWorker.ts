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
      try {
        workerRef.current = new Worker('/workers/violations-worker.js');

        workerRef.current.onmessage = (e) => {
          const { type, data } = e.data;

          switch (type) {
            case 'PROGRESS':
              setProgress(data);
              break;

            case 'VIOLATIONS_PROCESSED':
              console.log('Violations processed:', data.length, 'results');
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
                console.log('Hiding processing indicator');
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
              console.warn('Unknown worker message type:', type);
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
      console.log('No vessels to process, clearing state');
      setViolations([]);
      setIsProcessing(false);
      setProgress(null);
      return;
    }

    console.log('Starting violation processing for', vessels.length, 'vessels');
    setIsProcessing(true);
    setProgress({ processed: 0, total: vessels.length, percentage: 0 });
    setError(null);

    // Small delay to ensure UI updates before processing starts
    setTimeout(() => {
      if (workerRef.current) {
        console.log('Sending PROCESS_VIOLATIONS message to worker');
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