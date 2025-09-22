"use client";

import { motion } from "framer-motion";
import {
  MdWarning,
  MdRefresh,
  MdDelete,
  MdDirectionsBoat,
} from "react-icons/md";

interface HeaderProps {
  vesselCount: number;
  vesselsInBuffer: number;
  onRefresh: () => void;
  onClearTrack?: () => void;
  trackingVessel?: { uuid: string; name: string } | null;
  onGenerateBufferViolations?: () => void;
}

export default function Header({
  vesselCount,
  onRefresh,
  onClearTrack,
  trackingVessel,
  onGenerateBufferViolations,
}: HeaderProps) {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0, rotateX: -10 }}
      animate={{ y: 0, opacity: 1, rotateX: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative z-10 glass-coral hover-3d perspective"
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Top bar with title and stats */}
        <div className="flex justify-between items-center px-6 py-4">
          <h1 className="text-xl font-serif font-bold text-white text-shadow">
            Blue Forest Sentinel
          </h1>

          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05, rotateY: 2 }}
              className="glass-light px-3 py-1 rounded-lg text-sm text-white backdrop-blur-md hover-3d floating"
            >
              <MdDirectionsBoat className="inline mr-1" />
              <span className="font-medium mr-1 text-shadow-sm">Vessels: </span>
              <span className="font-semibold text-shadow-3d">
                {vesselCount}
              </span>
            </motion.div>
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

                <button
                  onClick={onGenerateBufferViolations}
                  className="px-3 py-1.5 glass-seagrass rounded-md text-white text-xs font-medium hover-3d hover:gradient-coral text-shadow-3d hover:cursor-pointer"
                >
                  <MdWarning className="inline mr-1" /> View All Violations
                </button>
              </div>

              <div className="h-4 w-px bg-white/30 mx-2"></div>

              {/* Tracking Section */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white/70 uppercase tracking-wider text-shadow-sm">
                  Tracking:
                </span>

                {trackingVessel && onClearTrack && (
                  <button
                    onClick={onClearTrack}
                    className="px-3 py-1.5 glass rounded-md text-white text-xs font-medium hover-3d hover:bg-white/30 text-shadow-3d hover:cursor-pointer"
                  >
                    <MdDelete className="inline mr-1" /> Clear (
                    {trackingVessel.name})
                  </button>
                )}
              </div>

              <div className="h-4 w-px bg-white/30 mx-2"></div>

              {/* System Section */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white/70 uppercase tracking-wider text-shadow-sm">
                  System:
                </span>

                <button
                  onClick={onRefresh}
                  className="px-3 py-1.5 glass-ocean rounded-md text-white text-xs font-medium hover-3d hover:gradient-ocean-light text-shadow-3d hover:cursor-pointer"
                >
                  <MdRefresh className="inline mr-1" /> Refresh
                </button>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </motion.header>
  );
}
