"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useCallback } from "react";
import { VesselData } from "@/types/vessel";
import { Violation, ViolationSeverity } from "@/lib/violations-engine";

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
  // Group vessels by violation severity
  const vesselsByViolation = useMemo(() => {
    const vesselsWithViolations = vessels as VesselWithViolations[];

    const critical = vesselsWithViolations.filter(
      v => v.violations && v.violations.length > 0 && v.violationSeverity === ViolationSeverity.CRITICAL
    );
    const high = vesselsWithViolations.filter(
      v => v.violations && v.violations.length > 0 && v.violationSeverity === ViolationSeverity.HIGH
    );
    const medium = vesselsWithViolations.filter(
      v => v.violations && v.violations.length > 0 && v.violationSeverity === ViolationSeverity.MEDIUM
    );
    const low = vesselsWithViolations.filter(
      v => v.violations && v.violations.length > 0 && v.violationSeverity === ViolationSeverity.LOW
    );
    const noViolations = vesselsWithViolations.filter(
      v => !v.violations || v.violations.length === 0
    );

    return {
      critical,
      high,
      medium,
      low,
      noViolations,
      totalViolations: critical.length + high.length + medium.length + low.length,
    };
  }, [vessels]);

  const handleTrackHistory = useCallback(
    (uuid: string, name: string) => {
      onTrackHistory?.(uuid, name);
    },
    [onTrackHistory]
  );

  const getSeverityColor = (severity: ViolationSeverity) => {
    switch (severity) {
      case ViolationSeverity.CRITICAL: return "glass-coral";
      case ViolationSeverity.HIGH: return "glass-coral";
      case ViolationSeverity.MEDIUM: return "glass-bubbles";
      case ViolationSeverity.LOW: return "glass-seagrass";
      default: return "glass";
    }
  };

  const renderVesselCard = (vessel: VesselWithViolations, index: number) => {
    const severityClass = vessel.violations && vessel.violations.length > 0
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
              {vessel.violations.length} {vessel.violations.length === 1 ? 'VIOLATION' : 'VIOLATIONS'}
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
              <div key={idx} className="flex items-center gap-2 text-xs text-white">
                <span>{violation.icon}</span>
                <span className="font-medium text-shadow-sm">{violation.title}</span>
              </div>
            ))}
          </div>
        )}

        {vessel.vessel.uuid && onTrackHistory && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTrackHistory(
                vessel.vessel.uuid!,
                vessel.vessel.name
              );
            }}
            className="w-full mt-3 px-3 py-2 glass-ocean rounded-md text-white text-xs font-medium hover:gradient-ocean-light transition-all duration-200 flex items-center justify-center gap-1 text-shadow-sm"
          >
            📍 Track History
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
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed top-0 right-0 w-[32rem] violations-panel-mobile h-screen glass-heavy shadow-2xl z-[60] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/20 bg-white/10 backdrop-blur-sm flex justify-between items-start flex-shrink-0">
              <div className="flex-1">
                <h2 className="font-serif font-semibold text-xl text-white mb-1 text-shadow">
                  ⚠️ Vessel Violations Monitor
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

              <button
                onClick={onClose}
                className="p-2 glass rounded-md text-white text-base font-medium hover:bg-white/30 transition-all duration-200 text-shadow-sm"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto py-4">
              {vesselsByViolation.totalViolations === 0 ? (
                <div className="px-6 py-8 text-center text-white/80">
                  <div className="text-6xl mb-4">✅</div>
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
                      <h3 className="font-serif font-semibold text-base text-white mb-3 pb-2 border-b border-white/20 text-shadow">
                        🚨 Critical Violations ({vesselsByViolation.critical.length})
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
                      <h3 className="font-serif font-semibold text-base text-white mb-3 pb-2 border-b border-white/20 text-shadow">
                        ⚡ High Severity ({vesselsByViolation.high.length})
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
                      <h3 className="font-serif font-semibold text-base text-white mb-3 pb-2 border-b border-white/20 text-shadow">
                        ⚠️ Medium Severity ({vesselsByViolation.medium.length})
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
                      <h3 className="font-serif font-semibold text-base text-white mb-3 pb-2 border-b border-white/20 text-shadow">
                        ℹ️ Low Severity ({vesselsByViolation.low.length})
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
                      <h3 className="font-serif font-semibold text-base text-white mb-3 pb-2 border-b border-white/20 text-shadow">
                        ✅ Compliant Vessels ({vesselsByViolation.noViolations.length})
                      </h3>
                      <div className="flex flex-col gap-3">
                        {vesselsByViolation.noViolations.slice(0, 5).map((vessel, index) =>
                          renderVesselCard(vessel, index)
                        )}
                        {vesselsByViolation.noViolations.length > 5 && (
                          <p className="text-xs text-white/60 text-center">
                            +{vesselsByViolation.noViolations.length - 5} more compliant vessels
                          </p>
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