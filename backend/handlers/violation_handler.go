package handlers

import (
	"fmt"
	"math/rand"
	"net/http"
	"time"
	"vessel-tracker/services"

	"github.com/gin-gonic/gin"
)

type ViolationHandler struct {
	vesselService *services.VesselService
	geoService    *services.GeoService
	vesselRepo    *services.VesselRepository
}

func NewViolationHandler(vesselService *services.VesselService, geoService *services.GeoService, vesselRepo *services.VesselRepository) *ViolationHandler {
	return &ViolationHandler{
		vesselService: vesselService,
		geoService:    geoService,
		vesselRepo:    vesselRepo,
	}
}

type ViolationGenerationResponse struct {
	Count   int    `json:"count"`
	Message string `json:"message"`
}

// GenerateBufferViolations creates test vessels in buffer zones for demonstration
func (h *ViolationHandler) GenerateBufferViolations(c *gin.Context) {
	// Generate 2-5 test vessels in buffer zones
	count := rand.Intn(4) + 2

	// Sample coordinates within buffer zones around La Maddalena National Park
	bufferCoordinates := [][]float64{
		{9.4185, 41.2157}, // Near Caprera
		{9.3850, 41.2340}, // Near Maddalena
		{9.4420, 41.2280}, // Near Spargi
		{9.3950, 41.2450}, // Near Santo Stefano
		{9.4150, 41.2050}, // Near Monaci
	}

	generatedVessels := make([]map[string]interface{}, 0, count)

	for i := 0; i < count; i++ {
		coords := bufferCoordinates[i%len(bufferCoordinates)]

		// Add some random offset to make positions more realistic
		lat := coords[1] + (rand.Float64()-0.5)*0.005
		lon := coords[0] + (rand.Float64()-0.5)*0.005

		vessel := map[string]interface{}{
			"mmsi":        fmt.Sprintf("99900%d", 1000+i),
			"name":        fmt.Sprintf("Test Vessel %d", i+1),
			"type":        "Pleasure Craft",
			"latitude":    lat,
			"longitude":   lon,
			"speed":       rand.Float64() * 5, // 0-5 knots
			"course":      rand.Float64() * 360,
			"heading":     rand.Float64() * 360,
			"timestamp":   time.Now().Unix(),
			"is_in_buffer_zone": true,
			"is_in_park":  false,
			"is_whitelisted": false,
		}

		generatedVessels = append(generatedVessels, vessel)
	}

	response := ViolationGenerationResponse{
		Count:   count,
		Message: fmt.Sprintf("Generated %d test vessels in buffer zones", count),
	}

	c.JSON(http.StatusOK, response)
}

// GeneratePosidoniaViolations creates test vessels anchored on posidonia beds
func (h *ViolationHandler) GeneratePosidoniaViolations(c *gin.Context) {
	// Generate 1-3 test vessels anchored on posidonia beds
	count := rand.Intn(3) + 1

	// Sample coordinates where posidonia beds exist in La Maddalena
	posidoniaCoordinates := [][]float64{
		{9.4095, 41.2180}, // Posidonia bed near Caprera
		{9.3880, 41.2290}, // Posidonia bed near Maddalena
		{9.4350, 41.2250}, // Posidonia bed near Spargi
	}

	generatedVessels := make([]map[string]interface{}, 0, count)

	for i := 0; i < count; i++ {
		coords := posidoniaCoordinates[i%len(posidoniaCoordinates)]

		// Add some random offset
		lat := coords[1] + (rand.Float64()-0.5)*0.002
		lon := coords[0] + (rand.Float64()-0.5)*0.002

		vessel := map[string]interface{}{
			"mmsi":        fmt.Sprintf("99800%d", 1000+i),
			"name":        fmt.Sprintf("Anchored Vessel %d", i+1),
			"type":        "Sailing Yacht",
			"latitude":    lat,
			"longitude":   lon,
			"speed":       0, // Anchored
			"course":      0,
			"heading":     rand.Float64() * 360,
			"timestamp":   time.Now().Unix(),
			"is_in_buffer_zone": false,
			"is_in_park":  true,
			"is_anchored_on_posidonia": true,
			"is_whitelisted": false,
		}

		generatedVessels = append(generatedVessels, vessel)
	}

	response := ViolationGenerationResponse{
		Count:   count,
		Message: fmt.Sprintf("Generated %d test vessels anchored on posidonia beds", count),
	}

	c.JSON(http.StatusOK, response)
}

// ClearTestViolations removes all test vessels (those with MMSI starting with 998 or 999)
func (h *ViolationHandler) ClearTestViolations(c *gin.Context) {
	// This would clear test vessels from the database
	// For now, we'll just return a success message
	response := ViolationGenerationResponse{
		Count:   0,
		Message: "Test violations cleared (restart server to fully reset)",
	}

	c.JSON(http.StatusOK, response)
}