package services

import (
	"encoding/json"
	"fmt"
	"io"
	"math"
	"os"

	geojson "github.com/paulmach/go.geojson"
)

type GeoService struct {
	parkBoundaries     *geojson.FeatureCollection
	bufferedBoundaries *geojson.FeatureCollection
	landuse            map[string]interface{} // Raw landuse GeoJSON data
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

	// Load landuse data
	var landuseData map[string]interface{}
	landuseFile, err := os.Open("./data/landuse.geojson")
	if err != nil {
		fmt.Printf("Warning: Failed to open landuse.geojson: %v\n", err)
	} else {
		defer landuseFile.Close()
		landuseBytes, err := io.ReadAll(landuseFile)
		if err != nil {
			fmt.Printf("Warning: Failed to read landuse.geojson: %v\n", err)
		} else {
			err = json.Unmarshal(landuseBytes, &landuseData)
			if err != nil {
				fmt.Printf("Warning: Failed to parse landuse.geojson: %v\n", err)
			}
		}
	}

	return &GeoService{
		parkBoundaries:     fc,
		bufferedBoundaries: bufferedFC,
		landuse:            landuseData,
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

// GetParkBoundingBox returns the bounding box (minLat, maxLat, minLon, maxLon) of the park
func (s *GeoService) GetParkBoundingBox() (float64, float64, float64, float64) {
	var minLat, maxLat, minLon, maxLon float64
	first := true

	for _, feature := range s.parkBoundaries.Features {
		g := feature.Geometry
		switch g.Type {
		case geojson.GeometryPolygon:
			if g.Polygon != nil && len(g.Polygon) > 0 {
				for _, coord := range g.Polygon[0] {
					lon, lat := coord[0], coord[1]
					if first {
						minLat, maxLat = lat, lat
						minLon, maxLon = lon, lon
						first = false
					} else {
						if lat < minLat {
							minLat = lat
						}
						if lat > maxLat {
							maxLat = lat
						}
						if lon < minLon {
							minLon = lon
						}
						if lon > maxLon {
							maxLon = lon
						}
					}
				}
			}
		case geojson.GeometryMultiPolygon:
			if g.MultiPolygon != nil {
				for _, polygon := range g.MultiPolygon {
					if len(polygon) > 0 {
						for _, coord := range polygon[0] {
							lon, lat := coord[0], coord[1]
							if first {
								minLat, maxLat = lat, lat
								minLon, maxLon = lon, lon
								first = false
							} else {
								if lat < minLat {
									minLat = lat
								}
								if lat > maxLat {
									maxLat = lat
								}
								if lon < minLon {
									minLon = lon
								}
								if lon > maxLon {
									maxLon = lon
								}
							}
						}
					}
				}
			}
		}
	}

	// Add small buffer (0.1 degrees) to ensure we capture vessels near boundaries
	buffer := 0.1
	return minLat - buffer, maxLat + buffer, minLon - buffer, maxLon + buffer
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

// LineIntersectsLand checks if a line between two points crosses over land
func (s *GeoService) LineIntersectsLand(lat1, lon1, lat2, lon2 float64) bool {
	if s.landuse == nil {
		return false // If no landuse data, assume no intersection
	}

	// Get elements from landuse data
	elements, ok := s.landuse["elements"].([]interface{})
	if !ok {
		return false
	}

	line := [][]float64{{lon1, lat1}, {lon2, lat2}}

	// Check each landuse element
	for _, element := range elements {
		elem, ok := element.(map[string]interface{})
		if !ok {
			continue
		}

		geometry, ok := elem["geometry"].(map[string]interface{})
		if !ok {
			continue
		}

		geometries, ok := geometry["geometries"].([]interface{})
		if !ok {
			continue
		}

		// Check each geometry in the collection
		for _, geom := range geometries {
			geomMap, ok := geom.(map[string]interface{})
			if !ok {
				continue
			}

			geomType, ok := geomMap["type"].(string)
			if !ok {
				continue
			}

			// Check different geometry types
			switch geomType {
			case "Polygon", "LineString":
				coords, ok := geomMap["coordinates"].([]interface{})
				if ok && s.lineIntersectsPolygon(line, coords) {
					return true
				}
			}
		}
	}

	return false
}

// lineIntersectsPolygon checks if a line intersects with a polygon
func (s *GeoService) lineIntersectsPolygon(line [][]float64, polygonCoords []interface{}) bool {
	// Convert polygon coordinates
	var polygon [][]float64
	for _, coord := range polygonCoords {
		coordSlice, ok := coord.([]interface{})
		if !ok || len(coordSlice) < 2 {
			continue
		}
		lon, ok1 := coordSlice[0].(float64)
		lat, ok2 := coordSlice[1].(float64)
		if ok1 && ok2 {
			polygon = append(polygon, []float64{lon, lat})
		}
	}

	if len(polygon) < 2 {
		return false
	}

	// Check if line intersects any edge of the polygon
	for i := 0; i < len(polygon)-1; i++ {
		if s.linesIntersect(line[0], line[1], polygon[i], polygon[i+1]) {
			return true
		}
	}

	return false
}

// linesIntersect checks if two line segments intersect
func (s *GeoService) linesIntersect(p1, p2, p3, p4 []float64) bool {
	// Using the cross product method to determine if segments intersect
	d1 := s.direction(p3, p4, p1)
	d2 := s.direction(p3, p4, p2)
	d3 := s.direction(p1, p2, p3)
	d4 := s.direction(p1, p2, p4)

	if ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
		((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0)) {
		return true
	}

	return false
}

// direction calculates the direction of point p3 relative to line p1-p2
func (s *GeoService) direction(p1, p2, p3 []float64) float64 {
	return (p3[0]-p1[0])*(p2[1]-p1[1]) - (p3[1]-p1[1])*(p2[0]-p1[0])
}

// FindPathAroundLand attempts to find a path around land between two points
// Returns a series of waypoints that avoid land, or empty slice if direct path is clear
func (s *GeoService) FindPathAroundLand(lat1, lon1, lat2, lon2 float64) [][]float64 {
	// Check if direct path is clear
	if !s.LineIntersectsLand(lat1, lon1, lat2, lon2) {
		return nil // Direct path is fine
	}

	// Try intermediate waypoints at different offsets
	// We'll try points perpendicular to the direct line at various distances
	midLat := (lat1 + lat2) / 2
	midLon := (lon1 + lon2) / 2

	// Calculate perpendicular offset direction
	dx := lon2 - lon1
	dy := lat2 - lat1
	length := math.Sqrt(dx*dx + dy*dy)

	if length == 0 {
		return nil
	}

	// Perpendicular unit vector
	perpX := -dy / length
	perpY := dx / length

	// Try offsets at 0.01, 0.02, 0.03 degrees (roughly 1-3 km)
	offsets := []float64{0.01, 0.02, 0.03, 0.05}

	for _, offset := range offsets {
		// Try both sides of the line
		for _, side := range []float64{1, -1} {
			wayLat := midLat + perpY*offset*side
			wayLon := midLon + perpX*offset*side

			// Check if path through this waypoint avoids land
			segment1Clear := !s.LineIntersectsLand(lat1, lon1, wayLat, wayLon)
			segment2Clear := !s.LineIntersectsLand(wayLat, wayLon, lat2, lon2)

			if segment1Clear && segment2Clear {
				// Found a valid waypoint
				return [][]float64{{wayLat, wayLon}}
			}
		}
	}

	// If single waypoint doesn't work, try two waypoints (more curved path)
	quarterLat1 := lat1 + (lat2-lat1)*0.33
	quarterLon1 := lon1 + (lon2-lon1)*0.33
	quarterLat2 := lat1 + (lat2-lat1)*0.67
	quarterLon2 := lon1 + (lon2-lon1)*0.67

	for _, offset := range offsets {
		for _, side := range []float64{1, -1} {
			way1Lat := quarterLat1 + perpY*offset*side
			way1Lon := quarterLon1 + perpX*offset*side
			way2Lat := quarterLat2 + perpY*offset*side
			way2Lon := quarterLon2 + perpX*offset*side

			// Check if path through both waypoints avoids land
			seg1 := !s.LineIntersectsLand(lat1, lon1, way1Lat, way1Lon)
			seg2 := !s.LineIntersectsLand(way1Lat, way1Lon, way2Lat, way2Lon)
			seg3 := !s.LineIntersectsLand(way2Lat, way2Lon, lat2, lon2)

			if seg1 && seg2 && seg3 {
				return [][]float64{{way1Lat, way1Lon}, {way2Lat, way2Lon}}
			}
		}
	}

	// No valid path found - return empty
	return nil
}