package main

import (
	"encoding/json"
	"fmt"
	"log"
	"vessel-tracker/services"
)

func main() {
	fmt.Println("Testing KMZ parsing...")

	geoJSON, err := services.LoadPosidoniaData()
	if err != nil {
		log.Fatalf("Failed to load posidonia data: %v", err)
	}

	fmt.Printf("Loaded GeoJSON with %d features\n", len(geoJSON.Features))

	// Pretty print first feature if any
	if len(geoJSON.Features) > 0 {
		firstFeature, _ := json.MarshalIndent(geoJSON.Features[0], "", "  ")
		fmt.Printf("First feature:\n%s\n", string(firstFeature))
	}

	// Save to file for inspection
	data, err := json.MarshalIndent(geoJSON, "", "  ")
	if err == nil {
		fmt.Printf("\nTotal JSON size: %d bytes\n", len(data))
	}
}