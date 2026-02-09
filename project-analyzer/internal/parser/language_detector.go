package parser

import (
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/go-enry/go-enry/v2"
	"github.com/rs/zerolog/log"
)

// ============================================
// ENHANCED LANGUAGE DETECTOR - GitHub's Classifier
// ============================================

// LanguageDetector performs accurate language detection using go-enry
type LanguageDetector struct {
	repoPath string
	cache    *LanguageDistribution // Cache result to avoid redundant scans
}

// LanguageDistribution contains language analysis results
type LanguageDistribution struct {
	Primary            string             `json:"primary"`
	Languages          map[string]float64 `json:"languages"` // language -> percentage
	TotalBytes         int64              `json:"totalBytes"`
	TotalFiles         int                `json:"totalFiles"`
	FilesByLanguage    map[string]int     `json:"filesByLanguage"`
	IsMultiLanguage    bool               `json:"isMultiLanguage"`
	HasGeneratedCode   bool               `json:"hasGeneratedCode"`
	HasVendoredCode    bool               `json:"hasVendoredCode"`
	DocumentationBytes int64              `json:"documentationBytes"`
	CodeBytes          int64              `json:"codeBytes"`
	AccuracyScore      float64            `json:"accuracyScore"` // Confidence in detection
}

// NewLanguageDetector creates a new language detector
func NewLanguageDetector(repoPath string) *LanguageDetector {
	return &LanguageDetector{
		repoPath: repoPath,
	}
}

// Detect performs accurate language detection (cached — safe to call multiple times)
func (d *LanguageDetector) Detect() (*LanguageDistribution, error) {
	// Return cached result if available (was called 4+ times per analysis)
	if d.cache != nil {
		return d.cache, nil
	}

	log.Info().Str("path", d.repoPath).Msg("Starting enhanced language detection")

	dist := &LanguageDistribution{
		Languages:       make(map[string]float64),
		FilesByLanguage: make(map[string]int),
	}

	// Track bytes by language
	bytesByLanguage := make(map[string]int64)

	// Walk through all files
	err := filepath.Walk(d.repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip directories
		if info.IsDir() {
			// Skip common ignored directories
			base := filepath.Base(path)
			if base == ".git" || base == "node_modules" || base == "vendor" {
				return filepath.SkipDir
			}
			return nil
		}

		// Skip large files (> 1MB)
		if info.Size() > 1*1024*1024 {
			return nil
		}

		// Read file content
		content, err := ioutil.ReadFile(path)
		if err != nil {
			return nil // Skip files we can't read
		}

		// Check if generated code
		if enry.IsGenerated(path, content) {
			dist.HasGeneratedCode = true
			return nil // Skip generated files
		}

		// Check if vendored code
		if enry.IsVendor(path) {
			dist.HasVendoredCode = true
			return nil // Skip vendored files
		}

		// Check if documentation
		if enry.IsDocumentation(path) {
			dist.DocumentationBytes += int64(len(content))
			return nil
		}

		// Detect language
		language := enry.GetLanguage(filepath.Base(path), content)

		if language != "" {
			bytesByLanguage[language] += int64(len(content))
			dist.FilesByLanguage[language]++
			dist.TotalFiles++
			dist.TotalBytes += int64(len(content))
			dist.CodeBytes += int64(len(content))
		}

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to walk directory: %w", err)
	}

	// Calculate percentages
	if dist.TotalBytes > 0 {
		for lang, bytes := range bytesByLanguage {
			percentage := (float64(bytes) / float64(dist.TotalBytes)) * 100
			dist.Languages[lang] = percentage
		}
	}

	// Determine primary language
	dist.Primary = d.determinePrimaryLanguage(bytesByLanguage)

	// Check if multi-language project
	significantLangs := 0
	for _, percentage := range dist.Languages {
		if percentage > 10 { // More than 10% is significant
			significantLangs++
		}
	}
	dist.IsMultiLanguage = significantLangs > 1

	// Calculate accuracy score
	dist.AccuracyScore = d.calculateAccuracyScore(dist)

	log.Info().
		Str("primary", dist.Primary).
		Int("totalFiles", dist.TotalFiles).
		Bool("multiLanguage", dist.IsMultiLanguage).
		Float64("accuracy", dist.AccuracyScore).
		Msg("Language detection completed")

	// Cache result to avoid redundant scans
	d.cache = dist

	return dist, nil
}

// determinePrimaryLanguage finds the primary language by bytes
func (d *LanguageDetector) determinePrimaryLanguage(bytesByLanguage map[string]int64) string {
	if len(bytesByLanguage) == 0 {
		return "Unknown"
	}

	// Sort languages by bytes (descending)
	type langBytes struct {
		lang  string
		bytes int64
	}

	var langs []langBytes
	for lang, bytes := range bytesByLanguage {
		langs = append(langs, langBytes{lang, bytes})
	}

	sort.Slice(langs, func(i, j int) bool {
		return langs[i].bytes > langs[j].bytes
	})

	return langs[0].lang
}

// calculateAccuracyScore calculates confidence in detection
func (d *LanguageDetector) calculateAccuracyScore(dist *LanguageDistribution) float64 {
	score := 100.0

	// Reduce score if very few files
	if dist.TotalFiles < 5 {
		score -= 20
	} else if dist.TotalFiles < 10 {
		score -= 10
	}

	// Reduce score if too much generated/vendored code
	if dist.HasGeneratedCode {
		score -= 5
	}
	if dist.HasVendoredCode {
		score -= 5
	}

	// Boost score if clear primary language
	if dist.Primary != "Unknown" && len(dist.Languages) > 0 {
		primaryPercentage := dist.Languages[dist.Primary]
		if primaryPercentage > 70 {
			score += 10 // Very clear primary
		} else if primaryPercentage < 30 {
			score -= 15 // Unclear primary
		}
	}

	// Ensure score is in valid range
	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}

	return score
}

// GetPrimaryLanguage returns just the primary language
func (d *LanguageDetector) GetPrimaryLanguage() (string, error) {
	dist, err := d.Detect()
	if err != nil {
		return "", err
	}
	return dist.Primary, nil
}

// GetLanguageBreakdown returns a formatted breakdown
func (d *LanguageDetector) GetLanguageBreakdown() string {
	dist, err := d.Detect()
	if err != nil {
		return "Unable to detect languages"
	}

	if len(dist.Languages) == 0 {
		return "No languages detected"
	}

	// Sort languages by percentage
	type langPct struct {
		lang       string
		percentage float64
	}

	var langs []langPct
	for lang, pct := range dist.Languages {
		langs = append(langs, langPct{lang, pct})
	}

	sort.Slice(langs, func(i, j int) bool {
		return langs[i].percentage > langs[j].percentage
	})

	// Build breakdown string
	var parts []string
	for _, lp := range langs {
		if lp.percentage > 1 { // Only show languages > 1%
			parts = append(parts, fmt.Sprintf("%s (%.1f%%)", lp.lang, lp.percentage))
		}
	}

	return strings.Join(parts, ", ")
}

// IsGoProject checks if this is primarily a Go project
func (d *LanguageDetector) IsGoProject() bool {
	dist, err := d.Detect()
	if err != nil {
		return false
	}
	return dist.Primary == "Go"
}

// IsJavaScriptProject checks if this is primarily a JS/TS project
func (d *LanguageDetector) IsJavaScriptProject() bool {
	dist, err := d.Detect()
	if err != nil {
		return false
	}
	return dist.Primary == "JavaScript" ||
		dist.Primary == "TypeScript" ||
		dist.Primary == "JSX" ||
		dist.Primary == "TSX"
}

// IsPythonProject checks if this is primarily a Python project
func (d *LanguageDetector) IsPythonProject() bool {
	dist, err := d.Detect()
	if err != nil {
		return false
	}
	return dist.Primary == "Python"
}
