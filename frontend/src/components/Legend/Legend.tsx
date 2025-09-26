"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LayerConfig } from "@/components/Map/Map";
import {
  MdLayers,
  MdExpandMore,
  MdCheckBox,
  MdCheckBoxOutlineBlank,
  MdClose,
} from "react-icons/md";

// Hook to detect mobile screen size
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

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
  const [isExpanded, setIsExpanded] = useState(false);
  const isMobile = useIsMobile();

  const handleToggle = useCallback(
    (layerId: string, currentVisible: boolean) => {
      onLayerToggle?.(layerId, !currentVisible);
    },
    [onLayerToggle]
  );

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Mobile version - bottom positioned with popup panel
  if (isMobile) {
    return (
      <>
        {/* Mobile Legend Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="fixed bottom-6 left-6 z-[1]"
        >
          <motion.button
            onClick={toggleExpanded}
            className="glass hover-3d rounded-xl p-3 text-white text-shadow-3d"
            whileHover={{ scale: 1.1, rotateY: 5 }}
            whileTap={{ scale: 0.9 }}
          >
            <MdLayers className="size-6" />
          </motion.button>
        </motion.div>

        {/* Mobile Legend Panel */}
        <AnimatePresence>
          {isExpanded && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                onClick={toggleExpanded}
              />

              {/* Panel */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "tween", duration: 0.3 }}
                className="fixed bottom-0 left-0 right-0 max-h-[80vh] glass-ocean shadow-2xl z-[60] flex flex-col overflow-hidden rounded-t-xl"
              >
                {/* Header */}
                <div className="p-4 border-b border-white/20 bg-white/10 backdrop-blur-sm flex justify-between items-center flex-shrink-0">
                  <div className="flex items-center">
                    <MdLayers className="mr-2 size-6 text-white" />
                    <h2 className="font-sans font-semibold text-lg text-white text-shadow">
                      Map Legend
                    </h2>
                  </div>
                  <button
                    onClick={toggleExpanded}
                    className="p-2 glass rounded-md text-white hover:bg-white/30 transition-all duration-200"
                  >
                    <MdClose className="size-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                  {layers && layers.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {layers.map((layer) => (
                        <motion.div
                          key={layer.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex items-center p-3 rounded-lg cursor-pointer border hover-3d transition-all duration-200 ${
                            layer.visible
                              ? "glass-ocean border-white/30 hover:bg-white/30"
                              : "bg-black/20 border-white/20 opacity-60 hover:bg-white/20"
                          }`}
                          onClick={() =>
                            showToggleControls
                              ? handleToggle(layer.id, layer.visible)
                              : null
                          }
                        >
                          {/* Toggle Checkbox */}
                          {showToggleControls && (
                            <div className="mr-3 flex items-center justify-center">
                              {layer.visible ? (
                                <MdCheckBox
                                  className="text-lg"
                                  style={{ color: layer.color }}
                                />
                              ) : (
                                <MdCheckBoxOutlineBlank className="text-lg text-white/40" />
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
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-white/70 text-sm">
                      No layers available
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Desktop version - original positioning and behavior
  return (
    <motion.div
      initial={{ opacity: 0, x: -20, rotateY: -15 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="absolute top-32 sm:top-35 left-2 sm:left-5 z-[1] select-none perspective"
      style={{ transformStyle: "preserve-3d" }}
    >
      <motion.div
        initial={{
          width: 50,
          height: 50,
        }}
        animate={{
          width: isExpanded ? 280 : 50,
          height: isExpanded ? "610px" : 50,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
          duration: 0.3,
        }}
        className="glass hover-3d rounded-xl overflow-hidden cursor-pointer"
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
              <div className="text-sm font-sans font-semibold text-white text-shadow-sm flex items-center">
                <MdLayers className="mr-2 size-6" /> Map Legend
              </div>
              <motion.div
                animate={{ rotate: 180 }}
                transition={{ duration: 0.2 }}
                className="text-white/70"
              >
                <MdExpandMore />
              </motion.div>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.2 }}
            >
              <div
                className="p-4 overflow-y-auto"
                style={{ maxHeight: "610px" }}
              >
                {layers && layers.length > 0 ? (
                  layers.map((layer, index) => (
                    <motion.div
                      key={layer.id}
                      initial={{ opacity: 0, x: -10, rotateX: 20 }}
                      animate={{ opacity: 1, x: 0, rotateX: 0 }}
                      transition={{
                        duration: 0.2,
                        delay: 0.25 + index * 0.05,
                        type: "spring",
                        stiffness: 200,
                      }}
                      className={`flex items-center mb-3 p-2 rounded-md cursor-pointer border hover-3d ${
                        layer.visible
                          ? "bg-white/20 border-white/30 backdrop-blur-sm hover:bg-white/30"
                          : "bg-black/20 border-white/20 opacity-60 hover:bg-white/20"
                      }`}
                      whileHover={{
                        scale: 1.03,
                        rotateY: 2,
                        rotateX: -1,
                      }}
                      whileTap={{ scale: 0.97, rotateY: -1 }}
                      onClick={() =>
                        showToggleControls
                          ? handleToggle(layer.id, layer.visible)
                          : null
                      }
                    >
                      {/* Toggle Checkbox - only show if toggle controls enabled */}
                      {showToggleControls && (
                        <div className="mr-3 flex items-center justify-center">
                          {layer.visible ? (
                            <MdCheckBox
                              className="text-lg"
                              style={{ color: layer.color }}
                            />
                          ) : (
                            <MdCheckBoxOutlineBlank className="text-lg text-white/40" />
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
            initial={{ opacity: 0, rotateZ: -45 }}
            animate={{ opacity: 1, rotateZ: 0 }}
            transition={{ duration: 0.4, delay: 0.1, type: "spring" }}
            className="w-full h-full flex items-center justify-center hover-3d floating"
            whileHover={{
              scale: 1.15,
              rotateY: 10,
              rotateX: 5,
            }}
            whileTap={{ scale: 0.9, rotateY: -5 }}
          >
            <div className="text-lg text-white text-shadow-3d">
              <MdLayers className="size-6" />
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
