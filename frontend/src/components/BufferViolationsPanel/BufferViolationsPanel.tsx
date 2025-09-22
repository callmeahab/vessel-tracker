"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useCallback } from "react";
import { VesselData } from "@/types/vessel";

interface BufferViolationsPanelProps {
  vessels: VesselData[];
  isOpen: boolean;
  onClose: () => void;
  onVesselClick?: (vessel: VesselData) => void;
  onTrackHistory?: (vesselUuid: string, vesselName: string) => void;
}

export default function BufferViolationsPanel({
  vessels,
  isOpen,
  onClose,
  onVesselClick,
  onTrackHistory,
}: BufferViolationsPanelProps) {
  // Memoize filtered vessel data to prevent expensive recalculations
  const vesselData = useMemo(() => {
    const bufferViolations = vessels.filter(
      (vessel) => vessel.is_in_buffer_zone && !vessel.is_whitelisted
    );

    const whitelistedInBuffer = vessels.filter(
      (vessel) => vessel.is_in_buffer_zone && vessel.is_whitelisted
    );

    const vesselsInPark = vessels; // All vessels are now within park boundaries (filtered by backend)

    const posidoniaViolations = vessels.filter(
      (vessel) => vessel.is_anchored_on_posidonia
    );

    return {
      bufferViolations,
      whitelistedInBuffer,
      vesselsInPark,
      posidoniaViolations,
      totalViolations: bufferViolations.length + posidoniaViolations.length,
    };
  }, [vessels]);

  const handleTrackHistory = useCallback(
    (uuid: string, name: string) => {
      onTrackHistory?.(uuid, name);
    },
    [onTrackHistory]
  );

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
            className="fixed top-0 right-0 w-[28rem] violations-panel-mobile h-screen glass-heavy shadow-2xl z-[60] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/20 bg-white/10 backdrop-blur-sm flex justify-between items-start flex-shrink-0">
              <div className="flex-1">
                <h2 className="font-serif font-semibold text-xl text-white mb-1 text-shadow">
                  ⚡ Buffer Zone Violations
                </h2>
                <p className="text-sm text-white/80 text-shadow-sm">
                  Vessels approaching protected areas
                </p>
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
              {vesselData.totalViolations === 0 ? (
                <div className="px-6 py-8 text-center text-white/80">
                  <div className="text-6xl mb-4">✅</div>
                  <p className="font-semibold text-lg mb-2 text-white text-shadow">
                    No buffer zone violations
                  </p>
                  <p className="text-sm text-white/70">
                    All vessels are maintaining safe distance
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Posidonia Violations */}
                  {vesselData.posidoniaViolations.length > 0 && (
                    <div className="mx-6">
                      <h3 className="font-serif font-semibold text-base text-white mb-3 pb-2 border-b border-white/20 text-shadow">
                        🚫 Anchored on Posidonia (
                        {vesselData.posidoniaViolations.length})
                      </h3>
                      <div className="flex flex-col gap-3">
                        {vesselData.posidoniaViolations.map((vessel, index) => (
                          <div
                            key={`posidonia-${vessel.vessel.mmsi}-${index}`}
                            className="glass-seagrass p-4 rounded-lg cursor-pointer hover:gradient-seagrass transition-all duration-200"
                            onClick={() => onVesselClick?.(vessel)}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-semibold text-base text-white truncate flex-1 mr-2 text-shadow-sm">
                                {vessel.vessel.name}
                              </h4>
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/20 text-white border border-white/30 backdrop-blur-sm">
                                ENVIRONMENTAL
                              </span>
                            </div>
                            <p className="text-sm text-white/90 mb-1">
                              {vessel.vessel.type} • MMSI: {vessel.vessel.mmsi}
                            </p>
                            <p className="text-xs text-white/70 mb-1">
                              {vessel.latitude.toFixed(4)},{" "}
                              {vessel.longitude.toFixed(4)}
                            </p>
                            <p className="text-xs text-white font-medium text-shadow-sm">
                              🌿 Anchoring on protected seagrass beds
                            </p>
                            {vessel.vessel.uuid && onTrackHistory && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTrackHistory(
                                    vessel.vessel.uuid!,
                                    vessel.vessel.name
                                  );
                                }}
                                className="w-full mt-2 px-3 py-2 glass-ocean rounded-md text-white text-xs font-medium hover:bg-white/30 transition-all duration-200 flex items-center justify-center gap-1 text-shadow-sm"
                              >
                                📍 Track History
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Buffer Zone Violations */}
                  {vesselData.bufferViolations.length > 0 && (
                    <div className="mx-6">
                      <h3 className="font-serif font-semibold text-base text-white mb-3 pb-2 border-b border-white/20 text-shadow">
                        ⚡ Buffer Zone Violations (
                        {vesselData.bufferViolations.length})
                      </h3>
                      <div className="flex flex-col gap-3">
                        {vesselData.bufferViolations.map((vessel, index) => (
                          <div
                            key={`buffer-${vessel.vessel.mmsi}-${index}`}
                            className="glass-coral p-4 rounded-lg cursor-pointer hover:gradient-coral transition-all duration-200"
                            onClick={() => onVesselClick?.(vessel)}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-semibold text-base text-white truncate flex-1 mr-2 text-shadow-sm">
                                {vessel.vessel.name}
                              </h4>
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/20 text-white border border-white/30 backdrop-blur-sm">
                                VIOLATION
                              </span>
                            </div>
                            <p className="text-sm text-white/90 mb-1">
                              {vessel.vessel.type} • MMSI: {vessel.vessel.mmsi}
                            </p>
                            <p className="text-xs text-white/70 mb-1">
                              {vessel.latitude.toFixed(4)},{" "}
                              {vessel.longitude.toFixed(4)}
                            </p>
                            <p className="text-xs text-white font-medium text-shadow-sm">
                              ⚠️ Too close to protected area (within 150m
                              buffer)
                            </p>
                            {vessel.vessel.uuid && onTrackHistory && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTrackHistory(
                                    vessel.vessel.uuid!,
                                    vessel.vessel.name
                                  );
                                }}
                                className="w-full mt-2 px-3 py-2 glass-ocean rounded-md text-white text-xs font-medium hover:bg-white/30 transition-all duration-200 flex items-center justify-center gap-1 text-shadow-sm"
                              >
                                📍 Track History
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Whitelisted Vessels in Buffer */}
                  {vesselData.whitelistedInBuffer.length > 0 && (
                    <div className="mx-6">
                      <h3 className="font-serif font-semibold text-base text-white mb-3 pb-2 border-b border-white/20 text-shadow">
                        ✅ Whitelisted Vessels in Buffer (
                        {vesselData.whitelistedInBuffer.length})
                      </h3>
                      <div className="flex flex-col gap-3">
                        {vesselData.whitelistedInBuffer.map((vessel, index) => (
                          <div
                            key={`whitelist-${vessel.vessel.mmsi}-${index}`}
                            className="glass p-4 rounded-lg cursor-pointer hover:bg-white/20 transition-all duration-200"
                            onClick={() => onVesselClick?.(vessel)}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-semibold text-base text-white truncate flex-1 mr-2 text-shadow-sm">
                                {vessel.vessel.name}
                              </h4>
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/20 text-white border border-white/30 backdrop-blur-sm">
                                WHITELISTED
                              </span>
                            </div>
                            <p className="text-sm text-white/90 mb-1">
                              {vessel.vessel.type} • MMSI: {vessel.vessel.mmsi}
                            </p>
                            <p className="text-xs text-white/70 mb-1">
                              {vessel.latitude.toFixed(4)},{" "}
                              {vessel.longitude.toFixed(4)}
                            </p>
                            {vessel.whitelist_info && (
                              <p className="text-xs text-white font-medium text-shadow-sm">
                                ✅ {vessel.whitelist_info.reason}
                              </p>
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
                                className="w-full mt-2 px-3 py-2 glass-ocean rounded-md text-white text-xs font-medium hover:bg-white/30 transition-all duration-200 flex items-center justify-center gap-1 text-shadow-sm"
                              >
                                📍 Track History
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Informational: Vessels in Park */}
                  {vesselData.vesselsInPark.length > 0 && (
                    <div className="mx-6">
                      <h3 className="font-serif font-semibold text-base text-white mb-3 pb-2 border-b border-white/20 text-shadow">
                        🌳 Vessels in Park ({vesselData.vesselsInPark.length})
                      </h3>
                      <div className="flex flex-col gap-3">
                        {vesselData.vesselsInPark.map((vessel, index) => (
                          <div
                            key={`park-${vessel.vessel.mmsi}-${index}`}
                            className="glass p-4 rounded-lg cursor-pointer hover:bg-white/20 transition-all duration-200"
                            onClick={() => onVesselClick?.(vessel)}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-semibold text-base text-white truncate flex-1 mr-2 text-shadow-sm">
                                {vessel.vessel.name}
                              </h4>
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/20 text-white border border-white/30 backdrop-blur-sm">
                                IN PARK
                              </span>
                            </div>
                            <p className="text-sm text-white/90 mb-1">
                              {vessel.vessel.type} • MMSI: {vessel.vessel.mmsi}
                            </p>
                            <p className="text-xs text-white/70 mb-1">
                              {vessel.latitude.toFixed(4)},{" "}
                              {vessel.longitude.toFixed(4)}
                            </p>
                            {vessel.vessel.uuid && onTrackHistory && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTrackHistory(
                                    vessel.vessel.uuid!,
                                    vessel.vessel.name
                                  );
                                }}
                                className="w-full mt-2 px-3 py-2 glass-ocean rounded-md text-white text-xs font-medium hover:bg-white/30 transition-all duration-200 flex items-center justify-center gap-1 text-shadow-sm"
                              >
                                📍 Track History
                              </button>
                            )}
                          </div>
                        ))}
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
