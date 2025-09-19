package services

import (
	"log"
	"time"

	"github.com/robfig/cron/v3"
)

type SchedulerService struct {
	cron           *cron.Cron
	vesselService  *VesselService
	geoService     *GeoService
	vesselRepo     *VesselRepository
}

func NewSchedulerService(vesselService *VesselService, geoService *GeoService, vesselRepo *VesselRepository) *SchedulerService {
	return &SchedulerService{
		cron:          cron.New(cron.WithSeconds()),
		vesselService: vesselService,
		geoService:    geoService,
		vesselRepo:    vesselRepo,
	}
}

func (s *SchedulerService) Start() error {
	// Fetch vessel data every 30 minutes
	_, err := s.cron.AddFunc("0 */30 * * * *", s.fetchVesselData)
	if err != nil {
		return err
	}

	// Clean up old records daily at 2 AM
	_, err = s.cron.AddFunc("0 0 2 * * *", s.cleanupOldRecords)
	if err != nil {
		return err
	}

	s.cron.Start()
	log.Println("Scheduler started - will fetch vessel data every 30 minutes")

	// Run initial fetch
	go s.fetchVesselData()

	return nil
}

func (s *SchedulerService) Stop() {
	s.cron.Stop()
	log.Println("Scheduler stopped")
}

func (s *SchedulerService) fetchVesselData() {
	log.Println("Starting scheduled vessel data fetch...")

	centerLat, centerLon := s.geoService.GetParkCenter()

	vesselPositions, err := s.vesselService.GetVesselsInRadius(centerLat, centerLon, 20)
	if err != nil {
		log.Printf("Failed to fetch vessels: %v", err)
		return
	}

	if len(vesselPositions.Data.Vessels) == 0 {
		log.Println("No vessels found in the area")
		return
	}

	err = s.vesselRepo.StoreVesselData(vesselPositions.Data.Vessels, s.geoService)
	if err != nil {
		log.Printf("Failed to store vessel data: %v", err)
		return
	}

	log.Printf("Successfully stored %d vessel positions", len(vesselPositions.Data.Vessels))
}

func (s *SchedulerService) cleanupOldRecords() {
	log.Println("Starting cleanup of old vessel records...")

	// Keep records for 30 days
	cutoffTime := time.Now().AddDate(0, 0, -30)

	err := s.vesselRepo.DeleteOldRecords(cutoffTime)
	if err != nil {
		log.Printf("Failed to cleanup old records: %v", err)
		return
	}

	log.Println("Cleanup completed")
}

func (s *SchedulerService) FetchNow() {
	go s.fetchVesselData()
}