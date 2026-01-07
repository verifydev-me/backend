package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/verifydev/resume-service/internal/config"
	"github.com/verifydev/resume-service/internal/generator"
	"github.com/verifydev/resume-service/internal/worker"
)

// Available templates
var availableTemplates = []TemplateInfo{
	{
		ID:          "modern",
		Name:        "Modern",
		Description: "Clean, modern design with accent colors and clean typography",
		Preview:     "/api/v1/templates/modern/preview",
		Features:    []string{"ATS-friendly", "Two-column layout", "Skills visualization"},
	},
	{
		ID:          "classic",
		Name:        "Classic",
		Description: "Traditional professional resume format",
		Preview:     "/api/v1/templates/classic/preview",
		Features:    []string{"ATS-friendly", "Single-column", "Formal layout"},
	},
	{
		ID:          "developer",
		Name:        "Developer",
		Description: "Technical-focused template highlighting projects and skills",
		Preview:     "/api/v1/templates/developer/preview",
		Features:    []string{"GitHub integration", "Project showcase", "Tech stack display"},
	},
	{
		ID:          "corporate",
		Name:        "Corporate",
		Description: "Professional corporate-style resume",
		Preview:     "/api/v1/templates/corporate/preview",
		Features:    []string{"Executive style", "Achievements focus", "Clean design"},
	},
}

// TemplateInfo describes a resume template
type TemplateInfo struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Preview     string   `json:"previewUrl"`
	Features    []string `json:"features"`
}

// JobStore stores generated PDFs in memory (for demo - use object storage in production)
type JobStore struct {
	pdfs map[string][]byte
	mu   sync.RWMutex
}

func NewJobStore() *JobStore {
	return &JobStore{
		pdfs: make(map[string][]byte),
	}
}

func (s *JobStore) Store(jobId string, pdf []byte) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.pdfs[jobId] = pdf
}

func (s *JobStore) Get(jobId string) ([]byte, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	pdf, ok := s.pdfs[jobId]
	return pdf, ok
}

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

	// Initialize worker pool for async PDF generation
	ctx := context.Background()
	workerPool := worker.NewWorkerPool(ctx, cfg.WorkerPoolSize, pdfGen)
	jobStore := NewJobStore()

	// Setup router
	router := setupRouter(pdfGen, workerPool, jobStore)

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

	// Shutdown worker pool first
	workerPool.Shutdown()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

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

func setupRouter(pdfGen *generator.PDFGenerator, workerPool *worker.WorkerPool, jobStore *JobStore) *gin.Engine {
	if os.Getenv("ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())

	// Health check
	router.GET("/health", func(c *gin.Context) {
		stats := workerPool.GetStats()
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Resume Service is healthy",
			"data": gin.H{
				"service":     "resume-service",
				"version":     "1.0.0",
				"timestamp":   time.Now().Format(time.RFC3339),
				"workerStats": stats,
			},
		})
	})

	// ============================================
	// TEMPLATES ENDPOINTS
	// ============================================

	// GET /api/v1/templates - List all available templates
	router.GET("/api/v1/templates", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Available templates retrieved",
			"data": gin.H{
				"templates": availableTemplates,
				"count":     len(availableTemplates),
			},
		})
	})

	// GET /api/v1/templates/:id - Get specific template info
	router.GET("/api/v1/templates/:id", func(c *gin.Context) {
		templateId := c.Param("id")

		for _, t := range availableTemplates {
			if t.ID == templateId {
				c.JSON(http.StatusOK, gin.H{
					"success": true,
					"data":    t,
				})
				return
			}
		}

		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Template not found",
			"error":   "TEMPLATE_NOT_FOUND",
		})
	})

	// ============================================
	// RESUME GENERATION ENDPOINTS
	// ============================================

	// POST /api/v1/resumes/generate - Generate PDF synchronously (returns binary)
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

		// Validate template
		validTemplate := false
		for _, t := range availableTemplates {
			if t.ID == data.Template {
				validTemplate = true
				break
			}
		}
		if !validTemplate && data.Template != "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Invalid template",
				"error":   "INVALID_TEMPLATE",
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

	// POST /api/v1/resumes/generate/async - Generate PDF asynchronously
	router.POST("/api/v1/resumes/generate/async", func(c *gin.Context) {
		var data generator.ResumeData
		if err := c.ShouldBindJSON(&data); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Invalid request body",
				"error":   err.Error(),
			})
			return
		}

		// Generate job ID
		jobId := generateJobID()

		// Create result channel to capture PDF
		resultChan := make(chan worker.JobResult, 1)

		// Submit job to worker pool
		job := worker.Job{
			ID:        jobId,
			UserID:    data.User.Email, // Use email as user identifier
			Data:      data,
			Template:  data.Template,
			CreatedAt: time.Now(),
			Result:    resultChan,
		}

		if err := workerPool.Submit(job); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"success": false,
				"message": "Service busy, try again later",
				"error":   err.Error(),
			})
			return
		}

		// Start goroutine to store result when ready
		go func() {
			result := <-resultChan
			if result.Error == nil && result.PDF != nil {
				jobStore.Store(result.JobID, result.PDF)
				log.Info().Str("jobId", result.JobID).Msg("PDF stored for download")
			}
		}()

		c.JSON(http.StatusAccepted, gin.H{
			"success": true,
			"message": "PDF generation started",
			"data": gin.H{
				"jobId":     jobId,
				"statusUrl": "/api/v1/resumes/status/" + jobId,
			},
		})
	})

	// GET /api/v1/resumes/status/:jobId - Check job status
	router.GET("/api/v1/resumes/status/:jobId", func(c *gin.Context) {
		jobId := c.Param("jobId")

		status, found := workerPool.GetStatus(jobId)
		if !found {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Job not found",
				"error":   "JOB_NOT_FOUND",
			})
			return
		}

		response := gin.H{
			"success": true,
			"data": gin.H{
				"jobId":     status.ID,
				"status":    status.Status,
				"createdAt": status.CreatedAt.Format(time.RFC3339),
			},
		}

		// Add completion details if done
		if status.CompletedAt != nil {
			responseData := response["data"].(gin.H)
			responseData["completedAt"] = status.CompletedAt.Format(time.RFC3339)

			if status.Status == "completed" {
				responseData["downloadUrl"] = "/api/v1/resumes/download/" + jobId
			} else if status.Status == "failed" {
				responseData["error"] = status.Error
			}
		}

		c.JSON(http.StatusOK, response)
	})

	// GET /api/v1/resumes/download/:jobId - Download completed PDF
	router.GET("/api/v1/resumes/download/:jobId", func(c *gin.Context) {
		jobId := c.Param("jobId")

		// Check job status first
		status, found := workerPool.GetStatus(jobId)
		if !found {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Job not found",
				"error":   "JOB_NOT_FOUND",
			})
			return
		}

		if status.Status != "completed" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "PDF not ready yet",
				"error":   "PDF_NOT_READY",
				"data": gin.H{
					"status": status.Status,
				},
			})
			return
		}

		// Get PDF from store
		pdf, ok := jobStore.Get(jobId)
		if !ok {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "PDF expired or not found",
				"error":   "PDF_NOT_FOUND",
			})
			return
		}

		// Return PDF
		c.Header("Content-Type", "application/pdf")
		c.Header("Content-Disposition", "attachment; filename=resume-"+jobId+".pdf")
		c.Data(http.StatusOK, "application/pdf", pdf)
	})

	// POST /api/v1/resumes/preview - Generate HTML preview
	router.POST("/api/v1/resumes/preview", func(c *gin.Context) {
		var data generator.ResumeData
		if err := c.ShouldBindJSON(&data); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Invalid request body",
			})
			return
		}

		// Generate HTML preview using the PDF generator's HTML renderer
		html, err := pdfGen.GenerateHTML(data)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Failed to generate preview",
				"error":   err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Preview generated",
			"data": gin.H{
				"template": data.Template,
				"html":     html,
			},
		})
	})

	// ============================================
	// WORKER STATS ENDPOINT
	// ============================================

	// GET /api/v1/stats - Get worker pool statistics
	router.GET("/api/v1/stats", func(c *gin.Context) {
		stats := workerPool.GetStats()
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    stats,
		})
	})

	return router
}

// generateJobID creates a unique job ID
func generateJobID() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}
