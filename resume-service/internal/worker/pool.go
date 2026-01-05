package worker

import (
	"context"
	"sync"
	"time"
	"github.com/rs/zerolog/log"
	"github.com/verifydev/resume-service/internal/generator"
)

// ============================================
// WORKER POOL FOR CONCURRENT PDF GENERATION
// ============================================

// Job represents a PDF generation job
type Job struct {
	ID        string
	UserID    string
	Data      generator.ResumeData
	Template  string
	CreatedAt time.Time
	Result    chan JobResult
}

// JobResult contains the result of a job
type JobResult struct {
	JobID       string
	UserID      string
	PDF         []byte
	Error       error
	Duration    time.Duration
	CompletedAt time.Time
}

// JobStatus tracks job status
type JobStatus struct {
	ID          string     `json:"id"`
	UserID      string     `json:"userId"`
	Status      string     `json:"status"` // queued, processing, completed, failed
	CreatedAt   time.Time  `json:"createdAt"`
	CompletedAt *time.Time `json:"completedAt,omitempty"`
	Error       string     `json:"error,omitempty"`
	PDFUrl      string     `json:"pdfUrl,omitempty"`
}

// WorkerPool manages concurrent PDF generation
type WorkerPool struct {
	workers    int
	jobQueue   chan Job
	pdfGen     *generator.PDFGenerator
	status     map[string]*JobStatus
	statusLock sync.RWMutex
	wg         sync.WaitGroup
	ctx        context.Context
	cancel     context.CancelFunc
}

// NewWorkerPool creates a new worker pool
func NewWorkerPool(ctx context.Context, workers int, pdfGen *generator.PDFGenerator) *WorkerPool {
	ctx, cancel := context.WithCancel(ctx)

	pool := &WorkerPool{
		workers:  workers,
		jobQueue: make(chan Job, 100), // Buffer for 100 jobs
		pdfGen:   pdfGen,
		status:   make(map[string]*JobStatus),
		ctx:      ctx,
		cancel:   cancel,
	}

	// Start workers
	for i := 0; i < workers; i++ {
		pool.wg.Add(1)
		go pool.worker(i)
	}

	log.Info().Int("workers", workers).Msg("Worker pool started")
	return pool
}

// worker processes jobs from the queue
func (p *WorkerPool) worker(id int) {
	defer p.wg.Done()

	log.Debug().Int("workerId", id).Msg("Worker started")

	for {
		select {
		case <-p.ctx.Done():
			log.Debug().Int("workerId", id).Msg("Worker shutting down")
			return
		case job, ok := <-p.jobQueue:
			if !ok {
				return
			}
			p.processJob(id, job)
		}
	}
}

// processJob handles a single job
func (p *WorkerPool) processJob(workerId int, job Job) {
	startTime := time.Now()

	log.Info().
		Int("workerId", workerId).
		Str("jobId", job.ID).
		Str("userId", job.UserID).
		Msg("Processing job")

	// Update status to processing
	p.updateStatus(job.ID, "processing", "", "")

	// Generate PDF
	pdf, err := p.pdfGen.Generate(p.ctx, job.Data)

	duration := time.Since(startTime)
	result := JobResult{
		JobID:       job.ID,
		UserID:      job.UserID,
		PDF:         pdf,
		Error:       err,
		Duration:    duration,
		CompletedAt: time.Now(),
	}

	// Update status
	if err != nil {
		log.Error().
			Err(err).
			Int("workerId", workerId).
			Str("jobId", job.ID).
			Msg("Job failed")
		p.updateStatus(job.ID, "failed", err.Error(), "")
	} else {
		log.Info().
			Int("workerId", workerId).
			Str("jobId", job.ID).
			Dur("duration", duration).
			Int("sizeBytes", len(pdf)).
			Msg("Job completed")

		// TODO: Upload to storage and get URL
		pdfUrl := "https://storage.verifydev.io/resumes/" + job.UserID + ".pdf"
		p.updateStatus(job.ID, "completed", "", pdfUrl)
	}

	// Send result back
	if job.Result != nil {
		job.Result <- result
		close(job.Result)
	}
}

// Submit adds a job to the queue
func (p *WorkerPool) Submit(job Job) error {
	// Create status entry
	p.statusLock.Lock()
	p.status[job.ID] = &JobStatus{
		ID:        job.ID,
		UserID:    job.UserID,
		Status:    "queued",
		CreatedAt: job.CreatedAt,
	}
	p.statusLock.Unlock()

	select {
	case p.jobQueue <- job:
		log.Debug().Str("jobId", job.ID).Msg("Job queued")
		return nil
	case <-p.ctx.Done():
		return p.ctx.Err()
	}
}

// GetStatus returns the status of a job
func (p *WorkerPool) GetStatus(jobId string) (*JobStatus, bool) {
	p.statusLock.RLock()
	defer p.statusLock.RUnlock()

	status, ok := p.status[jobId]
	return status, ok
}

// updateStatus updates job status
func (p *WorkerPool) updateStatus(jobId string, status string, errorMsg string, pdfUrl string) {
	p.statusLock.Lock()
	defer p.statusLock.Unlock()

	if s, ok := p.status[jobId]; ok {
		s.Status = status
		if errorMsg != "" {
			s.Error = errorMsg
		}
		if pdfUrl != "" {
			s.PDFUrl = pdfUrl
		}
		if status == "completed" || status == "failed" {
			now := time.Now()
			s.CompletedAt = &now
		}
	}
}

// GetStats returns worker pool statistics
func (p *WorkerPool) GetStats() map[string]interface{} {
	p.statusLock.RLock()
	defer p.statusLock.RUnlock()

	queued := 0
	processing := 0
	completed := 0
	failed := 0

	for _, s := range p.status {
		switch s.Status {
		case "queued":
			queued++
		case "processing":
			processing++
		case "completed":
			completed++
		case "failed":
			failed++
		}
	}

	return map[string]interface{}{
		"workers":    p.workers,
		"queueSize":  len(p.jobQueue),
		"queued":     queued,
		"processing": processing,
		"completed":  completed,
		"failed":     failed,
		"totalJobs":  len(p.status),
	}
}

// Shutdown gracefully shuts down the worker pool
func (p *WorkerPool) Shutdown() {
	log.Info().Msg("Shutting down worker pool")

	p.cancel()
	close(p.jobQueue)

	// Wait for all workers to finish
	done := make(chan struct{})
	go func() {
		p.wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		log.Info().Msg("Worker pool shutdown complete")
	case <-time.After(30 * time.Second):
		log.Warn().Msg("Worker pool shutdown timed out")
	}
}

// CleanupOldJobs removes old job statuses
func (p *WorkerPool) CleanupOldJobs(maxAge time.Duration) int {
	p.statusLock.Lock()
	defer p.statusLock.Unlock()

	cutoff := time.Now().Add(-maxAge)
	cleaned := 0

	for id, s := range p.status {
		if s.CompletedAt != nil && s.CompletedAt.Before(cutoff) {
			delete(p.status, id)
			cleaned++
		}
	}

	if cleaned > 0 {
		log.Info().Int("cleaned", cleaned).Msg("Cleaned old job statuses")
	}

	return cleaned
}
