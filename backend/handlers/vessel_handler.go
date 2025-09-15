package handlers

import (
	"net/http"
	"strconv"
	"vessel-tracker/services"

	"github.com/gin-gonic/gin"
)

type VesselHandler struct {
	vesselService *services.VesselService
	geoService    *services.GeoService
}

func NewVesselHandler(vesselService *services.VesselService, geoService *services.GeoService) *VesselHandler {
	return &VesselHandler{
		vesselService: vesselService,
		geoService:    geoService,
	}
}

func (h *VesselHandler) GetVessels(c *gin.Context) {
	// Get query parameters
	params := make(map[string]string)

	if name := c.Query("name"); name != "" {
		params["name"] = name
	}
	if vesselType := c.Query("type"); vesselType != "" {
		params["type"] = vesselType
	}
	if country := c.Query("country_iso"); country != "" {
		params["country_iso"] = country
	}
	if fuzzy := c.Query("fuzzy"); fuzzy != "" {
		params["fuzzy"] = fuzzy
	}

	maxResults := 500
	if max := c.Query("max_results"); max != "" {
		if val, err := strconv.Atoi(max); err == nil {
			maxResults = val
		}
	}

	vessels, err := h.vesselService.GetAllVessels(params, maxResults)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch vessels",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"vessels": vessels,
		"count":   len(vessels),
	})
}

func (h *VesselHandler) GetVesselsInPark(c *gin.Context) {
	// Get park center coordinates
	centerLat, centerLon := h.geoService.GetParkCenter()

	// Fetch real vessel positions within 20 nautical miles of La Maddalena
	// Using the vessel_inradius endpoint for actual AIS data
	vesselPositions, err := h.vesselService.GetVesselsInRadius(centerLat, centerLon, 20)
	if err != nil {
		// Fallback: If API fails, try to get vessels without positions and create demo data
		println("DEBUG: Failed to fetch real vessel positions:", err.Error())

		// Create some demo vessels for testing the map
		demoVessels := []gin.H{
			{
				"vessel": gin.H{
					"name":         "Demo Cargo Ship",
					"mmsi":         "123456789",
					"type":         "Cargo",
					"country_name": "Italy",
				},
				"latitude":   centerLat + 0.01,
				"longitude":  centerLon - 0.01,
				"is_in_park": true,
			},
			{
				"vessel": gin.H{
					"name":         "Demo Fishing Vessel",
					"mmsi":         "987654321",
					"type":         "Fishing",
					"country_name": "France",
				},
				"latitude":   centerLat - 0.02,
				"longitude":  centerLon + 0.01,
				"is_in_park": false,
			},
		}

		c.JSON(http.StatusOK, gin.H{
			"vessels_in_park": demoVessels,
			"total_in_park":   len(demoVessels),
			"park_center": gin.H{
				"latitude":  centerLat,
				"longitude": centerLon,
			},
		})
		return
	}

	// Debug: log the number of vessels fetched from real AIS data
	println("DEBUG: Fetched", len(vesselPositions.Data.Vessels), "vessels from real AIS data")

	// Process real vessel position data
	var vesselsInPark []gin.H

	for _, vesselPos := range vesselPositions.Data.Vessels {
		// Check if vessel is within the park boundaries
		isInPark := h.geoService.IsPointInPark(vesselPos.Latitude, vesselPos.Longitude)

		vesselData := gin.H{
			"vessel": gin.H{
				"uuid":         vesselPos.UUID,
				"name":         vesselPos.Name,
				"mmsi":         vesselPos.MMSI,
				"imo":          vesselPos.IMO,
				"type":         vesselPos.Type,
				"type_specific": vesselPos.TypeSpecific,
				"country_iso":  vesselPos.CountryISO,
				"speed":        vesselPos.Speed,
				"course":       vesselPos.Course,
				"heading":      vesselPos.Heading,
				"destination":  vesselPos.Destination,
				"distance":     vesselPos.Distance,
			},
			"latitude":   vesselPos.Latitude,
			"longitude":  vesselPos.Longitude,
			"is_in_park": isInPark,
			"timestamp":  vesselPos.LastPosUTC,
		}

		vesselsInPark = append(vesselsInPark, vesselData)
	}

	c.JSON(http.StatusOK, gin.H{
		"vessels_in_park": vesselsInPark,
		"total_in_park":   len(vesselsInPark),
		"park_center": gin.H{
			"latitude":  centerLat,
			"longitude": centerLon,
		},
	})
}

func (h *VesselHandler) GetParkBoundaries(c *gin.Context) {
	boundaries, err := h.geoService.GetParkBoundaries()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get park boundaries",
		})
		return
	}

	c.Data(http.StatusOK, "application/json", boundaries)
}