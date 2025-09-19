"use client";

import { motion } from "framer-motion";

interface HeaderProps {
  vesselCount: number;
  vesselsInPark: number;
  vesselsInBuffer: number;
  onRefresh: () => void;
  onToggleViolations: () => void;
  onClearTrack?: () => void;
  trackingVessel?: { uuid: string; name: string } | null;
}

export default function Header({
  vesselCount,
  vesselsInPark,
  vesselsInBuffer,
  onRefresh,
  onToggleViolations,
  onClearTrack,
  trackingVessel,
}: HeaderProps) {
  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
      className="header"
    >
      <div className="header-container">
        <motion.h1
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="header-title"
        >
          Blue Forest Sentinel
        </motion.h1>

        <div className="header-controls">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="header-stat"
          >
            <span className="header-stat-label">Vessels: </span>
            <motion.span
              key={vesselCount}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
              className="header-stat-value"
            >
              {vesselCount}
            </motion.span>
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
            className="header-stat"
          >
            <span className="header-stat-label">In Park: </span>
            <motion.span
              key={vesselsInPark}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
              className="header-stat-value-danger"
            >
              {vesselsInPark}
            </motion.span>
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.45, type: "spring", stiffness: 200 }}
            className="header-stat"
          >
            <span className="header-stat-label">Buffer: </span>
            <motion.span
              key={vesselsInBuffer}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
              className="header-stat-value-warning"
            >
              {vesselsInBuffer}
            </motion.span>
          </motion.div>

          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
            onClick={onToggleViolations}
            className={`header-violations-button ${vesselsInBuffer > 0 ? 'has-violations' : ''}`}
          >
            ⚡ Buffer Violations ({vesselsInBuffer})
          </motion.button>

          {trackingVessel && onClearTrack && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
              onClick={onClearTrack}
              className="header-clear-track-button"
            >
              🗑️ Clear Track ({trackingVessel.name})
            </motion.button>
          )}

          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ delay: 0.55, type: "spring", stiffness: 200 }}
            onClick={onRefresh}
            className="header-refresh-button"
          >
            Refresh
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
}
