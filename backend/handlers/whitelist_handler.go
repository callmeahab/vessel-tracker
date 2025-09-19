package handlers

import (
	"net/http"
	"strconv"
	"vessel-tracker/services"

	"github.com/gin-gonic/gin"
)

type WhitelistHandler struct {
	whitelistService *services.WhitelistService
}

func NewWhitelistHandler(whitelistService *services.WhitelistService) *WhitelistHandler {
	return &WhitelistHandler{
		whitelistService: whitelistService,
	}
}

// Get all whitelist entries
func (h *WhitelistHandler) GetWhitelistEntries(c *gin.Context) {
	entries, err := h.whitelistService.GetAllWhitelistEntries()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch whitelist entries",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"whitelist": entries,
		"count":     len(entries),
	})
}

// Check if a vessel is whitelisted
func (h *WhitelistHandler) CheckVesselWhitelist(c *gin.Context) {
	uuid := c.Query("uuid")
	mmsi := c.Query("mmsi")
	imo := c.Query("imo")

	if uuid == "" && mmsi == "" && imo == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "At least one of uuid, mmsi, or imo must be provided",
		})
		return
	}

	isWhitelisted := h.whitelistService.IsVesselWhitelisted(uuid, mmsi, imo)
	entry := h.whitelistService.GetWhitelistEntry(uuid, mmsi, imo)

	response := gin.H{
		"is_whitelisted": isWhitelisted,
		"uuid":           uuid,
		"mmsi":           mmsi,
		"imo":            imo,
	}

	if entry != nil {
		response["whitelist_entry"] = entry
	}

	c.JSON(http.StatusOK, response)
}

// Add vessel to whitelist
func (h *WhitelistHandler) AddToWhitelist(c *gin.Context) {
	var req struct {
		VesselUUID string `json:"vessel_uuid"`
		MMSI       string `json:"mmsi"`
		IMO        string `json:"imo"`
		Name       string `json:"name"`
		Reason     string `json:"reason"`
		AddedBy    string `json:"added_by"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	if req.VesselUUID == "" && req.MMSI == "" && req.IMO == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "At least one of vessel_uuid, mmsi, or imo must be provided",
		})
		return
	}

	if req.Reason == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Reason is required",
		})
		return
	}

	if req.AddedBy == "" {
		req.AddedBy = "manual"
	}

	err := h.whitelistService.AddToWhitelist(req.VesselUUID, req.MMSI, req.IMO, req.Name, req.Reason, req.AddedBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to add vessel to whitelist",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Vessel added to whitelist successfully",
		"vessel": gin.H{
			"uuid": req.VesselUUID,
			"mmsi": req.MMSI,
			"imo":  req.IMO,
			"name": req.Name,
		},
	})
}

// Remove vessel from whitelist
func (h *WhitelistHandler) RemoveFromWhitelist(c *gin.Context) {
	vesselUUID := c.Param("uuid")
	if vesselUUID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Vessel UUID is required",
		})
		return
	}

	err := h.whitelistService.RemoveFromWhitelist(vesselUUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to remove vessel from whitelist",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Vessel removed from whitelist successfully",
		"vessel_uuid": vesselUUID,
	})
}

// Initialize hardcoded whitelist
func (h *WhitelistHandler) InitializeHardcodedWhitelist(c *gin.Context) {
	err := h.whitelistService.InitializeHardcodedWhitelist()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to initialize hardcoded whitelist",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Hardcoded whitelist initialized successfully",
	})
}

// Refresh whitelist cache
func (h *WhitelistHandler) RefreshWhitelist(c *gin.Context) {
	err := h.whitelistService.RefreshIfNeeded()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to refresh whitelist",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Whitelist refreshed successfully",
	})
}