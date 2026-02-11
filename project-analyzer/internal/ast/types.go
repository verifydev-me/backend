package ast

// ============================================
// PHASE 1: Multi-Language AST Engine
// Core Types for Cross-Language Analysis
// ============================================

// ProjectASTResult holds AST analysis results for entire project
type ProjectASTResult struct {
	Files           []*FileAnalysis         `json:"files"`
	ImportGraph     map[string][]string     `json:"importGraph"`     // file -> [imported modules]
	TechnologyUsage map[string]*TechUsage   `json:"technologyUsage"` // technology -> usage stats
	Complexity      ProjectComplexity       `json:"complexity"`
	Summary         ASTSummary              `json:"summary"`
}

// FileAnalysis holds AST results for a single file
type FileAnalysis struct {
	FilePath      string             `json:"filePath"`
	Language      string             `json:"language"` // "typescript", "javascript", "go", "python"
	Imports       []ImportStatement  `json:"imports"`
	Exports       []ExportStatement  `json:"exports"`
	FunctionCalls []FunctionCall     `json:"functionCalls"`
	Definitions   []Definition       `json:"definitions"`
	Complexity    int                `json:"complexity"` // Cyclomatic complexity
	LineCount     int                `json:"lineCount"`
	Patterns      []CodePattern      `json:"patterns"`
}

// ImportStatement represents a parsed import
type ImportStatement struct {
	Names     []string `json:"names"`     // ["useState", "useEffect"]
	Source    string   `json:"source"`    // "react", "@nestjs/core"
	IsDefault bool    `json:"isDefault"` // import React from 'react'
	IsDynamic bool    `json:"isDynamic"` // await import('...')
	Line      int     `json:"line"`
}

// ExportStatement represents a parsed export
type ExportStatement struct {
	Name      string `json:"name"`
	Type      string `json:"type"` // "function", "class", "variable", "default"
	IsDefault bool   `json:"isDefault"`
	Line      int    `json:"line"`
}

// FunctionCall represents a detected function call
type FunctionCall struct {
	Name          string `json:"name"`
	Receiver      string `json:"receiver,omitempty"` // "app" in app.listen()
	FullCall      string `json:"fullCall"`            // "app.listen"
	ArgumentCount int    `json:"argumentCount"`
	IsAsync       bool   `json:"isAsync"`
	Line          int    `json:"line"`
}

// Definition represents a function/class/variable definition
type Definition struct {
	Name       string   `json:"name"`
	Type       string   `json:"type"` // "function", "class", "interface", "variable"
	IsExported bool     `json:"isExported"`
	Params     []string `json:"params,omitempty"`
	Line       int      `json:"line"`
	EndLine    int      `json:"endLine"`
}

// CodePattern represents a detected code pattern
type CodePattern struct {
	Type       string  `json:"type"`       // "react_hook", "express_route", "goroutine_with_ctx"
	Name       string  `json:"name"`       // "useState", "app.get", "go func(ctx)"
	Confidence float64 `json:"confidence"` // 0.0 - 1.0
	Evidence   string  `json:"evidence"`
	Line       int     `json:"line"`
}

// TechUsage tracks how heavily a technology is used
type TechUsage struct {
	Technology   string  `json:"technology"`
	ImportCount  int     `json:"importCount"`  // How many files import it
	CallCount    int     `json:"callCount"`    // How many function calls to it
	FileCount    int     `json:"fileCount"`    // How many files use it
	Intensity    float64 `json:"intensity"`    // 0.0 - 1.0 normalized usage
	IsDirectDep  bool    `json:"isDirectDep"`  // In package.json/go.mod
	Evidence     []string `json:"evidence"`
}

// ProjectComplexity holds project-wide complexity metrics
type ProjectComplexity struct {
	AveragePerFunction float64        `json:"averagePerFunction"`
	MaxComplexity      int            `json:"maxComplexity"`
	MaxComplexityFunc  string         `json:"maxComplexityFunc"`
	TotalFunctions     int            `json:"totalFunctions"`
	Distribution       map[string]int `json:"distribution"` // "simple", "moderate", "complex", "critical"
}

// ASTSummary holds summary statistics
type ASTSummary struct {
	TotalFiles      int `json:"totalFiles"`
	TotalImports    int `json:"totalImports"`
	UniqueModules   int `json:"uniqueModules"`
	TotalFunctions  int `json:"totalFunctions"`
	TotalCalls      int `json:"totalCalls"`
	TotalPatterns   int `json:"totalPatterns"`
	TotalExports    int `json:"totalExports"`
}

// ============================================
// Technology Signal Mappings
// ============================================

// KnownImportSignals maps import sources to technology names
var KnownImportSignals = map[string]string{
	// React ecosystem
	"react":                    "React",
	"react-dom":                "React",
	"react-dom/client":         "React",
	"react-router-dom":         "React Router",
	"@tanstack/react-query":    "React Query",
	"react-hook-form":          "React Hook Form",

	// Next.js
	"next":                     "Next.js",
	"next/image":               "Next.js",
	"next/link":                "Next.js",
	"next/router":              "Next.js",
	"next/navigation":          "Next.js",
	"next/server":              "Next.js",
	"next/headers":             "Next.js",

	// Vue
	"vue":                      "Vue",
	"@vue/composition-api":     "Vue",
	"pinia":                    "Pinia",

	// Angular
	"@angular/core":            "Angular",
	"@angular/common":          "Angular",
	"@angular/router":          "Angular",

	// Svelte
	"svelte":                   "Svelte",

	// State management
	"redux":                    "Redux",
	"@reduxjs/toolkit":         "Redux",
	"zustand":                  "Zustand",
	"recoil":                   "Recoil",
	"jotai":                    "Jotai",
	"mobx":                     "MobX",

	// Styling
	"tailwindcss":              "Tailwind CSS",
	"styled-components":        "Styled Components",
	"@emotion/react":           "Emotion",
	"@mui/material":            "Material UI",
	"@chakra-ui/react":         "Chakra UI",
	"framer-motion":            "Framer Motion",

	// Backend - Node.js
	"express":                  "Express",
	"@nestjs/core":             "NestJS",
	"@nestjs/common":           "NestJS",
	"fastify":                  "Fastify",
	"koa":                      "Koa",
	"hapi":                     "Hapi",
	"@hono/node-server":        "Hono",
	"hono":                     "Hono",

	// Database
	"prisma":                   "Prisma",
	"@prisma/client":           "Prisma",
	"mongoose":                 "Mongoose",
	"typeorm":                  "TypeORM",
	"sequelize":                "Sequelize",
	"drizzle-orm":              "Drizzle ORM",
	"knex":                     "Knex",
	"pg":                       "PostgreSQL",
	"mysql2":                   "MySQL",
	"mongodb":                  "MongoDB",
	"ioredis":                  "Redis",
	"redis":                    "Redis",
	"@upstash/redis":           "Redis",

	// Message Queues
	"amqplib":                  "RabbitMQ",
	"kafkajs":                  "Kafka",
	"bullmq":                   "BullMQ",
	"bull":                     "Bull",

	// Auth & Security
	"jsonwebtoken":             "JWT",
	"passport":                 "Passport.js",
	"bcrypt":                   "Password Hashing",
	"argon2":                   "Password Hashing",
	"helmet":                   "Helmet",
	"cors":                     "CORS",
	"express-rate-limit":       "Rate Limiting",

	// GraphQL
	"graphql":                  "GraphQL",
	"@apollo/server":           "Apollo GraphQL",
	"@apollo/client":           "Apollo GraphQL",
	"type-graphql":             "GraphQL",

	// WebSocket
	"ws":                       "WebSocket",
	"socket.io":                "Socket.IO",
	"socket.io-client":         "Socket.IO",

	// Testing
	"jest":                     "Jest",
	"vitest":                   "Vitest",
	"@testing-library/react":   "Testing Library",
	"cypress":                  "Cypress",
	"@playwright/test":         "Playwright",
	"supertest":                "Supertest",

	// Validation
	"zod":                      "Zod",
	"yup":                      "Yup",
	"joi":                      "Joi",

	// Cloud
	"aws-sdk":                  "AWS SDK",
	"@aws-sdk/client-s3":       "AWS S3",
	"@google-cloud/storage":    "GCP Storage",
	"firebase":                 "Firebase",
	"firebase-admin":           "Firebase",
	"@supabase/supabase-js":    "Supabase",

	// Observability
	"prom-client":              "Prometheus",
	"winston":                  "Winston Logger",
	"pino":                     "Pino Logger",
	"@sentry/node":             "Sentry",
	"@sentry/react":            "Sentry",

	// TypeScript
	"typescript":               "TypeScript",

	// gRPC
	"@grpc/grpc-js":            "gRPC",
}

// GoImportSignals maps Go import paths to technology names
var GoImportSignals = map[string]string{
	// Web frameworks
	"github.com/gin-gonic/gin":           "Gin",
	"github.com/gofiber/fiber":           "Fiber",
	"github.com/gofiber/fiber/v2":        "Fiber",
	"github.com/labstack/echo":           "Echo",
	"github.com/labstack/echo/v4":        "Echo",
	"github.com/go-chi/chi":              "Chi",
	"github.com/go-chi/chi/v5":           "Chi",
	"github.com/gorilla/mux":             "Gorilla Mux",

	// Database
	"gorm.io/gorm":                       "GORM",
	"gorm.io/driver/postgres":            "PostgreSQL",
	"gorm.io/driver/mysql":               "MySQL",
	"gorm.io/driver/sqlite":              "SQLite",
	"go.mongodb.org/mongo-driver":        "MongoDB",
	"go.mongodb.org/mongo-driver/mongo":  "MongoDB",
	"github.com/go-redis/redis":          "Redis",
	"github.com/go-redis/redis/v8":       "Redis",
	"database/sql":                       "SQL",
	"github.com/jmoiron/sqlx":            "SQLx",

	// Message Queues
	"github.com/rabbitmq/amqp091-go":     "RabbitMQ",
	"github.com/streadway/amqp":          "RabbitMQ",
	"github.com/confluentinc/confluent-kafka-go": "Kafka",
	"github.com/segmentio/kafka-go":      "Kafka",

	// gRPC
	"google.golang.org/grpc":             "gRPC",
	"google.golang.org/protobuf":         "Protocol Buffers",

	// Auth
	"github.com/golang-jwt/jwt":          "JWT",
	"github.com/golang-jwt/jwt/v5":       "JWT",
	"golang.org/x/crypto/bcrypt":         "Password Hashing",

	// Logging
	"github.com/rs/zerolog":              "Zerolog",
	"go.uber.org/zap":                    "Zap Logger",
	"github.com/sirupsen/logrus":         "Logrus",

	// Testing
	"github.com/stretchr/testify":        "Testify",
	"github.com/onsi/ginkgo":             "Ginkgo",
	"github.com/onsi/gomega":             "Gomega",

	// Cloud
	"github.com/aws/aws-sdk-go":          "AWS SDK",
	"cloud.google.com/go":                "GCP SDK",

	// Concurrency & Context
	"context":                            "Context",
	"sync":                               "Sync Primitives",

	// Standard library patterns
	"net/http":                            "HTTP Server",
	"encoding/json":                       "JSON",
}

// PythonImportSignals maps Python imports to technology names
var PythonImportSignals = map[string]string{
	// Web frameworks
	"django":      "Django",
	"flask":       "Flask",
	"fastapi":     "FastAPI",
	"starlette":   "Starlette",
	"tornado":     "Tornado",
	"aiohttp":     "aiohttp",
	"sanic":       "Sanic",

	// Database
	"sqlalchemy":  "SQLAlchemy",
	"django.db":   "Django ORM",
	"pymongo":     "MongoDB",
	"redis":       "Redis",
	"psycopg2":    "PostgreSQL",
	"asyncpg":     "PostgreSQL",
	"motor":       "MongoDB",

	// ML/AI
	"tensorflow":  "TensorFlow",
	"torch":       "PyTorch",
	"sklearn":     "Scikit-learn",
	"pandas":      "Pandas",
	"numpy":       "NumPy",
	"keras":       "Keras",
	"transformers":"Hugging Face",
	"openai":      "OpenAI",
	"langchain":   "LangChain",

	// Testing
	"pytest":      "Pytest",
	"unittest":    "Unittest",

	// API
	"pydantic":    "Pydantic",
	"requests":    "Requests",
	"httpx":       "HTTPX",

	// Cloud
	"boto3":       "AWS SDK",
	"google.cloud":"GCP SDK",

	// Data
	"celery":      "Celery",
	"pika":        "RabbitMQ",
}

// ReactHookPatterns defines React hook patterns for detection
var ReactHookPatterns = map[string]string{
	"useState":      "State Management",
	"useEffect":     "Side Effects",
	"useContext":     "Context API",
	"useReducer":     "Reducer Pattern",
	"useMemo":        "Memoization",
	"useCallback":    "Callback Memoization",
	"useRef":         "Ref Management",
	"useLayoutEffect":"Layout Effects",
	"useImperativeHandle": "Imperative Handle",
	"useDebugValue":  "Debug Value",
}
