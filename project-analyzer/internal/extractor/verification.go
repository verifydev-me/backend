package extractor

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/verifydev/project-analyzer/pkg/signals"
)

// ============================================
// VERIFICATION & USAGE ANALYSIS
// ============================================

// verifySignals performs a second pass to confirm if technologies are actually used in code
func (e *InfraExtractor) verifySignals() {
	// Map signals to their usage patterns (imports, specific function calls)
	verificationRules := map[signals.InfraSignal][]string{
		// Frameworks & Libraries
		signals.SignalPrisma:       {"@prisma/client", "PrismaClient"},
		signals.SignalTypeORM:      {"typeorm", "Entity", "Column"},
		signals.SignalMongoose:     {"mongoose", "Schema", "model"},
		signals.SignalSequelze:     {"sequelize", "Sequelize"},
		signals.SignalGORM:         {"gorm.io/gorm", "gorm.Model"},
		signals.SignalRedux:        {"redux", "useSelector", "useDispatch"},
		signals.SignalZustand:      {"zustand", "create"},
		signals.SignalReactQuery:   {"@tanstack/react-query", "useQuery", "useMutation"},
		signals.SignalTailwind:     {"tailwindcss", "className=", "apply"},
		signals.SignalFramerMotion: {"framer-motion", "motion.div", "AnimatePresence"},
		signals.SignalMaterialUI:   {"@mui/material", "@mui/icons-material"},
		signals.SignalChakraUI:     {"@chakra-ui/react", "ChakraProvider"},
		signals.SignalNextJS:       {"next/link", "next/image", "next/router", "next/navigation"},
		signals.SignalNestJS:       {"@nestjs/common", "@nestjs/core", "NestFactory"},

		// Infrastructure/Cloud SDKs (Verify they are imported/used)
		signals.SignalAWS:      {"aws-sdk", "@aws-sdk", "boto3", "github.com/aws/aws-sdk-go", "s3", "dynamodb"},
		signals.SignalGCP:      {"@google-cloud", "google-cloud", "firebase"},
		signals.SignalAzure:    {"@azure", "azure-sdk"},
		signals.SignalFirebase: {"firebase", "initializeApp", "getFirestore"},
		signals.SignalSupabase: {"@supabase/supabase-js", "createClient"},

		// Observability
		signals.SignalPrometheus:    {"prom-client", "prometheus", "Counter", "Gauge"},
		signals.SignalSentry:        {"@sentry", "Sentry.init"},
		signals.SignalOpenTelemetry: {"@opentelemetry", "otel"},

		// Testing
		signals.SignalJest:       {"jest", "describe", "it", "expect"},
		signals.SignalCypress:    {"cypress", "cy.visit"},
		signals.SignalPlaywright: {"@playwright/test", "playwright"},

		// Infrastructure (Client Libraries)
		signals.SignalRedis:    {"redis", "go-redis", "redigo", "ioredis"},
		signals.SignalKafka:    {"kafka", "sarama", "confluent-kafka", "kafkajs"},
		signals.SignalRabbitMQ: {"amqp", "streadway/amqp", "amqplib"},
		signals.SignalNATS:     {"nats", "nats.go"},
		signals.SignalSQS:      {"sqs", "aws-sdk", "boto3"},

		// Databases (Drivers/ORMs)
		signals.SignalPostgres: {"postgres", "pgx", "lib/pq", "pg", "sqlalchemy", "psycopg2"},
		signals.SignalMySQL:    {"mysql", "go-sql-driver/mysql", "pymysql"},
		signals.SignalMongoDB:  {"mongo", "bson", "pymongo"},
	}

	for signal, patterns := range verificationRules {
		// Only verify if we found the signal initially (via package.json etc)
		if e.signals.HasSignal(signal) {
			usageCount := e.countPatternUsage(patterns)

			if usageCount > 0 {
				// BOOST verification
				detail := e.signals.SignalDetails[signal]
				// Cap confidence at 1.0
				newConfidence := detail.Confidence + 0.15
				if newConfidence > 1.0 {
					newConfidence = 1.0
				}

				e.signals.AddSignal(signal, newConfidence, []string{
					fmt.Sprintf("Verified usage in %d code file(s)", usageCount),
				}, "code_verification")
			} else {
				// GENTLER PENALTY: Apply small confidence reduction for unused dependencies
				// Trust Docker Compose sources, only penalize package manager sources
				detail := e.signals.SignalDetails[signal]
				if strings.Contains(detail.Source, "dep") || strings.Contains(detail.Source, "package") {
					// Only reduce by 10% (was 20%) - be less aggressive
					newConfidence := detail.Confidence * 0.9
					if newConfidence < 0.5 {
						newConfidence = 0.5 // Don't go below 50%
					}
					e.signals.AddSignal(signal, newConfidence, []string{
						"Note: Installed but no direct usage patterns detected",
					}, "code_verification")
				}
				// Docker Compose/Dockerfile sources are trusted - no penalty
			}
		}
	}
}

// countPatternUsage counts how many code files contain any of the patterns
func (e *InfraExtractor) countPatternUsage(patterns []string) int {
	usageFileCount := 0

	// Create regexes for efficiency
	var regexes []*regexp.Regexp
	for _, p := range patterns {
		// Simple containment check regex
		regexes = append(regexes, regexp.MustCompile(regexp.QuoteMeta(p)))
	}

	filepath.Walk(e.repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}

		// Skip vendor/node_modules
		if strings.Contains(path, "node_modules") || strings.Contains(path, "vendor") || strings.Contains(path, ".git") {
			return filepath.SkipDir
		}

		// Only check code files
		ext := strings.ToLower(filepath.Ext(path))
		if ext != ".js" && ext != ".ts" && ext != ".jsx" && ext != ".tsx" && ext != ".go" && ext != ".py" {
			return nil
		}

		file, err := os.Open(path)
		if err != nil {
			return nil
		}
		defer file.Close()

		// Scan file content
		scanner := bufio.NewScanner(file)
		fileHasPattern := false

		// Check first 800 lines (imports usually at top, but usage can be anywhere)
		lineCount := 0
		for scanner.Scan() {
			lineCount++
			if lineCount > 800 {
				break
			}

			line := scanner.Text()
			for _, rx := range regexes {
				if rx.MatchString(line) {
					fileHasPattern = true
					break
				}
			}
			if fileHasPattern {
				break
			}
		}

		if fileHasPattern {
			usageFileCount++
		}

		return nil
	})

	return usageFileCount
}
