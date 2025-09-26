"use client";

import { motion, AnimatePresence } from "framer-motion";
import { VesselProperties } from "@/components/MapPopup/MapPopup";
import {
  MdClose,
  MdLocationOn,
  MdDirectionsBoat,
  MdSpeed,
  MdExplore,
  MdFlag,
  MdWarning,
  MdCheckCircle,
} from "react-icons/md";

interface MobileVesselPanelProps {
  vessel: VesselProperties | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileVesselPanel({
  vessel,
  isOpen,
  onClose,
}: MobileVesselPanelProps) {
  if (!vessel) return null;

  // Handle violations that might be stringified by MapBox
  let violations = vessel.violations;
  if (typeof violations === "string") {
    try {
      violations = JSON.parse(violations);
    } catch (e) {
      violations = [];
    }
  }
  const hasViolations =
    violations && Array.isArray(violations) && violations.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto"
          >
            {/* Handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200/50">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-full ${
                    vessel.isInPark ? "bg-amber-100" : "bg-blue-100"
                  }`}
                >
                  <MdDirectionsBoat
                    className={`text-lg ${
                      vessel.isInPark ? "text-amber-600" : "text-blue-600"
                    }`}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {vessel.name || "Unknown Vessel"}
                  </h3>
                  <p className="text-sm text-gray-500 text-shadow-lg flex items-center gap-1">
                    {vessel.isInPark ? (
                      <>
                        <MdWarning className="text-amber-500" />
                        Inside Park
                      </>
                    ) : (
                      <>
                        <MdLocationOn className="text-blue-500" />
                        Nearby
                      </>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <MdClose className="text-gray-600" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Violations Section */}
              {hasViolations ? (
                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                  <div className="flex items-center gap-2 mb-3">
                    <MdWarning className="text-red-600" />
                    <h4 className="font-medium text-red-800">
                      Violations ({violations?.length || 0})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {violations?.map((violation: any, index: number) => (
                      <div
                        key={index}
                        className="bg-white rounded-lg p-3 border border-red-100"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              violation.severity === "critical"
                                ? "bg-red-500"
                                : violation.severity === "high"
                                ? "bg-orange-500"
                                : violation.severity === "medium"
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                          ></div>
                          <span className="font-medium text-sm text-gray-900 capitalize">
                            {violation.type?.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          {violation.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <div className="flex items-center gap-2">
                    <MdCheckCircle className="text-green-600" />
                    <h4 className="font-semibold text-green-900 drop-shadow-sm">
                      No Violations Detected
                    </h4>
                  </div>
                </div>
              )}

              {/* Vessel Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <MdFlag className="text-sm" />
                    <span className="text-xs font-medium">MMSI</span>
                  </div>
                  <p className="font-semibold text-gray-900 drop-shadow-sm">
                    {vessel.mmsi}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <MdDirectionsBoat className="text-sm" />
                    <span className="text-xs font-medium">Type</span>
                  </div>
                  <p className="font-semibold text-gray-900 drop-shadow-sm">
                    {vessel.type}
                  </p>
                </div>

                {vessel.speed !== null && vessel.speed !== undefined && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <MdSpeed className="text-sm" />
                      <span className="text-xs font-medium">Speed</span>
                    </div>
                    <p className="font-semibold text-gray-900 drop-shadow-sm">
                      {vessel.speed} kts
                    </p>
                  </div>
                )}

                {vessel.course !== null && vessel.course !== undefined && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <MdExplore className="text-sm" />
                      <span className="text-xs font-medium">Course</span>
                    </div>
                    <p className="font-semibold text-gray-900 drop-shadow-sm">
                      {vessel.course}°
                    </p>
                  </div>
                )}

                {vessel.countryIso && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <MdFlag className="text-sm" />
                      <span className="text-xs font-medium">Flag</span>
                    </div>
                    <p className="font-semibold text-gray-900 drop-shadow-sm">
                      {vessel.countryIso}
                    </p>
                  </div>
                )}

                {vessel.destination && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <MdLocationOn className="text-sm" />
                      <span className="text-xs font-medium">Destination</span>
                    </div>
                    <p className="font-semibold text-gray-900 drop-shadow-sm text-sm">
                      {vessel.destination}
                    </p>
                  </div>
                )}
              </div>

              {/* Environmental Impact */}
              {vessel.distanceToNearestPosidonia !== null &&
                vessel.distanceToNearestPosidonia !== undefined &&
                vessel.distanceToNearestPosidonia < 500 && (
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-2">
                      Environmental Status
                    </h4>
                    <p className="text-sm text-blue-700">
                      {Math.round(vessel.distanceToNearestPosidonia)}m from
                      posidonia seagrass
                    </p>
                    {vessel.distanceToNearestPosidonia < 50 && (
                      <p className="text-xs text-red-600 mt-1">
                        ⚠ Very close to protected seagrass
                      </p>
                    )}
                  </div>
                )}

              {vessel.timestamp && (
                <div className="text-center pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Last updated: {new Date(vessel.timestamp).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
