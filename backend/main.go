package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"vessel-tracker/database"
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

	// Initialize database
	err = database.InitDatabase()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	apiKey := os.Getenv("DATALASTIC_API_KEY")
	if apiKey == "" {
		log.Fatal("DATALASTIC_API_KEY environment variable is required")
	}

	// Initialize services
	vesselService := services.NewVesselService(apiKey)
	geoService, err := services.NewGeoService("./data/national-park.geojson", "./data/buffered.geojson")
	if err != nil {
		log.Fatalf("Failed to initialize geo service: %v", err)
	}

	vesselRepo := services.NewVesselRepository()
	whitelistService := services.NewWhitelistService()

	// Initialize hardcoded whitelist on startup
	if err := whitelistService.InitializeHardcodedWhitelist(); err != nil {
		log.Printf("Warning: Failed to initialize hardcoded whitelist: %v", err)
	} else {
		log.Println("Hardcoded whitelist initialized successfully")
	}

	scheduler := services.NewSchedulerService(vesselService, geoService, vesselRepo)

	// Start scheduler
	err = scheduler.Start()
	if err != nil {
		log.Fatalf("Failed to start scheduler: %v", err)
	}

	// Handle graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-c
		log.Println("Shutting down gracefully...")
		scheduler.Stop()
		os.Exit(0)
	}()

	r := gin.Default()

	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept"}
	r.Use(cors.New(config))

	// Serve static files (Frontend)
	r.Static("/static", "./static")
	r.StaticFile("/", "./static/index.html")
	r.StaticFile("/favicon.ico", "./static/favicon.ico")

	vesselHandler := handlers.NewVesselHandler(vesselService, geoService, vesselRepo, whitelistService)
	whitelistHandler := handlers.NewWhitelistHandler(whitelistService)
	violationHandler := handlers.NewViolationHandler(vesselService, geoService, vesselRepo)

	api := r.Group("/api")
	{
		api.GET("/vessels", vesselHandler.GetVessels)
		api.GET("/vessels/in-park", vesselHandler.GetVesselsInPark)
		api.GET("/vessels/at-time", vesselHandler.GetVesselsAtTime)
		api.GET("/vessels/in-park/at-time", vesselHandler.GetVesselsInParkAtTime)
		api.GET("/vessels/:uuid/history", vesselHandler.GetVesselHistory)
		api.GET("/park-boundaries", vesselHandler.GetParkBoundaries)
		api.GET("/buffered-boundaries", vesselHandler.GetBufferedBoundaries)
		api.GET("/posidonia", handlers.GetPosidoniaData)

		// Whitelist endpoints
		api.GET("/whitelist", whitelistHandler.GetWhitelistEntries)
		api.GET("/whitelist/check", whitelistHandler.CheckVesselWhitelist)
		api.POST("/whitelist", whitelistHandler.AddToWhitelist)
		api.DELETE("/whitelist/:uuid", whitelistHandler.RemoveFromWhitelist)
		api.POST("/whitelist/initialize", whitelistHandler.InitializeHardcodedWhitelist)
		api.POST("/whitelist/refresh", whitelistHandler.RefreshWhitelist)

		// Violation generation endpoints (for testing/demo purposes)
		api.POST("/violations/generate-buffer", violationHandler.GenerateBufferViolations)
		api.POST("/violations/generate-posidonia", violationHandler.GeneratePosidoniaViolations)
		api.POST("/violations/clear-test", violationHandler.ClearTestViolations)

		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "healthy"})
		})
	}

	// Serve index.html for all non-API routes (SPA fallback)
	r.NoRoute(func(c *gin.Context) {
		c.File("./static/index.html")
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
