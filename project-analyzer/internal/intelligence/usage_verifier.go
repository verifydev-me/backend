package intelligence

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/rs/zerolog/log"
)

// ============================================
// USAGE VERIFICATION SYSTEM
// Validates actual code usage vs dependency detection
// Prevents false positives from dependency-only signals
// ============================================

// UsageVerifier interface for all usage verifiers
type UsageVerifier interface {
	Verify(repoPath string, signals *FastSignals) []*UsageVerdict
	Name() string
}

// UsageVerdict represents the result of usage verification
type UsageVerdict struct {
	SkillName     string          `json:"skillName"`
	UsageVerified bool            `json:"usageVerified"`
	UsageStrength float64         `json:"usageStrength"` // 0.0-1.0
	Evidence      []UsageEvidence `json:"evidence"`
	AntiEvidence  []UsageEvidence `json:"antiEvidence,omitempty"`
}

// UsageEvidenceType categorizes evidence types
type UsageEvidenceType string

const (
	UsageEvidenceFilePattern  UsageEvidenceType = "FILE_PATTERN"
	UsageEvidenceCodePattern  UsageEvidenceType = "CODE_PATTERN"
	UsageEvidenceConfig       UsageEvidenceType = "CONFIG"
	UsageEvidenceArchitecture UsageEvidenceType = "ARCHITECTURE"
)

// UsageEvidence represents proof of usage
type UsageEvidence struct {
	Type        UsageEvidenceType `json:"type"`
	Location    string            `json:"location,omitempty"`
	Description string            `json:"description"`
	Strength    float64           `json:"strength"` // 0.0-1.0
}

// ============================================
// FRONTEND USAGE VERIFIER (React/Next.js)
// ============================================

// FrontendUsageVerifier verifies React/Next.js actual usage
type FrontendUsageVerifier struct{}

// NewFrontendUsageVerifier creates a new frontend verifier
func NewFrontendUsageVerifier() *FrontendUsageVerifier {
	return &FrontendUsageVerifier{}
}

// Name returns the verifier name
func (v *FrontendUsageVerifier) Name() string {
	return "Frontend Usage Verifier"
}

// Verify checks for actual React/Next.js usage
func (v *FrontendUsageVerifier) Verify(repoPath string, signals *FastSignals) []*UsageVerdict {
	var verdicts []*UsageVerdict

	for _, fw := range signals.DetectedFrameworks {
		if fw == "React" || fw == "Next.js" {
			verdict := v.verifyReact(repoPath, fw)
			if verdict != nil {
				verdicts = append(verdicts, verdict)
			}
		}
	}
	return verdicts
}

func (v *FrontendUsageVerifier) verifyReact(repoPath string, name string) *UsageVerdict {
	verdict := &UsageVerdict{
		SkillName:     name,
		UsageVerified: false,
		UsageStrength: 0.0,
		Evidence:      []UsageEvidence{},
		AntiEvidence:  []UsageEvidence{},
	}

	jsxCount := 0
	tsxCount := 0
	componentCount := 0
	hooksUsage := false

	filepath.Walk(repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}

		// Skip node_modules and build directories
		if strings.Contains(path, "node_modules") || strings.Contains(path, "dist") || strings.Contains(path, "build") {
			return nil
		}

		ext := filepath.Ext(path)
		if ext == ".jsx" {
			jsxCount++
		} else if ext == ".tsx" {
			tsxCount++
		}

		// Check for component patterns and hooks
		if ext == ".jsx" || ext == ".tsx" || ext == ".js" || ext == ".ts" {
			content, err := os.ReadFile(path)
			if err == nil {
				contentStr := string(content)

				// Component patterns
				if strings.Contains(contentStr, "function ") && strings.Contains(contentStr, "return (") {
					componentCount++
				}
				if strings.Contains(contentStr, "const ") && strings.Contains(contentStr, "= () =>") {
					componentCount++
				}

				// Hooks usage
				if strings.Contains(contentStr, "useState") ||
					strings.Contains(contentStr, "useEffect") ||
					strings.Contains(contentStr, "useCallback") ||
					strings.Contains(contentStr, "useMemo") {
					hooksUsage = true
				}
			}
		}

		return nil
	})

	totalJSXFiles := jsxCount + tsxCount

	// Evaluate usage
	if totalJSXFiles == 0 {
		// No JSX/TSX files - dependency only
		verdict.AntiEvidence = append(verdict.AntiEvidence, UsageEvidence{
			Type:        UsageEvidenceFilePattern,
			Description: name + " dependency detected but no JSX/TSX files found",
			Strength:    0.8,
		})
		verdict.UsageStrength = 0.2 // Very weak
		return verdict
	}

	// Has JSX/TSX files
	verdict.UsageVerified = true
	verdict.Evidence = append(verdict.Evidence, UsageEvidence{
		Type:        UsageEvidenceFilePattern,
		Description: "JSX/TSX files present",
		Location:    repoPath,
		Strength:    0.6,
	})

	// Component usage
	if componentCount > 0 {
		verdict.Evidence = append(verdict.Evidence, UsageEvidence{
			Type:        UsageEvidenceCodePattern,
			Description: "Components defined and used",
			Strength:    0.7,
		})
	}

	// Hooks usage
	if hooksUsage {
		verdict.Evidence = append(verdict.Evidence, UsageEvidence{
			Type:        UsageEvidenceCodePattern,
			Description: "Hooks actively used",
			Strength:    0.8,
		})
	}

	// Calculate final strength
	baseStrength := 0.5
	if totalJSXFiles > 5 {
		baseStrength = 0.7
	}
	if componentCount > 3 {
		baseStrength += 0.1
	}
	if hooksUsage {
		baseStrength += 0.1
	}

	verdict.UsageStrength = minFloat64(1.0, baseStrength)

	return verdict
}

// ============================================
// NODE BACKEND USAGE VERIFIER
// ============================================

// NodeBackendUsageVerifier verifies Node.js framework usage
type NodeBackendUsageVerifier struct{}

// NewNodeBackendUsageVerifier creates a new Node backend verifier
func NewNodeBackendUsageVerifier() *NodeBackendUsageVerifier {
	return &NodeBackendUsageVerifier{}
}

// Name returns the verifier name
func (v *NodeBackendUsageVerifier) Name() string {
	return "Node Backend Usage Verifier"
}

// Verify checks for actual Node framework usage
func (v *NodeBackendUsageVerifier) Verify(repoPath string, signals *FastSignals) []*UsageVerdict {
	var verdicts []*UsageVerdict

	for _, fw := range signals.DetectedFrameworks {
		if fw == "Express" || fw == "NestJS" || fw == "Fastify" {
			verdict := v.verifyNodeFramework(repoPath, fw)
			if verdict != nil {
				verdicts = append(verdicts, verdict)
			}
		}
	}
	return verdicts
}

func (v *NodeBackendUsageVerifier) verifyNodeFramework(repoPath string, name string) *UsageVerdict {
	verdict := &UsageVerdict{
		SkillName:     name,
		UsageVerified: false,
		UsageStrength: 0.0,
		Evidence:      []UsageEvidence{},
		AntiEvidence:  []UsageEvidence{},
	}

	appInitialized := false
	routesRegistered := 0
	serverStarted := false
	decoratorsUsed := false // Specific to NestJS

	// Search for usage patterns
	filepath.Walk(repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}

		if strings.Contains(path, "node_modules") {
			return nil
		}

		ext := filepath.Ext(path)
		if ext == ".ts" || ext == ".js" {
			// CRITICAL FIX: Skip frontend directories and React files
			// to prevent false positive backend framework detection
			relPath := strings.TrimPrefix(path, repoPath)
			if isFrontendFilePath(relPath) {
				return nil
			}

			// Skip JSX/TSX files entirely
			if ext == ".tsx" || ext == ".jsx" {
				return nil
			}

			content, err := os.ReadFile(path)
			if err != nil {
				return nil
			}
			contentStr := string(content)

			// Skip files with React imports (React code in .ts files)
			if hasReactImports(contentStr) {
				return nil
			}

			// Express/Fastify Initialization
			if strings.Contains(contentStr, "express()") ||
				strings.Contains(contentStr, "fastify(") ||
				strings.Contains(contentStr, "NestFactory.create") {
				appInitialized = true
			}

			// NestJS Decorators
			if name == "NestJS" {
				if strings.Contains(contentStr, "@Controller") ||
					strings.Contains(contentStr, "@Injectable") ||
					strings.Contains(contentStr, "@Module") {
					decoratorsUsed = true
				}
			}

			// Route patterns
			if name == "Express" || name == "Fastify" {
				routePatterns := []string{".get(", ".post(", ".put(", ".delete(", ".patch("}
				for _, pattern := range routePatterns {
					routesRegistered += strings.Count(contentStr, pattern)
				}
			} else if name == "NestJS" {
				// NestJS route decorators
				nestPatterns := []string{"@Get(", "@Post(", "@Put(", "@Delete(", "@Patch("}
				for _, pattern := range nestPatterns {
					routesRegistered += strings.Count(contentStr, pattern)
				}
			}

			// Server start
			if strings.Contains(contentStr, ".listen(") {
				serverStarted = true
			}
		}

		return nil
	})

	// Evaluate
	if !appInitialized && !decoratorsUsed {
		verdict.AntiEvidence = append(verdict.AntiEvidence, UsageEvidence{
			Type:        UsageEvidenceCodePattern,
			Description: name + " dependency detected but app/module not initialized",
			Strength:    0.7,
		})
		verdict.UsageStrength = 0.2
		return verdict
	}

	verdict.UsageVerified = true
	verdict.Evidence = append(verdict.Evidence, UsageEvidence{
		Type:        UsageEvidenceCodePattern,
		Description: "Framework initialized/used",
		Strength:    0.8,
	})

	if routesRegistered > 0 {
		verdict.Evidence = append(verdict.Evidence, UsageEvidence{
			Type:        UsageEvidenceCodePattern,
			Description: "Routes defined",
			Strength:    0.8,
		})
	}

	if decoratorsUsed {
		verdict.Evidence = append(verdict.Evidence, UsageEvidence{
			Type:        UsageEvidenceCodePattern,
			Description: "NestJS decorators used",
			Strength:    0.9,
		})
	}

	baseStrength := 0.6
	if routesRegistered > 5 {
		baseStrength = 0.8
	}
	if decoratorsUsed {
		baseStrength += 0.1
	}
	if serverStarted {
		baseStrength += 0.1
	}

	verdict.UsageStrength = minFloat64(1.0, baseStrength)
	return verdict
}

// ============================================
// GO BACKEND USAGE VERIFIER
// ============================================

// GoBackendUsageVerifier verifies Go framework usage
type GoBackendUsageVerifier struct{}

// NewGoBackendUsageVerifier creates a new Go backend verifier
func NewGoBackendUsageVerifier() *GoBackendUsageVerifier {
	return &GoBackendUsageVerifier{}
}

// Name returns the verifier name
func (v *GoBackendUsageVerifier) Name() string {
	return "Go Backend Usage Verifier"
}

// Verify checks for actual Go framework usage (Gin/Fiber/Echo)
func (v *GoBackendUsageVerifier) Verify(repoPath string, signals *FastSignals) []*UsageVerdict {
	var verdicts []*UsageVerdict

	for _, fw := range signals.DetectedFrameworks {
		if fw == "Gin" || fw == "Fiber" || fw == "Echo" {
			verdict := v.verifyGoFramework(repoPath, fw)
			if verdict != nil {
				verdicts = append(verdicts, verdict)
			}
		}
	}
	return verdicts
}

func (v *GoBackendUsageVerifier) verifyGoFramework(repoPath string, name string) *UsageVerdict {
	verdict := &UsageVerdict{
		SkillName:     name,
		UsageVerified: false,
		UsageStrength: 0.0,
		Evidence:      []UsageEvidence{},
		AntiEvidence:  []UsageEvidence{},
	}

	routerInitialized := false
	routesRegistered := 0
	serverStarted := false

	// Search for usage patterns
	filepath.Walk(repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}

		if filepath.Ext(path) == ".go" {
			content, err := os.ReadFile(path)
			if err != nil {
				return nil
			}
			contentStr := string(content)

			// Router initialization patterns
			if strings.Contains(contentStr, "gin.New()") ||
				strings.Contains(contentStr, "gin.Default()") ||
				strings.Contains(contentStr, "fiber.New()") ||
				strings.Contains(contentStr, "echo.New()") {
				routerInitialized = true
			}

			// Route registration patterns
			routePatterns := []string{".GET(", ".POST(", ".PUT(", ".DELETE(", ".PATCH("}
			for _, pattern := range routePatterns {
				routesRegistered += strings.Count(contentStr, pattern)
			}

			// Server start patterns
			if strings.Contains(contentStr, ".Run(") ||
				strings.Contains(contentStr, ".Listen(") ||
				strings.Contains(contentStr, ".Start(") {
				serverStarted = true
			}
		}

		return nil
	})

	// Evaluate usage
	if !routerInitialized {
		verdict.AntiEvidence = append(verdict.AntiEvidence, UsageEvidence{
			Type:        UsageEvidenceCodePattern,
			Description: name + " dependency detected but router not initialized",
			Strength:    0.7,
		})
		verdict.UsageStrength = 0.25
		return verdict
	}

	if routesRegistered == 0 {
		verdict.AntiEvidence = append(verdict.AntiEvidence, UsageEvidence{
			Type:        UsageEvidenceCodePattern,
			Description: "Router initialized but no routes registered",
			Strength:    0.6,
		})
		verdict.UsageStrength = 0.3
		return verdict
	}

	// Valid usage detected
	verdict.UsageVerified = true

	verdict.Evidence = append(verdict.Evidence, UsageEvidence{
		Type:        UsageEvidenceCodePattern,
		Description: "Router initialized",
		Strength:    0.7,
	})

	verdict.Evidence = append(verdict.Evidence, UsageEvidence{
		Type:        UsageEvidenceCodePattern,
		Description: "Routes registered and handled",
		Strength:    0.8,
	})

	if serverStarted {
		verdict.Evidence = append(verdict.Evidence, UsageEvidence{
			Type:        UsageEvidenceCodePattern,
			Description: "Server started",
			Strength:    0.9,
		})
	}

	// Calculate strength
	baseStrength := 0.6
	if routesRegistered > 5 {
		baseStrength = 0.8
	} else if routesRegistered > 10 {
		baseStrength = 0.9
	}
	if serverStarted {
		baseStrength += 0.1
	}

	verdict.UsageStrength = minFloat64(1.0, baseStrength)

	return verdict
}

// ============================================
// DATABASE USAGE VERIFIER
// ============================================

// DatabaseUsageVerifier verifies ORM usage (GORM/Prisma/Mongoose)
type DatabaseUsageVerifier struct{}

// NewDatabaseUsageVerifier creates a new database verifier
func NewDatabaseUsageVerifier() *DatabaseUsageVerifier {
	return &DatabaseUsageVerifier{}
}

// Name returns the verifier name
func (v *DatabaseUsageVerifier) Name() string {
	return "Database Usage Verifier"
}

// Verify checks for actual database/ORM usage
func (v *DatabaseUsageVerifier) Verify(repoPath string, signals *FastSignals) []*UsageVerdict {
	var verdicts []*UsageVerdict

	for _, db := range signals.DetectedDatabases {
		verdict := v.verifyDatabase(repoPath, db)
		if verdict != nil {
			verdicts = append(verdicts, verdict)
		}
	}
	return verdicts
}

func (v *DatabaseUsageVerifier) verifyDatabase(repoPath string, name string) *UsageVerdict {
	verdict := &UsageVerdict{
		SkillName:     name,
		UsageVerified: false,
		UsageStrength: 0.0,
		Evidence:      []UsageEvidence{},
		AntiEvidence:  []UsageEvidence{},
	}

	connectionInit := false
	modelsFound := 0
	queriesFound := 0

	// Search for usage patterns
	filepath.Walk(repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}

		if strings.Contains(path, "node_modules") {
			return nil
		}

		ext := filepath.Ext(path)
		if ext == ".go" || ext == ".ts" || ext == ".js" || ext == ".prisma" {
			content, err := os.ReadFile(path)
			if err != nil {
				return nil
			}
			contentStr := string(content)

			// Connection patterns
			connectionPatterns := []string{
				"gorm.Open(",
				"mongoose.connect(",
				"new PrismaClient()",
				"createConnection(",
			}
			for _, pattern := range connectionPatterns {
				if strings.Contains(contentStr, pattern) {
					connectionInit = true
					break
				}
			}

			// Model/Entity definitions
			if strings.Contains(contentStr, "type ") && strings.Contains(contentStr, "gorm.Model") {
				modelsFound++
			}
			if strings.Contains(contentStr, "model ") && ext == ".prisma" {
				modelsFound++
			}

			// CRUD operation patterns
			crudPatterns := []string{
				".Create(", ".Find(", ".Update(", ".Delete(",
				".findOne(", ".findMany(", ".create(", ".update(",
				".save(", ".remove(",
			}
			for _, pattern := range crudPatterns {
				queriesFound += strings.Count(contentStr, pattern)
			}
		}

		return nil
	})

	// Evaluate usage
	// Relaxed check: if we see models OR connection OR queries, we count it as verified
	// This helps with mono-repos where connection might be elsewhere
	if !connectionInit && modelsFound == 0 && queriesFound == 0 {
		verdict.AntiEvidence = append(verdict.AntiEvidence, UsageEvidence{
			Type:        UsageEvidenceCodePattern,
			Description: "Database dependency detected but no usage patterns found",
			Strength:    0.7,
		})
		verdict.UsageStrength = 0.2
		return verdict
	}

	// Valid usage detected
	verdict.UsageVerified = true

	if connectionInit {
		verdict.Evidence = append(verdict.Evidence, UsageEvidence{
			Type:        UsageEvidenceCodePattern,
			Description: "Database connection initialized",
			Strength:    0.7,
		})
	}

	if modelsFound > 0 {
		verdict.Evidence = append(verdict.Evidence, UsageEvidence{
			Type:        UsageEvidenceCodePattern,
			Description: "Models/entities defined",
			Strength:    0.8,
		})
	}

	if queriesFound > 0 {
		verdict.Evidence = append(verdict.Evidence, UsageEvidence{
			Type:        UsageEvidenceCodePattern,
			Description: "CRUD operations present",
			Strength:    0.9,
		})
	}

	// Calculate strength
	baseStrength := 0.6
	if modelsFound > 2 {
		baseStrength = 0.8
	}
	if queriesFound > 5 {
		baseStrength += 0.1
	}

	verdict.UsageStrength = minFloat64(1.0, baseStrength)

	return verdict
}

// ============================================
// INFRASTRUCTURE USAGE VERIFIER
// ============================================

// InfraUsageVerifier verifies infrastructure tool usage (Kafka/Redis/RabbitMQ)
type InfraUsageVerifier struct{}

// NewInfraUsageVerifier creates a new infrastructure verifier
func NewInfraUsageVerifier() *InfraUsageVerifier {
	return &InfraUsageVerifier{}
}

// Name returns the verifier name
func (v *InfraUsageVerifier) Name() string {
	return "Infrastructure Usage Verifier"
}

// Verify checks for actual infrastructure usage
func (v *InfraUsageVerifier) Verify(repoPath string, signals *FastSignals) []*UsageVerdict {
	var verdicts []*UsageVerdict
	for _, infra := range signals.DetectedInfra {
		verdict := v.verifyInfra(repoPath, infra)
		if verdict != nil {
			verdicts = append(verdicts, verdict)
		}
	}
	return verdicts
}

func (v *InfraUsageVerifier) verifyInfra(repoPath string, name string) *UsageVerdict {
	verdict := &UsageVerdict{
		SkillName:     name,
		UsageVerified: false,
		UsageStrength: 0.0,
		Evidence:      []UsageEvidence{},
		AntiEvidence:  []UsageEvidence{},
	}

	clientInit := false
	producerConsumer := false
	cacheUsage := false

	// Search for usage patterns
	filepath.Walk(repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}

		if strings.Contains(path, "node_modules") {
			return nil
		}

		ext := filepath.Ext(path)
		if ext == ".go" || ext == ".ts" || ext == ".js" {
			content, err := os.ReadFile(path)
			if err != nil {
				return nil
			}
			contentStr := string(content)

			// Client initialization
			if strings.Contains(strings.ToLower(contentStr), strings.ToLower(name)) {
				// Simple check for now: if we see the infra name in code, likely being used
				// Can overlap with imports or comments, but better than nothing
				clientInit = true
			}

			// More specific patterns
			clientPatterns := []string{
				"redis.NewClient(",
				"kafka.NewConsumer(",
				"kafka.NewProducer(",
				"amqp.Dial(",
			}
			for _, pattern := range clientPatterns {
				if strings.Contains(contentStr, pattern) {
					clientInit = true
					break
				}
			}

			// Producer/Consumer patterns
			if strings.Contains(contentStr, ".Produce(") ||
				strings.Contains(contentStr, ".Consume(") ||
				strings.Contains(contentStr, ".Publish(") ||
				strings.Contains(contentStr, ".Subscribe(") {
				producerConsumer = true
			}

			// Cache operations
			if strings.Contains(contentStr, ".Get(") ||
				strings.Contains(contentStr, ".Set(") ||
				strings.Contains(contentStr, ".Del(") {
				cacheUsage = true
			}
		}

		return nil
	})

	// Evaluate usage
	if !clientInit {
		verdict.AntiEvidence = append(verdict.AntiEvidence, UsageEvidence{
			Type:        UsageEvidenceCodePattern,
			Description: name + " dependency detected but no usage patterns found",
			Strength:    0.7,
		})
		verdict.UsageStrength = 0.25
		return verdict
	}

	// Valid usage detected
	verdict.UsageVerified = true

	verdict.Evidence = append(verdict.Evidence, UsageEvidence{
		Type:        UsageEvidenceCodePattern,
		Description: "Client usage detected",
		Strength:    0.7,
	})

	if producerConsumer {
		verdict.Evidence = append(verdict.Evidence, UsageEvidence{
			Type:        UsageEvidenceCodePattern,
			Description: "Producer/consumer patterns used",
			Strength:    0.9,
		})
	}

	if cacheUsage {
		verdict.Evidence = append(verdict.Evidence, UsageEvidence{
			Type:        UsageEvidenceCodePattern,
			Description: "Cache operations present",
			Strength:    0.8,
		})
	}

	// Calculate strength
	verdict.UsageStrength = 0.7
	if producerConsumer || cacheUsage {
		verdict.UsageStrength = 0.85
	}

	return verdict
}

// ============================================
// GENERIC / DOCKER / LANGUAGE VERIFIER
// ============================================

type GenericUsageVerifier struct{}

func NewGenericUsageVerifier() *GenericUsageVerifier {
	return &GenericUsageVerifier{}
}

func (v *GenericUsageVerifier) Name() string {
	return "Generic Usage Verifier"
}

func (v *GenericUsageVerifier) Verify(repoPath string, signals *FastSignals) []*UsageVerdict {
	var verdicts []*UsageVerdict

	// 1. Docker
	if signals.HasDockerfile || signals.HasDockerCompose {
		verdicts = append(verdicts, &UsageVerdict{
			SkillName:     "Docker",
			UsageVerified: true,
			UsageStrength: 0.9,
			Evidence: []UsageEvidence{{
				Type:        UsageEvidenceFilePattern,
				Description: "Dockerfile/Compose present",
				Strength:    0.9,
			}},
		})
		verdicts = append(verdicts, &UsageVerdict{
			SkillName:     "Docker & Containerization", // Alias seen in some projects
			UsageVerified: true,
			UsageStrength: 0.9,
			Evidence: []UsageEvidence{{
				Type:        UsageEvidenceFilePattern,
				Description: "Dockerfile/Compose present",
				Strength:    0.9,
			}},
		})
	}

	// 2. Primary Language
	if signals.DominantLanguage != "" {
		verdicts = append(verdicts, &UsageVerdict{
			SkillName:     signals.DominantLanguage,
			UsageVerified: true,
			UsageStrength: 1.0, // Primary language is definitely used
			Evidence: []UsageEvidence{{
				Type:        UsageEvidenceFilePattern,
				Description: "Primary project language",
				Strength:    1.0,
			}},
		})
	}

	return verdicts
}

// ============================================
// ORCHESTRATOR
// ============================================

// VerifyAllUsage runs all verifiers and returns verdicts
func VerifyAllUsage(repoPath string, signals *FastSignals) map[string]*UsageVerdict {
	log.Debug().Msg("Running usage verification")

	verifiers := []UsageVerifier{
		NewFrontendUsageVerifier(),
		NewGoBackendUsageVerifier(),
		NewNodeBackendUsageVerifier(),

		NewDatabaseUsageVerifier(),
		NewInfraUsageVerifier(),
		NewGenericUsageVerifier(),
	}

	verdicts := make(map[string]*UsageVerdict)

	for _, verifier := range verifiers {
		vList := verifier.Verify(repoPath, signals)
		for _, v := range vList {
			verdicts[v.SkillName] = v
			log.Debug().
				Str("skill", v.SkillName).
				Bool("verified", v.UsageVerified).
				Float64("strength", v.UsageStrength).
				Msg("Usage verification complete")
		}
	}

	return verdicts
}

// Helper function
func minFloat64(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

// isFrontendFilePath checks if a relative file path belongs to a frontend directory.
// Used by usage verifiers to avoid scanning React/Vue/Angular component files
// when verifying backend framework usage (Express/NestJS/Fastify).
func isFrontendFilePath(relPath string) bool {
	normalized := strings.ToLower(strings.ReplaceAll(relPath, "\\", "/"))

	frontendDirs := []string{
		"/components/", "/pages/", "/views/", "/layouts/", "/hooks/",
		"/contexts/", "/providers/", "/features/", "/screens/",
		"/widgets/", "/ui/", "/atoms/", "/molecules/", "/organisms/",
		"/templates/", "/stories/", "/storybook/",
		"/app/", // Next.js App Router
	}

	for _, dir := range frontendDirs {
		if strings.Contains(normalized, dir) {
			return true
		}
	}

	return false
}

// hasReactImports checks if file content contains React-specific imports.
// Used to identify React code in .ts files that may live outside
// typical frontend directories (e.g., shared hooks, custom providers).
func hasReactImports(content string) bool {
	reactIndicators := []string{
		"from 'react'",
		"from \"react\"",
		"import React",
		"from 'react-dom'",
		"from \"react-dom\"",
		"from 'next",
		"from \"next",
	}

	for _, indicator := range reactIndicators {
		if strings.Contains(content, indicator) {
			return true
		}
	}

	return false
}
