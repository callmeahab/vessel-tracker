"use client";

import {
  MdShield,
  MdSpeed,
  MdAnchor,
  MdWarning,
  MdBeachAccess,
} from "react-icons/md";
import { GiAnchor } from "react-icons/gi";

interface ViolationIconProps {
  iconName: string;
  className?: string;
}

export default function ViolationIcon({ iconName, className = "" }: ViolationIconProps) {
  const getIcon = () => {
    switch (iconName) {
      case "shield":
        return <MdShield className={className} />;
      case "speed":
        return <MdSpeed className={className} />;
      case "anchor-ban":
        return <GiAnchor className={className} />;
      case "shore-warning":
        return <MdBeachAccess className={className} />;
      default:
        return <MdWarning className={className} />;
    }
  };

  return getIcon();
}