"use client";

import { motion, AnimatePresence } from "framer-motion";
import { VesselData } from "@/types/vessel";

interface BufferViolationsPanelProps {
  vessels: VesselData[];
  isOpen: boolean;
  onClose: () => void;
  onVesselClick?: (vessel: VesselData) => void;
  onTrackHistory?: (vesselUuid: string, vesselName: string) => void;
}

const panelVariants = {
  hidden: { x: "100%", opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
      staggerChildren: 0.1,
    },
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
};

export default function BufferViolationsPanel({
  vessels,
  isOpen,
  onClose,
  onVesselClick,
  onTrackHistory,
}: BufferViolationsPanelProps) {
  // Filter vessels that are in buffer zone and NOT whitelisted - these are the violations
  const bufferViolations = vessels.filter(
    (vessel) => vessel.is_in_buffer_zone && !vessel.is_whitelisted
  );

  // Whitelisted vessels in buffer zone (not violations but worth noting)
  const whitelistedInBuffer = vessels.filter(
    (vessel) => vessel.is_in_buffer_zone && vessel.is_whitelisted
  );

  // Vessels in park are just informational (not violations)
  const vesselsInPark = vessels.filter((vessel) => vessel.is_in_park);

  const totalViolations = bufferViolations.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="violations-panel-backdrop"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="violations-panel"
          >
            {/* Header */}
            <div className="violations-panel-header">
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="violations-panel-title-section"
              >
                <h2 className="violations-panel-title">⚡ Buffer Zone Violations</h2>
                <p className="violations-panel-subtitle">
                  Vessels approaching protected areas
                </p>
              </motion.div>

              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ delay: 0.3 }}
                onClick={onClose}
                className="violations-panel-close"
              >
                ✕
              </motion.button>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="violations-panel-stats"
            >
              <div className="violations-stat">
                <span className="violations-stat-number violations-stat-warning">
                  {bufferViolations.length}
                </span>
                <span className="violations-stat-label">Violations</span>
              </div>
              <div className="violations-stat">
                <span className="violations-stat-number">
                  {vesselsInPark.length}
                </span>
                <span className="violations-stat-label">In Park</span>
              </div>
              <div className="violations-stat">
                <span className="violations-stat-number">
                  {whitelistedInBuffer.length}
                </span>
                <span className="violations-stat-label">Whitelisted</span>
              </div>
            </motion.div>

            {/* Content */}
            <div className="violations-panel-content">
              {totalViolations === 0 ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                  className="violations-panel-empty"
                >
                  <div className="violations-panel-empty-icon">✅</div>
                  <p className="violations-panel-empty-text">
                    No buffer zone violations
                  </p>
                  <p className="violations-panel-empty-subtext">
                    All vessels are maintaining safe distance
                  </p>
                </motion.div>
              ) : (
                <div className="violations-panel-sections">
                  {/* Buffer Zone Violations */}
                  {bufferViolations.length > 0 && (
                    <motion.div
                      variants={itemVariants}
                      className="violations-section"
                    >
                      <h3 className="violations-section-title violations-warning">
                        ⚡ Buffer Zone Violations ({bufferViolations.length})
                      </h3>
                      <div className="violations-list">
                        {bufferViolations.map((vessel, index) => (
                          <motion.div
                            key={`buffer-${vessel.vessel.mmsi}-${index}`}
                            variants={itemVariants}
                            whileHover={{ x: 5, scale: 1.02 }}
                            className="violation-item violation-warning"
                            onClick={() => onVesselClick?.(vessel)}
                          >
                            <div className="violation-header">
                              <h4 className="violation-vessel-name">
                                {vessel.vessel.name}
                              </h4>
                              <span className="violation-badge violation-badge-warning">
                                VIOLATION
                              </span>
                            </div>
                            <p className="violation-details">
                              {vessel.vessel.type} • MMSI: {vessel.vessel.mmsi}
                            </p>
                            <p className="violation-coords">
                              {vessel.latitude.toFixed(4)}, {vessel.longitude.toFixed(4)}
                            </p>
                            <p className="violation-warning-text">
                              ⚠️ Too close to protected area (within 150m buffer)
                            </p>
                            {vessel.vessel.uuid && onTrackHistory && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTrackHistory(vessel.vessel.uuid!, vessel.vessel.name);
                                }}
                                className="violation-track-btn"
                              >
                                📍 Track History
                              </motion.button>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Whitelisted Vessels in Buffer */}
                  {whitelistedInBuffer.length > 0 && (
                    <motion.div
                      variants={itemVariants}
                      className="violations-section"
                    >
                      <h3 className="violations-section-title">
                        ✅ Whitelisted Vessels in Buffer ({whitelistedInBuffer.length})
                      </h3>
                      <div className="violations-list">
                        {whitelistedInBuffer.map((vessel, index) => (
                          <motion.div
                            key={`whitelist-${vessel.vessel.mmsi}-${index}`}
                            variants={itemVariants}
                            whileHover={{ x: 5, scale: 1.02 }}
                            className="violation-item violation-whitelisted"
                            onClick={() => onVesselClick?.(vessel)}
                          >
                            <div className="violation-header">
                              <h4 className="violation-vessel-name">
                                {vessel.vessel.name}
                              </h4>
                              <span className="violation-badge violation-badge-whitelisted">
                                WHITELISTED
                              </span>
                            </div>
                            <p className="violation-details">
                              {vessel.vessel.type} • MMSI: {vessel.vessel.mmsi}
                            </p>
                            <p className="violation-coords">
                              {vessel.latitude.toFixed(4)}, {vessel.longitude.toFixed(4)}
                            </p>
                            {vessel.whitelist_info && (
                              <p className="violation-whitelist-reason">
                                ✅ {vessel.whitelist_info.reason}
                              </p>
                            )}
                            {vessel.vessel.uuid && onTrackHistory && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTrackHistory(vessel.vessel.uuid!, vessel.vessel.name);
                                }}
                                className="violation-track-btn"
                              >
                                📍 Track History
                              </motion.button>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Informational: Vessels in Park */}
                  {vesselsInPark.length > 0 && (
                    <motion.div
                      variants={itemVariants}
                      className="violations-section"
                    >
                      <h3 className="violations-section-title">
                        🌳 Vessels in Park ({vesselsInPark.length})
                      </h3>
                      <div className="violations-list">
                        {vesselsInPark.map((vessel, index) => (
                          <motion.div
                            key={`park-${vessel.vessel.mmsi}-${index}`}
                            variants={itemVariants}
                            whileHover={{ x: 5, scale: 1.02 }}
                            className="violation-item"
                            onClick={() => onVesselClick?.(vessel)}
                          >
                            <div className="violation-header">
                              <h4 className="violation-vessel-name">
                                {vessel.vessel.name}
                              </h4>
                              <span className="violation-badge">
                                IN PARK
                              </span>
                            </div>
                            <p className="violation-details">
                              {vessel.vessel.type} • MMSI: {vessel.vessel.mmsi}
                            </p>
                            <p className="violation-coords">
                              {vessel.latitude.toFixed(4)}, {vessel.longitude.toFixed(4)}
                            </p>
                            {vessel.vessel.uuid && onTrackHistory && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTrackHistory(vessel.vessel.uuid!, vessel.vessel.name);
                                }}
                                className="violation-track-btn"
                              >
                                📍 Track History
                              </motion.button>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
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