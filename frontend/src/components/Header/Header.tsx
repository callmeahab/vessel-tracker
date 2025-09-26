"use client";

import { motion } from "framer-motion";
import { MdWarning, MdDirectionsBoat, MdFilterList } from "react-icons/md";

export type ViolationFilter =
  | "all"
  | "violations-only"
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "no-violations";

interface HeaderProps {
  vesselCount: number;
  vesselsInBuffer: number;
  onClearTrack?: () => void;
  trackingVessel?: { uuid: string; name: string } | null;
  onGenerateBufferViolations?: () => void;
  violationFilter: ViolationFilter;
  onViolationFilterChange: (filter: ViolationFilter) => void;
}

export default function Header({
  vesselCount,
  onClearTrack,
  trackingVessel,
  onGenerateBufferViolations,
  violationFilter,
  onViolationFilterChange,
}: HeaderProps) {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0, rotateX: -10 }}
      animate={{ y: 0, opacity: 1, rotateX: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative z-1 glass-coral hover-3d perspective"
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Top bar with title and stats - always on same line */}
        <div className="flex flex-row justify-between items-center px-4 sm:px-6 py-3 sm:py-4">
          <h1 className="text-base sm:text-xl font-sans font-bold text-white text-shadow">
            Blue Forest Sentinel
          </h1>

          <div className="flex items-center gap-2 sm:gap-3">
            <motion.div
              whileHover={{ scale: 1.05, rotateY: 2 }}
              className="glass-light flex px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm text-white backdrop-blur-md"
            >
              <MdDirectionsBoat className="inline mr-1 my-auto" />
              <span className="font-medium mr-2 my-auto text-shadow-sm hidden sm:inline">
                Vessels:{" "}
              </span>
              <span className="font-semibold my-auto text-shadow-3d">
                {vesselCount}
              </span>
            </motion.div>
          </div>
        </div>

        {/* Navigation menu */}
        <nav className="">
          <div className="px-4 sm:px-6 py-2 sm:py-3">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 lg:gap-2">
              {/* Filter Section */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full lg:w-auto">
                <span className="text-xs font-medium text-white/70 uppercase tracking-wider text-shadow-sm whitespace-nowrap">
                  <MdFilterList className="inline mr-1" />
                  Filter:
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { value: "all", label: "All", color: "glass" },
                    {
                      value: "violations-only",
                      label: "Violations",
                      color: "glass-coral",
                    },
                    {
                      value: "critical",
                      label: "Critical",
                      color: "glass-red",
                    },
                    { value: "high", label: "High", color: "glass-orange" },
                    { value: "medium", label: "Medium", color: "glass-yellow" },
                    { value: "low", label: "Low", color: "glass-green" },
                    {
                      value: "no-violations",
                      label: "None",
                      color: "glass-emerald",
                    },
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() =>
                        onViolationFilterChange(filter.value as ViolationFilter)
                      }
                      className={`px-2 py-1 ${filter.color} ${
                        violationFilter === filter.value
                          ? "ring-1 ring-white/50"
                          : ""
                      } rounded-md text-white text-xs font-medium hover-3d text-shadow-3d hover:cursor-pointer transition-all`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="hidden lg:block h-4 w-px bg-white/30 mx-2"></div>

              {/* Violations Section */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white/70 uppercase tracking-wider text-shadow-sm">
                  Monitoring:
                </span>

                <button
                  onClick={onGenerateBufferViolations}
                  className="px-2 sm:px-3 py-1.5 glass-seagrass rounded-md text-white text-xs font-medium hover-3d hover:gradient-coral text-shadow-3d hover:cursor-pointer"
                >
                  <MdWarning className="inline mr-1" />
                  <span className="hidden sm:inline">View All </span>Violations
                </button>
              </div>

              <div className="hidden lg:block h-4 w-px bg-white/30 mx-2"></div>

              {/* Tracking Section */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white/70 uppercase tracking-wider text-shadow-sm">
                  Tracking:
                </span>

                {trackingVessel && onClearTrack ? (
                  <button
                    onClick={onClearTrack}
                    className="flex gap-0.5 px-2 sm:px-3 py-1.5 glass rounded-md text-white text-xs font-medium hover-3d hover:bg-white/30 text-shadow-3d hover:cursor-pointer"
                  >
                    <span className="hidden sm:inline">Clear (</span>
                    <span className="sm:hidden">Clear </span>
                    <span className="max-w-24 sm:max-w-none truncate inline-block">
                      {trackingVessel.name}
                    </span>
                    <span className="hidden sm:inline">)</span>
                  </button>
                ) : (
                  <span className="text-xs text-white/50">None</span>
                )}
              </div>

              <div className="hidden lg:block h-4 w-px bg-white/30 mx-2"></div>
            </div>
          </div>
        </nav>
      </div>
    </motion.header>
  );
}
