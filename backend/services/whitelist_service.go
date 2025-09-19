package services

import (
	"time"
	"vessel-tracker/database"
	"vessel-tracker/models"
)

type WhitelistService struct {
	// In-memory cache for fast lookups
	whitelistCache map[string]*models.WhitelistEntry
	lastUpdate     time.Time
}

func NewWhitelistService() *WhitelistService {
	ws := &WhitelistService{
		whitelistCache: make(map[string]*models.WhitelistEntry),
	}
	ws.loadWhitelist()
	return ws
}

// Load whitelist from database into memory cache
func (ws *WhitelistService) loadWhitelist() error {
	var entries []models.WhitelistEntry
	if err := database.DB.Where("is_active = ?", true).Find(&entries).Error; err != nil {
		return err
	}

	// Clear cache and reload
	ws.whitelistCache = make(map[string]*models.WhitelistEntry)
	for i := range entries {
		entry := &entries[i]
		// Index by UUID, MMSI, and IMO for fast lookups
		if entry.VesselUUID != "" {
			ws.whitelistCache[entry.VesselUUID] = entry
		}
		if entry.MMSI != "" {
			ws.whitelistCache["mmsi:"+entry.MMSI] = entry
		}
		if entry.IMO != "" {
			ws.whitelistCache["imo:"+entry.IMO] = entry
		}
	}

	ws.lastUpdate = time.Now()
	return nil
}

// Check if a vessel is whitelisted by UUID
func (ws *WhitelistService) IsVesselWhitelistedByUUID(uuid string) bool {
	if uuid == "" {
		return false
	}
	_, exists := ws.whitelistCache[uuid]
	return exists
}

// Check if a vessel is whitelisted by MMSI
func (ws *WhitelistService) IsVesselWhitelistedByMMSI(mmsi string) bool {
	if mmsi == "" {
		return false
	}
	_, exists := ws.whitelistCache["mmsi:"+mmsi]
	return exists
}

// Check if a vessel is whitelisted by IMO
func (ws *WhitelistService) IsVesselWhitelistedByIMO(imo string) bool {
	if imo == "" {
		return false
	}
	_, exists := ws.whitelistCache["imo:"+imo]
	return exists
}

// Check if a vessel is whitelisted (checks UUID, MMSI, and IMO)
func (ws *WhitelistService) IsVesselWhitelisted(uuid, mmsi, imo string) bool {
	return ws.IsVesselWhitelistedByUUID(uuid) ||
		ws.IsVesselWhitelistedByMMSI(mmsi) ||
		ws.IsVesselWhitelistedByIMO(imo)
}

// Get whitelist entry for a vessel
func (ws *WhitelistService) GetWhitelistEntry(uuid, mmsi, imo string) *models.WhitelistEntry {
	if uuid != "" {
		if entry, exists := ws.whitelistCache[uuid]; exists {
			return entry
		}
	}
	if mmsi != "" {
		if entry, exists := ws.whitelistCache["mmsi:"+mmsi]; exists {
			return entry
		}
	}
	if imo != "" {
		if entry, exists := ws.whitelistCache["imo:"+imo]; exists {
			return entry
		}
	}
	return nil
}

// Add vessel to whitelist
func (ws *WhitelistService) AddToWhitelist(vesselUUID, mmsi, imo, name, reason, addedBy string) error {
	entry := models.WhitelistEntry{
		VesselUUID: vesselUUID,
		MMSI:       mmsi,
		IMO:        imo,
		Name:       name,
		Reason:     reason,
		AddedBy:    addedBy,
		IsActive:   true,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	if err := database.DB.Create(&entry).Error; err != nil {
		return err
	}

	// Refresh cache
	return ws.loadWhitelist()
}

// Remove vessel from whitelist (mark as inactive)
func (ws *WhitelistService) RemoveFromWhitelist(vesselUUID string) error {
	if err := database.DB.Model(&models.WhitelistEntry{}).
		Where("vessel_uuid = ?", vesselUUID).
		Update("is_active", false).Error; err != nil {
		return err
	}

	// Refresh cache
	return ws.loadWhitelist()
}

// Get all active whitelist entries
func (ws *WhitelistService) GetAllWhitelistEntries() ([]models.WhitelistEntry, error) {
	var entries []models.WhitelistEntry
	err := database.DB.Where("is_active = ?", true).Preload("Vessel").Find(&entries).Error
	return entries, err
}

// Refresh cache if it's older than 5 minutes
func (ws *WhitelistService) RefreshIfNeeded() error {
	if time.Since(ws.lastUpdate) > 5*time.Minute {
		return ws.loadWhitelist()
	}
	return nil
}

// Initialize hardcoded whitelist entries
func (ws *WhitelistService) InitializeHardcodedWhitelist() error {
	// Define hardcoded whitelist entries
	hardcodedEntries := []models.WhitelistEntry{
		{
			MMSI:       "123456789",
			Name:       "Coast Guard Vessel Alpha",
			Reason:     "Official coast guard patrol vessel",
			AddedBy:    "system",
			IsActive:   true,
		},
		{
			MMSI:       "987654321",
			Name:       "Research Vessel Beta",
			Reason:     "Authorized marine research vessel",
			AddedBy:    "system",
			IsActive:   true,
		},
		{
			IMO:        "IMO1234567",
			Name:       "Marine Sanctuary Patrol",
			Reason:     "Official sanctuary enforcement vessel",
			AddedBy:    "system",
			IsActive:   true,
		},
		// Add more hardcoded entries as needed
	}

	for _, entry := range hardcodedEntries {
		// Check if entry already exists
		var existing models.WhitelistEntry
		err := database.DB.Where("mmsi = ? OR imo = ?", entry.MMSI, entry.IMO).First(&existing).Error

		if err != nil {
			// Entry doesn't exist, create it
			entry.CreatedAt = time.Now()
			entry.UpdatedAt = time.Now()
			if err := database.DB.Create(&entry).Error; err != nil {
				return err
			}
		}
	}

	// Refresh cache after adding hardcoded entries
	return ws.loadWhitelist()
}