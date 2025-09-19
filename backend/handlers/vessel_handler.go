package handlers

import (
	"net/http"
	"strconv"
	"time"
	"vessel-tracker/services"

	"github.com/gin-gonic/gin"
)

type VesselHandler struct {
	vesselService    *services.VesselService
	geoService       *services.GeoService
	vesselRepo       *services.VesselRepository
	whitelistService *services.WhitelistService
}

func NewVesselHandler(vesselService *services.VesselService, geoService *services.GeoService, vesselRepo *services.VesselRepository, whitelistService *services.WhitelistService) *VesselHandler {
	return &VesselHandler{
		vesselService:    vesselService,
		geoService:       geoService,
		vesselRepo:       vesselRepo,
		whitelistService: whitelistService,
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

	// Get latest vessel positions from database
	positions, err := h.vesselRepo.GetLatestVesselPositions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch vessel positions from database",
			"details": err.Error(),
		})
		return
	}

	// If no data in database, try to fetch from API as fallback
	if len(positions) == 0 {
		vesselPositions, apiErr := h.vesselService.GetVesselsInRadius(centerLat, centerLon, 20)
		if apiErr != nil {
			// No data available anywhere, return demo data
			demoVessels := []gin.H{
				{
					"vessel": gin.H{
						"name":         "Demo Cargo Ship",
						"mmsi":         "123456789",
						"type":         "Cargo",
						"country_name": "Italy",
					},
					"latitude":          centerLat + 0.01,
					"longitude":         centerLon - 0.01,
					"is_in_park":        true,
					"is_in_buffer_zone": false,
				},
				{
					"vessel": gin.H{
						"name":         "Demo Fishing Vessel",
						"mmsi":         "987654321",
						"type":         "Fishing",
						"country_name": "France",
					},
					"latitude":          centerLat - 0.02,
					"longitude":         centerLon + 0.01,
					"is_in_park":        false,
					"is_in_buffer_zone": true,
				},
				{
					"vessel": gin.H{
						"name":         "Demo Tourist Boat",
						"mmsi":         "555666777",
						"type":         "Pleasure",
						"country_name": "Spain",
					},
					"latitude":          centerLat + 0.005,
					"longitude":         centerLon + 0.005,
					"is_in_park":        false,
					"is_in_buffer_zone": true,
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

		// Process API data directly
		var vesselsFromAPI []gin.H
		for _, vesselPos := range vesselPositions.Data.Vessels {
			isInPark := h.geoService.IsPointInPark(vesselPos.Latitude, vesselPos.Longitude)
			isInBufferZone := h.geoService.IsPointInBufferZone(vesselPos.Latitude, vesselPos.Longitude)

			// Check if vessel is whitelisted
			isWhitelisted := h.whitelistService.IsVesselWhitelisted(vesselPos.UUID, vesselPos.MMSI, vesselPos.IMO)
			whitelistEntry := h.whitelistService.GetWhitelistEntry(vesselPos.UUID, vesselPos.MMSI, vesselPos.IMO)

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
				"latitude":          vesselPos.Latitude,
				"longitude":         vesselPos.Longitude,
				"is_in_park":        isInPark,
				"is_in_buffer_zone": isInBufferZone,
				"is_whitelisted":    isWhitelisted,
				"timestamp":         vesselPos.LastPosUTC,
			}

			if whitelistEntry != nil {
				vesselData["whitelist_info"] = gin.H{
					"reason":   whitelistEntry.Reason,
					"added_by": whitelistEntry.AddedBy,
				}
			}

			vesselsFromAPI = append(vesselsFromAPI, vesselData)
		}

		c.JSON(http.StatusOK, gin.H{
			"vessels_in_park": vesselsFromAPI,
			"total_in_park":   len(vesselsFromAPI),
			"park_center": gin.H{
				"latitude":  centerLat,
				"longitude": centerLon,
			},
		})
		return
	}

	// Process database data
	var vesselsInPark []gin.H
	for _, pos := range positions {
		isInBufferZone := h.geoService.IsPointInBufferZone(pos.Latitude, pos.Longitude)

		// Check if vessel is whitelisted
		isWhitelisted := h.whitelistService.IsVesselWhitelisted(pos.VesselUUID, pos.Vessel.MMSI, pos.Vessel.IMO)
		whitelistEntry := h.whitelistService.GetWhitelistEntry(pos.VesselUUID, pos.Vessel.MMSI, pos.Vessel.IMO)

		vesselData := gin.H{
			"vessel": gin.H{
				"uuid":         pos.VesselUUID,
				"name":         pos.Vessel.Name,
				"mmsi":         pos.Vessel.MMSI,
				"imo":          pos.Vessel.IMO,
				"type":         pos.Vessel.Type,
				"type_specific": pos.Vessel.TypeSpecific,
				"country_iso":  pos.Vessel.CountryISO,
				"speed":        pos.Speed,
				"course":       pos.Course,
				"heading":      pos.Heading,
				"destination":  pos.Destination,
				"distance":     pos.Distance,
			},
			"latitude":          pos.Latitude,
			"longitude":         pos.Longitude,
			"is_in_park":        pos.IsInPark,
			"is_in_buffer_zone": isInBufferZone,
			"is_whitelisted":    isWhitelisted,
			"timestamp":         pos.LastPosUTC,
		}

		if whitelistEntry != nil {
			vesselData["whitelist_info"] = gin.H{
				"reason":   whitelistEntry.Reason,
				"added_by": whitelistEntry.AddedBy,
			}
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

func (h *VesselHandler) GetBufferedBoundaries(c *gin.Context) {
	boundaries, err := h.geoService.GetBufferedBoundaries()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get buffered boundaries",
		})
		return
	}

	c.Data(http.StatusOK, "application/json", boundaries)
}

func (h *VesselHandler) GetVesselsAtTime(c *gin.Context) {
	timestampStr := c.Query("timestamp")
	if timestampStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "timestamp parameter is required",
		})
		return
	}

	timestamp, err := time.Parse(time.RFC3339, timestampStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid timestamp format, use RFC3339",
		})
		return
	}

	positions, err := h.vesselRepo.GetVesselPositionsAtTime(timestamp)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch vessel positions",
			"details": err.Error(),
		})
		return
	}

	var vessels []gin.H
	for _, pos := range positions {
		vesselData := gin.H{
			"vessel": gin.H{
				"uuid":         pos.VesselUUID,
				"name":         pos.Vessel.Name,
				"mmsi":         pos.Vessel.MMSI,
				"imo":          pos.Vessel.IMO,
				"type":         pos.Vessel.Type,
				"type_specific": pos.Vessel.TypeSpecific,
				"country_iso":  pos.Vessel.CountryISO,
				"speed":        pos.Speed,
				"course":       pos.Course,
				"heading":      pos.Heading,
				"destination":  pos.Destination,
				"distance":     pos.Distance,
			},
			"latitude":   pos.Latitude,
			"longitude":  pos.Longitude,
			"is_in_park": pos.IsInPark,
			"timestamp":  pos.LastPosUTC,
		}
		vessels = append(vessels, vesselData)
	}

	c.JSON(http.StatusOK, gin.H{
		"vessels":   vessels,
		"count":     len(vessels),
		"timestamp": timestampStr,
	})
}

func (h *VesselHandler) GetVesselsInParkAtTime(c *gin.Context) {
	timestampStr := c.Query("timestamp")
	if timestampStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "timestamp parameter is required",
		})
		return
	}

	timestamp, err := time.Parse(time.RFC3339, timestampStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid timestamp format, use RFC3339",
		})
		return
	}

	positions, err := h.vesselRepo.GetVesselsInParkAtTime(timestamp)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch vessel positions",
			"details": err.Error(),
		})
		return
	}

	var vessels []gin.H
	for _, pos := range positions {
		vesselData := gin.H{
			"vessel": gin.H{
				"uuid":         pos.VesselUUID,
				"name":         pos.Vessel.Name,
				"mmsi":         pos.Vessel.MMSI,
				"imo":          pos.Vessel.IMO,
				"type":         pos.Vessel.Type,
				"type_specific": pos.Vessel.TypeSpecific,
				"country_iso":  pos.Vessel.CountryISO,
				"speed":        pos.Speed,
				"course":       pos.Course,
				"heading":      pos.Heading,
				"destination":  pos.Destination,
				"distance":     pos.Distance,
			},
			"latitude":   pos.Latitude,
			"longitude":  pos.Longitude,
			"is_in_park": pos.IsInPark,
			"timestamp":  pos.LastPosUTC,
		}
		vessels = append(vessels, vesselData)
	}

	centerLat, centerLon := h.geoService.GetParkCenter()

	c.JSON(http.StatusOK, gin.H{
		"vessels_in_park": vessels,
		"total_in_park":   len(vessels),
		"timestamp":       timestampStr,
		"park_center": gin.H{
			"latitude":  centerLat,
			"longitude": centerLon,
		},
	})
}

func (h *VesselHandler) GetVesselHistory(c *gin.Context) {
	vesselUUID := c.Param("uuid")
	if vesselUUID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "vessel UUID is required",
		})
		return
	}

	// Parse query parameters
	startTimeStr := c.Query("start_time")
	endTimeStr := c.Query("end_time")
	limitStr := c.Query("limit")

	var startTime, endTime time.Time
	var err error
	limit := 100 // default limit

	if startTimeStr != "" {
		startTime, err = time.Parse(time.RFC3339, startTimeStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "invalid start_time format, use RFC3339",
			})
			return
		}
	} else {
		startTime = time.Now().AddDate(0, 0, -7) // default to last 7 days
	}

	if endTimeStr != "" {
		endTime, err = time.Parse(time.RFC3339, endTimeStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "invalid end_time format, use RFC3339",
			})
			return
		}
	} else {
		endTime = time.Now()
	}

	if limitStr != "" {
		limit, err = strconv.Atoi(limitStr)
		if err != nil || limit <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "invalid limit parameter",
			})
			return
		}
	}

	positions, err := h.vesselRepo.GetVesselHistory(vesselUUID, startTime, endTime, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch vessel history",
			"details": err.Error(),
		})
		return
	}

	var history []gin.H
	for _, pos := range positions {
		historyEntry := gin.H{
			"latitude":      pos.Latitude,
			"longitude":     pos.Longitude,
			"speed":         pos.Speed,
			"course":        pos.Course,
			"heading":       pos.Heading,
			"destination":   pos.Destination,
			"distance":      pos.Distance,
			"is_in_park":    pos.IsInPark,
			"timestamp":     pos.LastPosUTC,
			"recorded_at":   pos.RecordedAt,
		}
		history = append(history, historyEntry)
	}

	c.JSON(http.StatusOK, gin.H{
		"vessel_uuid": vesselUUID,
		"history":     history,
		"count":       len(history),
		"start_time":  startTimeStr,
		"end_time":    endTimeStr,
		"limit":       limit,
	})
}