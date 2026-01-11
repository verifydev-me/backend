package parser

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/verifydev/project-analyzer/pkg/signals"
)

// scanServicePython scans a service's requirements.txt/pyproject.toml
func (e *InfraExtractor) scanServicePython(servicePath, serviceName string) {
	// 1. Check requirements.txt
	reqPath := filepath.Join(servicePath, "requirements.txt")
	if fileExists(reqPath) {
		content, err := os.ReadFile(reqPath)
		if err == nil {
			e.analyzePythonDependencies(string(content), serviceName, "requirements.txt")
		}
	}

	// 2. Check pyproject.toml
	pyPath := filepath.Join(servicePath, "pyproject.toml")
	if fileExists(pyPath) {
		content, err := os.ReadFile(pyPath)
		if err == nil {
			e.analyzePythonDependencies(string(content), serviceName, "pyproject.toml")
		}
	}
}

// analyzePythonDependencies maps python packages to signals
func (e *InfraExtractor) analyzePythonDependencies(content, serviceName, sourceFile string) {
	contentStr := strings.ToLower(content)

	depSignals := map[string]signals.InfraSignal{
		// Frameworks
		"django":  signals.SignalHTTPFramework,
		"flask":   signals.SignalHTTPFramework,
		"fastapi": signals.SignalHTTPFramework,
		"bottle":  signals.SignalHTTPFramework,
		"pyramid": signals.SignalHTTPFramework,
		"tornado": signals.SignalHTTPFramework,

		// Databases
		"sqlalchemy":       signals.SignalSQLAlch,
		"psycopg2":         signals.SignalPostgres,
		"asyncpg":          signals.SignalPostgres,
		"pymysql":          signals.SignalMySQL,
		"mysql-connector":  signals.SignalMySQL,
		"pymongo":          signals.SignalMongoDB,
		"motor":            signals.SignalMongoDB,
		"redis":            signals.SignalRedis,
		"cassandra-driver": signals.SignalCassandra,

		// Message Queues
		"pika":            signals.SignalRabbitMQ,
		"kafka-python":    signals.SignalKafka,
		"confluent-kafka": signals.SignalKafka,
		"celery":          signals.SignalWorkerQueues,

		// ML/AI
		"tensorflow":   signals.SignalTensorFlow,
		"torch":        signals.SignalPyTorch,
		"keras":        signals.SignalTensorFlow,
		"scikit-learn": signals.SignalScikitLearn,
		"pandas":       signals.SignalPandas,
		"numpy":        signals.SignalNumpy,
		"transformers": signals.SignalLLM,
		"langchain":    signals.SignalLLM,
		"openai":       signals.SignalLLM,

		// Testing
		"pytest":         signals.SignalUnitTests,
		"unittest":       signals.SignalUnitTests,
		"nose2":          signals.SignalUnitTests,
		"robotframework": signals.SignalE2ETests,

		// Cloud
		"boto3":         signals.SignalAWS,
		"google-cloud":  signals.SignalGCP,
		"azure-storage": signals.SignalAzure,
	}

	for pattern, signal := range depSignals {
		if strings.Contains(contentStr, strings.ToLower(pattern)) {
			evidence := fmt.Sprintf("%s/%s → %s", serviceName, sourceFile, pattern)
			e.signals.AddSignal(signal, 0.9, []string{evidence}, "deep_service_scan")
		}
	}
}

// analyzePythonDeps extracts signals from requirements files
func (e *InfraExtractor) analyzePythonDeps() {
	files := e.findFiles("requirements.txt", "pyproject.toml", "setup.py")

	for _, file := range files {
		serviceName := filepath.Dir(file)
		if serviceName == "." {
			serviceName = "root"
		}
		dir := filepath.Dir(filepath.Join(e.repoPath, file))
		e.scanServicePython(dir, serviceName)
	}
}
