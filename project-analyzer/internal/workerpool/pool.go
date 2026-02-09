package workerpool

import (
	"context"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
)

// Job represents a unit of work to be processed
type Job struct {
	ID      string
	Payload interface{}
}

// Result represents the outcome of processing a job
type Result struct {
	JobID    string
	Success  bool
	Error    error
	Duration time.Duration
}

// WorkerFunc is the function signature for job processing
type WorkerFunc func(ctx context.Context, job Job) Result

// Pool manages a pool of worker goroutines
type Pool struct {
	name        string
	workerCount int
	jobQueue    chan Job
	results     chan Result
	workerFunc  WorkerFunc
	wg          sync.WaitGroup
	ctx         context.Context
	cancel      context.CancelFunc
	metrics     *Metrics
}

// Metrics tracks worker pool statistics
type Metrics struct {
	mu            sync.RWMutex
	TotalJobs     int64
	CompletedJobs int64
	FailedJobs    int64
	ActiveWorkers int
	AvgDuration   time.Duration
	totalDuration time.Duration
}

// NewMetrics creates a new Metrics instance
func NewMetrics() *Metrics {
	return &Metrics{}
}

// IncrementActive safely increments active workers
func (m *Metrics) IncrementActive() {
	m.mu.Lock()
	m.ActiveWorkers++
	m.mu.Unlock()
}

// DecrementActive safely decrements active workers
func (m *Metrics) DecrementActive() {
	m.mu.Lock()
	m.ActiveWorkers--
	m.mu.Unlock()
}

// RecordJob records a completed job
func (m *Metrics) RecordJob(success bool, duration time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.TotalJobs++
	m.totalDuration += duration

	if success {
		m.CompletedJobs++
	} else {
		m.FailedJobs++
	}

	// Recalculate average
	if m.TotalJobs > 0 {
		m.AvgDuration = m.totalDuration / time.Duration(m.TotalJobs)
	}
}

// GetStats returns current metrics
func (m *Metrics) GetStats() (total, completed, failed int64, active int, avgDur time.Duration) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.TotalJobs, m.CompletedJobs, m.FailedJobs, m.ActiveWorkers, m.AvgDuration
}

// Config holds worker pool configuration
type Config struct {
	Name          string
	WorkerCount   int
	QueueSize     int
	ResultsBuffer int
}

// DefaultConfig returns sensible defaults
func DefaultConfig(name string) Config {
	return Config{
		Name:          name,
		WorkerCount:   4,   // Default 4 concurrent workers
		QueueSize:     100, // Buffer up to 100 jobs
		ResultsBuffer: 100,
	}
}

// New creates a new worker pool
func New(cfg Config, workerFunc WorkerFunc) *Pool {
	ctx, cancel := context.WithCancel(context.Background())

	return &Pool{
		name:        cfg.Name,
		workerCount: cfg.WorkerCount,
		jobQueue:    make(chan Job, cfg.QueueSize),
		results:     make(chan Result, cfg.ResultsBuffer),
		workerFunc:  workerFunc,
		ctx:         ctx,
		cancel:      cancel,
		metrics:     NewMetrics(),
	}
}

// Start initializes and starts all workers
func (p *Pool) Start() {
	log.Info().
		Str("pool", p.name).
		Int("workers", p.workerCount).
		Msg("🚀 Starting worker pool")

	for i := 0; i < p.workerCount; i++ {
		p.wg.Add(1)
		go p.worker(i)
	}

	// Start metrics logger
	go p.logMetrics()
}

// worker is the main worker goroutine
func (p *Pool) worker(id int) {
	defer p.wg.Done()

	log.Debug().
		Str("pool", p.name).
		Int("workerId", id).
		Msg("Worker started")

	for {
		select {
		case <-p.ctx.Done():
			log.Debug().
				Str("pool", p.name).
				Int("workerId", id).
				Msg("Worker shutting down")
			return

		case job, ok := <-p.jobQueue:
			if !ok {
				// Channel closed
				return
			}

			// Track active workers
			p.metrics.IncrementActive()

			// Process job
			start := time.Now()
			result := p.workerFunc(p.ctx, job)
			result.Duration = time.Since(start)
			result.JobID = job.ID

			// Record metrics
			p.metrics.RecordJob(result.Success, result.Duration)
			p.metrics.DecrementActive()

			// Send result (non-blocking with timeout)
			select {
			case p.results <- result:
			case <-time.After(5 * time.Second):
				log.Warn().
					Str("pool", p.name).
					Str("jobId", job.ID).
					Msg("Result channel full, dropping result")
			}
		}
	}
}

// Submit adds a job to the queue
// Returns false if the pool is full or shutting down
func (p *Pool) Submit(job Job) bool {
	select {
	case <-p.ctx.Done():
		return false
	case p.jobQueue <- job:
		return true
	default:
		// Queue is full
		log.Warn().
			Str("pool", p.name).
			Str("jobId", job.ID).
			Msg("Job queue full, dropping job")
		return false
	}
}

// SubmitWait adds a job and waits if queue is full
func (p *Pool) SubmitWait(job Job) bool {
	select {
	case <-p.ctx.Done():
		return false
	case p.jobQueue <- job:
		return true
	}
}

// Results returns the results channel for reading
func (p *Pool) Results() <-chan Result {
	return p.results
}

// Stop gracefully shuts down the worker pool
func (p *Pool) Stop() {
	log.Info().
		Str("pool", p.name).
		Msg("Stopping worker pool...")

	// Signal workers to stop
	p.cancel()

	// Wait for workers to finish current jobs
	p.wg.Wait()

	// Close channels
	close(p.jobQueue)
	close(p.results)

	total, completed, failed, _, avgDur := p.metrics.GetStats()
	log.Info().
		Str("pool", p.name).
		Int64("totalJobs", total).
		Int64("completed", completed).
		Int64("failed", failed).
		Dur("avgDuration", avgDur).
		Msg("Worker pool stopped")
}

// logMetrics periodically logs pool statistics
func (p *Pool) logMetrics() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-p.ctx.Done():
			return
		case <-ticker.C:
			total, completed, failed, active, avgDur := p.metrics.GetStats()
			log.Info().
				Str("pool", p.name).
				Int64("total", total).
				Int64("completed", completed).
				Int64("failed", failed).
				Int("active", active).
				Dur("avgDuration", avgDur).
				Int("queueLen", len(p.jobQueue)).
				Msg("📊 Worker pool metrics")
		}
	}
}

// QueueLength returns current queue size
func (p *Pool) QueueLength() int {
	return len(p.jobQueue)
}

// GetMetrics returns current metrics snapshot
func (p *Pool) GetMetrics() (total, completed, failed int64, active int, avgDur time.Duration) {
	return p.metrics.GetStats()
}
