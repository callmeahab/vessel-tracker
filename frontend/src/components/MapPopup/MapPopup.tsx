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
  violations?: any[];
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
        ${this.generateVesselPopupHeader(properties)}
        ${this.generateVesselPopupBodyWithViolations(properties)}
      </div>
    `;
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
   * Generates the header section of the vessel popup
   */
  private static generateVesselPopupHeader(
    properties: VesselProperties
  ): string {
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
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 4px;
          margin-right: 20px;
          line-height: 1.2;
          letter-spacing: 0.03em;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        ">${properties.name || "Unknown Vessel"}</div>
        <div style="
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 10px;
          opacity: 0.9;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        ">${properties.isInPark ? `INSIDE PARK` : `NEARBY`}</div>
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
   * Generates the body section of the popup with vessel details and violations (scrollable)
   */
  private static generateVesselPopupBodyWithViolations(properties: VesselProperties): string {
    const fields = this.buildDetailFields(properties);

    return `
      <div style="
        overflow-y: auto;
        flex: 1;
        min-height: 0;
      ">
        ${this.generateViolationsSection(properties)}
        <div style="padding: 14px 16px;">
          <div style="display: grid; gap: 8px;">
            ${fields.join("")}
            ${this.generateTimestamp(properties.timestamp)}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generates the body section of the popup with vessel details
   */
  private static generateVesselPopupBody(properties: VesselProperties): string {
    const fields = this.buildDetailFields(properties);

    return `
      <div style="
        padding: 14px 16px;
        overflow-y: auto;
        flex: 1;
        min-height: 0;
      ">
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
          `${this.md("bolt", 12)} Speed:`,
          `${properties.speed} knots`,
          "normal",
          "#059669"
        )
      );
    }

    // Course field (if available)
    if (properties.course !== null && properties.course !== undefined) {
      fields.push(
        this.createDetailField(
          `${this.md("navigation", 12)} Course:`,
          `${properties.course}°`
        )
      );
    }

    // Heading field (if available)
    if (properties.heading !== null && properties.heading !== undefined) {
      fields.push(
        this.createDetailField(
          `${this.md("arrow_forward", 12)} Heading:`,
          `${properties.heading}°`
        )
      );
    }

    // Destination field (if available)
    if (properties.destination) {
      fields.push(
        this.createDetailField(
          `${this.md("flag", 12)} Destination:`,
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
          `${this.md("straighten", 12)} Distance:`,
          `${properties.distance.toFixed(1)} nm`,
          "normal",
          "#fbbf24"
        )
      );
    }

    // Posidonia distance (if vessel is near posidonia beds)
    if (
      properties.distanceToNearestPosidonia !== null &&
      properties.distanceToNearestPosidonia !== undefined &&
      properties.distanceToNearestPosidonia < 500
    ) {
      const distance = properties.distanceToNearestPosidonia;
      const color =
        distance < 50 ? "#ef4444" : distance < 100 ? "#f59e0b" : "#10b981";
      const icon =
        distance < 50
          ? this.md("warning", 12)
          : distance < 100
          ? this.md("bolt", 12)
          : this.md("check_circle", 12);

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
          `${this.md("block", 12)} Violation:`,
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
  <span style="color: rgba(0, 0, 0, 0.6); font-size: 11px;">${this.md(
    "schedule",
    12
  )}</span>
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

  /**
   * Generates violations section for vessel popup
   */
  private static generateViolationsSection(
    properties: VesselProperties
  ): string {
    // Handle violations that might be stringified by MapBox
    let violations = properties.violations;

    if (typeof violations === "string") {
      try {
        violations = JSON.parse(violations);
      } catch (e) {
        violations = [];
      }
    }

    if (!violations || !Array.isArray(violations) || violations.length === 0) {
      return `
        <div style="
          padding: 12px 16px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.8), rgba(5, 150, 105, 0.7), rgba(16, 185, 129, 0.65));
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
          border-radius: 8px;
          margin: 8px 16px;
          margin-bottom: 12px;
        ">
          <div style="
            font-size: 12px;
            color: white;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
          ">
            ${this.md("check", 14)}
            No Violations Detected
          </div>
        </div>
      `;
    }

    const violationItems = violations
      .map((violation) => {
        const severityColors = {
          critical: "#dc2626",
          high: "#ea580c",
          medium: "#d97706",
          low: "#059669",
        };

        const severityIcons = {
          critical: this.md("warning", 12),
          high: this.md("priority_high", 12),
          medium: this.md("info", 12),
          low: this.md("check_circle", 12),
        } as const;

        type SeverityKey = keyof typeof severityColors; // "critical" | "high" | "medium" | "low"
        const sev: unknown = (violation as any)?.severity;
        const sevKey: SeverityKey | undefined =
          sev === "critical" ||
          sev === "high" ||
          sev === "medium" ||
          sev === "low"
            ? (sev as SeverityKey)
            : undefined;

        const color = sevKey ? severityColors[sevKey] : "#6b7280";
        // Use a default Material-style warning icon (inline SVG) instead of emoji fallback
        const defaultIcon =
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M1 21h22L12 2 1 21zm12-3h-2v2h2v-2zm0-8h-2v6h2V10z"/></svg>';
        const icon = sevKey ? severityIcons[sevKey] : defaultIcon;

        return `
        <div style="
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 8px;
          padding: 8px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.15), rgba(16, 185, 129, 0.1));
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          border-radius: 6px;
          border-left: 3px solid ${color};
          border: 1px solid rgba(255, 255, 255, 0.1);
        ">
          <div style="color: ${color}; flex-shrink: 0;">${icon}</div>
          <div style="flex: 1; min-width: 0;">
            <div style="
              font-size: 11px;
              font-weight: 600;
              color: white;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 2px;
              text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
            ">${String((violation as any)?.type || "violation").replace(
              /_/g,
              " "
            )}</div>
            <div style="
              font-size: 10px;
              color: rgba(255, 255, 255, 0.9);
              line-height: 1.3;
              text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
            ">${String((violation as any)?.description || "")}</div>
          </div>
        </div>
      `;
      })
      .join("");

    return `
      <div style="
        padding: 12px 16px;
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.8), rgba(220, 38, 38, 0.7), rgba(185, 28, 28, 0.6));
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
        border-radius: 8px;
        margin: 8px 16px;
        margin-bottom: 12px;
      ">
        <div style="
          font-size: 12px;
          color: white;
          font-weight: 600;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
        ">
          ${this.md("warning", 14)}
          Violations (${violations.length})
        </div>
        ${violationItems}
      </div>
    `;
  }
}

export default MapPopupControl;
