package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port              string
	Env               string
	DatabaseURL       string
	RabbitMQURL       string
	ConsumeQueue      string
	PublishQueue      string
	WorkerPoolSize    int
	MaxConcurrentPDFs int
	PDFTimeoutSec     int
}

func Load() *Config {
	return &Config{
		Port:              getEnv("PORT", "8003"),
		Env:               getEnv("ENV", "development"),
		DatabaseURL:       getEnv("DATABASE_URL", ""),
		RabbitMQURL:       getEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/"),
		ConsumeQueue:      getEnv("CONSUME_QUEUE", "resume.generate.request"),
		PublishQueue:      getEnv("PUBLISH_QUEUE", "resume.generated"),
		WorkerPoolSize:    getEnvInt("WORKER_POOL_SIZE", 4),
		MaxConcurrentPDFs: getEnvInt("MAX_CONCURRENT_PDFS", 10),
		PDFTimeoutSec:     getEnvInt("PDF_TIMEOUT_SEC", 30),
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

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolVal, err := strconv.ParseBool(value); err == nil {
			return boolVal
		}
	}
	return defaultValue
}
