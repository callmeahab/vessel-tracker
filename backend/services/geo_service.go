package services

import (
	"encoding/json"
	"fmt"
	"io"
	"os"

	geojson "github.com/paulmach/go.geojson"
)

type GeoService struct {
	parkBoundaries     *geojson.FeatureCollection
	bufferedBoundaries *geojson.FeatureCollection
}

func NewGeoService(geojsonPath string, bufferedPath string) (*GeoService, error) {
	// Load park boundaries
	file, err := os.Open(geojsonPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open geojson file: %w", err)
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("failed to read geojson file: %w", err)
	}

	fc, err := geojson.UnmarshalFeatureCollection(data)
	if err != nil {
		return nil, fmt.Errorf("failed to parse geojson: %w", err)
	}

	// Load buffered boundaries
	var bufferedFC *geojson.FeatureCollection
	if bufferedPath != "" {
		bufferedFile, err := os.Open(bufferedPath)
		if err != nil {
			fmt.Printf("Warning: Failed to open buffered boundaries file %s: %v\n", bufferedPath, err)
		} else {
			defer bufferedFile.Close()
			bufferedData, err := io.ReadAll(bufferedFile)
			if err != nil {
				fmt.Printf("Warning: Failed to read buffered boundaries file: %v\n", err)
			} else {
				bufferedFC, err = geojson.UnmarshalFeatureCollection(bufferedData)
				if err != nil {
					fmt.Printf("Warning: Failed to parse buffered boundaries GeoJSON: %v\n", err)
				} else {
					fmt.Printf("Successfully loaded buffered boundaries with %d features\n", len(bufferedFC.Features))
				}
			}
		}
	}

	return &GeoService{
		parkBoundaries:     fc,
		bufferedBoundaries: bufferedFC,
	}, nil
}

func (s *GeoService) IsPointInPark(lat, lon float64) bool {
	point := []float64{lon, lat}

	for _, feature := range s.parkBoundaries.Features {
		if s.isPointInFeature(point, feature) {
			return true
		}
	}

	// Add buffer zone check - if point is within ~500m (roughly 0.005 degrees) of park boundaries
	return s.isPointNearPark(lat, lon, 0.005)
}

func (s *GeoService) isPointInFeature(point []float64, feature *geojson.Feature) bool {
	g := feature.Geometry
	switch g.Type {
	case geojson.GeometryPolygon:
		if g.Polygon != nil && len(g.Polygon) > 0 {
			return s.isPointInPolygon(point, g.Polygon[0])
		}
	case geojson.GeometryMultiPolygon:
		if g.MultiPolygon != nil {
			for _, polygon := range g.MultiPolygon {
				if len(polygon) > 0 && s.isPointInPolygon(point, polygon[0]) {
					return true
				}
			}
		}
	}
	return false
}

func (s *GeoService) isPointInPolygon(point []float64, polygon [][]float64) bool {
	if len(polygon) < 3 {
		return false
	}

	x, y := point[0], point[1]
	inside := false

	j := len(polygon) - 1

	for i := 0; i < len(polygon); i++ {
		xi, yi := polygon[i][0], polygon[i][1]
		xj, yj := polygon[j][0], polygon[j][1]

		if ((yi > y) != (yj > y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi) {
			inside = !inside
		}

		j = i
	}

	return inside
}

func (s *GeoService) GetParkBoundaries() ([]byte, error) {
	return json.Marshal(s.parkBoundaries)
}

func (s *GeoService) GetBufferedBoundaries() ([]byte, error) {
	if s.bufferedBoundaries == nil {
		return nil, fmt.Errorf("buffered boundaries not loaded")
	}
	return json.Marshal(s.bufferedBoundaries)
}

func (s *GeoService) IsPointInBufferZone(lat, lon float64) bool {
	if s.bufferedBoundaries == nil {
		return false
	}

	point := []float64{lon, lat}

	for _, feature := range s.bufferedBoundaries.Features {
		if s.isPointInFeature(point, feature) {
			return true
		}
	}

	return false
}

func (s *GeoService) GetParkCenter() (float64, float64) {
	// Calculate the center of all park boundaries
	var totalLat, totalLon float64
	var count int

	for _, feature := range s.parkBoundaries.Features {
		g := feature.Geometry
		switch g.Type {
		case geojson.GeometryPolygon:
			if g.Polygon != nil && len(g.Polygon) > 0 {
				for _, coord := range g.Polygon[0] {
					totalLon += coord[0]
					totalLat += coord[1]
					count++
				}
			}
		case geojson.GeometryMultiPolygon:
			if g.MultiPolygon != nil {
				for _, polygon := range g.MultiPolygon {
					if len(polygon) > 0 {
						for _, coord := range polygon[0] {
							totalLon += coord[0]
							totalLat += coord[1]
							count++
						}
					}
				}
			}
		}
	}

	if count > 0 {
		return totalLat / float64(count), totalLon / float64(count)
	}

	// Default to La Maddalena area if calculation fails
	return 41.2167, 9.4167
}

// isPointNearPark checks if a point is within buffer distance of any park boundary
func (s *GeoService) isPointNearPark(lat, lon, buffer float64) bool {
	point := []float64{lon, lat}

	for _, feature := range s.parkBoundaries.Features {
		if s.isPointNearFeature(point, feature, buffer) {
			return true
		}
	}

	return false
}

// isPointNearFeature checks if a point is within buffer distance of a feature
func (s *GeoService) isPointNearFeature(point []float64, feature *geojson.Feature, buffer float64) bool {
	g := feature.Geometry
	switch g.Type {
	case geojson.GeometryPolygon:
		if g.Polygon != nil && len(g.Polygon) > 0 {
			return s.isPointNearPolygon(point, g.Polygon[0], buffer)
		}
	case geojson.GeometryMultiPolygon:
		if g.MultiPolygon != nil {
			for _, polygon := range g.MultiPolygon {
				if len(polygon) > 0 && s.isPointNearPolygon(point, polygon[0], buffer) {
					return true
				}
			}
		}
	}
	return false
}

// isPointNearPolygon checks if a point is within buffer distance of a polygon boundary
func (s *GeoService) isPointNearPolygon(point []float64, polygon [][]float64, buffer float64) bool {
	if len(polygon) < 2 {
		return false
	}

	x, y := point[0], point[1]

	// Check distance to each edge of the polygon
	for i := 0; i < len(polygon); i++ {
		j := (i + 1) % len(polygon)
		x1, y1 := polygon[i][0], polygon[i][1]
		x2, y2 := polygon[j][0], polygon[j][1]

		// Calculate squared distance from point to line segment
		distSquared := s.pointToLineDistance(x, y, x1, y1, x2, y2)
		if distSquared <= buffer*buffer {
			return true
		}
	}

	return false
}

// pointToLineDistance calculates the minimum distance from a point to a line segment
func (s *GeoService) pointToLineDistance(px, py, x1, y1, x2, y2 float64) float64 {
	// Vector from line start to point
	dx1 := px - x1
	dy1 := py - y1

	// Vector from line start to end
	dx2 := x2 - x1
	dy2 := y2 - y1

	// Calculate the parameter t for the closest point on the line segment
	t := (dx1*dx2 + dy1*dy2) / (dx2*dx2 + dy2*dy2)

	// Clamp t to the line segment
	if t < 0 {
		t = 0
	} else if t > 1 {
		t = 1
	}

	// Calculate the closest point on the line segment
	closestX := x1 + t*dx2
	closestY := y1 + t*dy2

	// Calculate distance from point to closest point
	dx := px - closestX
	dy := py - closestY
	return dx*dx + dy*dy // Return squared distance for performance (we'll compare with squared buffer)
}