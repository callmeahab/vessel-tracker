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
  is_in_buffer_zone?: boolean;
  is_whitelisted?: boolean;
  whitelist_info?: {
    reason: string;
    added_by: string;
  };
  timestamp?: string;
}

export interface VesselHistoryEntry {
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  heading: number | null;
  destination: string;
  distance: number;
  is_in_park: boolean;
  timestamp: string;
  recorded_at: string;
}

export interface VesselHistoryResponse {
  vessel_uuid: string;
  history: VesselHistoryEntry[];
  count: number;
  start_time: string;
  end_time: string;
  limit: number;
}