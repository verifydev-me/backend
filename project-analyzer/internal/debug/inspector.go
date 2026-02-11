// Package debug - Signal Inspector
// Use this to dump and inspect all detected signals for debugging
package debug

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"

	"github.com/rs/zerolog/log"
)

// SignalDump represents a simplified view of detected signals
type SignalDump struct {
	TotalSignals int                 `json:"totalSignals"`
	ByCategory   map[string][]string `json:"byCategory"`
	ByConfidence map[string]float64  `json:"byConfidence"`
	Evidence     map[string][]string `json:"evidence"`
}

// InspectSignals creates a debug dump of all signals
// Generic interface to work with any signal structure
func InspectSignals(signals interface{}) *SignalDump {
	dump := &SignalDump{
		ByCategory:   make(map[string][]string),
		ByConfidence: make(map[string]float64),
		Evidence:     make(map[string][]string),
	}

	// Convert to JSON and back to get a map we can iterate
	data, err := json.Marshal(signals)
	if err != nil {
		log.Error().Err(err).Msg("Failed to marshal signals for inspection")
		return dump
	}

	var signalMap map[string]interface{}
	if err := json.Unmarshal(data, &signalMap); err != nil {
		log.Error().Err(err).Msg("Failed to unmarshal signals for inspection")
		return dump
	}

	// Extract signal details if present
	if details, ok := signalMap["SignalDetails"].(map[string]interface{}); ok {
		for signal, detail := range details {
			dump.TotalSignals++
			if detailMap, ok := detail.(map[string]interface{}); ok {
				// Get confidence
				if conf, ok := detailMap["Confidence"].(float64); ok {
					dump.ByConfidence[signal] = conf
				}
				// Get evidence
				if evidence, ok := detailMap["Evidence"].([]interface{}); ok {
					for _, e := range evidence {
						if eStr, ok := e.(string); ok {
							dump.Evidence[signal] = append(dump.Evidence[signal], eStr)
						}
					}
				}
			}
			// Categorize signal
			category := categorizeSignal(signal)
			dump.ByCategory[category] = append(dump.ByCategory[category], signal)
		}
	}

	return dump
}

// categorizeSignal groups signals by type
func categorizeSignal(signal string) string {
	signal = strings.ToLower(signal)

	categories := map[string][]string{
		"language": {"typescript", "javascript", "go", "python", "rust", "java", "kotlin", "swift"},
		"frontend": {"react", "nextjs", "vue", "angular", "svelte", "tailwind", "redux", "zustand"},
		"backend":  {"express", "nestjs", "gin", "django", "fastapi", "grpc", "graphql"},
		"database": {"postgres", "mysql", "mongodb", "redis", "prisma", "typeorm", "mongoose"},
		"devops":   {"docker", "kubernetes", "github_actions", "gitlab_ci", "terraform"},
		"cloud":    {"aws", "gcp", "azure", "vercel", "netlify", "firebase", "supabase"},
		"testing":  {"jest", "cypress", "playwright", "pytest", "vitest"},
		"security": {"jwt", "oauth", "helmet", "rate_limiting", "cors"},
	}

	for category, keywords := range categories {
		for _, keyword := range keywords {
			if strings.Contains(signal, keyword) {
				return category
			}
		}
	}

	return "other"
}

// PrintSignalDump prints a formatted signal dump to stdout
func PrintSignalDump(dump *SignalDump) {
	fmt.Println("\n" + strings.Repeat("=", 60))
	fmt.Printf("📊 SIGNAL INSPECTION REPORT (Total: %d signals)\n", dump.TotalSignals)
	fmt.Println(strings.Repeat("=", 60))

	// Sort categories for consistent output
	var categories []string
	for cat := range dump.ByCategory {
		categories = append(categories, cat)
	}
	sort.Strings(categories)

	for _, category := range categories {
		signals := dump.ByCategory[category]
		fmt.Printf("\n📁 %s (%d)\n", strings.ToUpper(category), len(signals))
		fmt.Println(strings.Repeat("-", 40))

		// Sort signals
		sort.Strings(signals)
		for _, signal := range signals {
			conf := dump.ByConfidence[signal]
			confBar := getConfidenceBar(conf)
			fmt.Printf("  • %-25s %s %.0f%%\n", signal, confBar, conf*100)

			// Show evidence (first 2 items)
			if evidence, ok := dump.Evidence[signal]; ok && len(evidence) > 0 {
				for i, e := range evidence {
					if i >= 2 {
						fmt.Printf("      ... and %d more\n", len(evidence)-2)
						break
					}
					// Truncate long evidence
					if len(e) > 50 {
						e = e[:47] + "..."
					}
					fmt.Printf("      ↳ %s\n", e)
				}
			}
		}
	}

	fmt.Println("\n" + strings.Repeat("=", 60))
}

// getConfidenceBar returns a visual confidence indicator
func getConfidenceBar(confidence float64) string {
	filled := int(confidence * 10)
	return "[" + strings.Repeat("█", filled) + strings.Repeat("░", 10-filled) + "]"
}

// DumpToFile writes signal dump to a file
func DumpToFile(dump *SignalDump, filepath string) error {
	data, err := json.MarshalIndent(dump, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal dump: %w", err)
	}
	return os.WriteFile(filepath, data, 0644)
}

// DumpToJSON returns the signal dump as formatted JSON
func DumpToJSON(dump *SignalDump) string {
	data, _ := json.MarshalIndent(dump, "", "  ")
	return string(data)
}

// CompareSignals compares two signal dumps and shows differences
func CompareSignals(before, after *SignalDump) {
	fmt.Println("\n" + strings.Repeat("=", 60))
	fmt.Println("🔄 SIGNAL COMPARISON")
	fmt.Println(strings.Repeat("=", 60))

	// Find added signals
	added := []string{}
	for signal := range after.ByConfidence {
		if _, exists := before.ByConfidence[signal]; !exists {
			added = append(added, signal)
		}
	}

	// Find removed signals
	removed := []string{}
	for signal := range before.ByConfidence {
		if _, exists := after.ByConfidence[signal]; !exists {
			removed = append(removed, signal)
		}
	}

	// Find changed confidence
	changed := []string{}
	for signal, afterConf := range after.ByConfidence {
		if beforeConf, exists := before.ByConfidence[signal]; exists {
			if beforeConf != afterConf {
				changed = append(changed, signal)
			}
		}
	}

	if len(added) > 0 {
		fmt.Printf("\n✅ Added (%d):\n", len(added))
		for _, s := range added {
			fmt.Printf("  + %s\n", s)
		}
	}

	if len(removed) > 0 {
		fmt.Printf("\n❌ Removed (%d):\n", len(removed))
		for _, s := range removed {
			fmt.Printf("  - %s\n", s)
		}
	}

	if len(changed) > 0 {
		fmt.Printf("\n🔄 Changed (%d):\n", len(changed))
		for _, s := range changed {
			fmt.Printf("  ~ %s: %.0f%% → %.0f%%\n", s,
				before.ByConfidence[s]*100,
				after.ByConfidence[s]*100)
		}
	}

	if len(added) == 0 && len(removed) == 0 && len(changed) == 0 {
		fmt.Println("\n✅ No changes detected")
	}

	fmt.Println("\n" + strings.Repeat("=", 60))
}
