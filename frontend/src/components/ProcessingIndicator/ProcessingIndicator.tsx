"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MdRadar, MdClose } from "react-icons/md";

interface ProcessingIndicatorProps {
  isProcessing: boolean;
  progress?: {
    processed: number;
    total: number;
    percentage: number;
  } | null;
  error?: {
    message: string;
    stack?: string;
  } | null;
  onClearError?: () => void;
}

export default function ProcessingIndicator({
  isProcessing,
  progress,
  error,
  onClearError
}: ProcessingIndicatorProps) {
  if (!isProcessing && !error) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed bottom-24 right-4 z-50"
      >
        <div className="glass-ocean rounded-xl px-4 py-3 shadow-xl min-w-[220px] max-w-[300px] border border-white/10">
          {error ? (
            // Error state
            <div className="flex items-center gap-2">
              <div className="text-red-400 text-sm">⚠</div>
              <div className="flex-1 min-w-0">
                <p className="text-red-300 text-xs font-medium truncate">
                  Processing Error
                </p>
                <p className="text-red-200/80 text-xs truncate" title={error.message}>
                  {error.message}
                </p>
              </div>
              {onClearError && (
                <button
                  onClick={onClearError}
                  className="text-red-200/60 hover:text-white transition-colors"
                  aria-label="Dismiss error"
                >
                  <MdClose className="text-sm" />
                </button>
              )}
            </div>
          ) : (
            // Processing state
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="text-blue-300 flex-shrink-0"
              >
                <MdRadar className="text-base" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="mb-1.5">
                  <p className="text-white/90 text-xs font-medium">
                    Analyzing Vessels
                  </p>
                </div>
                {progress && (
                  <div className="relative">
                    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full relative"
                        style={{
                          background: `linear-gradient(90deg,
                            ${progress.percentage < 33 ? '#3b82f6' :
                              progress.percentage < 66 ? '#10b981' : '#22c55e'} 0%,
                            ${progress.percentage < 33 ? '#60a5fa' :
                              progress.percentage < 66 ? '#34d399' : '#86efac'} 100%)`
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress.percentage}%` }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                      >
                        {progress.percentage > 5 && (
                          <motion.div
                            className="absolute right-0 top-0 h-full w-3 bg-white/20 rounded-full"
                            animate={{ opacity: [0.3, 0.8, 0.3] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        )}
                      </motion.div>
                    </div>
                    <div className="flex justify-between items-center mt-1.5">
                      <p className="text-white/60 text-[10px]">
                        {progress.processed}/{progress.total} vessels
                      </p>
                      <p className="text-white/70 text-[10px] font-mono">
                        {progress.percentage === 100 ? 'Complete' : `${Math.round((progress.processed / progress.total) * 1000) / 10}%`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}