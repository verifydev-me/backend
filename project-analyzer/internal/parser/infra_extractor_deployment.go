package parser

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/verifydev/project-analyzer/pkg/signals"
)

// ============================================
// DEPLOYMENT & DEVOPS EXTRACTION
// ============================================

// extractDeploymentSignals checks for deployment & DevOps configurations
func (e *InfraExtractor) extractDeploymentSignals() {
	// 1. Docker
	if e.fileExists("Dockerfile") || e.fileExists("docker-compose.yml") || e.fileExists("docker-compose.yaml") {
		e.signals.AddSignal(signals.SignalDocker, 1.0, []string{"Docker configuration found"}, "file")
	}

	if e.fileExists("docker-compose.yml") || e.fileExists("docker-compose.yaml") {
		e.signals.AddSignal(signals.SignalDockerCompose, 1.0, []string{"Docker Compose found"}, "file")
	}

	// 2. Kubernetes
	k8sFiles := e.findFiles("deployment.yaml", "service.yaml", "ingress.yaml", "kustomization.yaml", "values.yaml")
	if len(k8sFiles) > 0 || e.directoryExists("k8s") || e.directoryExists("kubernetes") || e.directoryExists("helm") {
		e.signals.AddSignal(signals.SignalKubernetes, 1.0, []string{"Kubernetes manifests found"}, "file")
	}

	if e.directoryExists("helm") || e.fileExists("Chart.yaml") {
		e.signals.AddSignal(signals.SignalHelm, 1.0, []string{"Helm charts detected"}, "file")
	}

	// 3. Infrastructure as Code (IaC)
	if len(e.findFiles("*.tf", "*.tfvars")) > 0 {
		e.signals.AddSignal(signals.SignalTerraform, 1.0, []string{"Terraform files detected"}, "file")
		e.signals.AddSignal(signals.SignalIaC, 1.0, []string{"Terraform detected"}, "file")
	}

	if e.fileExists("Pulumi.yaml") {
		e.signals.AddSignal(signals.SignalPulumi, 1.0, []string{"Pulumi detected"}, "file")
		e.signals.AddSignal(signals.SignalIaC, 1.0, []string{"Pulumi detected"}, "file")
	}

	if len(e.findFiles("serverless.yml", "serverless.yaml")) > 0 {
		e.signals.AddSignal(signals.SignalServerless, 1.0, []string{"Serverless Framework detected"}, "file")
	}

	// 4. CI/CD Pipelines
	if e.directoryExists(".github/workflows") {
		e.signals.AddSignal(signals.SignalGitHubActions, 1.0, []string{"GitHub Actions workflows found"}, "file")
	}

	if e.fileExists(".gitlab-ci.yml") {
		e.signals.AddSignal(signals.SignalGitLabCI, 1.0, []string{"GitLab CI found"}, "file")
	}

	if e.fileExists("Jenkinsfile") {
		e.signals.AddSignal(signals.SignalJenkins, 1.0, []string{"Jenkinsfile found"}, "file")
	}

	if e.directoryExists(".circleci") {
		e.signals.AddSignal(signals.SignalCircleCI, 1.0, []string{"CircleCI found"}, "file")
	}

	if e.fileExists("cloudbuild.yaml") {
		e.signals.AddSignal(signals.SignalGCP, 0.9, []string{"Cloud Build detected"}, "file")
	}

	if e.fileExists("buildspec.yml") {
		e.signals.AddSignal(signals.SignalAWS, 0.9, []string{"AWS CodeBuild detected"}, "file")
	}

	// 5. Deployment Strategies (Code Analysis)
	if e.findCodePattern(`rolling.*update|maxSurge|maxUnavailable`) {
		e.signals.AddSignal(signals.SignalRollingUpdate, 0.80, []string{"Rolling update strategy detected"}, "code")
	}

	if e.findCodePattern(`canary`) {
		e.signals.AddSignal(signals.SignalCanaryDeployment, 0.80, []string{"Canary deployment detected"}, "code")
	}

	if e.findCodePattern(`blue.*green`) {
		e.signals.AddSignal(signals.SignalBlueGreen, 0.80, []string{"Blue/Green deployment detected"}, "code")
	}

	// 6. GitOps
	if e.findCodePattern(`argocd|ArgoCD|Application.*apiVersion.*argoproj`) {
		e.signals.AddSignal(signals.SignalArgoCD, 0.90, []string{"ArgoCD GitOps detected"}, "code")
	}

	if e.findCodePattern(`flux|Flux|Kustomization.*fluxcd`) {
		e.signals.AddSignal(signals.SignalFlux, 0.90, []string{"Flux GitOps detected"}, "code")
	}

	// 7. Feature branch deployments/Previews
	if e.findCodePattern(`preview.*url|deploy.*preview|vercel.*json|netlify.*toml`) {
		e.signals.AddSignal(signals.SignalPreviewEnvironments, 0.80, []string{"Preview environments config detected"}, "code")
	}

	// 8. Database Management
	if e.findCodePattern(`migrate|Migration|flyway|liquibase|knex.*migrate|prisma.*migrate`) {
		e.signals.AddSignal(signals.SignalDatabaseMigrations, 0.85, []string{"Database migrations detected"}, "code")
	}
}

// extractDockerComposeSignals parses docker-compose.yml
func (e *InfraExtractor) extractDockerComposeSignals() {
	composeFiles := []string{"docker-compose.yml", "docker-compose.yaml"}

	for _, filename := range composeFiles {
		path := filepath.Join(e.repoPath, filename)
		if fileExists(path) {
			// Read file content
			// Basic text analysis for now (keeping it simple)
			// In future: parse YAML
			e.scanDockerComposeContent(path, filename)
		}
	}
}

func (e *InfraExtractor) scanDockerComposeContent(path, filename string) {
	content, err := os.ReadFile(path)
	if err != nil {
		return
	}
	contentStr := string(content)
	contentLower := strings.ToLower(contentStr)

	// Fix #5: Track third-party services vs custom services
	// Third-party: postgres, redis, nginx, etc. (developer USES but didn't BUILD)
	// Custom: services with build: context or Dockerfile (developer BUILT)
	thirdPartyImages := map[string]bool{
		"postgres": true, "mysql": true, "mariadb": true, "mongo": true, "mongodb": true,
		"redis": true, "rabbitmq": true, "kafka": true, "zookeeper": true, "confluent": true,
		"nats": true, "localstack": true, "minio": true, "nginx": true, "traefik": true,
		"envoy": true, "consul": true, "vault": true, "prometheus": true, "grafana": true,
		"elasticsearch": true, "kibana": true, "jaeger": true, "zipkin": true, "clickhouse": true,
		"memcached": true, "cassandra": true, "dynamodb": true, "etcd": true, "haproxy": true,
	}

	// Map images/services to signals
	serviceMap := map[string]signals.InfraSignal{
		"postgres":      signals.SignalPostgres,
		"mysql":         signals.SignalMySQL,
		"mariadb":       signals.SignalMySQL,
		"mongo":         signals.SignalMongoDB,
		"redis":         signals.SignalRedis,
		"rabbitmq":      signals.SignalRabbitMQ,
		"kafka":         signals.SignalKafka,
		"zookeeper":     signals.SignalKafka, // Often implies Kafka
		"confluent":     signals.SignalKafka,
		"nats":          signals.SignalNATS,
		"sqs":           signals.SignalSQS,
		"localstack":    signals.SignalAWS, // Implies AWS usage
		"minio":         signals.SignalS3,  // Implies S3 usage
		"nginx":         signals.SignalNginx,
		"traefik":       signals.SignalTraefik,
		"envoy":         signals.SignalEnvoy,
		"consul":        signals.SignalConsul,
		"vault":         signals.SignalVault,
		"prometheus":    signals.SignalPrometheus,
		"grafana":       signals.SignalGrafana,
		"elasticsearch": signals.SignalElasticsearch,
		"kibana":        signals.SignalELKStack,
		"jaeger":        signals.SignalJaeger,
		"zipkin":        signals.SignalZipkin,
		"clickhouse":    signals.SignalClickHouse,
	}

	// Fix #5: Parse docker-compose to identify custom vs third-party services
	// Services with "build:" are custom, services with "image:" are third-party
	lines := strings.Split(contentStr, "\n")
	inServices := false
	currentService := ""
	serviceHasBuild := make(map[string]bool)
	serviceHasImage := make(map[string]bool)
	detectedThirdParty := make(map[string]bool)

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		lineLower := strings.ToLower(trimmed)

		// Track services section
		if lineLower == "services:" {
			inServices = true
			continue
		}

		// New top-level section ends services
		if inServices && len(line) > 0 && line[0] != ' ' && line[0] != '\t' && !strings.HasPrefix(lineLower, "#") {
			if !strings.HasPrefix(lineLower, "services") {
				inServices = false
			}
		}

		if !inServices {
			continue
		}

		// Detect service definition (indented name ending with :)
		if strings.HasSuffix(trimmed, ":") && !strings.HasPrefix(lineLower, "#") {
			indent := len(line) - len(strings.TrimLeft(line, " \t"))
			if indent > 0 && indent <= 4 { // Service name indentation level
				currentService = strings.TrimSuffix(trimmed, ":")
			}
		}

		// Detect build: context (marks as custom service)
		if currentService != "" && strings.HasPrefix(lineLower, "build:") {
			serviceHasBuild[currentService] = true
		}

		// Detect image: (could be third-party)
		if currentService != "" && strings.HasPrefix(lineLower, "image:") {
			serviceHasImage[currentService] = true
			// Check if it's a known third-party image
			for thirdParty := range thirdPartyImages {
				if strings.Contains(lineLower, thirdParty) {
					detectedThirdParty[currentService] = true
					break
				}
			}
		}
	}

	// Fix #5: Categorize services
	for service, hasBuild := range serviceHasBuild {
		if hasBuild {
			e.signals.CustomServiceCount++
			e.signals.CustomServiceNames = append(e.signals.CustomServiceNames, service)
		}
	}
	for service := range serviceHasImage {
		if _, hasBuild := serviceHasBuild[service]; !hasBuild {
			// No build context, check if third-party
			if _, isThirdParty := detectedThirdParty[service]; isThirdParty {
				e.signals.ThirdPartyServiceCount++
				e.signals.ThirdPartyServiceNames = append(e.signals.ThirdPartyServiceNames, service)
			} else {
				// Image but not known third-party - could be custom image from registry
				e.signals.CustomServiceCount++
				e.signals.CustomServiceNames = append(e.signals.CustomServiceNames, service)
			}
		}
	}

	// Process signals for detected technologies
	// Only match services from "image:" lines or service names, NOT volume paths
	for _, line := range lines {
		lineLower := strings.ToLower(strings.TrimSpace(line))

		// Skip comments and volume/path lines that could cause false positives
		if strings.HasPrefix(lineLower, "#") {
			continue
		}
		// Volume paths often contain /etc/nginx, /var/lib/mysql etc - SKIP
		if strings.Contains(lineLower, "/") && !strings.HasPrefix(lineLower, "image:") {
			continue
		}

		// Only match on "image:" lines or service definition lines (no colon followed by /)
		for pattern, signal := range serviceMap {
			// Match: "image: postgres:13" or "  postgres:" (service name)
			if strings.Contains(lineLower, "image:") && strings.Contains(lineLower, pattern) {
				e.signals.AddSignal(signal, 0.95,
					[]string{fmt.Sprintf("Docker image '%s' in %s", pattern, filename)},
					"docker_compose")
			} else if strings.HasSuffix(lineLower, pattern+":") || lineLower == pattern+":" {
				// Service name definition line like "  postgres:"
				e.signals.AddSignal(signal, 0.90,
					[]string{fmt.Sprintf("Service '%s' in %s", pattern, filename)},
					"docker_compose")
			}
		}
	}

	// Also check for infra services mentioned as environment variables (more reliable)
	envPatterns := map[string]signals.InfraSignal{
		"rabbitmq_host": signals.SignalRabbitMQ,
		"kafka_":        signals.SignalKafka,
		"redis_host":    signals.SignalRedis,
		"postgres_":     signals.SignalPostgres,
		"mongo_":        signals.SignalMongoDB,
	}
	for pattern, signal := range envPatterns {
		if strings.Contains(contentLower, pattern) {
			e.signals.AddSignal(signal, 0.85,
				[]string{fmt.Sprintf("Environment variable '%s' in %s", pattern, filename)},
				"docker_compose_env")
		}
	}
}
