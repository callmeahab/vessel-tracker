"use client";

import { motion, AnimatePresence } from "framer-motion";
import { VesselData } from "@/types/vessel";

interface VesselListProps {
  vessels: VesselData[];
  onVesselClick?: (vessel: VesselData) => void;
}

const containerVariants = {
  hidden: { opacity: 0, x: 100 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.5,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
};

export default function VesselList({
  vessels,
  onVesselClick,
}: VesselListProps) {
  const isValidArray = Array.isArray(vessels) && vessels.length > 0;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="vessel-list-wrapper"
    >
      <div className="vessel-list-container">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="vessel-list-header"
        >
          <h3 className="vessel-list-title">Active Vessels</h3>
        </motion.div>

        <div className="vessel-list-content">
          {!isValidArray ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="vessel-list-empty"
            >
              <div className="vessel-list-empty-icon">🚢</div>
              <p className="vessel-list-empty-text">No vessels detected</p>
              <p className="vessel-list-empty-subtext">
                Check API configuration
              </p>
            </motion.div>
          ) : (
            <AnimatePresence>
              {vessels.map((vessel, index) => (
                <motion.div
                  key={vessel.vessel.mmsi + index}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, x: -20 }}
                  whileHover={{ scale: 1.02, x: 5 }}
                  transition={{ duration: 0.2 }}
                  className="vessel-item"
                  onClick={() => onVesselClick?.(vessel)}
                >
                  <div className="vessel-header">
                    <h4 className="vessel-name">{vessel.vessel.name}</h4>
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.3 }}
                      className={`vessel-badge ${
                        vessel.is_in_park
                          ? "vessel-badge-danger"
                          : "vessel-badge-info"
                      }`}
                    >
                      {vessel.is_in_park ? "IN PARK" : "NEARBY"}
                    </motion.span>
                  </div>

                  <p className="vessel-info">
                    {vessel.vessel.type}
                    {vessel.vessel.type_specific
                      ? ` (${vessel.vessel.type_specific})`
                      : ""}
                    {vessel.vessel.country_iso
                      ? ` - ${vessel.vessel.country_iso}`
                      : vessel.vessel.countryName
                      ? ` - ${vessel.vessel.countryName}`
                      : ""}
                  </p>

                  <div className="vessel-details">
                    <span className="vessel-detail">
                      MMSI: {vessel.vessel.mmsi}
                    </span>
                    {vessel.vessel.speed !== null &&
                      vessel.vessel.speed !== undefined && (
                        <span className="vessel-detail">
                          {vessel.vessel.speed} kts
                        </span>
                      )}
                  </div>

                  <div className="vessel-coords">
                    <span className="vessel-coord">
                      {vessel.latitude.toFixed(4)},{" "}
                      {vessel.longitude.toFixed(4)}
                    </span>
                    {vessel.vessel.distance !== null &&
                      vessel.vessel.distance !== undefined && (
                        <span className="vessel-distance">
                          {vessel.vessel.distance.toFixed(1)} nm
                        </span>
                      )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
}
