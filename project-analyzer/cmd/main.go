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
║   🚀 WORKER POOL ENABLED                                  ║
║   • Concurrent message processing                         ║
║   • Configurable worker count                             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
	`)

	log.Info().
		Int("workerCount", cfg.WorkerCount).
		Int("prefetchCount", cfg.PrefetchCount).
		Msg("🔧 Worker pool configuration loaded")

	// Connect to RabbitMQ with worker pool support
	rabbit, err := rabbitmq.NewRabbitMQ(
		cfg.RabbitMQURL,
		cfg.ExchangeName,
		cfg.ConsumeQueue,
		cfg.PublishQueue,
		cfg.PrefetchCount, // Match prefetch to worker count
	)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to RabbitMQ")
	}
	defer rabbit.Close()

	// Create analyzer with worker pool
	anlzr := analyzer.NewAnalyzer(cfg, rabbit)

	// Context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())

	// Start analyzer with worker pool in goroutine
	go func() {
		if err := anlzr.StartWithWorkerPool(ctx); err != nil {
			log.Error().Err(err).Msg("Analyzer stopped with error")
		}
	}()

	// Start HTTP server for health checks
	router := setupRouter(cfg)
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

func setupRouter(cfg *config.Config) *gin.Engine {
	if os.Getenv("ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())

	// Health check with worker pool info
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Project Analyzer is healthy",
			"data": gin.H{
				"service":       "project-analyzer",
				"version":       "2.0.0-workerpool",
				"timestamp":     time.Now().Format(time.RFC3339),
				"workerCount":   cfg.WorkerCount,
				"prefetchCount": cfg.PrefetchCount,
			},
		})
	})

	// Ready check
	router.GET("/ready", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Ready to analyze with worker pool",
		})
	})

	// Metrics endpoint for worker pool stats
	router.GET("/metrics", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Worker pool metrics",
			"data": gin.H{
				"workerCount":   cfg.WorkerCount,
				"prefetchCount": cfg.PrefetchCount,
				// Note: Actual runtime metrics would be added from analyzer.GetMetrics()
			},
		})
	})

	return router
}
