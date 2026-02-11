// Package debug provides debugging utilities for the project analyzer.
package debug

import (
	"os"
	"runtime"
	"strings"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// LogLevel determines the verbosity of debug logs
type LogLevel int

const (
	LevelSilent LogLevel = iota
	LevelError
	LevelWarn
	LevelInfo
	LevelDebug
	LevelTrace
)

var (
	CurrentLevel      = LevelDebug
	EnabledCategories = map[string]bool{}
)

func init() {
	switch strings.ToLower(os.Getenv("DEBUG_LEVEL")) {
	case "silent", "off":
		CurrentLevel = LevelSilent
	case "error":
		CurrentLevel = LevelError
	case "warn":
		CurrentLevel = LevelWarn
	case "info":
		CurrentLevel = LevelInfo
	case "debug":
		CurrentLevel = LevelDebug
	case "trace", "verbose":
		CurrentLevel = LevelTrace
	}

	cats := os.Getenv("DEBUG_CATEGORIES")
	if cats != "" {
		for _, cat := range strings.Split(cats, ",") {
			EnabledCategories[strings.TrimSpace(cat)] = true
		}
	}
}

func isEnabled(category string) bool {
	if len(EnabledCategories) == 0 {
		return true
	}
	return EnabledCategories[category]
}

// LogSignal logs when a signal is detected
func LogSignal(signal string, confidence float64, evidence []string) {
	if CurrentLevel < LevelDebug || !isEnabled("signal") {
		return
	}
	log.Debug().
		Str("signal", signal).
		Float64("confidence", confidence).
		Strs("evidence", evidence).
		Msg("🎯 Signal detected")
}

// LogScan logs file scanning operations
func LogScan(pattern string, found int, repoPath string) {
	if CurrentLevel < LevelDebug || !isEnabled("scan") {
		return
	}
	log.Debug().
		Str("pattern", pattern).
		Int("found", found).
		Str("repoPath", repoPath).
		Msg("🔍 File scan completed")
}

// LogScanStart logs when a scan begins
func LogScanStart(patterns []string, repoPath string) {
	if CurrentLevel < LevelDebug || !isEnabled("scan") {
		return
	}
	log.Debug().
		Strs("patterns", patterns).
		Str("repoPath", repoPath).
		Msg("🔍 Starting file scan")
}

// LogFileFound logs when a matching file is found
func LogFileFound(file string, pattern string) {
	if CurrentLevel < LevelTrace || !isEnabled("scan") {
		return
	}
	log.Trace().
		Str("file", file).
		Str("pattern", pattern).
		Msg("🔍 File matched pattern")
}

// LogFileSkip logs when a file is skipped
func LogFileSkip(file string, reason string) {
	if CurrentLevel < LevelTrace || !isEnabled("scan") {
		return
	}
	log.Trace().
		Str("file", file).
		Str("reason", reason).
		Msg("⏭️ File skipped")
}

// LogPackage logs package.json/go.mod/requirements.txt scanning
func LogPackage(pkgType string, path string, depCount int) {
	if CurrentLevel < LevelDebug || !isEnabled("package") {
		return
	}
	log.Debug().
		Str("type", pkgType).
		Str("path", path).
		Int("dependencies", depCount).
		Msg("📦 Package file scanned")
}

// LogDependency logs individual dependency detection
func LogDependency(name string, signal string, source string) {
	if CurrentLevel < LevelDebug || !isEnabled("package") {
		return
	}
	log.Debug().
		Str("dependency", name).
		Str("signal", signal).
		Str("source", source).
		Msg("📦 Dependency → Signal")
}

// TraceFunction returns a function to be deferred for timing
func TraceFunction(name string) func() {
	if CurrentLevel < LevelDebug || !isEnabled("perf") {
		return func() {}
	}
	start := time.Now()
	log.Debug().Str("function", name).Msg("→ Entering")
	return func() {
		log.Debug().
			Str("function", name).
			Dur("duration", time.Since(start)).
			Msg("← Exiting")
	}
}

// TraceAnalysis returns a function to log analysis completion
func TraceAnalysis(projectId string, repo string) func() {
	start := time.Now()
	log.Info().
		Str("projectId", projectId).
		Str("repo", repo).
		Msg("📦 Starting analysis")
	return func() {
		log.Info().
			Str("projectId", projectId).
			Dur("duration", time.Since(start)).
			Msg("✅ Analysis completed")
	}
}

// LogError logs an error with context
func LogError(err error, context string, metadata map[string]string) {
	event := log.Error().Err(err).Str("context", context)
	for k, v := range metadata {
		event = event.Str(k, v)
	}
	event.Msg("❌ Error occurred")
}

// LogWarn logs a warning
func LogWarn(message string, metadata map[string]string) {
	event := log.Warn()
	for k, v := range metadata {
		event = event.Str(k, v)
	}
	event.Msg("⚠️ " + message)
}

// LogRoute logs routing decisions
func LogRoute(decision string, reason string, metadata map[string]interface{}) {
	if CurrentLevel < LevelDebug || !isEnabled("route") {
		return
	}
	event := log.Debug().
		Str("decision", decision).
		Str("reason", reason)
	for k, v := range metadata {
		switch val := v.(type) {
		case string:
			event = event.Str(k, val)
		case bool:
			event = event.Bool(k, val)
		}
	}
	event.Msg("🔀 Routing decision")
}

// GetCaller returns the calling function name and line
func GetCaller(skip int) (string, int) {
	_, file, line, ok := runtime.Caller(skip + 1)
	if !ok {
		return "unknown", 0
	}
	parts := strings.Split(file, "/")
	return parts[len(parts)-1], line
}

// LogWithCaller adds caller info to log
func LogWithCaller() *zerolog.Event {
	file, line := GetCaller(1)
	return log.Debug().Str("caller", file).Int("line", line)
}
