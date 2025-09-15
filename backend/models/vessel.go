package models

type Vessel struct {
	UUID         string  `json:"uuid"`
	Name         string  `json:"name"`
	NameAIS      string  `json:"name_ais"`
	MMSI         string  `json:"mmsi"`
	IMO          string  `json:"imo"`
	ENI          *string `json:"eni"`
	CountryISO   string  `json:"country_iso"`
	CountryName  string  `json:"country_name"`
	Callsign     string  `json:"callsign"`
	Type         string  `json:"type"`
	TypeSpecific string  `json:"type_specific"`
	GrossTonnage interface{} `json:"gross_tonnage"`
	Deadweight   interface{} `json:"deadweight"`
	TEU          interface{} `json:"teu"`
	LiquidGas    interface{} `json:"liquid_gas"`
	Length       float64 `json:"length"`
	Breadth      float64 `json:"breadth"`
	DraughtAvg   *float64 `json:"draught_avg"`
	DraughtMax   *float64 `json:"draught_max"`
	SpeedAvg     *float64 `json:"speed_avg"`
	SpeedMax     *float64 `json:"speed_max"`
	YearBuilt    string  `json:"year_built"`
	IsNavaid     bool    `json:"is_navaid"`
	HomePort     *string `json:"home_port"`

	// Additional fields for tracking
	Latitude     float64 `json:"latitude,omitempty"`
	Longitude    float64 `json:"longitude,omitempty"`
	IsInPark     bool    `json:"is_in_park,omitempty"`
	LastUpdated  string  `json:"last_updated,omitempty"`
}

type VesselResponse struct {
	Data []Vessel `json:"data"`
	Meta Meta     `json:"meta"`
}

type Meta struct {
	Duration float64 `json:"duration"`
	Endpoint string  `json:"endpoint"`
	Next     string  `json:"next,omitempty"`
	Success  bool    `json:"success"`
}

type VesselPosition struct {
	UUID         string  `json:"uuid"`
	Name         string  `json:"name"`
	MMSI         string  `json:"mmsi"`
	IMO          string  `json:"imo"`
	Type         string  `json:"type"`
	TypeSpecific string  `json:"type_specific"`
	Latitude     float64 `json:"lat"`
	Longitude    float64 `json:"lon"`
	Speed        float64 `json:"speed"`
	Course       float64 `json:"course"`
	Heading      *int    `json:"heading"`
	Destination  string  `json:"destination"`
	CountryISO   string  `json:"country_iso"`
	Distance     float64 `json:"distance"`
	LastPosEpoch int64   `json:"last_position_epoch"`
	LastPosUTC   string  `json:"last_position_UTC"`
	ETAEpoch     *int64  `json:"eta_epoch"`
	ETAUTC       *string `json:"eta_UTC"`
}

type VesselPositionData struct {
	Point   map[string]interface{} `json:"point"`
	Total   int                    `json:"total"`
	Vessels []VesselPosition       `json:"vessels"`
}

type VesselPositionResponse struct {
	Data VesselPositionData `json:"data"`
}