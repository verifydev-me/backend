package parser

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/verifydev/project-analyzer/pkg/signals"
)

// scanServiceDockerfile scans a service's Dockerfile
func (e *InfraExtractor) scanServiceDockerfile(servicePath, serviceName string) {
	dockerfilePath := filepath.Join(servicePath, "Dockerfile")
	if !fileExists(dockerfilePath) {
		// Try case insensitive
		dockerfilePath = filepath.Join(servicePath, "dockerfile")
		if !fileExists(dockerfilePath) {
			return
		}
	}

	content, err := os.ReadFile(dockerfilePath)
	if err != nil {
		return
	}

	contentStr := strings.ToLower(string(content))
	e.signals.AddSignal(signals.SignalDocker, 1.0, []string{fmt.Sprintf("%s/Dockerfile", serviceName)}, "deep_service_docker")

	// Scan base images and instructions
	dockerSignals := map[string]signals.InfraSignal{
		"node":          signals.SignalHTTPFramework, // Implies Node.js
		"python":        signals.SignalHTTPFramework, // Implies Python (generic)
		"golang":        signals.SignalHTTPFramework, // Implies Go
		"postgres":      signals.SignalPostgres,
		"mongo":         signals.SignalMongoDB,
		"mysql":         signals.SignalMySQL,
		"mariadb":       signals.SignalMySQL,
		"redis":         signals.SignalRedis,
		"rabbitmq":      signals.SignalRabbitMQ,
		"nginx":         signals.SignalNginx,
		"traefik":       signals.SignalTraefik,
		"envoy":         signals.SignalEnvoy,
		"consul":        signals.SignalConsul,
		"vault":         signals.SignalVault,
		"elasticsearch": signals.SignalElasticsearch,
		"kibana":        signals.SignalELKStack,
		"fluentd":       signals.SignalELKStack,
		"prometheus":    signals.SignalPrometheus,
		"grafana":       signals.SignalGrafana,
		"jenkins":       signals.SignalJenkins,
	}

	lines := strings.Split(contentStr, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "from ") {
			// Extract image name
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				image := parts[1]
				for pattern, signal := range dockerSignals {
					if strings.Contains(image, pattern) {
						evidence := fmt.Sprintf("%s/Dockerfile FROM %s", serviceName, image)
						e.signals.AddSignal(signal, 0.95, []string{evidence}, "deep_service_docker")
					}
				}
			}
		}
	}
}
