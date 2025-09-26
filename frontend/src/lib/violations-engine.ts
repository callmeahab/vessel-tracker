import * as turf from "@turf/turf";
import { VesselData } from "@/types/vessel";

// Violation severity levels
export enum ViolationSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

// Violation types
export enum ViolationType {
  ANCHORED_ON_POSIDONIA = "anchored_on_posidonia",
  IN_BUFFER_ZONE = "in_buffer_zone",
  IN_RESTRICTED_AREA = "in_restricted_area",
  EXCESSIVE_SPEED = "excessive_speed",
  TOO_CLOSE_TO_SHORE = "too_close_to_shore",
  IN_NO_ANCHOR_ZONE = "in_no_anchor_zone",
  NEAR_PROTECTED_SPECIES = "near_protected_species",
}

// Individual violation record
export interface Violation {
  type: ViolationType;
  severity: ViolationSeverity;
  title: string;
  description: string;
  icon: string; // Icon name or emoji for compatibility
  color: string;
  distance?: number; // Distance to violation boundary in meters
  speedLimit?: number; // Speed limit if applicable
  actualSpeed?: number; // Actual speed if applicable
  timestamp: Date;
}

// Vessel violations summary
export interface VesselViolations {
  vessel: VesselData;
  violations: Violation[];
  maxSeverity: ViolationSeverity;
  isWhitelisted: boolean;
  primaryViolation?: Violation; // Most severe violation for display
}

// Violation detection configuration
export interface ViolationConfig {
  bufferZoneDistance: number; // meters
  shoreProximityWarning: number; // meters
  speedLimitInPark: number; // knots
  anchoringSpeedThreshold: number; // knots
  posidoniaProximityWarning: number; // meters
}

// Default configuration
export const DEFAULT_VIOLATION_CONFIG: ViolationConfig = {
  bufferZoneDistance: 100,
  shoreProximityWarning: 100,
  speedLimitInPark: 5,
  anchoringSpeedThreshold: 0.5,
  posidoniaProximityWarning: 50,
};

export class ViolationsEngine {
  private config: ViolationConfig;

  constructor(config: Partial<ViolationConfig> = {}) {
    this.config = { ...DEFAULT_VIOLATION_CONFIG, ...config };
  }

  /**
   * Detect all violations for a vessel
   */
  detectViolations(
    vessel: VesselData,
    parkBoundaries: GeoJSON.FeatureCollection | null,
    bufferedBoundaries: GeoJSON.FeatureCollection | null,
    posidoniaData: GeoJSON.FeatureCollection | null,
    shoreline?: GeoJSON.FeatureCollection | null
  ): VesselViolations {
    const violations: Violation[] = [];
    const vesselPoint = turf.point([vessel.longitude, vessel.latitude]);

    // All vessels are now pre-filtered by backend to be within park boundaries
    // No need to check park boundaries again - proceed directly to violation detection

    // Check posidonia violations (only within park)
    const posidoniaViolations = this.checkPosidoniaViolations(
      vesselPoint,
      vessel.vessel.speed || 0,
      posidoniaData
    );
    violations.push(...posidoniaViolations);

    // Check speed violations in park (all vessels are now within park)
    const speedViolation = this.checkSpeedViolation(vessel.vessel.speed || 0);
    if (speedViolation) violations.push(speedViolation);

    // Check buffer zone violations (which indicate proximity to shore)
    const bufferViolation = this.checkBufferZoneViolation(
      vesselPoint,
      bufferedBoundaries
    );
    if (bufferViolation) violations.push(bufferViolation);

    // Check shore proximity if shoreline data available (only within park)
    if (shoreline) {
      const shoreViolation = this.checkShoreProximity(vesselPoint, shoreline);
      if (shoreViolation) violations.push(shoreViolation);
    }

    // Determine max severity
    const maxSeverity = this.getMaxSeverity(violations);

    // Get primary violation (most severe)
    const primaryViolation =
      violations.length > 0
        ? violations.reduce((prev, curr) =>
            this.getSeverityLevel(curr.severity) >
            this.getSeverityLevel(prev.severity)
              ? curr
              : prev
          )
        : undefined;

    return {
      vessel,
      violations,
      maxSeverity,
      isWhitelisted: vessel.is_whitelisted || false,
      primaryViolation,
    };
  }

  // checkIfInPark method removed - vessels are now pre-filtered by backend

  /**
   * Check buffer zone violation
   */
  private checkBufferZoneViolation(
    vesselPoint: GeoJSON.Feature<GeoJSON.Point>,
    bufferedBoundaries: GeoJSON.FeatureCollection | null
  ): Violation | null {
    if (!bufferedBoundaries || !bufferedBoundaries.features) {
      return null;
    }

    for (const feature of bufferedBoundaries.features) {
      if (
        feature.geometry &&
        (feature.geometry.type === "Polygon" ||
          feature.geometry.type === "MultiPolygon")
      ) {
        try {
          // Create a proper turf feature from the geometry
          const turfFeature = turf.feature(feature.geometry);
          const isInBuffer = turf.booleanPointInPolygon(
            vesselPoint,
            turfFeature
          );

          if (isInBuffer) {
            return {
              type: ViolationType.IN_BUFFER_ZONE,
              severity: ViolationSeverity.MEDIUM,
              title: "Too Close to Shore",
              description: `Vessel is within ${this.config.bufferZoneDistance}m buffer zone - too close to protected shoreline`,
              icon: "shore-warning",
              color: "#f59e0b",
              distance: this.config.bufferZoneDistance,
              timestamp: new Date(),
            };
          }
        } catch (error) {
          console.error("Buffer zone check failed:", error);
        }
      }
    }
    return null;
  }

  /**
   * Check posidonia-related violations
   */
  private checkPosidoniaViolations(
    vesselPoint: GeoJSON.Feature<GeoJSON.Point>,
    speed: number,
    posidoniaData: GeoJSON.FeatureCollection | null
  ): Violation[] {
    const violations: Violation[] = [];
    if (!posidoniaData || !posidoniaData.features) return violations;

    // Check all posidonia features for comprehensive violation detection
    for (const feature of posidoniaData.features) {
      if (feature.geometry.type === "Polygon") {
        try {
          const polygon = turf.polygon(feature.geometry.coordinates);

          // Check if vessel is over posidonia
          if (turf.booleanPointInPolygon(vesselPoint, polygon)) {
            // Check if anchored
            if (speed <= this.config.anchoringSpeedThreshold) {
              violations.push({
                type: ViolationType.ANCHORED_ON_POSIDONIA,
                severity: ViolationSeverity.CRITICAL,
                title: "Anchoring on Posidonia",
                description: "Vessel is anchored on protected seagrass beds",
                icon: "anchor-ban",
                color: "#dc2626",
                actualSpeed: speed,
                timestamp: new Date(),
              });
            }
            // If we found a violation, no need to check proximity
            break;
          }
        } catch (error) {
          // Posidonia check failed, continue to next feature
          continue;
        }
      }
    }

    return violations;
  }

  /**
   * Check speed violations
   */
  private checkSpeedViolation(speed: number): Violation | null {
    if (speed <= this.config.speedLimitInPark) return null;

    return {
      type: ViolationType.EXCESSIVE_SPEED,
      severity: ViolationSeverity.MEDIUM,
      title: "Speed Violation",
      description: `Exceeding ${this.config.speedLimitInPark} knot speed limit in park`,
      icon: "speed",
      color: "#f59e0b",
      speedLimit: this.config.speedLimitInPark,
      actualSpeed: speed,
      timestamp: new Date(),
    };
  }

  /**
   * Check shore proximity
   */
  private checkShoreProximity(
    vesselPoint: GeoJSON.Feature<GeoJSON.Point>,
    shoreline: GeoJSON.FeatureCollection
  ): Violation | null {
    let minDistance = Infinity;

    for (const feature of shoreline.features) {
      if (
        feature.geometry.type === "LineString" ||
        feature.geometry.type === "MultiLineString"
      ) {
        const distance = turf.pointToLineDistance(
          vesselPoint,
          feature as GeoJSON.Feature<GeoJSON.LineString>,
          { units: "meters" }
        );
        minDistance = Math.min(minDistance, distance);
      }
    }

    if (minDistance < this.config.shoreProximityWarning) {
      return {
        type: ViolationType.TOO_CLOSE_TO_SHORE,
        severity: ViolationSeverity.HIGH,
        title: "Too Close to Shore",
        description: `Vessel is only ${Math.round(minDistance)}m from shore`,
        icon: "shore-warning",
        color: "#ef4444",
        distance: Math.round(minDistance),
        timestamp: new Date(),
      };
    }

    return null;
  }

  /**
   * Get maximum severity from violations
   */
  private getMaxSeverity(violations: Violation[]): ViolationSeverity {
    if (violations.length === 0) return ViolationSeverity.LOW;

    const severityLevels = violations.map((v) =>
      this.getSeverityLevel(v.severity)
    );
    const maxLevel = Math.max(...severityLevels);

    return this.getSeverityFromLevel(maxLevel);
  }

  /**
   * Convert severity to numeric level
   */
  private getSeverityLevel(severity: ViolationSeverity): number {
    switch (severity) {
      case ViolationSeverity.LOW:
        return 1;
      case ViolationSeverity.MEDIUM:
        return 2;
      case ViolationSeverity.HIGH:
        return 3;
      case ViolationSeverity.CRITICAL:
        return 4;
      default:
        return 0;
    }
  }

  /**
   * Convert numeric level to severity
   */
  private getSeverityFromLevel(level: number): ViolationSeverity {
    switch (level) {
      case 1:
        return ViolationSeverity.LOW;
      case 2:
        return ViolationSeverity.MEDIUM;
      case 3:
        return ViolationSeverity.HIGH;
      case 4:
        return ViolationSeverity.CRITICAL;
      default:
        return ViolationSeverity.LOW;
    }
  }

  /**
   * Get color for vessel based on violations
   */
  getVesselColor(violations: VesselViolations): string {
    if (violations.violations.length === 0) return "#86efac"; // Turquoise/seafoam

    switch (violations.maxSeverity) {
      case ViolationSeverity.CRITICAL:
        return "#dc2626"; // Red
      case ViolationSeverity.HIGH:
        return "#ef4444"; // Light red
      case ViolationSeverity.MEDIUM:
        return "#f59e0b"; // Coral/amber
      case ViolationSeverity.LOW:
        return "#10b981"; // Seagrass green
      default:
        return "#86efac";
    }
  }

  /**
   * Get icon for vessel based on primary violation
   */
  getVesselIcon(violations: VesselViolations): string {
    if (violations.primaryViolation) {
      return violations.primaryViolation.icon;
    }
    return "🚢";
  }
}

export default ViolationsEngine;
