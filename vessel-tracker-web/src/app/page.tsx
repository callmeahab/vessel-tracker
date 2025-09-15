"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { VesselData } from "@/types/vessel";
import Header from "@/components/Header/Header";
import VesselList from "@/components/VesselList/VesselList";
import Legend from "@/components/Legend/Legend";
import MapComponent from "@/components/Map/Map";

export default function Home() {
  const [vessels, setVessels] = useState<VesselData[]>([]);
  const [parkBoundaries, setParkBoundaries] =
    useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Starting data fetch...");
        setLoading(true);
        setError(null);

        // Fetch park boundaries
        console.log("Fetching park boundaries...");
        const boundariesResponse = await fetch(
          `${API_BASE_URL}/api/park-boundaries`
        );
        if (boundariesResponse.ok) {
          const boundaries = await boundariesResponse.json();
          console.log("Park boundaries loaded successfully");
          setParkBoundaries(boundaries);
        } else {
          console.error(
            "Failed to fetch boundaries:",
            boundariesResponse.status
          );
        }

        // Fetch vessels in park
        console.log("Fetching vessels...");
        const vesselsResponse = await fetch(
          `${API_BASE_URL}/api/vessels/in-park`
        );
        if (vesselsResponse.ok) {
          const vesselData = await vesselsResponse.json();
          const vessels = vesselData.vessels_in_park || [];
          console.log(`Loaded ${vessels.length} vessels`);
          setVessels(Array.isArray(vessels) ? vessels : []);
        } else {
          console.warn("Failed to fetch vessels:", vesselsResponse.status);
          setVessels([]);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please check your connection.");
      } finally {
        setLoading(false);
        console.log("Data fetch completed");
      }
    };

    fetchData();
  }, [API_BASE_URL]);

  const refreshData = () => {
    window.location.reload();
  };

  const handleMapReady = useCallback((map: mapboxgl.Map) => {
    mapRef.current = map;
  }, []);

  const handleVesselClick = useCallback((vessel: VesselData) => {
    if (mapRef.current) {
      // Zoom to vessel with smooth animation
      mapRef.current.flyTo({
        center: [vessel.longitude, vessel.latitude],
        zoom: 16,
        duration: 2000,
      });
    }
  }, []);

  if (error) {
    return (
      <div className="error-container">
        <div className="background-overlay"></div>
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <p className="error-text">{error}</p>
          <button onClick={refreshData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      <div className="background-overlay"></div>

      <Header
        vesselCount={Array.isArray(vessels) ? vessels.length : 0}
        vesselsInPark={
          Array.isArray(vessels)
            ? vessels.filter((v) => v.is_in_park).length
            : 0
        }
        onRefresh={refreshData}
      />

      <MapComponent
        vessels={vessels}
        parkBoundaries={parkBoundaries}
        loading={loading}
        onMapReady={handleMapReady}
      />

      <Legend />

      <VesselList vessels={vessels} onVesselClick={handleVesselClick} />
    </div>
  );
}
