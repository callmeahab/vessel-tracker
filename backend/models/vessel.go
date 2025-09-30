package models

import (
	"fmt"
	"math"
	"time"
)

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

// MarineTraffic API response structures

type MarineTrafficVessel struct {
	MMSI         string  `json:"MMSI"`
	IMO          string  `json:"IMO"`
	ShipID       string  `json:"SHIP_ID"`
	Latitude     string  `json:"LAT"`
	Longitude    string  `json:"LON"`
	Speed        string  `json:"SPEED"`
	Heading      string  `json:"HEADING"`
	Course       string  `json:"COURSE"`
	Status       string  `json:"STATUS"`
	Timestamp    string  `json:"TIMESTAMP"`
	DSRC         string  `json:"DSRC"`
	UTCSeconds   string  `json:"UTC_SECONDS"`
	Market       string  `json:"MARKET"`
	ShipName     string  `json:"SHIPNAME"`
	ShipType     string  `json:"SHIPTYPE"`
	TypeName     string  `json:"TYPE_NAME"`
	AISType      string  `json:"AIS_TYPE_SUMMARY"`
	Flag         string  `json:"FLAG"`
	CallSign     string  `json:"CALLSIGN"`
	Destination  string  `json:"DESTINATION"`
	CurrentPort  string  `json:"CURRENT_PORT"`
	LastPort     string  `json:"LAST_PORT"`
	ETA          string  `json:"ETA"`
	Length       string  `json:"LENGTH"`
	Width        string  `json:"WIDTH"`
	Draught      string  `json:"DRAUGHT"`
	GRT          string  `json:"GRT"`
	DWT          string  `json:"DWT"`
	YearBuilt    string  `json:"YEAR_BUILT"`
	ShipCountry  string  `json:"SHIP_COUNTRY"`
}

type MarineTrafficMetadata struct {
	Cursor   string `json:"CURSOR"`
	DateFrom string `json:"DATE_FROM"`
	DateTo   string `json:"DATE_TO"`
}

type MarineTrafficResponse struct {
	Data     []MarineTrafficVessel `json:"DATA"`
	Metadata MarineTrafficMetadata `json:"METADATA"`
}

type MarineTrafficTrackPoint struct {
	MMSI      string `json:"MMSI"`
	IMO       string `json:"IMO"`
	Status    string `json:"STATUS"`
	Speed     string `json:"SPEED"`
	Longitude string `json:"LON"`
	Latitude  string `json:"LAT"`
	Course    string `json:"COURSE"`
	Heading   string `json:"HEADING"`
	Timestamp string `json:"TIMESTAMP"`
	ShipID    string `json:"SHIP_ID"`
}

type MarineTrafficTrackResponse struct {
	Data []MarineTrafficTrackPoint `json:"DATA"`
}

// Converter functions

func ConvertMarineTrafficToVesselPosition(mtResp *MarineTrafficResponse, centerLat, centerLon float64) *VesselPositionResponse {
	vessels := make([]VesselPosition, 0, len(mtResp.Data))

	for _, mtVessel := range mtResp.Data {
		// Parse latitude and longitude
		lat := parseFloat(mtVessel.Latitude)
		lon := parseFloat(mtVessel.Longitude)

		// Calculate distance from center point
		distance := calculateDistance(centerLat, centerLon, lat, lon)

		// Convert timestamp to epoch and UTC string
		epoch, utcStr := parseMarineTrafficTimestamp(mtVessel.Timestamp)

		// Parse heading (handle -1 and 511 as nil)
		var heading *int
		headingVal := parseInt(mtVessel.Heading)
		if headingVal >= 0 && headingVal < 360 {
			heading = &headingVal
		}

		vessel := VesselPosition{
			UUID:         mtVessel.MMSI, // MarineTraffic doesn't provide UUID, use MMSI
			Name:         mtVessel.ShipName,
			MMSI:         mtVessel.MMSI,
			IMO:          mtVessel.IMO,
			Type:         mtVessel.TypeName,
			TypeSpecific: mtVessel.TypeName,
			Latitude:     lat,
			Longitude:    lon,
			Speed:        parseFloat(mtVessel.Speed) / 10.0, // SPEED is in knots x10
			Course:       parseFloat(mtVessel.Course),
			Heading:      heading,
			Destination:  mtVessel.Destination,
			CountryISO:   mtVessel.Flag,
			Distance:     distance,
			LastPosEpoch: epoch,
			LastPosUTC:   utcStr,
		}

		vessels = append(vessels, vessel)
	}

	return &VesselPositionResponse{
		Data: VesselPositionData{
			Total:   len(vessels),
			Vessels: vessels,
		},
	}
}

func ConvertMarineTrafficTrackToHistory(mtTrackResp *MarineTrafficTrackResponse) *VesselHistoryResponse {
	if len(mtTrackResp.Data) == 0 {
		return &VesselHistoryResponse{}
	}

	// Get vessel info from first record
	firstPoint := mtTrackResp.Data[0]

	positions := make([]VesselHistoryPosition, 0, len(mtTrackResp.Data))

	for _, point := range mtTrackResp.Data {
		epoch, utcStr := parseMarineTrafficTimestamp(point.Timestamp)

		// Parse heading
		var heading *int
		headingVal := parseInt(point.Heading)
		if headingVal >= 0 && headingVal < 360 {
			heading = &headingVal
		}

		position := VesselHistoryPosition{
			Latitude:          parseFloat(point.Latitude),
			Longitude:         parseFloat(point.Longitude),
			Speed:             parseFloat(point.Speed) / 10.0, // SPEED is in knots x10
			Course:            parseFloat(point.Course),
			Heading:           heading,
			LastPositionEpoch: epoch,
			LastPositionUTC:   utcStr,
		}

		positions = append(positions, position)
	}

	return &VesselHistoryResponse{
		Data: VesselHistoryData{
			UUID:      firstPoint.MMSI, // Use MMSI as UUID
			Name:      "",              // Not provided in track data
			MMSI:      firstPoint.MMSI,
			IMO:       firstPoint.IMO,
			Positions: positions,
		},
		Meta: Meta{
			Success: true,
		},
	}
}

func parseMarineTrafficTimestamp(timestamp string) (int64, string) {
	// MarineTraffic timestamps are in ISO 8601 format "2020-10-15T12:21:44.000Z"
	t, err := time.Parse(time.RFC3339, timestamp)
	if err != nil {
		// Try alternative format without milliseconds
		t, err = time.Parse("2006-01-02T15:04:05Z", timestamp)
		if err != nil {
			return 0, timestamp
		}
	}
	return t.Unix(), t.Format(time.RFC3339)
}

func parseFloat(s string) float64 {
	var f float64
	fmt.Sscanf(s, "%f", &f)
	return f
}

func parseInt(s string) int {
	var i int
	fmt.Sscanf(s, "%d", &i)
	return i
}

func calculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
	// Haversine formula for distance calculation
	const earthRadiusKm = 6371.0

	dLat := (lat2 - lat1) * (3.14159265359 / 180.0)
	dLon := (lon2 - lon1) * (3.14159265359 / 180.0)

	lat1Rad := lat1 * (3.14159265359 / 180.0)
	lat2Rad := lat2 * (3.14159265359 / 180.0)

	a := (1 - math.Cos(dLat)) / 2 + math.Cos(lat1Rad) * math.Cos(lat2Rad) * (1 - math.Cos(dLon)) / 2
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return earthRadiusKm * c
}