package main

import (
	"log"
	"os"
	"vessel-tracker/handlers"
	"vessel-tracker/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found")
	}

	apiKey := os.Getenv("DATALASTIC_API_KEY")
	if apiKey == "" {
		log.Fatal("DATALASTIC_API_KEY environment variable is required")
	}

	vesselService := services.NewVesselService(apiKey)
	geoService, err := services.NewGeoService("../data/national-park.json")
	if err != nil {
		log.Fatalf("Failed to initialize geo service: %v", err)
	}

	r := gin.Default()

	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept"}
	r.Use(cors.New(config))

	vesselHandler := handlers.NewVesselHandler(vesselService, geoService)

	api := r.Group("/api")
	{
		api.GET("/vessels", vesselHandler.GetVessels)
		api.GET("/vessels/in-park", vesselHandler.GetVesselsInPark)
		api.GET("/park-boundaries", vesselHandler.GetParkBoundaries)
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "healthy"})
		})
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}