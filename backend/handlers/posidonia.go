package handlers

import (
	"net/http"
	"vessel-tracker/services"

	"github.com/gin-gonic/gin"
)

func GetPosidoniaData(c *gin.Context) {
	geoJSON, err := services.LoadPosidoniaData()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, geoJSON)
}