"use client";

import { AnimatePresence } from "framer-motion";
import Notification, { NotificationProps } from "@/components/Notification/Notification";

export interface NotificationData extends Omit<NotificationProps, "onClose"> {
  id: string;
}

interface NotificationContainerProps {
  notifications: NotificationData[];
  onRemoveNotification: (id: string) => void;
}

export default function NotificationContainer({
  notifications,
  onRemoveNotification,
}: NotificationContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <Notification {...notification} onClose={onRemoveNotification} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}