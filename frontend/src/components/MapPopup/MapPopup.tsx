import mapboxgl from "mapbox-gl";

export interface VesselProperties {
  uuid?: string;
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
  violations?: Array<{ severity: string; type: string; description: string }>;
  violationSeverity?: string;
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

export interface VesselPositionProperties {
  timestamp: string;
  speed?: number;
  is_start?: boolean;
  is_end?: boolean;
  vesselName: string;
}

export class MapPopupControl {
  private static currentPopup: mapboxgl.Popup | undefined;

  // Material Design inline SVG icon helper (no external font dependency)
  private static md(name: string, size: number = 12): string {
    const common = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"`;
    switch (name) {
      case "warning":
        return `<svg ${common}><path d="M1 21h22L12 2 1 21zm12-3h-2v2h2v-2zm0-8h-2v6h2V10z"/></svg>`;
      case "priority_high":
        return `<svg ${common}><path d="M11 17h2v2h-2v-2zm0-14h2v12h-2V3z"/></svg>`;
      case "info":
        return `<svg ${common}><path d="M11 7h2v2h-2V7zm0 4h2v8h-2v-8z"/></svg>`;
      case "check":
        return `<svg ${common}><path d="M9 16.2 4.8 12 3.4 13.4 9 19 21 7.9 19.6 6.5z"/></svg>`;
      case "check_circle":
        return `<svg ${common}><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 14.2-3.5-3.5 1.4-1.4 2.1 2.1 5.6-5.6 1.4 1.4-7 7z"/></svg>`;
      case "bolt":
        return `<svg ${common}><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>`;
      case "circle":
        return `<svg ${common}><circle cx="12" cy="12" r="6"/></svg>`;
      case "block":
        return `<svg ${common}><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm5.65 5.35L7.35 17.65A8 8 0 0 1 6 12c0-4.41 3.59-8 8-8 1.48 0 2.86.4 4.05 1.1z"/></svg>`;
      case "schedule":
        return `<svg ${common}><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 11h5v-2h-4V7h-2v6z"/></svg>`;
      case "navigation":
        return `<svg ${common}><path d="M12 2 4.5 20.29 12 17l7.5 3.29z"/></svg>`;
      case "arrow_forward":
        return `<svg ${common}><path d="M12 4 10.59 5.41 16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>`;
      case "flag":
        return `<svg ${common}><path d="M14 6l-1-2H5v18h2v-7h5l1 2h6V6z"/></svg>`;
      case "straighten":
        return `<svg ${common}><path d="M3 16v5h18v-5H3zm2 3v-1h2v1H5zm4 0v-1h2v1H9zm4 0v-1h2v1h-2zm4 0v-1h2v1h-2zM3 3v9h18V3H3zm2 7V5h2v5H5zm4 0V5h2v5H9zm4 0V5h2v5h-2zm4 0V5h2v5h-2z"/></svg>`;
      case "spa":
        return `<svg ${common}><path d="M8.55 12c-1.48 0-2.83.4-3.95 1.1C5.21 16.19 8.3 18 12 18s6.79-1.81 7.4-4.9A7.49 7.49 0 0 0 12 10c-1.23 0-2.4.28-3.45.78.01-.26.05-.52.05-.78 0-3.31-2.69-6-6-6 .69 3.02 3.23 5.36 6.4 5.9-.15.4-.28.82-.36 1.26-.03.28-.05.56-.09.84z"/></svg>`;
      case "dangerous":
        return `<svg ${common}><path d="M12 2 2 12l10 10 10-10L12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>`;
      case "waves":
        return `<svg ${common}><path d="M2 18c4 0 4-2 8-2s4 2 8 2v2c-4 0-4-2-8-2s-4 2-8 2v-2zm0-6c4 0 4-2 8-2s4 2 8 2v2c-4 0-4-2-8-2s-4 2-8 2v-2zm0-6c4 0 4-2 8-2s4 2 8 2v2c-4 0-4-2-8-2s-4 2-8 2V6z"/></svg>`;
      default:
        return `<svg ${common}></svg>`;
    }
  }

  /**
   * Closes the currently open popup if any
   */
  static closePopup(): void {
    if (this.currentPopup) {
      this.currentPopup.remove();
      this.currentPopup = undefined;
    }
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
    this.closePopup();

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
   * Creates and displays a vessel previous position popup with details
   */
  static createVesselPositionPopup(
    map: mapboxgl.Map,
    coordinates: [number, number],
    properties: VesselPositionProperties
  ): mapboxgl.Popup {
    const popupContent = this.generateVesselPositionPopupHTML(properties);

    // Close any existing popup before opening a new one
    this.closePopup();

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
   * Generates the HTML content for the posidonia popup
   */
  private static generatePosidoniaPopupHTML(
    properties: PosidoniaProperties
  ): string {
    return `
      <div style="
        width: 280px;
        max-width: 90vw;
        max-height: 500px;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.2));
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
        border: 1px solid rgba(255, 255, 255, 0.3);
        display: flex;
        flex-direction: column;
      ">
        ${this.generatePosidoniaPopupHeader(properties)}
        ${this.generatePosidoniaPopupBody(properties)}
      </div>
    `;
  }

  /**
   * Generates the posidonia popup header
   */
  private static generatePosidoniaPopupHeader(
    properties: PosidoniaProperties
  ): string {
    const classification = properties.classification || "standard";

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
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 4px;
          margin-right: 20px;
          line-height: 1.2;
          letter-spacing: 0.03em;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        ">${headerConfig.title}</div>
        <div style="
          font-family: 'Inter', system-ui, sans-serif;
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
          icon: `${this.md("spa", 12)}`,
          title: "Healthy Posidonia",
          subtitle: "THRIVING SEAGRASS",
          gradient:
            "rgba(16, 185, 129, 0.8), rgba(5, 150, 105, 0.7), rgba(4, 120, 87, 0.6)",
        };
      case "degraded":
        return {
          icon: `${this.md("warning", 12)}`,
          title: "Degraded Posidonia",
          subtitle: "DAMAGED SEAGRASS",
          gradient:
            "rgba(245, 158, 11, 0.8), rgba(234, 88, 12, 0.7), rgba(194, 65, 12, 0.6)",
        };
      case "dead":
        return {
          icon: `${this.md("dangerous", 12)}`,
          title: "Dead Matte",
          subtitle: "FORMER SEAGRASS BED",
          gradient: "rgba(139, 69, 19, 0.8), rgba(101, 67, 33, 0.9)",
        };
      default:
        return {
          icon: `${this.md("waves", 12)}`,
          title: "Posidonia Beds",
          subtitle: "PROTECTED SEAGRASS",
          gradient:
            "rgba(125, 211, 252, 0.8), rgba(14, 165, 233, 0.7), rgba(3, 105, 161, 0.6)",
        };
    }
  }

  /**
   * Generates the posidonia popup body
   */
  private static generatePosidoniaPopupBody(
    properties: PosidoniaProperties
  ): string {
    const classification = properties.classification || "standard";
    const condition = properties.condition || "unknown";
    const substrate = properties.substrate || "unknown";

    return `
      <div style="
        padding: 14px 16px;
        overflow-y: auto;
        flex: 1;
        min-height: 0;
      ">
        <div style="display: grid; gap: 8px;">
          ${this.createDetailField(
            "Type:",
            "Posidonia oceanica",
            "normal",
            "#00CED1"
          )}
          ${this.createDetailField(
            "Classification:",
            this.formatClassification(classification),
            "normal",
            this.getClassificationColor(classification)
          )}
          ${
            condition !== "unknown"
              ? this.createDetailField(
                  "Condition:",
                  this.formatCondition(condition),
                  "normal",
                  this.getConditionColor(condition)
                )
              : ""
          }
          ${
            substrate !== "unknown"
              ? this.createDetailField(
                  "Substrate:",
                  this.formatSubstrate(substrate),
                  "normal",
                  "#8B9DC3"
                )
              : ""
          }
          ${
            properties.description
              ? this.createDetailField(
                  "Details:",
                  this.parsePosidoniaDescription(properties.description),
                  "normal",
                  undefined,
                  "200px"
                )
              : ""
          }
          ${this.createDetailField(
            `${this.md("block", 12)} Warning:`,
            "Anchoring prohibited",
            "normal",
            "#ef4444"
          )}
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
      case "healthy":
        return "Healthy Ecosystem";
      case "degraded":
        return "Degraded/Damaged";
      case "dead":
        return "Dead Matte";
      case "standard":
        return "Protected Area";
      default:
        return "Unknown";
    }
  }

  /**
   * Formats condition for display
   */
  private static formatCondition(condition: string): string {
    switch (condition) {
      case "on_matte":
        return "On Natural Matte";
      case "degraded":
        return "Degraded State";
      case "dead_matte":
        return "Dead Matte";
      default:
        return condition.charAt(0).toUpperCase() + condition.slice(1);
    }
  }

  /**
   * Formats substrate for display
   */
  private static formatSubstrate(substrate: string): string {
    switch (substrate) {
      case "sand":
        return "Sandy Bottom";
      case "rock":
        return "Rocky Bottom";
      case "matte":
        return "Posidonia Matte";
      default:
        return substrate.charAt(0).toUpperCase() + substrate.slice(1);
    }
  }

  /**
   * Gets color for classification
   */
  private static getClassificationColor(classification: string): string {
    switch (classification) {
      case "healthy":
        return "#00CED1";
      case "degraded":
        return "#FF6B6B";
      case "dead":
        return "#8B4513";
      default:
        return "#20B2AA";
    }
  }

  /**
   * Gets color for condition
   */
  private static getConditionColor(condition: string): string {
    switch (condition) {
      case "on_matte":
        return "#059669";
      case "degraded":
        return "#f59e0b";
      case "dead_matte":
        return "#dc2626";
      default:
        return "#6b7280";
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
          description:
            "These thriving seagrass beds provide essential marine habitat, produce oxygen, and support biodiversity. Critical for marine ecosystem health.",
          background:
            "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))",
          borderColor: "#00CED1",
        };
      case "degraded":
        return {
          title: "Degraded Habitat",
          description:
            "This area shows signs of posidonia degradation, possibly from anchoring, pollution, or environmental stress. Recovery is slow and requires protection.",
          background:
            "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(234, 88, 12, 0.1))",
          borderColor: "#FF6B6B",
        };
      case "dead":
        return {
          title: "Former Seagrass Bed",
          description:
            "This area contains dead posidonia matte - the remnants of former seagrass beds. While no longer living, it still provides some habitat structure.",
          background:
            "linear-gradient(135deg, rgba(139, 69, 19, 0.15), rgba(101, 67, 33, 0.1))",
          borderColor: "#8B4513",
        };
      default:
        return {
          title: "Environmental Protection",
          description:
            "These seagrass beds are vital marine ecosystems that provide oxygen, food, and shelter for marine life. Anchoring damages these slow-growing plants.",
          background:
            "linear-gradient(135deg, rgba(125, 211, 252, 0.15), rgba(14, 165, 233, 0.1))",
          borderColor: "#20B2AA",
        };
    }
  }

  /**
   * Parses posidonia description to extract meaningful information
   */
  private static parsePosidoniaDescription(description: string): string {
    // Remove HTML tags and extract useful info
    const cleaned = description
      .replace(/<[^>]*>/g, "")
      .replace(/&[^;]+;/g, " ");

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
   * Generates the HTML content for the vessel position popup
   */
  private static generateVesselPositionPopupHTML(
    properties: VesselPositionProperties
  ): string {
    const positionType = properties.is_start
      ? "oldest"
      : properties.is_end
      ? "latest"
      : "previous";

    const headerConfig = this.getVesselPositionHeaderConfig(positionType);

    return `
      <div style="
        width: 280px;
        max-width: 90vw;
        max-height: 500px;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.2));
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
        border: 1px solid rgba(255, 255, 255, 0.3);
        display: flex;
        flex-direction: column;
      ">
        ${this.generateVesselPositionHeader(properties, headerConfig)}
        ${this.generateVesselPositionBody(properties, headerConfig)}
      </div>
    `;
  }

  /**
   * Generates the vessel position popup header
   */
  private static generateVesselPositionHeader(
    properties: VesselPositionProperties,
    headerConfig: { subtitle: string; gradient: string }
  ): string {
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
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 4px;
          margin-right: 20px;
          line-height: 1.2;
          letter-spacing: 0.03em;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        ">${properties.vesselName}</div>
        <div style="
          font-family: 'Inter', system-ui, sans-serif;
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
   * Generates the vessel position popup body
   */
  private static generateVesselPositionBody(
    properties: VesselPositionProperties,
    headerConfig: { typeLabel: string; typeColor: string }
  ): string {
    const formattedTime = new Date(properties.timestamp).toLocaleString();

    return `
      <div style="
        padding: 14px 16px;
        overflow-y: auto;
        flex: 1;
        min-height: 0;
      ">
        <div style="display: grid; gap: 8px;">
          ${this.createDetailField(
            `${this.md("schedule", 12)} Time:`,
            formattedTime,
            "normal",
            "#6366f1"
          )}
          ${properties.speed ? this.createDetailField(
            `${this.md("navigation", 12)} Speed:`,
            `${properties.speed} knots`,
            "normal",
            "#059669"
          ) : ''}
          ${this.createDetailField(
            `${this.md("flag", 12)} Position Type:`,
            headerConfig.typeLabel,
            "normal",
            headerConfig.typeColor
          )}
          ${this.generatePositionInfo(properties)}
        </div>
      </div>
    `;
  }

  /**
   * Gets header configuration for vessel position type
   */
  private static getVesselPositionHeaderConfig(positionType: string) {
    switch (positionType) {
      case "oldest":
        return {
          subtitle: "EARLIEST POSITION",
          gradient: "rgba(16, 185, 129, 0.8), rgba(5, 150, 105, 0.7), rgba(4, 120, 87, 0.6)",
          typeLabel: "Start of Track",
          typeColor: "#10b981"
        };
      case "latest":
        return {
          subtitle: "MOST RECENT POSITION",
          gradient: "rgba(239, 68, 68, 0.8), rgba(220, 38, 38, 0.7), rgba(185, 28, 28, 0.6)",
          typeLabel: "End of Track",
          typeColor: "#ef4444"
        };
      default:
        return {
          subtitle: "HISTORICAL POSITION",
          gradient: "rgba(59, 130, 246, 0.8), rgba(37, 99, 235, 0.7), rgba(29, 78, 216, 0.6)",
          typeLabel: "Track Point",
          typeColor: "#3b82f6"
        };
    }
  }

  /**
   * Generates position-specific information
   */
  private static generatePositionInfo(properties: VesselPositionProperties): string {
    const positionType = properties.is_start
      ? "oldest"
      : properties.is_end
      ? "latest"
      : "previous";

    const config = this.getPositionInfoConfig(positionType);

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
   * Gets configuration for position info box
   */
  private static getPositionInfoConfig(positionType: string) {
    switch (positionType) {
      case "oldest":
        return {
          title: "Track Start",
          description: "This is the earliest recorded position for this vessel's track. Use this to see where the vessel's journey began.",
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))",
          borderColor: "#10b981",
        };
      case "latest":
        return {
          title: "Latest Position",
          description: "This is the most recent position before the current location. The vessel's track ends near this point.",
          background: "linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1))",
          borderColor: "#ef4444",
        };
      default:
        return {
          title: "Historical Track Point",
          description: "This represents a previous position along the vessel's route. Click different markers to see the vessel's movement pattern.",
          background: "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.1))",
          borderColor: "#3b82f6",
        };
    }
  }
}

export default MapPopupControl;
