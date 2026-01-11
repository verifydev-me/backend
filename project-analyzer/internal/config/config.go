package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port               string
	Env                string
	RabbitMQURL        string
	ExchangeName       string
	ConsumeQueue       string
	PublishQueue       string
	CloneDir           string
	MaxRepoSizeMB      int
	AnalysisTimeoutSec int
	GitHubToken        string
}

func Load() *Config {
	return &Config{
		Port:               getEnv("PORT", "8001"),
		Env:                getEnv("ENV", "development"),
		RabbitMQURL:        getEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/"),
		ExchangeName:       getEnv("EXCHANGE_NAME", "project.events"),
		ConsumeQueue:       getEnv("CONSUME_QUEUE", "project.analyze.request"),
		PublishQueue:       getEnv("PUBLISH_QUEUE", "project.analyzed"),
		CloneDir:           getEnv("CLONE_DIR", "/tmp/repos"),
		MaxRepoSizeMB:      getEnvInt("MAX_REPO_SIZE_MB", 100),
		AnalysisTimeoutSec: getEnvInt("ANALYSIS_TIMEOUT_SEC", 120),
		GitHubToken:        getEnv("GITHUB_TOKEN", ""),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}
