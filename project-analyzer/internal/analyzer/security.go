package analyzer

import (
	"regexp"
	"strings"
)

// ============================================
// SECURITY ANALYZER
// Detects security vulnerabilities in code
// ============================================

// SecurityIssue represents a detected security vulnerability
type SecurityIssue struct {
	Type        string `json:"type"`
	Severity    string `json:"severity"` // critical, high, medium, low
	File        string `json:"file"`
	Line        int    `json:"line"`
	Description string `json:"description"`
	Suggestion  string `json:"suggestion"`
}

// SecurityAnalysisResult contains all security analysis results
type SecurityAnalysisResult struct {
	Score          int             `json:"score"`           // 0-100 (higher is better)
	Issues         []SecurityIssue `json:"issues"`
	IssueCount     int             `json:"issueCount"`
	CriticalCount  int             `json:"criticalCount"`
	HighCount      int             `json:"highCount"`
	MediumCount    int             `json:"mediumCount"`
	LowCount       int             `json:"lowCount"`
	Passed         []string        `json:"passed"`          // Security checks that passed
	Recommendations []string       `json:"recommendations"` // General recommendations
}

// SecurityPattern defines a security vulnerability pattern
type SecurityPattern struct {
	Name        string
	Type        string
	Severity    string
	Pattern     *regexp.Regexp
	Description string
	Suggestion  string
	Languages   []string // Languages this pattern applies to
}

// SecurityAnalyzer analyzes code for security vulnerabilities
type SecurityAnalyzer struct {
	patterns []SecurityPattern
}

// NewSecurityAnalyzer creates a new security analyzer
func NewSecurityAnalyzer() *SecurityAnalyzer {
	sa := &SecurityAnalyzer{}
	sa.loadPatterns()
	return sa
}

// loadPatterns initializes all security patterns
func (sa *SecurityAnalyzer) loadPatterns() {
	sa.patterns = []SecurityPattern{
		// Hardcoded Secrets
		{
			Name:        "Hardcoded API Key",
			Type:        "HARDCODED_SECRET",
			Severity:    "critical",
			Pattern:     regexp.MustCompile(`(?i)(api[_-]?key|apikey)\s*[=:]\s*['"][a-zA-Z0-9]{20,}['"]`),
			Description: "Hardcoded API key detected in source code",
			Suggestion:  "Use environment variables or a secrets manager",
			Languages:   []string{"javascript", "typescript", "python", "go"},
		},
		{
			Name:        "Hardcoded Password",
			Type:        "HARDCODED_SECRET",
			Severity:    "critical",
			Pattern:     regexp.MustCompile(`(?i)(password|passwd|pwd)\s*[=:]\s*['"][^'"]{4,}['"]`),
			Description: "Hardcoded password detected in source code",
			Suggestion:  "Never store passwords in code. Use environment variables",
			Languages:   []string{"javascript", "typescript", "python", "go", "java"},
		},
		{
			Name:        "AWS Access Key",
			Type:        "HARDCODED_SECRET",
			Severity:    "critical",
			Pattern:     regexp.MustCompile(`AKIA[0-9A-Z]{16}`),
			Description: "AWS Access Key ID detected in code",
			Suggestion:  "Remove and rotate AWS credentials immediately",
			Languages:   []string{"all"},
		},
		{
			Name:        "Private Key",
			Type:        "HARDCODED_SECRET",
			Severity:    "critical",
			Pattern:     regexp.MustCompile(`-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----`),
			Description: "Private key embedded in source code",
			Suggestion:  "Never commit private keys. Use secrets management",
			Languages:   []string{"all"},
		},
		{
			Name:        "JWT Secret",
			Type:        "HARDCODED_SECRET",
			Severity:    "critical",
			Pattern:     regexp.MustCompile(`(?i)(jwt[_-]?secret|jwt[_-]?key)\s*[=:]\s*['"][^'"]{10,}['"]`),
			Description: "Hardcoded JWT secret detected",
			Suggestion:  "Store JWT secrets in environment variables",
			Languages:   []string{"javascript", "typescript", "python", "go"},
		},

		// SQL Injection
		{
			Name:        "Potential SQL Injection",
			Type:        "SQL_INJECTION",
			Severity:    "high",
			Pattern:     regexp.MustCompile(`(?i)(query|execute)\s*\(\s*['"\x60].*\+.*\$|query\s*\(\s*\$|executeRaw\s*\(\s*\$)`),
			Description: "Potential SQL injection vulnerability - string concatenation in query",
			Suggestion:  "Use parameterized queries or an ORM with bound parameters",
			Languages:   []string{"javascript", "typescript", "python", "php"},
		},
		{
			Name:        "Raw SQL with Variables",
			Type:        "SQL_INJECTION",
			Severity:    "high",
			Pattern:     regexp.MustCompile(`(?i)f['"](SELECT|INSERT|UPDATE|DELETE).*\{`),
			Description: "F-string/template literal used with SQL query",
			Suggestion:  "Use parameterized queries instead of string interpolation",
			Languages:   []string{"python"},
		},

		// XSS Vulnerabilities
		{
			Name:        "Potential XSS - innerHTML",
			Type:        "XSS",
			Severity:    "high",
			Pattern:     regexp.MustCompile(`\.innerHTML\s*=`),
			Description: "Use of innerHTML can lead to XSS vulnerabilities",
			Suggestion:  "Use textContent or sanitize HTML before injection",
			Languages:   []string{"javascript", "typescript"},
		},
		{
			Name:        "Potential XSS - dangerouslySetInnerHTML",
			Type:        "XSS",
			Severity:    "medium",
			Pattern:     regexp.MustCompile(`dangerouslySetInnerHTML`),
			Description: "Use of dangerouslySetInnerHTML in React",
			Suggestion:  "Ensure content is properly sanitized before use",
			Languages:   []string{"javascript", "typescript"},
		},
		{
			Name:        "Potential XSS - document.write",
			Type:        "XSS",
			Severity:    "high",
			Pattern:     regexp.MustCompile(`document\.write\s*\(`),
			Description: "Use of document.write can lead to XSS",
			Suggestion:  "Avoid document.write. Use DOM manipulation methods",
			Languages:   []string{"javascript", "typescript"},
		},

		// Insecure Configurations
		{
			Name:        "Disabled SSL Verification",
			Type:        "INSECURE_CONFIG",
			Severity:    "high",
			Pattern:     regexp.MustCompile(`(?i)(rejectUnauthorized|verify_ssl|ssl_verify|InsecureSkipVerify)\s*[=:]\s*(false|False|0)`),
			Description: "SSL certificate verification is disabled",
			Suggestion:  "Enable SSL verification in production",
			Languages:   []string{"javascript", "typescript", "python", "go"},
		},
		{
			Name:        "Weak Crypto",
			Type:        "WEAK_CRYPTO",
			Severity:    "medium",
			Pattern:     regexp.MustCompile(`(?i)(md5|sha1)\s*\(`),
			Description: "Use of weak cryptographic algorithm",
			Suggestion:  "Use SHA-256 or stronger hashing algorithms",
			Languages:   []string{"javascript", "typescript", "python", "go", "php"},
		},
		{
			Name:        "CORS Allow All",
			Type:        "INSECURE_CONFIG",
			Severity:    "medium",
			Pattern:     regexp.MustCompile(`(?i)(origin|Access-Control-Allow-Origin)\s*[=:]\s*['"]?\*['"]?`),
			Description: "CORS configured to allow all origins",
			Suggestion:  "Restrict CORS to specific trusted origins",
			Languages:   []string{"javascript", "typescript", "python", "go"},
		},

		// Sensitive Data Exposure
		{
			Name:        "Exposed .env File",
			Type:        "SENSITIVE_DATA",
			Severity:    "critical",
			Pattern:     regexp.MustCompile(`\.env\s*$|\.env\.local\s*$|\.env\.production\s*$`),
			Description: ".env file may be exposed in repository",
			Suggestion:  "Add .env files to .gitignore",
			Languages:   []string{"all"},
		},
		{
			Name:        "Console Log with Sensitive Data",
			Type:        "SENSITIVE_DATA",
			Severity:    "low",
			Pattern:     regexp.MustCompile(`console\.log\s*\([^)]*(?i)(password|token|secret|key|credential)`),
			Description: "Potential logging of sensitive data",
			Suggestion:  "Remove console.log statements with sensitive data",
			Languages:   []string{"javascript", "typescript"},
		},

		// Eval and Code Execution
		{
			Name:        "Dangerous eval() Usage",
			Type:        "CODE_INJECTION",
			Severity:    "high",
			Pattern:     regexp.MustCompile(`\beval\s*\(`),
			Description: "Use of eval() can lead to code injection",
			Suggestion:  "Avoid eval(). Use safer alternatives like JSON.parse()",
			Languages:   []string{"javascript", "typescript", "python"},
		},
		{
			Name:        "Exec/System Call",
			Type:        "COMMAND_INJECTION",
			Severity:    "high",
			Pattern:     regexp.MustCompile(`(?i)(exec|system|spawn|popen)\s*\(`),
			Description: "Direct command execution may be vulnerable to injection",
			Suggestion:  "Sanitize all inputs before command execution",
			Languages:   []string{"javascript", "typescript", "python", "go", "php"},
		},
	}
}

// Analyze performs security analysis on code content
func (sa *SecurityAnalyzer) Analyze(fileContents map[string]string) SecurityAnalysisResult {
	result := SecurityAnalysisResult{
		Score:           100,
		Issues:          []SecurityIssue{},
		Passed:          []string{},
		Recommendations: []string{},
	}

	checkedTypes := make(map[string]bool)
	foundIssueTypes := make(map[string]bool)

	for filename, content := range fileContents {
		ext := getFileExtension(filename)
		lang := extensionToLanguage(ext)

		for _, pattern := range sa.patterns {
			if !sa.patternApplies(pattern, lang) {
				continue
			}

			checkedTypes[pattern.Type] = true

			if pattern.Pattern.MatchString(content) {
				// Find line number
				lineNum := sa.findLineNumber(content, pattern.Pattern)

				issue := SecurityIssue{
					Type:        pattern.Type,
					Severity:    pattern.Severity,
					File:        filename,
					Line:        lineNum,
					Description: pattern.Description,
					Suggestion:  pattern.Suggestion,
				}
				result.Issues = append(result.Issues, issue)
				foundIssueTypes[pattern.Type] = true

				// Update severity counts
				switch pattern.Severity {
				case "critical":
					result.CriticalCount++
					result.Score -= 25
				case "high":
					result.HighCount++
					result.Score -= 15
				case "medium":
					result.MediumCount++
					result.Score -= 10
				case "low":
					result.LowCount++
					result.Score -= 5
				}
			}
		}
	}

	result.IssueCount = len(result.Issues)

	// Ensure score doesn't go below 0
	if result.Score < 0 {
		result.Score = 0
	}

	// Add passed checks
	passedChecks := []string{
		"HARDCODED_SECRET",
		"SQL_INJECTION",
		"XSS",
		"INSECURE_CONFIG",
		"WEAK_CRYPTO",
		"CODE_INJECTION",
		"COMMAND_INJECTION",
	}

	for _, check := range passedChecks {
		if checkedTypes[check] && !foundIssueTypes[check] {
			result.Passed = append(result.Passed, check)
		}
	}

	// Add recommendations
	result.Recommendations = sa.generateRecommendations(result)

	return result
}

// generateRecommendations generates security recommendations based on analysis
func (sa *SecurityAnalyzer) generateRecommendations(result SecurityAnalysisResult) []string {
	recs := []string{}

	if result.CriticalCount > 0 {
		recs = append(recs, "🚨 Address critical security issues immediately")
	}

	// Check what passed
	hasSecrets := false
	hasSQLi := false
	hasXSS := false

	for _, issue := range result.Issues {
		switch issue.Type {
		case "HARDCODED_SECRET":
			hasSecrets = true
		case "SQL_INJECTION":
			hasSQLi = true
		case "XSS":
			hasXSS = true
		}
	}

	if hasSecrets {
		recs = append(recs, "🔐 Implement secrets management (e.g., HashiCorp Vault, AWS Secrets Manager)")
	}

	if hasSQLi {
		recs = append(recs, "🛡️ Use parameterized queries exclusively")
	}

	if hasXSS {
		recs = append(recs, "🧹 Implement input sanitization library")
	}

	// General recommendations
	if result.Score >= 80 {
		recs = append(recs, "✅ Good security practices observed")
	}

	if len(result.Passed) > 0 {
		recs = append(recs, "✅ No issues found for: "+strings.Join(result.Passed, ", "))
	}

	return recs
}

// patternApplies checks if a pattern applies to the given language
func (sa *SecurityAnalyzer) patternApplies(pattern SecurityPattern, lang string) bool {
	for _, l := range pattern.Languages {
		if l == "all" || l == lang {
			return true
		}
	}
	return false
}

// findLineNumber finds the line number of the first match
func (sa *SecurityAnalyzer) findLineNumber(content string, pattern *regexp.Regexp) int {
	loc := pattern.FindStringIndex(content)
	if loc == nil {
		return 0
	}

	lines := strings.Split(content[:loc[0]], "\n")
	return len(lines)
}

// Helper functions
func getFileExtension(filename string) string {
	parts := strings.Split(filename, ".")
	if len(parts) > 1 {
		return parts[len(parts)-1]
	}
	return ""
}

func extensionToLanguage(ext string) string {
	switch ext {
	case "js":
		return "javascript"
	case "ts", "tsx":
		return "typescript"
	case "py":
		return "python"
	case "go":
		return "go"
	case "java":
		return "java"
	case "php":
		return "php"
	case "rb":
		return "ruby"
	default:
		return ext
	}
}
