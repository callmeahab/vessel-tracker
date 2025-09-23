package services

import (
	"archive/zip"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type KML struct {
	XMLName  xml.Name `xml:"kml"`
	Document Document `xml:"Document"`
}

type Document struct {
	Placemarks []Placemark `xml:"Placemark"`
	Folders    []Folder    `xml:"Folder"`
}

type Folder struct {
	Name       string      `xml:"name"`
	Placemarks []Placemark `xml:"Placemark"`
}

type Placemark struct {
	Name          string         `xml:"name"`
	Description   string         `xml:"description"`
	Polygon       *Polygon       `xml:"Polygon"`
	Point         *Point         `xml:"Point"`
	LineString    *LineString    `xml:"LineString"`
	MultiGeometry *MultiGeometry `xml:"MultiGeometry"`
}

type MultiGeometry struct {
	Polygons    []Polygon    `xml:"Polygon"`
	Points      []Point      `xml:"Point"`
	LineStrings []LineString `xml:"LineString"`
}

type Polygon struct {
	OuterBoundaryIs OuterBoundaryIs `xml:"outerBoundaryIs"`
}

type OuterBoundaryIs struct {
	LinearRing LinearRing `xml:"LinearRing"`
}

type LinearRing struct {
	Coordinates string `xml:"coordinates"`
}

type Point struct {
	Coordinates string `xml:"coordinates"`
}

type LineString struct {
	Coordinates string `xml:"coordinates"`
}

type GeoJSON struct {
	Type     string    `json:"type"`
	Features []Feature `json:"features"`
}

type Feature struct {
	Type       string                 `json:"type"`
	Properties map[string]interface{} `json:"properties"`
	Geometry   Geometry               `json:"geometry"`
}

type Geometry struct {
	Type        string          `json:"type"`
	Coordinates json.RawMessage `json:"coordinates"`
}

type PosidoniaType struct {
	Type           string
	Condition      string
	Substrate      string
	Classification string
}

func ParseKMZToGeoJSON(kmzPath string) (*GeoJSON, error) {
	reader, err := zip.OpenReader(kmzPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open KMZ file: %w", err)
	}
	defer reader.Close()

	var kmlData []byte
	for _, file := range reader.File {
		if strings.HasSuffix(strings.ToLower(file.Name), ".kml") {
			rc, err := file.Open()
			if err != nil {
				return nil, fmt.Errorf("failed to open KML file in KMZ: %w", err)
			}
			defer rc.Close()

			kmlData, err = io.ReadAll(rc)
			if err != nil {
				return nil, fmt.Errorf("failed to read KML data: %w", err)
			}
			break
		}
	}

	if kmlData == nil {
		return nil, fmt.Errorf("no KML file found in KMZ archive")
	}

	var kml KML
	if err := xml.Unmarshal(kmlData, &kml); err != nil {
		return nil, fmt.Errorf("failed to parse KML: %w", err)
	}


	return convertKMLToGeoJSON(&kml), nil
}

func convertKMLToGeoJSON(kml *KML) *GeoJSON {
	geoJSON := &GeoJSON{
		Type:     "FeatureCollection",
		Features: []Feature{},
	}

	// Process direct placemarks
	for _, placemark := range kml.Document.Placemarks {
		processPlacemark(placemark, geoJSON)
	}

	// Process placemarks in folders
	for _, folder := range kml.Document.Folders {
		for _, placemark := range folder.Placemarks {
			processPlacemark(placemark, geoJSON)
		}
	}

	return geoJSON
}

func processPlacemark(placemark Placemark, geoJSON *GeoJSON) {
	// Parse posidonia type from description
	posidoniaType := parsePosidoniaType(placemark.Description)

	baseFeature := Feature{
		Type: "Feature",
		Properties: map[string]interface{}{
			"name":         placemark.Name,
			"description":  placemark.Description,
			"type":         posidoniaType.Type,
			"condition":    posidoniaType.Condition,
			"substrate":    posidoniaType.Substrate,
			"classification": posidoniaType.Classification,
		},
	}

	// Handle direct geometries
	if placemark.Polygon != nil {
		feature := baseFeature
		coords := parseCoordinates(placemark.Polygon.OuterBoundaryIs.LinearRing.Coordinates)
		if len(coords) > 0 {
			polygonCoords := [][][]float64{coords}
			coordsJSON, _ := json.Marshal(polygonCoords)
			feature.Geometry = Geometry{
				Type:        "Polygon",
				Coordinates: coordsJSON,
			}
			geoJSON.Features = append(geoJSON.Features, feature)
		}
	} else if placemark.Point != nil {
		feature := baseFeature
		coords := parseCoordinates(placemark.Point.Coordinates)
		if len(coords) > 0 && len(coords[0]) >= 2 {
			coordsJSON, _ := json.Marshal(coords[0])
			feature.Geometry = Geometry{
				Type:        "Point",
				Coordinates: coordsJSON,
			}
			geoJSON.Features = append(geoJSON.Features, feature)
		}
	} else if placemark.LineString != nil {
		feature := baseFeature
		coords := parseCoordinates(placemark.LineString.Coordinates)
		if len(coords) > 0 {
			coordsJSON, _ := json.Marshal(coords)
			feature.Geometry = Geometry{
				Type:        "LineString",
				Coordinates: coordsJSON,
			}
			geoJSON.Features = append(geoJSON.Features, feature)
		}
	}

	// Handle MultiGeometry
	if placemark.MultiGeometry != nil {
		// Process polygons in MultiGeometry
		for _, polygon := range placemark.MultiGeometry.Polygons {
			feature := baseFeature
			coords := parseCoordinates(polygon.OuterBoundaryIs.LinearRing.Coordinates)
			if len(coords) > 0 {
				polygonCoords := [][][]float64{coords}
				coordsJSON, _ := json.Marshal(polygonCoords)
				feature.Geometry = Geometry{
					Type:        "Polygon",
					Coordinates: coordsJSON,
				}
				geoJSON.Features = append(geoJSON.Features, feature)
			}
		}

		// Process points in MultiGeometry
		for _, point := range placemark.MultiGeometry.Points {
			feature := baseFeature
			coords := parseCoordinates(point.Coordinates)
			if len(coords) > 0 && len(coords[0]) >= 2 {
				coordsJSON, _ := json.Marshal(coords[0])
				feature.Geometry = Geometry{
					Type:        "Point",
					Coordinates: coordsJSON,
				}
				geoJSON.Features = append(geoJSON.Features, feature)
			}
		}

		// Process linestrings in MultiGeometry
		for _, lineString := range placemark.MultiGeometry.LineStrings {
			feature := baseFeature
			coords := parseCoordinates(lineString.Coordinates)
			if len(coords) > 0 {
				coordsJSON, _ := json.Marshal(coords)
				feature.Geometry = Geometry{
					Type:        "LineString",
					Coordinates: coordsJSON,
				}
				geoJSON.Features = append(geoJSON.Features, feature)
			}
		}
	}
}

func parseCoordinates(coordString string) [][]float64 {
	coordString = strings.TrimSpace(coordString)
	if coordString == "" {
		return nil
	}

	var result [][]float64
	points := strings.Fields(coordString)

	for _, point := range points {
		parts := strings.Split(point, ",")
		if len(parts) >= 2 {
			lon, err1 := strconv.ParseFloat(parts[0], 64)
			lat, err2 := strconv.ParseFloat(parts[1], 64)
			if err1 == nil && err2 == nil {
				result = append(result, []float64{lon, lat})
			}
		}
	}

	return result
}

func LoadPosidoniaData() (*GeoJSON, error) {
	kmzPath := filepath.Join(".", "data", "posidonia-maddalena.kmz")

	if _, err := os.Stat(kmzPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("posidonia KMZ file not found at %s", kmzPath)
	}

	return ParseKMZToGeoJSON(kmzPath)
}

// parsePosidoniaType extracts posidonia bed type information from KML descriptions
func parsePosidoniaType(description string) PosidoniaType {
	result := PosidoniaType{
		Type:           "posidonia",
		Condition:      "unknown",
		Substrate:      "unknown",
		Classification: "standard",
	}

	// Clean up HTML tags and normalize text
	cleaned := strings.ToLower(strings.ReplaceAll(description, "<br>", " "))
	cleaned = strings.ReplaceAll(cleaned, "&nbsp;", " ")

	// Extract posidonia type patterns
	if strings.Contains(cleaned, "posidonia degradata") || strings.Contains(cleaned, "degradata") {
		result.Condition = "degraded"
		result.Classification = "degraded"
	} else if strings.Contains(cleaned, "posidonia su matte") || strings.Contains(cleaned, "su matte") {
		result.Condition = "on_matte"
		result.Classification = "healthy"
	} else if strings.Contains(cleaned, "matte morta") || strings.Contains(cleaned, "morta") {
		result.Condition = "dead_matte"
		result.Classification = "dead"
	}

	// Extract substrate information
	if strings.Contains(cleaned, "sabbia") {
		result.Substrate = "sand"
	} else if strings.Contains(cleaned, "roccia") || strings.Contains(cleaned, "rock") {
		result.Substrate = "rock"
	} else if strings.Contains(cleaned, "matte") {
		result.Substrate = "matte"
	}

	// Determine overall classification
	if result.Condition == "degraded" || result.Condition == "dead_matte" {
		result.Classification = "degraded"
	} else if result.Condition == "on_matte" {
		result.Classification = "healthy"
	}

	return result
}

// Spatial analysis is now handled on the frontend using Turf.js
// These functions are kept for potential future backend use