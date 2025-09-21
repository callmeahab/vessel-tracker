"use client";

import { motion } from "framer-motion";

interface HeaderProps {
  vesselCount: number;
  vesselsInPark: number;
  vesselsInBuffer: number;
  onRefresh: () => void;
  onClearTrack?: () => void;
  trackingVessel?: { uuid: string; name: string } | null;
  onGenerateBufferViolations?: () => void;
}

export default function Header({
  vesselCount,
  vesselsInPark,
  onRefresh,
  onClearTrack,
  trackingVessel,
  onGenerateBufferViolations,
}: HeaderProps) {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="relative z-10 glass shadow-xl"
    >
      <div className="max-w-7xl mx-auto">
        {/* Top bar with title and stats */}
        <div className="flex justify-between items-center px-6 py-4">
          <h1 className="text-xl font-serif font-bold text-white text-shadow">
            Blue Forest Sentinel
          </h1>

          <div className="flex items-center gap-3">
            <div className="glass-light px-3 py-1 rounded-lg text-sm text-white backdrop-blur-md">
              <span className="font-medium mr-1 text-shadow-sm">Vessels: </span>
              <span className="font-semibold text-shadow-sm">
                {vesselCount}
              </span>
            </div>
            <div className="glass-seagrass px-3 py-1 rounded-lg text-sm text-white backdrop-blur-md">
              <span className="font-medium mr-1 text-shadow-sm">In Park: </span>
              <span className="font-semibold text-shadow-sm">
                {vesselsInPark}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation menu */}
        <nav className="">
          <div className="px-6 py-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Violations Section */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white/70 uppercase tracking-wider text-shadow-sm">
                  Monitoring:
                </span>

                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ delay: 0.2 }}
                  onClick={onGenerateBufferViolations}
                  className="px-3 py-1.5 glass-coral rounded-md text-white text-xs font-medium transition-all duration-200 hover:gradient-coral text-shadow-sm"
                >
                  ⚠️ View All Violations
                </motion.button>
              </div>

              <div className="h-4 w-px bg-white/30 mx-2"></div>

              {/* Tracking Section */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white/70 uppercase tracking-wider text-shadow-sm">
                  Tracking:
                </span>

                {trackingVessel && onClearTrack && (
                  <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ delay: 0.4 }}
                    onClick={onClearTrack}
                    className="px-3 py-1.5 glass rounded-md text-white text-xs font-medium transition-all duration-200 hover:bg-white/30 text-shadow-sm"
                  >
                    🗑️ Clear ({trackingVessel.name})
                  </motion.button>
                )}
              </div>

              <div className="h-4 w-px bg-white/30 mx-2"></div>

              {/* System Section */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white/70 uppercase tracking-wider text-shadow-sm">
                  System:
                </span>

                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ delay: 0.5 }}
                  onClick={onRefresh}
                  className="px-3 py-1.5 glass-ocean rounded-md text-white text-xs font-medium transition-all duration-200 hover:gradient-ocean-light text-shadow-sm"
                >
                  🔄 Refresh
                </motion.button>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </motion.header>
  );
}
