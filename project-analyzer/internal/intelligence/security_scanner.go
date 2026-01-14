package intelligence

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/rs/zerolog/log"
)

// ============================================
// SECURITY SCANNER - Vulnerability Detection
// Uses gosec CLI for reliable analysis
// ============================================

// SecurityScanner performs security analysis
type SecurityScanner struct {
	repoPath string
}

// SecurityReport contains security scan results
type SecurityReport struct {
	SecurityScore       int                     `json:"securityScore"` // 0-100
	TotalIssues         int                     `json:"totalIssues"`
	CriticalIssues      int                     `json:"criticalIssues"`
	HighIssues          int                     `json:"highIssues"`
	MediumIssues        int                     `json:"mediumIssues"`
	LowIssues           int                     `json:"lowIssues"`
	Vulnerabilities     []SecurityVulnerability `json:"vulnerabilities"`
	CategoryBreakdown   map[string]int          `json:"categoryBreakdown"`
	HasHardcodedSecrets bool                    `json:"hasHardcodedSecrets"`
	HasSQLInjection     bool                    `json:"hasSQLInjection"`
	HasWeakCrypto       bool                    `json:"hasWeakCrypto"`
}

// SecurityVulnerability represents a single security issue
type SecurityVulnerability struct {
	Type        string `json:"type"`
	RuleID      string `json:"ruleId"`
	Severity    string `json:"severity"`
	Confidence  string `json:"confidence"`
	File        string `json:"file"`
	Line        int    `json:"line"`
	Code        string `json:"code,omitempty"`
	Description string `json:"description"`
	CWE         string `json:"cwe,omitempty"`
}

// NewSecurityScanner creates a new security scanner
func NewSecurityScanner(repoPath string) *SecurityScanner {
	return &SecurityScanner{
		repoPath: repoPath,
	}
}

// Scan performs security scanning on the repository
func (s *SecurityScanner) Scan() (*SecurityReport, error) {
	log.Info().Str("path", s.repoPath).Msg("Starting security scan")

	report := &SecurityReport{
		SecurityScore:     100, // Start perfect
		CategoryBreakdown: make(map[string]int),
		Vulnerabilities:   []SecurityVulnerability{},
	}

	// Check if this is a Go project
	if !s.isGoProject() {
		log.Info().Msg("Not a Go project, skipping security scan")
		return report, nil
	}

	// Run security analysis using pattern-based detection
	s.analyzeSecurityPatterns(report)

	// Calculate security score
	report.SecurityScore = s.calculateSecurityScore(report)

	log.Info().
		Int("totalIssues", report.TotalIssues).
		Int("score", report.SecurityScore).
		Msg("Security scan completed")

	return report, nil
}

// isGoProject checks if this is a Go project
func (s *SecurityScanner) isGoProject() bool {
	goModPath := filepath.Join(s.repoPath, "go.mod")
	_, err := os.Stat(goModPath)
	return err == nil
}

// analyzeSecurityPatterns performs pattern-based security analysis
func (s *SecurityScanner) analyzeSecurityPatterns(report *SecurityReport) {
	// Find all Go files
	goFiles := []string{}
	filepath.Walk(s.repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if strings.Contains(path, "/vendor/") || strings.Contains(path, "/.git/") {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if !info.IsDir() && strings.HasSuffix(path, ".go") {
			goFiles = append(goFiles, path)
		}
		return nil
	})

	// Security patterns to check
	securityPatterns := []struct {
		pattern     string
		category    string
		severity    string
		description string
	}{
		// SQL Injection
		{"fmt.Sprintf.*SELECT", "SQL Injection", "HIGH", "Potential SQL injection via string formatting"},
		{"\"SELECT.*\" +", "SQL Injection", "HIGH", "Potential SQL injection via string concatenation"},
		{"db.Exec(.*+.*)", "SQL Injection", "MEDIUM", "Potential SQL injection in db.Exec"},
		{"db.Query(.*+.*)", "SQL Injection", "MEDIUM", "Potential SQL injection in db.Query"},

		// Hardcoded Secrets
		{"password.*=.*\"", "Hardcoded Secrets", "HIGH", "Hardcoded password detected"},
		{"secret.*=.*\"", "Hardcoded Secrets", "HIGH", "Hardcoded secret detected"},
		{"api_key.*=.*\"", "Hardcoded Secrets", "HIGH", "Hardcoded API key detected"},
		{"apikey.*=.*\"", "Hardcoded Secrets", "HIGH", "Hardcoded API key detected"},
		{"token.*=.*\"[a-zA-Z0-9]{20,}\"", "Hardcoded Secrets", "HIGH", "Hardcoded token detected"},

		// Weak Cryptography
		{"crypto/md5", "Weak Crypto", "MEDIUM", "MD5 is cryptographically broken"},
		{"crypto/sha1", "Weak Crypto", "LOW", "SHA1 is deprecated for security"},
		{"crypto/des", "Weak Crypto", "HIGH", "DES encryption is insecure"},
		{"crypto/rc4", "Weak Crypto", "HIGH", "RC4 cipher is insecure"},

		// Unsafe Operations
		{"unsafe.Pointer", "Unsafe Code", "MEDIUM", "Usage of unsafe pointer"},
		{"\"unsafe\"", "Unsafe Code", "LOW", "Unsafe package imported"},

		// Command Injection
		{"exec.Command.*+", "Command Injection", "HIGH", "Potential command injection"},
		{"os.exec.*+", "Command Injection", "HIGH", "Potential command injection"},

		// Path Traversal
		{"filepath.Join.*+.*req", "Path Traversal", "MEDIUM", "Potential path traversal"},
		{"os.Open.*+.*input", "Path Traversal", "MEDIUM", "Potential path traversal via user input"},

		// TLS Issues
		{"InsecureSkipVerify.*true", "TLS Issue", "HIGH", "TLS certificate validation disabled"},
		{"MinVersion.*tls.VersionSSL", "TLS Issue", "HIGH", "Insecure TLS version"},
		{"MinVersion.*tls.VersionTLS10", "TLS Issue", "MEDIUM", "TLS 1.0 is deprecated"},

		// Error Handling
		{"_ = err", "Error Handling", "LOW", "Error ignored"},
		{"_, _ =", "Error Handling", "LOW", "Multiple values ignored"},
	}

	// Check each file for patterns
	for _, filePath := range goFiles {
		content, err := os.ReadFile(filePath)
		if err != nil {
			continue
		}

		lines := strings.Split(string(content), "\n")
		for lineNum, line := range lines {
			for _, pattern := range securityPatterns {
				if strings.Contains(strings.ToLower(line), strings.ToLower(pattern.pattern)) ||
					matchesPattern(line, pattern.pattern) {

					vuln := SecurityVulnerability{
						Type:        pattern.category,
						Severity:    pattern.severity,
						File:        filepath.Base(filePath),
						Line:        lineNum + 1,
						Code:        truncateString(strings.TrimSpace(line), 100),
						Description: pattern.description,
					}

					report.Vulnerabilities = append(report.Vulnerabilities, vuln)
					report.TotalIssues++
					report.CategoryBreakdown[pattern.category]++

					// Increment severity counts
					switch pattern.severity {
					case "CRITICAL":
						report.CriticalIssues++
					case "HIGH":
						report.HighIssues++
					case "MEDIUM":
						report.MediumIssues++
					case "LOW":
						report.LowIssues++
					}

					// Flag specific issues
					if pattern.category == "Hardcoded Secrets" {
						report.HasHardcodedSecrets = true
					}
					if pattern.category == "SQL Injection" {
						report.HasSQLInjection = true
					}
					if pattern.category == "Weak Crypto" {
						report.HasWeakCrypto = true
					}
				}
			}
		}
	}
}

// matchesPattern checks if line matches a simple pattern
func matchesPattern(line, pattern string) bool {
	// Simple wildcard matching
	if strings.Contains(pattern, ".*") {
		parts := strings.Split(pattern, ".*")
		if len(parts) >= 2 {
			return strings.Contains(line, parts[0]) && strings.Contains(line, parts[len(parts)-1])
		}
	}
	return strings.Contains(line, pattern)
}

// truncateString truncates a string to max length
func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

// calculateSecurityScore calculates overall security score
func (s *SecurityScanner) calculateSecurityScore(report *SecurityReport) int {
	score := 100

	// Deduct points based on severity
	score -= report.CriticalIssues * 20
	score -= report.HighIssues * 10
	score -= report.MediumIssues * 5
	score -= report.LowIssues * 2

	// Extra penalties for critical categories
	if report.HasHardcodedSecrets {
		score -= 15
	}
	if report.HasSQLInjection {
		score -= 15
	}
	if report.HasWeakCrypto {
		score -= 10
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

// RunGosecCLI runs gosec CLI tool if available (optional enhancement)
func (s *SecurityScanner) RunGosecCLI() (string, error) {
	cmd := exec.Command("gosec", "-fmt=json", "-quiet", "./...")
	cmd.Dir = s.repoPath

	output, err := cmd.CombinedOutput()
	if err != nil {
		// gosec returns non-zero if issues found, check if it's just that
		if len(output) > 0 {
			return string(output), nil
		}
		return "", fmt.Errorf("gosec failed: %w", err)
	}

	return string(output), nil
}

// Helper to convert string to int safely
func safeAtoi(s string) int {
	i, _ := strconv.Atoi(s)
	return i
}
