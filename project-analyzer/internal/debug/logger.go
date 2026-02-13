// Package debug provides debugging utilities for the project analyzer.
package debug

import (
	"os"
	"strings"

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
