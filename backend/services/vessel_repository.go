package services

import (
	"fmt"
	"time"
	"vessel-tracker/database"
	"vessel-tracker/models"

	"gorm.io/gorm"
)

type VesselRepository struct {
	db *gorm.DB
}

func NewVesselRepository() *VesselRepository {
	return &VesselRepository{
		db: database.GetDB(),
	}
}

func (r *VesselRepository) StoreVesselData(vesselPositions []models.VesselPosition, geoService *GeoService) error {
	tx := r.db.Begin()
	if tx.Error != nil {
		return tx.Error
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	recordedAt := time.Now()

	for _, vesselPos := range vesselPositions {
		// Create or update vessel record
		vesselRecord := models.VesselRecord{
			UUID:         vesselPos.UUID,
			Name:         vesselPos.Name,
			MMSI:         vesselPos.MMSI,
			IMO:          vesselPos.IMO,
			Type:         vesselPos.Type,
			TypeSpecific: vesselPos.TypeSpecific,
			CountryISO:   vesselPos.CountryISO,
		}

		err := tx.Where("uuid = ?", vesselPos.UUID).FirstOrCreate(&vesselRecord).Error
		if err != nil {
			tx.Rollback()
			return err
		}

		// Check if vessel is in park
		isInPark := geoService.IsPointInPark(vesselPos.Latitude, vesselPos.Longitude)

		// Store position record
		positionRecord := models.VesselPositionRecord{
			VesselUUID:   vesselPos.UUID,
			Latitude:     vesselPos.Latitude,
			Longitude:    vesselPos.Longitude,
			Speed:        vesselPos.Speed,
			Course:       vesselPos.Course,
			Heading:      vesselPos.Heading,
			Destination:  vesselPos.Destination,
			Distance:     vesselPos.Distance,
			IsInPark:     isInPark,
			LastPosEpoch: vesselPos.LastPosEpoch,
			LastPosUTC:   vesselPos.LastPosUTC,
			ETAEpoch:     vesselPos.ETAEpoch,
			ETAUTC:       vesselPos.ETAUTC,
			RecordedAt:   recordedAt,
		}

		err = tx.Create(&positionRecord).Error
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit().Error
}

func (r *VesselRepository) GetLatestVesselPositions() ([]models.VesselPositionRecord, error) {
	var positions []models.VesselPositionRecord

	// Get the latest position for each vessel that is within the park
	subQuery := r.db.Model(&models.VesselPositionRecord{}).
		Select("vessel_uuid, MAX(recorded_at) as max_recorded_at").
		Where("is_in_park = ?", true).
		Group("vessel_uuid")

	err := r.db.Joins("JOIN (?) as latest ON vessel_position_records.vessel_uuid = latest.vessel_uuid AND vessel_position_records.recorded_at = latest.max_recorded_at", subQuery).
		Where("vessel_position_records.is_in_park = ?", true).
		Preload("Vessel").
		Find(&positions).Error

	return positions, err
}

func (r *VesselRepository) GetVesselPositionsAtTime(timestamp time.Time) ([]models.VesselPositionRecord, error) {
	var positions []models.VesselPositionRecord

	// Get the most recent position for each vessel before or at the specified time
	subQuery := r.db.Model(&models.VesselPositionRecord{}).
		Select("vessel_uuid, MAX(recorded_at) as max_recorded_at").
		Where("recorded_at <= ?", timestamp).
		Group("vessel_uuid")

	err := r.db.Joins("JOIN (?) as latest ON vessel_position_records.vessel_uuid = latest.vessel_uuid AND vessel_position_records.recorded_at = latest.max_recorded_at", subQuery).
		Preload("Vessel").
		Find(&positions).Error

	return positions, err
}

func (r *VesselRepository) GetVesselsInParkAtTime(timestamp time.Time) ([]models.VesselPositionRecord, error) {
	var positions []models.VesselPositionRecord

	// Get the most recent position for each vessel before or at the specified time, filtered by is_in_park
	subQuery := r.db.Model(&models.VesselPositionRecord{}).
		Select("vessel_uuid, MAX(recorded_at) as max_recorded_at").
		Where("recorded_at <= ?", timestamp).
		Group("vessel_uuid")

	err := r.db.Joins("JOIN (?) as latest ON vessel_position_records.vessel_uuid = latest.vessel_uuid AND vessel_position_records.recorded_at = latest.max_recorded_at", subQuery).
		Where("vessel_position_records.is_in_park = ?", true).
		Preload("Vessel").
		Find(&positions).Error

	return positions, err
}

func (r *VesselRepository) GetVesselHistory(vesselUUID string, startTime, endTime time.Time, limit int) ([]models.VesselPositionRecord, error) {
	var positions []models.VesselPositionRecord

	query := r.db.Where("vessel_uuid = ? AND recorded_at BETWEEN ? AND ?", vesselUUID, startTime, endTime).
		Order("recorded_at DESC").
		Preload("Vessel")

	if limit > 0 {
		query = query.Limit(limit)
	}
	// If limit is 0 or negative, return all records without limit

	err := query.Find(&positions).Error
	return positions, err
}

func (r *VesselRepository) GetAvailableTimeRange() (time.Time, time.Time, error) {
	var earliest, latest time.Time

	err := r.db.Model(&models.VesselPositionRecord{}).
		Select("MIN(recorded_at)").
		Scan(&earliest).Error
	if err != nil {
		return earliest, latest, err
	}

	err = r.db.Model(&models.VesselPositionRecord{}).
		Select("MAX(recorded_at)").
		Scan(&latest).Error

	return earliest, latest, err
}

func (r *VesselRepository) DeleteOldRecords(olderThan time.Time) error {
	result := r.db.Where("recorded_at < ?", olderThan).Delete(&models.VesselPositionRecord{})
	if result.Error != nil {
		return result.Error
	}

	fmt.Printf("Deleted %d old vessel position records\n", result.RowsAffected)
	return nil
}