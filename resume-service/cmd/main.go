package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/verifydev/resume-service/internal/config"
	"github.com/verifydev/resume-service/internal/generator"
)

func main() {
	godotenv.Load()
	setupLogger()

	cfg := config.Load()

	log.Info().Msg(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   📄 Resume Service (Go)                                  ║
║   ───────────────────────────────────────────────────     ║
║                                                           ║
║   Responsibilities:                                       ║
║   • Generate PDF resumes from templates                   ║
║   • Support multiple templates                            ║
║   • Handle concurrent PDF generation                      ║
║   • Store PDFs in object storage                         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
	`)

	// Initialize PDF generator
	pdfGen, err := generator.NewPDFGenerator(time.Duration(cfg.PDFTimeoutSec) * time.Second)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to create PDF generator")
	}

	// Setup router
	router := setupRouter(pdfGen)

	server := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router,
	}

	go func() {
		log.Info().Str("port", cfg.Port).Msg("HTTP server started")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("Server failed")
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Error().Err(err).Msg("Server shutdown error")
	}

	log.Info().Msg("Server stopped")
}

func setupLogger() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	if os.Getenv("ENV") != "production" {
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stdout})
	}
}

func setupRouter(pdfGen *generator.PDFGenerator) *gin.Engine {
	if os.Getenv("ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Resume Service is healthy",
			"data": gin.H{
				"service":   "resume-service",
				"version":   "1.0.0",
				"timestamp": time.Now().Format(time.RFC3339),
			},
		})
	})

	// Generate resume PDF (API endpoint)
	router.POST("/api/v1/resumes/generate", func(c *gin.Context) {
		var data generator.ResumeData
		if err := c.ShouldBindJSON(&data); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Invalid request body",
				"error":   err.Error(),
			})
			return
		}

		pdf, err := pdfGen.Generate(c.Request.Context(), data)
		if err != nil {
			log.Error().Err(err).Msg("Failed to generate PDF")
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Failed to generate PDF",
				"error":   err.Error(),
			})
			return
		}

		// Return PDF as binary
		c.Header("Content-Type", "application/pdf")
		c.Header("Content-Disposition", "attachment; filename=resume.pdf")
		c.Data(http.StatusOK, "application/pdf", pdf)
	})

	// Preview resume HTML
	router.POST("/api/v1/resumes/preview", func(c *gin.Context) {
		var data generator.ResumeData
		if err := c.ShouldBindJSON(&data); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Invalid request body",
			})
			return
		}

		// This would render HTML preview
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Preview generated",
			"data": gin.H{
				"template": data.Template,
			},
		})
	})

	return router
}
