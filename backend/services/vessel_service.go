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
	BaseURL = "https://api.datalastic.com/api/v0"
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
	endpoint := fmt.Sprintf("%s/vessel_find", BaseURL)

	u, err := url.Parse(endpoint)
	if err != nil {
		return nil, fmt.Errorf("failed to parse URL: %w", err)
	}

	q := u.Query()
	q.Set("api-key", s.apiKey)

	for key, value := range params {
		q.Set(key, value)
	}

	u.RawQuery = q.Encode()

	resp, err := s.client.Get(u.String())
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	var vesselResp models.VesselResponse
	if err := json.NewDecoder(resp.Body).Decode(&vesselResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &vesselResp, nil
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
		"type": "Cargo,Tanker,Passenger,Fishing",
	}

	return s.GetAllVessels(params, 0) // No limit - return all vessels in area
}

func (s *VesselService) GetVesselsInRadius(lat, lon float64, radius int) (*models.VesselPositionResponse, error) {
	return s.getVesselsInRadiusWithRetry(lat, lon, radius, 3)
}

func (s *VesselService) getVesselsInRadiusWithRetry(lat, lon float64, radius int, maxRetries int) (*models.VesselPositionResponse, error) {
	endpoint := fmt.Sprintf("%s/vessel_inradius", BaseURL)

	u, err := url.Parse(endpoint)
	if err != nil {
		return nil, fmt.Errorf("failed to parse URL: %w", err)
	}

	q := u.Query()
	q.Set("api-key", s.apiKey)
	q.Set("lat", fmt.Sprintf("%.6f", lat))
	q.Set("lon", fmt.Sprintf("%.6f", lon))
	q.Set("radius", fmt.Sprintf("%d", radius))

	u.RawQuery = q.Encode()

	var lastErr error

	for attempt := 0; attempt < maxRetries; attempt++ {
		if attempt > 0 {
			// Exponential backoff: 2^attempt seconds with jitter
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
			// Success - decode and return
			var vesselResp models.VesselPositionResponse
			if err := json.NewDecoder(resp.Body).Decode(&vesselResp); err != nil {
				resp.Body.Close()
				return nil, fmt.Errorf("failed to decode response: %w", err)
			}
			resp.Body.Close()
			return &vesselResp, nil
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