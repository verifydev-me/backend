// Package debug - Performance Profiler
// Use this to profile analysis performance and find bottlenecks
package debug

import (
	"fmt"
	"runtime"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
)

// Profiler tracks timing for different operations
type Profiler struct {
	mu       sync.Mutex
	timings  map[string][]time.Duration
	counts   map[string]int
	active   map[string]time.Time
	enabled  bool
	memStart uint64
}

// Global profiler instance
var globalProfiler = NewProfiler()

// NewProfiler creates a new profiler instance
func NewProfiler() *Profiler {
	return &Profiler{
		timings: make(map[string][]time.Duration),
		counts:  make(map[string]int),
		active:  make(map[string]time.Time),
		enabled: true,
	}
}

// Enable turns on profiling
func (p *Profiler) Enable() {
	p.enabled = true
}

// Disable turns off profiling
func (p *Profiler) Disable() {
	p.enabled = false
}

// Reset clears all profiling data
func (p *Profiler) Reset() {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.timings = make(map[string][]time.Duration)
	p.counts = make(map[string]int)
	p.active = make(map[string]time.Time)
}

// Start begins timing an operation
func (p *Profiler) Start(operation string) {
	if !p.enabled {
		return
	}
	p.mu.Lock()
	defer p.mu.Unlock()
	p.active[operation] = time.Now()
}

// Stop ends timing and records the duration
func (p *Profiler) Stop(operation string) time.Duration {
	if !p.enabled {
		return 0
	}
	p.mu.Lock()
	defer p.mu.Unlock()

	start, exists := p.active[operation]
	if !exists {
		return 0
	}

	duration := time.Since(start)
	p.timings[operation] = append(p.timings[operation], duration)
	p.counts[operation]++
	delete(p.active, operation)

	return duration
}

// Track is a convenience function that returns a stop function
// Usage: defer profiler.Track("operation")()
func (p *Profiler) Track(operation string) func() {
	p.Start(operation)
	return func() {
		p.Stop(operation)
	}
}

// Increment counts an operation without timing
func (p *Profiler) Increment(operation string) {
	if !p.enabled {
		return
	}
	p.mu.Lock()
	defer p.mu.Unlock()
	p.counts[operation]++
}

// SnapshotMemory records current memory usage
func (p *Profiler) SnapshotMemory() {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	p.memStart = m.Alloc
}

// MemoryDelta returns memory change since snapshot
func (p *Profiler) MemoryDelta() int64 {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	return int64(m.Alloc) - int64(p.memStart)
}

// ProfileResult contains stats for one operation
type ProfileResult struct {
	Operation string
	Count     int
	TotalTime time.Duration
	AvgTime   time.Duration
	MinTime   time.Duration
	MaxTime   time.Duration
}

// GetResults returns all profiling results
func (p *Profiler) GetResults() []ProfileResult {
	p.mu.Lock()
	defer p.mu.Unlock()

	var results []ProfileResult

	for op, durations := range p.timings {
		if len(durations) == 0 {
			continue
		}

		result := ProfileResult{
			Operation: op,
			Count:     len(durations),
			MinTime:   durations[0],
			MaxTime:   durations[0],
		}

		var total time.Duration
		for _, d := range durations {
			total += d
			if d < result.MinTime {
				result.MinTime = d
			}
			if d > result.MaxTime {
				result.MaxTime = d
			}
		}

		result.TotalTime = total
		result.AvgTime = total / time.Duration(len(durations))
		results = append(results, result)
	}

	// Sort by total time (descending)
	sort.Slice(results, func(i, j int) bool {
		return results[i].TotalTime > results[j].TotalTime
	})

	return results
}

// PrintReport prints a formatted profiling report
func (p *Profiler) PrintReport() {
	results := p.GetResults()

	fmt.Println("\n" + strings.Repeat("=", 80))
	fmt.Println("⚡ PERFORMANCE PROFILING REPORT")
	fmt.Println(strings.Repeat("=", 80))
	fmt.Printf("\n%-35s %8s %12s %12s %12s\n", "OPERATION", "COUNT", "TOTAL", "AVG", "MAX")
	fmt.Println(strings.Repeat("-", 80))

	var grandTotal time.Duration
	for _, r := range results {
		grandTotal += r.TotalTime
		fmt.Printf("%-35s %8d %12s %12s %12s\n",
			truncate(r.Operation, 35),
			r.Count,
			formatDuration(r.TotalTime),
			formatDuration(r.AvgTime),
			formatDuration(r.MaxTime))
	}

	fmt.Println(strings.Repeat("-", 80))
	fmt.Printf("%-35s %8s %12s\n", "TOTAL", "", formatDuration(grandTotal))

	// Memory stats
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	fmt.Printf("\n📊 Memory: Alloc=%s, TotalAlloc=%s, Sys=%s, NumGC=%d\n",
		formatBytes(m.Alloc),
		formatBytes(m.TotalAlloc),
		formatBytes(m.Sys),
		m.NumGC)

	fmt.Println(strings.Repeat("=", 80))
}

// LogReport logs the profiling report
func (p *Profiler) LogReport() {
	results := p.GetResults()

	for _, r := range results {
		log.Info().
			Str("operation", r.Operation).
			Int("count", r.Count).
			Dur("total", r.TotalTime).
			Dur("avg", r.AvgTime).
			Dur("max", r.MaxTime).
			Msg("⚡ Profile")
	}
}

// ============================================
// GLOBAL PROFILER FUNCTIONS
// ============================================

// ProfileStart starts timing using global profiler
func ProfileStart(operation string) {
	globalProfiler.Start(operation)
}

// ProfileStop stops timing using global profiler
func ProfileStop(operation string) time.Duration {
	return globalProfiler.Stop(operation)
}

// Profile returns a defer-able function using global profiler
// Usage: defer debug.Profile("operation")()
func Profile(operation string) func() {
	return globalProfiler.Track(operation)
}

// ProfileCount increments a counter
func ProfileCount(operation string) {
	globalProfiler.Increment(operation)
}

// ProfileReport prints the global profile report
func ProfileReport() {
	globalProfiler.PrintReport()
}

// ProfileReset clears global profiler
func ProfileReset() {
	globalProfiler.Reset()
}

// ============================================
// HELPER FUNCTIONS
// ============================================

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}

func formatDuration(d time.Duration) string {
	if d < time.Microsecond {
		return fmt.Sprintf("%dns", d.Nanoseconds())
	}
	if d < time.Millisecond {
		return fmt.Sprintf("%.1fµs", float64(d.Microseconds()))
	}
	if d < time.Second {
		return fmt.Sprintf("%.1fms", float64(d.Milliseconds()))
	}
	return fmt.Sprintf("%.2fs", d.Seconds())
}

func formatBytes(b uint64) string {
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := uint64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(b)/float64(div), "KMGTPE"[exp])
}

// ============================================
// ANALYSIS-SPECIFIC PROFILERS
// ============================================

// AnalysisProfiler provides pre-defined profile points for analysis
type AnalysisProfiler struct {
	*Profiler
	projectId string
	startTime time.Time
}

// NewAnalysisProfiler creates a profiler for a specific analysis
func NewAnalysisProfiler(projectId string) *AnalysisProfiler {
	return &AnalysisProfiler{
		Profiler:  NewProfiler(),
		projectId: projectId,
		startTime: time.Now(),
	}
}

// Standard analysis phases
const (
	PhaseClone           = "1_clone"
	PhaseLanguageDetect  = "2_language_detect"
	PhaseInfraExtract    = "3_infra_extract"
	PhasePatternAnalysis = "4_pattern_analysis"
	PhaseInference       = "5_inference"
	PhaseIntelligence    = "6_intelligence"
	PhaseEnrichment      = "7_enrichment"
)

// TrackPhase tracks an analysis phase
func (ap *AnalysisProfiler) TrackPhase(phase string) func() {
	return ap.Track(phase)
}

// Summary prints a summary for this analysis
func (ap *AnalysisProfiler) Summary() {
	totalTime := time.Since(ap.startTime)

	fmt.Printf("\n📊 Analysis Summary for %s\n", ap.projectId)
	fmt.Printf("Total Time: %s\n", formatDuration(totalTime))
	ap.PrintReport()
}
