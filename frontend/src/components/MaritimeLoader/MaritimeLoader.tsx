"use client";

import { motion } from "framer-motion";
import { MdAnchor } from "react-icons/md";

interface MaritimeLoaderProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export default function MaritimeLoader({
  message = "Loading...",
  size = "md"
}: MaritimeLoaderProps) {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-20 h-20",
    lg: "w-28 h-28"
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  };

  const iconSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl"
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Maritime Loading Animation */}
      <motion.div
        className={`relative ${sizeClasses[size]}`}
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      >
        {/* Outer Ring - Compass */}
        <div className="absolute inset-0 border-4 border-white/20 border-t-white border-r-white/40 rounded-full" />

        {/* Inner Elements */}
        <motion.div
          className="absolute inset-2 flex items-center justify-center"
          animate={{ rotate: -360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        >
          {/* Anchor Symbol */}
          <motion.div
            className={`text-white ${iconSizes[size]}`}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <MdAnchor />
          </motion.div>
        </motion.div>

        {/* Compass Points */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 w-1 h-3 bg-white rounded-full" />
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-1 h-2 bg-white/60 rounded-full" />
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 h-1 w-3 bg-white rounded-full" />
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1 h-1 w-2 bg-white/60 rounded-full" />
      </motion.div>

      {/* Animated Waves */}
      <motion.div
        className="flex gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="w-2 h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
            animate={{
              scaleX: [1, 1.5, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </motion.div>

      <p className={`text-white font-medium text-shadow text-center ${textSizes[size]}`}>
        {message}
      </p>
    </div>
  );
}