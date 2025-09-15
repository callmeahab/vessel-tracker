package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
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

		if response.Meta.Next == "" || len(allVessels) >= maxResults {
			break
		}

		nextToken = response.Meta.Next
	}

	if len(allVessels) > maxResults {
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

	return s.GetAllVessels(params, 1000)
}

func (s *VesselService) GetVesselsInRadius(lat, lon float64, radius int) (*models.VesselPositionResponse, error) {
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

	// No vessel type filtering - include all vessel types for maximum coverage

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

	var vesselResp models.VesselPositionResponse
	if err := json.NewDecoder(resp.Body).Decode(&vesselResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &vesselResp, nil
}