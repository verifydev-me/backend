// Package debug - Request Tracer
// Use this to trace the full lifecycle of an analysis request
package debug

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
)

// Span represents a traced operation
type Span struct {
	Name      string
	StartTime time.Time
	EndTime   time.Time
	Duration  time.Duration
	Metadata  map[string]string
	Children  []*Span
	parent    *Span
}

// Tracer manages request tracing
type Tracer struct {
	mu       sync.Mutex
	traceID  string
	rootSpan *Span
	current  *Span
	enabled  bool
}

// NewTracer creates a new tracer for a request
func NewTracer(traceID string) *Tracer {
	return &Tracer{
		traceID: traceID,
		enabled: true,
	}
}

// StartSpan begins a new span
func (t *Tracer) StartSpan(name string) *Span {
	if !t.enabled {
		return nil
	}

	t.mu.Lock()
	defer t.mu.Unlock()

	span := &Span{
		Name:      name,
		StartTime: time.Now(),
		Metadata:  make(map[string]string),
		parent:    t.current,
	}

	if t.current != nil {
		t.current.Children = append(t.current.Children, span)
	} else {
		t.rootSpan = span
	}

	t.current = span

	log.Debug().
		Str("traceId", t.traceID).
		Str("span", name).
		Msg("→ Span started")

	return span
}

// EndSpan ends the current span
func (t *Tracer) EndSpan() {
	if !t.enabled || t.current == nil {
		return
	}

	t.mu.Lock()
	defer t.mu.Unlock()

	t.current.EndTime = time.Now()
	t.current.Duration = t.current.EndTime.Sub(t.current.StartTime)

	log.Debug().
		Str("traceId", t.traceID).
		Str("span", t.current.Name).
		Dur("duration", t.current.Duration).
		Msg("← Span ended")

	t.current = t.current.parent
}

// TraceSpan returns a function for defer-based tracing
// Usage: defer tracer.TraceSpan("operation")()
func (t *Tracer) TraceSpan(name string) func() {
	t.StartSpan(name)
	return func() {
		t.EndSpan()
	}
}

// SetMetadata adds metadata to current span
func (t *Tracer) SetMetadata(key, value string) {
	if !t.enabled || t.current == nil {
		return
	}
	t.mu.Lock()
	defer t.mu.Unlock()
	t.current.Metadata[key] = value
}

// PrintTrace prints the full trace tree
func (t *Tracer) PrintTrace() {
	if t.rootSpan == nil {
		fmt.Println("No trace recorded")
		return
	}

	fmt.Println("\n" + strings.Repeat("=", 70))
	fmt.Printf("🔍 TRACE: %s\n", t.traceID)
	fmt.Println(strings.Repeat("=", 70))

	t.printSpan(t.rootSpan, 0)

	fmt.Println(strings.Repeat("=", 70))
}

func (t *Tracer) printSpan(span *Span, depth int) {
	indent := strings.Repeat("  ", depth)
	bar := t.getTimeBar(span.Duration)

	fmt.Printf("%s├─ %-30s %s %s\n",
		indent,
		truncateSpanName(span.Name, 30),
		bar,
		formatDuration(span.Duration))

	// Print metadata
	for k, v := range span.Metadata {
		fmt.Printf("%s│  📎 %s: %s\n", indent, k, v)
	}

	// Print children
	for _, child := range span.Children {
		t.printSpan(child, depth+1)
	}
}

func (t *Tracer) getTimeBar(d time.Duration) string {
	// Scale: each block = 10ms, max 20 blocks
	blocks := int(d.Milliseconds() / 10)
	if blocks > 20 {
		blocks = 20
	}
	if blocks < 1 {
		blocks = 1
	}
	return "[" + strings.Repeat("█", blocks) + strings.Repeat("░", 20-blocks) + "]"
}

func truncateSpanName(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s + strings.Repeat(" ", maxLen-len(s))
	}
	return s[:maxLen-3] + "..."
}

// ToJSON returns the trace as JSON
func (t *Tracer) ToJSON() string {
	// Simple implementation - could use encoding/json for full version
	return fmt.Sprintf(`{"traceId":"%s","totalDuration":"%s"}`,
		t.traceID,
		t.rootSpan.Duration.String())
}
