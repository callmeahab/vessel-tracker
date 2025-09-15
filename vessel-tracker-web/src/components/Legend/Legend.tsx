"use client";

import { motion } from "framer-motion";

const legendItems = [
  {
    color: "green",
    label: "Park Boundary",
    icon: "🌳",
  },
  {
    color: "red",
    label: "Vessels in Park",
    icon: "⚠️",
  },
  {
    color: "blue",
    label: "Vessels Outside Park",
    icon: "✅",
  },
];

const containerVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
    }
  },
};

export default function Legend() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="legend-container"
    >
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="legend-title"
      >
        Legend
      </motion.h3>

      <div className="legend-items">
        {legendItems.map((item, index) => (
          <motion.div
            key={item.label}
            variants={itemVariants}
            whileHover={{ x: 5, scale: 1.05 }}
            className="legend-item"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: 0.5 + index * 0.1,
                type: "spring",
                stiffness: 200
              }}
              className={`legend-indicator legend-${item.color}`}
            >
              <span className="legend-icon">{item.icon}</span>
            </motion.div>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="legend-label"
            >
              {item.label}
            </motion.span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}