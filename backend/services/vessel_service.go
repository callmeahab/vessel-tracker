package services

import (
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"time"
	"vessel-tracker/models"
)

const (
	BaseURL = "https://services.marinetraffic.com/api"
)

type VesselService struct {
	apiKey string
	client *http.Client
}

func NewVesselService(apiKey string) *VesselService {
	return &VesselService{
		apiKey: apiKey,
		client: &http.Client{},
	}
}

func (s *VesselService) SearchVessels(params map[string]string) (*models.VesselResponse, error) {
	// MarineTraffic doesn't have a direct vessel search API like Datalastic
	// This would need to be implemented using exportvessels or other endpoints
	return nil, fmt.Errorf("vessel search not supported in MarineTraffic API, use GetVesselsInRadius instead")
}

func (s *VesselService) GetAllVessels(params map[string]string, maxResults int) ([]models.Vessel, error) {
	var allVessels []models.Vessel
	nextToken := ""

	for {
		if nextToken != "" {
			params["next"] = nextToken
		}

		response, err := s.SearchVessels(params)
		if err != nil {
			return nil, err
		}

		allVessels = append(allVessels, response.Data...)

		if response.Meta.Next == "" || (maxResults > 0 && len(allVessels) >= maxResults) {
			break
		}

		nextToken = response.Meta.Next
	}

	if maxResults > 0 && len(allVessels) > maxResults {
		allVessels = allVessels[:maxResults]
	}

	return allVessels, nil
}


func (s *VesselService) GetVesselsByArea(minLat, maxLat, minLon, maxLon float64) ([]models.Vessel, error) {
	// Note: The Datalastic API doesn't directly support area filtering
	// You would need to use their vessel position endpoint or filter after fetching
	// For now, we'll fetch vessels and you'll need to filter by position separately

	params := map[string]string{
		// "type": "Cargo,Tanker,Passenger,Fishing",
	}

	return s.GetAllVessels(params, 0) // No limit - return all vessels in area
}

func (s *VesselService) GetVesselsInRadius(lat, lon float64, radius int) (*models.VesselPositionResponse, error) {
	return s.getVesselsInRadiusWithRetry(lat, lon, radius, 3)
}

func (s *VesselService) getVesselsInRadiusWithRetry(lat, lon float64, radius int, maxRetries int) (*models.VesselPositionResponse, error) {
	// MarineTraffic uses exportvessels-custom-area endpoint
	// The area is defined by your MarineTraffic subscription

	endpoint := fmt.Sprintf("%s/exportvessels-custom-area/%s", BaseURL, s.apiKey)

	u, err := url.Parse(endpoint)
	if err != nil {
		return nil, fmt.Errorf("failed to parse URL: %w", err)
	}

	q := u.Query()
	q.Set("v", "2")
	q.Set("protocol", "jsono")
	q.Set("timespan", "5") // Last 5 minutes

	u.RawQuery = q.Encode()

	var lastErr error

	for attempt := 0; attempt < maxRetries; attempt++ {
		if attempt > 0 {
			// Exponential backoff: 2^attempt seconds
			backoffSeconds := math.Pow(2, float64(attempt))
			backoffDuration := time.Duration(backoffSeconds) * time.Second
			fmt.Printf("Rate limit encountered, retrying in %.0f seconds (attempt %d/%d)...\n",
				backoffSeconds, attempt+1, maxRetries)
			time.Sleep(backoffDuration)
		}

		resp, err := s.client.Get(u.String())
		if err != nil {
			lastErr = fmt.Errorf("failed to make request: %w", err)
			continue
		}

		if resp.StatusCode == http.StatusOK {
			// Success - decode MarineTraffic response and convert to our format
			var mtResp models.MarineTrafficResponse
			if err := json.NewDecoder(resp.Body).Decode(&mtResp); err != nil {
				resp.Body.Close()
				return nil, fmt.Errorf("failed to decode response: %w", err)
			}
			resp.Body.Close()

			// Convert to our VesselPositionResponse format
			vesselResp := models.ConvertMarineTrafficToVesselPosition(&mtResp, lat, lon)
			return vesselResp, nil
		}

		// Read error response
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode == 402 || resp.StatusCode == 429 {
			// Rate limit - continue retrying
			lastErr = fmt.Errorf("API rate limit (status %d): %s", resp.StatusCode, string(body))
			continue
		}

		// Other error - don't retry
		return nil, fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	return nil, fmt.Errorf("max retries exceeded, last error: %v", lastErr)
}
