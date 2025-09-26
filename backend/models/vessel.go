package models

import "time"

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

type VesselRecord struct {
	ID           uint    `gorm:"primaryKey" json:"id"`
	UUID         string  `gorm:"uniqueIndex;not null" json:"uuid"`
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
	GrossTonnage *float64 `gorm:"type:decimal(10,2)" json:"gross_tonnage"`
	Deadweight   *float64 `gorm:"type:decimal(10,2)" json:"deadweight"`
	TEU          *int     `json:"teu"`
	LiquidGas    *float64 `gorm:"type:decimal(10,2)" json:"liquid_gas"`
	Length       float64 `gorm:"type:decimal(8,2)" json:"length"`
	Breadth      float64 `gorm:"type:decimal(8,2)" json:"breadth"`
	DraughtAvg   *float64 `gorm:"type:decimal(8,2)" json:"draught_avg"`
	DraughtMax   *float64 `gorm:"type:decimal(8,2)" json:"draught_max"`
	SpeedAvg     *float64 `gorm:"type:decimal(8,2)" json:"speed_avg"`
	SpeedMax     *float64 `gorm:"type:decimal(8,2)" json:"speed_max"`
	YearBuilt    string  `json:"year_built"`
	IsNavaid     bool    `json:"is_navaid"`
	HomePort     *string `json:"home_port"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type VesselPositionRecord struct {
	ID           uint    `gorm:"primaryKey" json:"id"`
	VesselUUID   string  `gorm:"index;not null" json:"vessel_uuid"`
	Latitude     float64 `gorm:"type:decimal(10,6);not null" json:"latitude"`
	Longitude    float64 `gorm:"type:decimal(10,6);not null" json:"longitude"`
	Speed        float64 `gorm:"type:decimal(8,2)" json:"speed"`
	Course       float64 `gorm:"type:decimal(8,2)" json:"course"`
	Heading      *int    `json:"heading"`
	Destination  string  `json:"destination"`
	Distance     float64 `gorm:"type:decimal(10,2)" json:"distance"`
	IsInPark     bool    `gorm:"index" json:"is_in_park"`
	LastPosEpoch int64   `gorm:"index" json:"last_position_epoch"`
	LastPosUTC   string  `json:"last_position_utc"`
	ETAEpoch     *int64  `json:"eta_epoch"`
	ETAUTC       *string `json:"eta_utc"`
	RecordedAt   time.Time `gorm:"index;not null" json:"recorded_at"`

	Vessel VesselRecord `gorm:"foreignKey:VesselUUID;references:UUID" json:"vessel,omitempty"`
}

type WhitelistEntry struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	VesselUUID  string    `gorm:"uniqueIndex;not null" json:"vessel_uuid"`
	MMSI        string    `gorm:"index" json:"mmsi"`
	IMO         string    `gorm:"index" json:"imo"`
	Name        string    `json:"name"`
	Reason      string    `json:"reason"`
	AddedBy     string    `json:"added_by"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	Vessel VesselRecord `gorm:"foreignKey:VesselUUID;references:UUID" json:"vessel,omitempty"`
}

// VesselHistoryPosition represents a historical position from Datalastic API
type VesselHistoryPosition struct {
	Latitude         float64 `json:"lat"`
	Longitude        float64 `json:"lon"`
	Speed            float64 `json:"speed"`
	Course           float64 `json:"course"`
	Heading          *int    `json:"heading"`
	Destination      string  `json:"destination"`
	LastPositionEpoch int64   `json:"last_position_epoch"`
	LastPositionUTC  string  `json:"last_position_UTC"`
}

// VesselHistoryData represents vessel historical data from Datalastic API
type VesselHistoryData struct {
	UUID         string                  `json:"uuid"`
	Name         string                  `json:"name"`
	MMSI         string                  `json:"mmsi"`
	IMO          string                  `json:"imo"`
	ENI          *string                 `json:"eni"`
	CountryISO   string                  `json:"country_iso"`
	Type         string                  `json:"type"`
	TypeSpecific string                  `json:"type_specific"`
	Positions    []VesselHistoryPosition `json:"positions"`
}

// VesselHistoryResponse represents the response from vessel_history API
type VesselHistoryResponse struct {
	Data VesselHistoryData `json:"data"`
	Meta Meta              `json:"meta"`
}