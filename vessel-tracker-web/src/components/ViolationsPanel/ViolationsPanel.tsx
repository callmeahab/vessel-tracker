"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useCallback } from "react";
import { VesselData } from "@/types/vessel";
import { Violation, ViolationSeverity } from "@/lib/violations-engine";
import {
  MdWarning,
  MdClose,
  MdLocationOn,
  MdCheckCircle,
  MdError,
  MdPriorityHigh,
  MdInfo,
} from "react-icons/md";
import ViolationIcon from "@/components/ViolationIcon/ViolationIcon";

interface ViolationsPanelProps {
  vessels: VesselData[];
  isOpen: boolean;
  onClose: () => void;
  onVesselClick?: (vessel: VesselData) => void;
  onTrackHistory?: (vesselUuid: string, vesselName: string) => void;
}

interface VesselWithViolations extends VesselData {
  violations?: Violation[];
  violationSeverity?: ViolationSeverity;
}

export default function ViolationsPanel({
  vessels,
  isOpen,
  onClose,
  onVesselClick,
  onTrackHistory,
}: ViolationsPanelProps) {
  // Group vessels by violation severity - optimized
  const vesselsByViolation = useMemo(() => {
    if (!isOpen) {
      // Don't process if panel is closed
      return {
        critical: [],
        high: [],
        medium: [],
        low: [],
        noViolations: [],
        totalViolations: 0,
      };
    }

    const vesselsWithViolations = vessels as VesselWithViolations[];
    const result = {
      critical: [] as VesselWithViolations[],
      high: [] as VesselWithViolations[],
      medium: [] as VesselWithViolations[],
      low: [] as VesselWithViolations[],
      noViolations: [] as VesselWithViolations[],
      totalViolations: 0,
    };

    // Single pass through vessels
    for (const vessel of vesselsWithViolations) {
      if (vessel.violations && vessel.violations.length > 0) {
        switch (vessel.violationSeverity) {
          case ViolationSeverity.CRITICAL:
            result.critical.push(vessel);
            break;
          case ViolationSeverity.HIGH:
            result.high.push(vessel);
            break;
          case ViolationSeverity.MEDIUM:
            result.medium.push(vessel);
            break;
          case ViolationSeverity.LOW:
            result.low.push(vessel);
            break;
        }
        result.totalViolations++;
      } else {
        result.noViolations.push(vessel);
      }
    }

    return result;
  }, [vessels, isOpen]);

  const handleTrackHistory = useCallback(
    (uuid: string, name: string) => {
      onTrackHistory?.(uuid, name);
    },
    [onTrackHistory]
  );

  const getSeverityColor = (severity: ViolationSeverity) => {
    switch (severity) {
      case ViolationSeverity.CRITICAL:
        return "glass";
      case ViolationSeverity.HIGH:
        return "glass";
      case ViolationSeverity.MEDIUM:
        return "glass";
      case ViolationSeverity.LOW:
        return "glass";
      default:
        return "glass";
    }
  };

  const renderVesselCard = (vessel: VesselWithViolations, index: number) => {
    const severityClass =
      vessel.violations && vessel.violations.length > 0
        ? getSeverityColor(vessel.violationSeverity!)
        : "glass";

    return (
      <div
        key={`vessel-${vessel.vessel.mmsi}-${index}`}
        className={`${severityClass} p-4 rounded-lg cursor-pointer hover:gradient-ocean-light transition-all duration-200`}
        onClick={() => onVesselClick?.(vessel)}
      >
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold text-base text-white truncate flex-1 mr-2 text-shadow-sm">
            {vessel.vessel.name}
          </h4>
          {vessel.violations && vessel.violations.length > 0 && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/20 text-white border border-white/30 backdrop-blur-sm">
              {vessel.violations.length}{" "}
              {vessel.violations.length === 1 ? "VIOLATION" : "VIOLATIONS"}
            </span>
          )}
        </div>
        <p className="text-sm text-white/90 mb-1">
          {vessel.vessel.type} • MMSI: {vessel.vessel.mmsi}
        </p>
        <p className="text-xs text-white/70 mb-2">
          {vessel.latitude.toFixed(4)}, {vessel.longitude.toFixed(4)}
        </p>

        {/* Show violations list */}
        {vessel.violations && vessel.violations.length > 0 && (
          <div className="mt-2 space-y-1">
            {vessel.violations.map((violation, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-xs text-white"
              >
                <ViolationIcon iconName={violation.icon} className="text-sm" />
                <span className="font-medium text-shadow-sm">
                  {violation.title}
                </span>
              </div>
            ))}
          </div>
        )}

        {vessel.vessel.uuid && onTrackHistory && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTrackHistory(vessel.vessel.uuid!, vessel.vessel.name);
            }}
            className="w-full mt-3 px-3 py-2 glass-ocean rounded-md text-white text-xs font-medium hover:gradient-ocean-light transition-all duration-200 flex items-center justify-center gap-1 text-shadow-sm"
          >
            <MdLocationOn className="inline mr-1" /> Track History
          </button>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%", rotateY: 15 }}
            animate={{ x: 0, rotateY: 0 }}
            exit={{ x: "100%", rotateY: 15 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 25,
              duration: 0.4,
            }}
            className="fixed top-0 right-0 w-[32rem] violations-panel-mobile h-screen glass-ocean hover-3d z-[60] flex flex-col overflow-hidden perspective"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Header */}
            <div className="p-6 border-b border-white/20 bg-white/10 backdrop-blur-sm flex justify-between items-start flex-shrink-0">
              <div className="flex-1">
                <h2 className="font-serif font-semibold text-xl text-white mb-1 text-shadow flex items-center">
                  <MdWarning className="mr-2" /> Vessel Violations Monitor
                </h2>
                <p className="text-sm text-white/80 text-shadow-sm">
                  Real-time detection of marine violations
                </p>
                <div className="mt-2 flex gap-2 text-xs">
                  <span className="px-2 py-1 glass-coral rounded text-white">
                    Critical: {vesselsByViolation.critical.length}
                  </span>
                  <span className="px-2 py-1 glass-bubbles rounded text-white">
                    High: {vesselsByViolation.high.length}
                  </span>
                  <span className="px-2 py-1 glass-seagrass rounded text-white">
                    Medium: {vesselsByViolation.medium.length}
                  </span>
                </div>
              </div>

              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1, rotateZ: 90 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 glass rounded-md text-white text-base font-medium hover:bg-white/30 hover-3d text-shadow-3d hover:cursor-pointer"
              >
                <MdClose />
              </motion.button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto py-4">
              {vesselsByViolation.totalViolations === 0 ? (
                <div className="px-6 py-8 text-center text-white/80">
                  <div className="text-6xl mb-4">
                    <MdCheckCircle className="text-green-400" />
                  </div>
                  <p className="font-semibold text-lg mb-2 text-white text-shadow">
                    No violations detected
                  </p>
                  <p className="text-sm text-white/70">
                    All vessels are operating within regulations
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Critical Violations */}
                  {vesselsByViolation.critical.length > 0 && (
                    <div className="mx-6">
                      <h3 className="font-serif font-semibold text-base text-white mb-3 pb-2 border-b border-white/20 text-shadow flex items-center">
                        <MdError className="mr-2 text-red-400" /> Critical
                        Violations ({vesselsByViolation.critical.length})
                      </h3>
                      <div className="flex flex-col gap-3">
                        {vesselsByViolation.critical.map((vessel, index) =>
                          renderVesselCard(vessel, index)
                        )}
                      </div>
                    </div>
                  )}

                  {/* High Severity Violations */}
                  {vesselsByViolation.high.length > 0 && (
                    <div className="mx-6">
                      <h3 className="font-serif font-semibold text-base text-white mb-3 pb-2 border-b border-white/20 text-shadow flex items-center">
                        <MdPriorityHigh className="mr-2 text-orange-400" /> High
                        Severity ({vesselsByViolation.high.length})
                      </h3>
                      <div className="flex flex-col gap-3">
                        {vesselsByViolation.high.map((vessel, index) =>
                          renderVesselCard(vessel, index)
                        )}
                      </div>
                    </div>
                  )}

                  {/* Medium Severity Violations */}
                  {vesselsByViolation.medium.length > 0 && (
                    <div className="mx-6">
                      <h3 className="font-serif font-semibold text-base text-white mb-3 pb-2 border-b border-white/20 text-shadow flex items-center">
                        <MdWarning className="mr-2 text-yellow-400" /> Medium
                        Severity ({vesselsByViolation.medium.length})
                      </h3>
                      <div className="flex flex-col gap-3">
                        {vesselsByViolation.medium.map((vessel, index) =>
                          renderVesselCard(vessel, index)
                        )}
                      </div>
                    </div>
                  )}

                  {/* Low Severity Violations */}
                  {vesselsByViolation.low.length > 0 && (
                    <div className="mx-6">
                      <h3 className="font-serif font-semibold text-base text-white mb-3 pb-2 border-b border-white/20 text-shadow flex items-center">
                        <MdInfo className="mr-2 text-blue-400" /> Low Severity (
                        {vesselsByViolation.low.length})
                      </h3>
                      <div className="flex flex-col gap-3">
                        {vesselsByViolation.low.map((vessel, index) =>
                          renderVesselCard(vessel, index)
                        )}
                      </div>
                    </div>
                  )}

                  {/* Compliant Vessels (Optional) */}
                  {vesselsByViolation.noViolations.length > 0 && (
                    <div className="mx-6">
                      <h3 className="font-serif font-semibold text-base text-white mb-3 pb-2 border-b border-white/20 text-shadow flex items-center">
                        <MdCheckCircle className="mr-2 text-green-400" />{" "}
                        Compliant Vessels (
                        {vesselsByViolation.noViolations.length})
                      </h3>
                      <div className="flex flex-col gap-3">
                        {vesselsByViolation.noViolations.map((vessel, index) =>
                          renderVesselCard(vessel, index)
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
