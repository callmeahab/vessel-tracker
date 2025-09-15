export interface Vessel {
  uuid?: string;
  mmsi: string;
  name: string;
  type: string;
  type_specific?: string;
  country_iso?: string;
  countryName?: string;
  imo?: string;
  speed?: number;
  course?: number;
  heading?: number;
  destination?: string;
  distance?: number;
}

export interface VesselData {
  vessel: Vessel;
  latitude: number;
  longitude: number;
  is_in_park: boolean;
  timestamp?: string;
}