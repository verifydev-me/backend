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

	"github.com/verifydev/project-analyzer/internal/analyzer"
	"github.com/verifydev/project-analyzer/internal/config"
	"github.com/verifydev/project-analyzer/internal/rabbitmq"
)

func main() {
	// Load .env file
	godotenv.Load()

	// Setup logging
	setupLogger()

	// Load config
	cfg := config.Load()

	log.Info().Msg(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🔍 Project Analyzer Service (Go)                        ║
║   ───────────────────────────────────────────────────     ║
║                                                           ║
║   Responsibilities:                                       ║
║   • Clone GitHub repositories                             ║
║   • Analyze code structure                                ║
║   • Extract signals (frameworks, patterns)                ║
║   • Publish signals to RabbitMQ                          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
	`)

	// Connect to RabbitMQ
	rabbit, err := rabbitmq.NewRabbitMQ(
		cfg.RabbitMQURL,
		cfg.ExchangeName,
		cfg.ConsumeQueue,
		cfg.PublishQueue,
	)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to RabbitMQ")
	}
	defer rabbit.Close()

	// Create analyzer
	anlzr := analyzer.NewAnalyzer(cfg, rabbit)

	// Context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())

	// Start analyzer in goroutine
	go func() {
		if err := anlzr.Start(ctx); err != nil {
			log.Error().Err(err).Msg("Analyzer stopped with error")
		}
	}()

	// Start HTTP server for health checks
	router := setupRouter()
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

	// Wait for shutdown signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutting down...")

	// Cancel context to stop analyzer
	cancel()

	// Shutdown HTTP server
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
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

func setupRouter() *gin.Engine {
	if os.Getenv("ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Project Analyzer is healthy",
			"data": gin.H{
				"service":   "project-analyzer",
				"version":   "1.0.0",
				"timestamp": time.Now().Format(time.RFC3339),
			},
		})
	})

	// Ready check
	router.GET("/ready", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Ready to analyze",
		})
	})

	return router
}
