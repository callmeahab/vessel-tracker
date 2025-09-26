"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MdClose, MdGrass, MdWarning, MdInfo } from "react-icons/md";

interface MobilePosidoniaProps {
  isOpen: boolean;
  onClose: () => void;
  posidoniaData: {properties?: Record<string, unknown>; geometry?: unknown; id?: string | number} | null;
}

export default function MobilePosidoniaPanel({
  isOpen,
  onClose,
  posidoniaData,
}: MobilePosidoniaProps) {
  if (!posidoniaData) return null;

  // Determine health status based on properties
  const getHealthStatus = () => {
    const classification = (posidoniaData.properties?.classification as string) || "standard";

    if (classification === "healthy") {
      return {
        label: "Healthy Posidonia",
        color: "#10b981",
        icon: <MdGrass className="text-green-400" />,
        description: "Thriving seagrass meadow in excellent condition",
        details: "Dense coverage with minimal anthropogenic impact. Vital habitat supporting diverse marine life.",
      };
    } else if (classification === "degraded") {
      return {
        label: "Degraded Posidonia",
        color: "#f59e0b",
        icon: <MdWarning className="text-amber-400" />,
        description: "Seagrass showing signs of stress or damage",
        details: "Reduced density due to anchoring damage or pollution. Requires immediate protection to prevent further degradation.",
      };
    } else if (classification === "dead") {
      return {
        label: "Dead Matte",
        color: "#6b7280",
        icon: <MdInfo className="text-gray-400" />,
        description: "Former seagrass bed remains",
        details: "Historical Posidonia bed that has died. The matte (root system) remains and provides substrate for recolonization.",
      };
    } else {
      return {
        label: "Standard Posidonia",
        color: "#7dd3fc",
        icon: <MdGrass className="text-sky-300" />,
        description: "Regular seagrass meadow requiring protection",
        details: "Posidonia oceanica beds on rocky or sandy substrate. Standard protection measures apply.",
      };
    }
  };

  const status = getHealthStatus();
  const classification = (posidoniaData.properties?.classification as string) || "standard";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 sm:hidden"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed bottom-0 left-0 right-0 glass-ocean shadow-2xl z-[60] sm:hidden rounded-t-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/20 bg-white/10 backdrop-blur-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {status.icon}
                    <h2 className="font-sans font-semibold text-lg text-white text-shadow">
                      {status.label}
                    </h2>
                  </div>
                  <p className="text-sm text-white/80 text-shadow-sm">
                    Protected Seagrass Meadow
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 glass rounded-md text-white hover:bg-white/30 transition-all duration-200"
                >
                  <MdClose className="size-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {/* Status Indicator */}
              <div
                className="glass-ocean p-4 rounded-lg mb-4 border border-white/20"
                style={{ borderColor: status.color + "40" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white text-shadow-sm">
                    Conservation Status
                  </span>
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white/50 shadow-sm"
                    style={{ backgroundColor: status.color }}
                  />
                </div>
                <p className="text-sm text-white/90 mb-2">
                  {status.description}
                </p>
                {status.details && (
                  <p className="text-xs text-white/80">
                    {status.details}
                  </p>
                )}
              </div>

              {/* Information Section */}
              <div className="glass p-4 rounded-lg mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <MdInfo className="text-white/80 size-5" />
                  <h3 className="font-semibold text-white text-shadow-sm">
                    About Posidonia Oceanica
                  </h3>
                </div>
                <div className="space-y-2 text-sm text-white/90">
                  <p>
                    Posidonia oceanica is a critically important seagrass species endemic to the Mediterranean Sea.
                  </p>
                  <p>
                    These underwater meadows provide essential ecosystem services including:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Oxygen production and CO₂ absorption</li>
                    <li>Nursery habitat for many fish species</li>
                    <li>Coastal protection from erosion</li>
                    <li>Water clarity improvement</li>
                  </ul>
                </div>
              </div>

              {/* Protection Notice */}
              <div className={`p-4 rounded-lg ${
                classification === "degraded" ? "glass-coral" :
                classification === "dead" ? "glass" :
                "glass-seagrass"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <MdWarning className="text-white size-5" />
                  <h3 className="font-semibold text-white text-shadow-sm">
                    Protection Notice
                  </h3>
                </div>
                {classification === "degraded" ? (
                  <>
                    <p className="text-sm text-white/90 mb-2">
                      This area requires urgent protection. Any disturbance is strictly prohibited.
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-white/90">
                      <li>Enhanced monitoring in effect</li>
                      <li>Anchoring absolutely forbidden</li>
                      <li>Report any violations immediately</li>
                    </ul>
                  </>
                ) : classification === "dead" ? (
                  <>
                    <p className="text-sm text-white/90 mb-2">
                      Historic seagrass area. The matte provides important substrate for potential recovery.
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-white/90">
                      <li>Anchoring discouraged to allow recovery</li>
                      <li>Area monitored for recolonization</li>
                      <li>Part of restoration efforts</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-white/90 mb-2">
                      Anchoring on Posidonia meadows is strictly prohibited. Violations can result in:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-white/90">
                      <li>Environmental damage fines up to €100,000</li>
                      <li>Vessel impoundment</li>
                      <li>Criminal prosecution for environmental crimes</li>
                    </ul>
                  </>
                )}
              </div>

              {/* Area Details if available */}
              {posidoniaData.properties && Object.keys(posidoniaData.properties).length > 1 && (
                <div className="glass p-4 rounded-lg mt-4">
                  <h3 className="font-semibold text-white text-shadow-sm mb-2">
                    Area Details
                  </h3>
                  <div className="space-y-1 text-sm text-white/90">
                    <p>Classification: {status.label}</p>
                    {(posidoniaData.properties?.area as number) && (
                      <p>Area: {Number(posidoniaData.properties.area as number).toLocaleString()} m²</p>
                    )}
                    {(posidoniaData.properties?.depth as number) && (
                      <p>Average Depth: {posidoniaData.properties.depth as number} meters</p>
                    )}
                    {(posidoniaData.properties?.coverage as number) && (
                      <p>Coverage: {posidoniaData.properties.coverage as number}%</p>
                    )}
                    {(posidoniaData.properties?.density as number) && (
                      <p>Shoot Density: {posidoniaData.properties.density as number} shoots/m²</p>
                    )}
                    {(posidoniaData.properties?.last_survey as string) && (
                      <p>Last Survey: {posidoniaData.properties.last_survey as string}</p>
                    )}
                    {!!posidoniaData.geometry && (
                      <p className="text-xs text-white/70 mt-2">
                        Feature ID: {(posidoniaData.id as string | number) || `posidonia-${classification}-${Date.now()}`}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}