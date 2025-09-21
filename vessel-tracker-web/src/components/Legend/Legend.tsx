"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import type { LayerConfig } from "@/components/Map/Map";

interface LegendProps {
  layers?: LayerConfig[];
  onLayerToggle?: (layerId: string, visible: boolean) => void;
  showToggleControls?: boolean;
}

export default function Legend({
  layers = [],
  onLayerToggle,
  showToggleControls = false,
}: LegendProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleToggle = useCallback(
    (layerId: string, currentVisible: boolean) => {
      onLayerToggle?.(layerId, !currentVisible);
    },
    [onLayerToggle]
  );

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute top-[150px] left-5 z-[999] select-none"
    >
      <motion.div
        animate={{
          width: isExpanded ? 280 : 50,
          height: isExpanded ? "auto" : 50,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
          duration: 0.3,
        }}
        className="glass shadow-xl rounded-xl overflow-hidden cursor-pointer"
        onClick={!isExpanded ? toggleExpanded : undefined}
      >
        {isExpanded ? (
          <>
            {/* Header */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="bg-white/20 border-b border-white/20 px-4 py-3 cursor-pointer flex justify-between items-center backdrop-blur-sm"
              onClick={toggleExpanded}
            >
              <div className="text-sm font-serif font-semibold text-white text-shadow-sm">
                🗺️ Map Legend
              </div>
              <motion.div
                animate={{ rotate: 180 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-white/70"
              >
                ▼
              </motion.div>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.2 }}
            >
              <div className="p-4">
                {layers && layers.length > 0 ? (
                  layers.map((layer, index) => (
                    <motion.div
                      key={layer.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.15,
                        delay: 0.25 + index * 0.03,
                      }}
                      className={`flex items-center mb-3 p-2 rounded-md cursor-pointer border transition-all duration-200 ${
                        layer.visible
                          ? "bg-white/20 border-white/30 backdrop-blur-sm hover:bg-white/30"
                          : "bg-black/20 border-white/20 opacity-60 hover:bg-white/20"
                      }`}
                      whileHover={{
                        scale: 1.02,
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() =>
                        showToggleControls
                          ? handleToggle(layer.id, layer.visible)
                          : null
                      }
                    >
                      {/* Toggle Checkbox - only show if toggle controls enabled */}
                      {showToggleControls && (
                        <div
                          className={`w-[18px] h-[18px] rounded border-2 border-white/40 mr-3 flex items-center justify-center transition-all duration-200 ${
                            layer.visible ? "" : "bg-transparent"
                          }`}
                          style={{
                            backgroundColor: layer.visible
                              ? layer.color
                              : "transparent",
                          }}
                        >
                          {layer.visible && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-white text-xs font-bold"
                            >
                              ✓
                            </motion.div>
                          )}
                        </div>
                      )}

                      {/* Layer Info */}
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <span className="text-sm mr-2">{layer.icon}</span>
                          <span className="text-white text-sm font-medium text-shadow-sm">
                            {layer.name}
                          </span>
                        </div>
                        <div className="text-white/80 text-xs leading-relaxed">
                          {layer.description}
                        </div>
                      </div>

                      {/* Color Indicator */}
                      <div
                        className="w-4 h-4 rounded-full border-2 border-white/50 ml-2 flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: layer.color }}
                      />
                    </motion.div>
                  ))
                ) : (
                  <div className="p-2 text-white/70 text-xs">
                    No layers available
                  </div>
                )}
              </div>
            </motion.div>
          </>
        ) : (
          /* Collapsed Icon */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="w-full h-full flex items-center justify-center"
            whileHover={{
              scale: 1.1,
            }}
            whileTap={{ scale: 0.9 }}
          >
            <div className="text-lg text-white drop-shadow-lg">🗺️</div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
