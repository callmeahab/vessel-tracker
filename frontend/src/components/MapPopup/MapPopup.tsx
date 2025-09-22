import mapboxgl from "mapbox-gl";

export interface VesselProperties {
  name: string;
  isInPark: boolean;
  isInBufferZone?: boolean;
  isAnchoredOnPosidonia?: boolean;
  distanceToNearestPosidonia?: number;
  isNearPosidonia?: boolean;
  mmsi: string;
  type: string;
  typeSpecific?: string;
  countryIso?: string;
  imo?: string;
  speed?: number;
  course?: number;
  heading?: number;
  destination?: string;
  distance?: number;
  timestamp?: string;
}

export interface PosidoniaProperties {
  name?: string;
  description?: string;
  type?: string;
  condition?: string;
  substrate?: string;
  classification?: string;
  [key: string]: string | number | boolean | undefined;
}

export class MapPopupControl {
  private static currentPopup: mapboxgl.Popup | undefined;

  /**
   * Closes the currently open popup if any
   */
  static closeVesselPopup(): void {
    if (this.currentPopup) {
      this.currentPopup.remove();
      this.currentPopup = undefined;
    }
  }

  /**
   * Creates and displays a vessel popup with vessel details
   */
  static createVesselPopup(
    map: mapboxgl.Map,
    coordinates: [number, number],
    properties: VesselProperties
  ): mapboxgl.Popup {
    const popupContent = this.generateVesselPopupHTML(properties);

    // Close any existing popup before opening a new one
    this.closeVesselPopup();

    const popup = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      className: "glassmorphic-popup",
    })
      .setLngLat(coordinates)
      .setHTML(popupContent)
      .addTo(map);

    this.currentPopup = popup;
    popup.on("close", () => {
      if (this.currentPopup === popup) {
        this.currentPopup = undefined;
      }
    });

    return popup;
  }

  /**
   * Creates and displays a posidonia bed popup with details
   */
  static createPosidoniaPopup(
    map: mapboxgl.Map,
    coordinates: [number, number],
    properties: PosidoniaProperties
  ): mapboxgl.Popup {
    const popupContent = this.generatePosidoniaPopupHTML(properties);

    // Close any existing popup before opening a new one
    this.closeVesselPopup();

    const popup = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      className: "glassmorphic-popup",
    })
      .setLngLat(coordinates)
      .setHTML(popupContent)
      .addTo(map);

    this.currentPopup = popup;
    popup.on("close", () => {
      if (this.currentPopup === popup) {
        this.currentPopup = undefined;
      }
    });

    return popup;
  }

  /**
   * Generates the HTML content for the vessel popup
   */
  private static generateVesselPopupHTML(properties: VesselProperties): string {
    return `
      <div style="
        width: 280px;
        max-width: 90vw;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.2));
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
        border: 1px solid rgba(255, 255, 255, 0.3);
      ">
        ${this.generateVesselPopupHeader(properties)}
        ${this.generateVesselPopupBody(properties)}
      </div>
    `;
  }

  /**
   * Generates the HTML content for the posidonia popup
   */
  private static generatePosidoniaPopupHTML(properties: PosidoniaProperties): string {
    return `
      <div style="
        width: 280px;
        max-width: 90vw;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.2));
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
        border: 1px solid rgba(255, 255, 255, 0.3);
      ">
        ${this.generatePosidoniaPopupHeader(properties)}
        ${this.generatePosidoniaPopupBody(properties)}
      </div>
    `;
  }

  /**
   * Generates the header section of the vessel popup
   */
  private static generateVesselPopupHeader(properties: VesselProperties): string {
    return `
      <div style="
        background: linear-gradient(135deg, ${
          properties.isInPark
            ? "rgba(245, 158, 11, 0.8), rgba(234, 88, 12, 0.7), rgba(194, 65, 12, 0.6)"
            : "rgba(14, 165, 233, 0.8), rgba(3, 105, 161, 0.7), rgba(30, 58, 138, 0.6)"
        });
        color: rgba(0, 0, 0, 0.9);
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      ">
        <div style="
          font-family: 'Merriweather', Georgia, serif;
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 4px;
          line-height: 1.2;
          letter-spacing: 0.03em;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        ">${properties.name || "Unknown Vessel"}</div>
        <div style="
          font-family: 'Merriweather', Georgia, serif;
          font-size: 10px;
          opacity: 0.9;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        ">${properties.isInPark ? "🚨 INSIDE PARK" : "📍 NEARBY"}</div>
      </div>
    `;
  }

  /**
   * Generates the posidonia popup header
   */
  private static generatePosidoniaPopupHeader(properties: PosidoniaProperties): string {
    const classification = properties.classification || "standard";
    const condition = properties.condition || "unknown";

    // Determine header colors and icons based on classification
    const headerConfig = this.getPosidoniaHeaderConfig(classification);

    return `
      <div style="
        background: linear-gradient(135deg, ${headerConfig.gradient});
        color: rgba(0, 0, 0, 0.9);
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      ">
        <div style="
          font-family: 'Merriweather', Georgia, serif;
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 4px;
          line-height: 1.2;
          letter-spacing: 0.03em;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        ">${headerConfig.icon} ${headerConfig.title}</div>
        <div style="
          font-family: 'Merriweather', Georgia, serif;
          font-size: 10px;
          opacity: 0.9;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        ">${headerConfig.subtitle}</div>
      </div>
    `;
  }

  /**
   * Gets header configuration based on posidonia classification
   */
  private static getPosidoniaHeaderConfig(classification: string) {
    switch (classification) {
      case "healthy":
        return {
          icon: "●",
          title: "Healthy Posidonia",
          subtitle: "🌊 THRIVING SEAGRASS",
          gradient: "rgba(16, 185, 129, 0.8), rgba(5, 150, 105, 0.7), rgba(4, 120, 87, 0.6)"
        };
      case "degraded":
        return {
          icon: "⚠",
          title: "Degraded Posidonia",
          subtitle: "🚨 DAMAGED SEAGRASS",
          gradient: "rgba(245, 158, 11, 0.8), rgba(234, 88, 12, 0.7), rgba(194, 65, 12, 0.6)"
        };
      case "dead":
        return {
          icon: "💀",
          title: "Dead Matte",
          subtitle: "🪦 FORMER SEAGRASS BED",
          gradient: "rgba(139, 69, 19, 0.8), rgba(101, 67, 33, 0.9)"
        };
      default:
        return {
          icon: "●",
          title: "Posidonia Beds",
          subtitle: "🌊 PROTECTED SEAGRASS",
          gradient: "rgba(125, 211, 252, 0.8), rgba(14, 165, 233, 0.7), rgba(3, 105, 161, 0.6)"
        };
    }
  }

  /**
   * Generates the posidonia popup body
   */
  private static generatePosidoniaPopupBody(properties: PosidoniaProperties): string {
    const classification = properties.classification || "standard";
    const condition = properties.condition || "unknown";
    const substrate = properties.substrate || "unknown";

    return `
      <div style="padding: 14px 16px;">
        <div style="display: grid; gap: 8px;">
          ${this.createDetailField("Type:", "Posidonia oceanica", "normal", "#00CED1")}
          ${this.createDetailField("Classification:", this.formatClassification(classification), "normal", this.getClassificationColor(classification))}
          ${condition !== "unknown" ? this.createDetailField("Condition:", this.formatCondition(condition), "normal", this.getConditionColor(condition)) : ""}
          ${substrate !== "unknown" ? this.createDetailField("Substrate:", this.formatSubstrate(substrate), "normal", "#8B9DC3") : ""}
          ${properties.description ? this.createDetailField("Details:", this.parsePosidoniaDescription(properties.description), "normal", undefined, "200px") : ""}
          ${this.createDetailField("⚠ Warning:", "Anchoring prohibited", "normal", "#ef4444")}
          ${this.generateClassificationInfo(classification)}
        </div>
      </div>
    `;
  }

  /**
   * Formats classification for display
   */
  private static formatClassification(classification: string): string {
    switch (classification) {
      case "healthy": return "Healthy Ecosystem";
      case "degraded": return "Degraded/Damaged";
      case "dead": return "Dead Matte";
      case "standard": return "Protected Area";
      default: return "Unknown";
    }
  }

  /**
   * Formats condition for display
   */
  private static formatCondition(condition: string): string {
    switch (condition) {
      case "on_matte": return "On Natural Matte";
      case "degraded": return "Degraded State";
      case "dead_matte": return "Dead Matte";
      default: return condition.charAt(0).toUpperCase() + condition.slice(1);
    }
  }

  /**
   * Formats substrate for display
   */
  private static formatSubstrate(substrate: string): string {
    switch (substrate) {
      case "sand": return "Sandy Bottom";
      case "rock": return "Rocky Bottom";
      case "matte": return "Posidonia Matte";
      default: return substrate.charAt(0).toUpperCase() + substrate.slice(1);
    }
  }

  /**
   * Gets color for classification
   */
  private static getClassificationColor(classification: string): string {
    switch (classification) {
      case "healthy": return "#00CED1";
      case "degraded": return "#FF6B6B";
      case "dead": return "#8B4513";
      default: return "#20B2AA";
    }
  }

  /**
   * Gets color for condition
   */
  private static getConditionColor(condition: string): string {
    switch (condition) {
      case "on_matte": return "#059669";
      case "degraded": return "#f59e0b";
      case "dead_matte": return "#dc2626";
      default: return "#6b7280";
    }
  }

  /**
   * Generates classification-specific information
   */
  private static generateClassificationInfo(classification: string): string {
    const config = this.getClassificationInfoConfig(classification);

    return `
      <div style="
        margin-top: 12px;
        padding: 12px;
        background: ${config.background};
        border-radius: 8px;
        border-left: 4px solid ${config.borderColor};
      ">
        <div style="
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 12px;
          color: rgba(0, 0, 0, 0.8);
          line-height: 1.4;
        ">
          <strong>${config.title}:</strong><br>
          ${config.description}
        </div>
      </div>
    `;
  }

  /**
   * Gets configuration for classification info box
   */
  private static getClassificationInfoConfig(classification: string) {
    switch (classification) {
      case "healthy":
        return {
          title: "Healthy Ecosystem",
          description: "These thriving seagrass beds provide essential marine habitat, produce oxygen, and support biodiversity. Critical for marine ecosystem health.",
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))",
          borderColor: "#00CED1"
        };
      case "degraded":
        return {
          title: "Degraded Habitat",
          description: "This area shows signs of posidonia degradation, possibly from anchoring, pollution, or environmental stress. Recovery is slow and requires protection.",
          background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(234, 88, 12, 0.1))",
          borderColor: "#FF6B6B"
        };
      case "dead":
        return {
          title: "Former Seagrass Bed",
          description: "This area contains dead posidonia matte - the remnants of former seagrass beds. While no longer living, it still provides some habitat structure.",
          background: "linear-gradient(135deg, rgba(139, 69, 19, 0.15), rgba(101, 67, 33, 0.1))",
          borderColor: "#8B4513"
        };
      default:
        return {
          title: "Environmental Protection",
          description: "These seagrass beds are vital marine ecosystems that provide oxygen, food, and shelter for marine life. Anchoring damages these slow-growing plants.",
          background: "linear-gradient(135deg, rgba(125, 211, 252, 0.15), rgba(14, 165, 233, 0.1))",
          borderColor: "#20B2AA"
        };
    }
  }

  /**
   * Parses posidonia description to extract meaningful information
   */
  private static parsePosidoniaDescription(description: string): string {
    // Remove HTML tags and extract useful info
    const cleaned = description.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ');

    // Look for surface area or condition info
    const surfaceMatch = cleaned.match(/Superficie:\s*([0-9.]+)/i);
    const conditionMatch = cleaned.match(/Posidonia\s+([^<\n]+)/i);

    let result = "";
    if (surfaceMatch) {
      result += `Area: ${surfaceMatch[1]} m²`;
    }
    if (conditionMatch) {
      if (result) result += " • ";
      result += conditionMatch[1].trim();
    }

    return result || "Marine protected area";
  }

  /**
   * Generates the body section of the popup with vessel details
   */
  private static generateVesselPopupBody(properties: VesselProperties): string {
    const fields = this.buildDetailFields(properties);

    return `
      <div style="padding: 14px 16px;">
        <div style="display: grid; gap: 8px;">
          ${fields.join("")}
          ${this.generateTimestamp(properties.timestamp)}
        </div>
      </div>
    `;
  }

  /**
   * Builds an array of detail field HTML strings
   */
  private static buildDetailFields(properties: VesselProperties): string[] {
    const fields: string[] = [];

    // Type field
    const typeText = properties.type || "Unknown";
    const typeSpecificText = properties.typeSpecific
      ? ` (${properties.typeSpecific})`
      : "";
    fields.push(
      this.createDetailField("Type:", `${typeText}${typeSpecificText}`)
    );

    // MMSI field
    fields.push(
      this.createDetailField("MMSI:", properties.mmsi || "N/A", "monospace")
    );

    // IMO field (if available)
    if (properties.imo) {
      fields.push(this.createDetailField("IMO:", properties.imo, "monospace"));
    }

    // Country field (if available)
    if (properties.countryIso) {
      fields.push(this.createDetailField("Flag:", properties.countryIso));
    }

    // Speed field (if available)
    if (properties.speed !== null && properties.speed !== undefined) {
      fields.push(
        this.createDetailField(
          "⚡ Speed:",
          `${properties.speed} knots`,
          "normal",
          "#059669"
        )
      );
    }

    // Course field (if available)
    if (properties.course !== null && properties.course !== undefined) {
      fields.push(
        this.createDetailField("↗ Course:", `${properties.course}°`)
      );
    }

    // Heading field (if available)
    if (properties.heading !== null && properties.heading !== undefined) {
      fields.push(
        this.createDetailField("→ Heading:", `${properties.heading}°`)
      );
    }

    // Destination field (if available)
    if (properties.destination) {
      fields.push(
        this.createDetailField(
          "📍 Destination:",
          properties.destination,
          "normal",
          undefined,
          "140px"
        )
      );
    }

    // Distance field (if available)
    if (properties.distance !== null && properties.distance !== undefined) {
      fields.push(
        this.createDetailField(
          "📐 Distance:",
          `${properties.distance.toFixed(1)} nm`,
          "normal",
          "#fbbf24"
        )
      );
    }

    // Posidonia distance (if vessel is near posidonia beds)
    if (properties.distanceToNearestPosidonia !== null &&
        properties.distanceToNearestPosidonia !== undefined &&
        properties.distanceToNearestPosidonia < 500) {
      const distance = properties.distanceToNearestPosidonia;
      const color = distance < 50 ? "#ef4444" : distance < 100 ? "#f59e0b" : "#10b981";
      const icon = distance < 50 ? "⚠" : distance < 100 ? "⚡" : "●";

      fields.push(
        this.createDetailField(
          `${icon} Posidonia:`,
          `${distance.toFixed(0)}m away`,
          "normal",
          color
        )
      );
    }

    // Anchoring warning (if over posidonia)
    if (properties.isAnchoredOnPosidonia) {
      fields.push(
        this.createDetailField(
          "⛔ Violation:",
          "Anchored on seagrass",
          "normal",
          "#dc2626"
        )
      );
    }

    return fields;
  }

  /**
   * Creates a detail field HTML string
   */
  private static createDetailField(
    label: string,
    value: string,
    fontFamily: string = "normal",
    valueColor?: string,
    maxWidth?: string
  ): string {
    const valueStyle = `
      color: ${valueColor || "rgba(0, 0, 0, 0.7)"};
      ${
        fontFamily === "monospace"
          ? "font-family: 'Inter', system-ui, sans-serif;"
          : "font-family: 'Inter', system-ui, sans-serif;"
      }
      font-size: 13px;
      ${
        maxWidth
          ? `max-width: ${maxWidth}; word-break: break-word;`
          : "text-align: right;"
      }
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      ${valueColor ? "font-weight: 700;" : ""}
    `;

    return `
      <div style="display: flex; justify-content: space-between; align-items: ${
        maxWidth ? "flex-start" : "center"
      };">
        <span style="font-family: 'Inter', system-ui, sans-serif; font-weight: 600; color: rgba(0, 0, 0, 0.9); font-size: 13px; text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5); ${
          maxWidth ? "flex-shrink: 0;" : ""
        }">${label}</span>
        <span style="${valueStyle}">${value}</span>
      </div>
    `;
  }

  /**
   * Generates the timestamp section if available
   */
  private static generateTimestamp(timestamp?: string): string {
    if (!timestamp) return "";

    return `
      <div style="
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid rgba(0, 0, 0, 0.2);
        display: flex;
        align-items: center;
        gap: 6px;
      ">
        <span style="color: rgba(0, 0, 0, 0.6); font-size: 11px;">🕒</span>
        <span style="font-family: 'Inter', system-ui, sans-serif; color: rgba(0, 0, 0, 0.5); font-size: 11px; text-shadow: 0 1px 2px rgba(255, 255, 255, 0.3);">${new Date(
          timestamp
        ).toLocaleString()}</span>
      </div>
    `;
  }

  /**
   * Sets up click event handlers for vessel markers
   */
  static setupVesselClickHandlers(map: mapboxgl.Map): void {
    // Add click event listener for vessel details
    map.on("click", "vessels-circle", (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const properties = feature.properties;

        if (!properties) return;

        const coordinates = (feature.geometry as GeoJSON.Point).coordinates;
        this.createVesselPopup(
          map,
          [coordinates[0], coordinates[1]],
          properties as VesselProperties
        );
      }
    });

    // Change cursor on hover
    map.on("mouseenter", "vessels-circle", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "vessels-circle", () => {
      map.getCanvas().style.cursor = "";
    });
  }
}

export default MapPopupControl;
