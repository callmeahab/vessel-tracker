import mapboxgl from "mapbox-gl";

export interface VesselProperties {
  name: string;
  isInPark: boolean;
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
    const popupContent = this.generatePopupHTML(properties);

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
  private static generatePopupHTML(properties: VesselProperties): string {
    return `
      <div style="
        width: 280px;
        max-width: 90vw;
        font-family: var(--font-jetbrains-mono), monospace, system-ui, -apple-system, sans-serif;
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        background: rgba(255, 255, 255, 0.2);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.3);
      ">
        ${this.generatePopupHeader(properties)}
        ${this.generatePopupBody(properties)}
      </div>
    `;
  }

  /**
   * Generates the header section of the popup
   */
  private static generatePopupHeader(properties: VesselProperties): string {
    return `
      <div style="
        background: linear-gradient(135deg, ${
          properties.isInPark
            ? "rgba(220, 38, 38, 0.8), rgba(239, 68, 68, 0.9)"
            : "rgba(37, 99, 235, 0.8), rgba(59, 130, 246, 0.9)"
        });
        color: white;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      ">
        <div style="
          font-family: var(--font-orbitron), 'Orbitron', sans-serif;
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 4px;
          line-height: 1.2;
          letter-spacing: 0.03em;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        ">${properties.name || "Unknown Vessel"}</div>
        <div style="
          font-family: var(--font-orbitron), 'Orbitron', sans-serif;
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
   * Generates the body section of the popup with vessel details
   */
  private static generatePopupBody(properties: VesselProperties): string {
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
        this.createDetailField("🧭 Course:", `${properties.course}°`)
      );
    }

    // Heading field (if available)
    if (properties.heading !== null && properties.heading !== undefined) {
      fields.push(
        this.createDetailField("🎯 Heading:", `${properties.heading}°`)
      );
    }

    // Destination field (if available)
    if (properties.destination) {
      fields.push(
        this.createDetailField(
          "🏁 Destination:",
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
          "📏 Distance:",
          `${properties.distance.toFixed(1)} nm`,
          "normal",
          "#fbbf24"
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
      color: ${valueColor || "rgba(255, 255, 255, 0.7)"};
      ${
        fontFamily === "monospace"
          ? "font-family: var(--font-jetbrains-mono), 'JetBrains Mono', 'SF Mono', Monaco, monospace;"
          : "font-family: var(--font-jetbrains-mono), 'JetBrains Mono', monospace;"
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
        <span style="font-family: var(--font-jetbrains-mono), 'JetBrains Mono', monospace; font-weight: 600; color: rgba(255, 255, 255, 0.9); font-size: 13px; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5); ${
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
        border-top: 1px solid rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        gap: 6px;
      ">
        <span style="color: rgba(255, 255, 255, 0.6); font-size: 11px;">🕒</span>
        <span style="font-family: var(--font-jetbrains-mono), 'JetBrains Mono', monospace; color: rgba(255, 255, 255, 0.5); font-size: 11px; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);">${new Date(
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
