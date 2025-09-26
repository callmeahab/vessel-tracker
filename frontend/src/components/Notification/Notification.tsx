"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import {
  MdCheckCircle,
  MdError,
  MdInfo,
  MdWarning,
  MdClose,
} from "react-icons/md";

export interface NotificationProps {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const iconMap = {
  success: MdCheckCircle,
  error: MdError,
  info: MdInfo,
  warning: MdWarning,
};

const colorMap = {
  success: {
    bg: "bg-green-500/90",
    border: "border-green-400",
    icon: "text-green-100",
    text: "text-white",
  },
  error: {
    bg: "bg-red-500/90",
    border: "border-red-400",
    icon: "text-red-100",
    text: "text-white",
  },
  info: {
    bg: "bg-blue-500/90",
    border: "border-blue-400",
    icon: "text-blue-100",
    text: "text-white",
  },
  warning: {
    bg: "bg-yellow-500/90",
    border: "border-yellow-400",
    icon: "text-yellow-100",
    text: "text-white",
  },
};

export default function Notification({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
}: NotificationProps) {
  const Icon = iconMap[type];
  const colors = colorMap[type];

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.9 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 0.3,
      }}
      className={`relative flex items-start gap-3 p-4 rounded-lg border backdrop-blur-lg shadow-lg min-w-[320px] max-w-[400px] ${colors.bg} ${colors.border}`}
    >
      <div className={`flex-shrink-0 ${colors.icon}`}>
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${colors.text} text-shadow-sm`}>
          {title}
        </p>
        {message && (
          <p
            className={`mt-1 text-xs ${colors.text} opacity-90 text-shadow-sm`}
          >
            {message}
          </p>
        )}
      </div>

      <button
        onClick={() => onClose(id)}
        className={`flex-shrink-0 ${colors.text} hover:opacity-70 transition-opacity`}
      >
        <MdClose className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
