package signals

// ============================================
// LAYER 1: INFRASTRUCTURE SIGNALS
// Raw facts extracted from the repository
// NO DECISIONS - ONLY FACTS
// ============================================

// InfraSignal - A single infrastructure fact
type InfraSignal string

const (
	// Container Signals
	SignalDocker        InfraSignal = "docker"
	SignalDockerCompose InfraSignal = "docker_compose"
	SignalKubernetes    InfraSignal = "kubernetes"
	SignalHelm          InfraSignal = "helm"

	// Gateway/Proxy Signals
	SignalNginx   InfraSignal = "nginx"
	SignalTraefik InfraSignal = "traefik"
	SignalEnvoy   InfraSignal = "envoy"

	// Message Queue Signals
	SignalRabbitMQ InfraSignal = "rabbitmq"
	SignalKafka    InfraSignal = "kafka"
	SignalRedis    InfraSignal = "redis"
	SignalNATS     InfraSignal = "nats"
	SignalSQS      InfraSignal = "sqs"

	// Database Signals
	SignalPostgres  InfraSignal = "postgres"
	SignalMySQL     InfraSignal = "mysql"
	SignalMongoDB   InfraSignal = "mongodb"
	SignalSQLite    InfraSignal = "sqlite"
	SignalCassandra InfraSignal = "cassandra"
	SignalDynamoDB  InfraSignal = "dynamodb"

	// ORM Signals
	SignalPrisma   InfraSignal = "prisma"
	SignalTypeORM  InfraSignal = "typeorm"
	SignalSequelze InfraSignal = "sequelize"
	SignalGORM     InfraSignal = "gorm"
	SignalSQLAlch  InfraSignal = "sqlalchemy"
	SignalMongoose InfraSignal = "mongoose"

	// CI/CD Signals
	SignalGitHubActions InfraSignal = "github_actions"
	SignalGitLabCI      InfraSignal = "gitlab_ci"
	SignalJenkins       InfraSignal = "jenkins"
	SignalCircleCI      InfraSignal = "circleci"
	SignalTravisCI      InfraSignal = "travis"

	// Cloud Signals
	SignalAWS   InfraSignal = "aws"
	SignalGCP   InfraSignal = "gcp"
	SignalAzure InfraSignal = "azure"

	// Architecture Signals
	SignalMultipleServices        InfraSignal = "multiple_services"
	SignalSeparatePorts           InfraSignal = "separate_ports"
	SignalServiceIsolation        InfraSignal = "service_isolation"
	SignalSharedDatabase          InfraSignal = "shared_database"
	SignalDatabasePerService      InfraSignal = "database_per_service"
	SignalAPIVersioning           InfraSignal = "api_versioning"
	SignalHealthEndpoints         InfraSignal = "health_endpoints"
	SignalGracefulShutdown        InfraSignal = "graceful_shutdown"
	SignalEventSourcing           InfraSignal = "event_sourcing"
	SignalCQRS                    InfraSignal = "cqrs"
	SignalMessageProducer         InfraSignal = "message_producer"
	SignalMessageConsumer         InfraSignal = "message_consumer"
	SignalAsyncCommunication      InfraSignal = "async_communication"
	SignalSyncCommunication       InfraSignal = "sync_communication"
	SignalServiceDiscovery        InfraSignal = "service_discovery"
	SignalLoadBalancing           InfraSignal = "load_balancing"
	SignalCircuitBreaker          InfraSignal = "circuit_breaker"
	SignalRetryLogic              InfraSignal = "retry_logic"
	SignalRateLimiting            InfraSignal = "rate_limiting"
	SignalCentralizedLogging      InfraSignal = "centralized_logging"
	SignalDistributedTracing      InfraSignal = "distributed_tracing"
	SignalMetricsCollection       InfraSignal = "metrics_collection"
	SignalSecretManagement        InfraSignal = "secret_management"
	SignalConfigManagement        InfraSignal = "config_management"
	SignalAuthMicroservice        InfraSignal = "auth_microservice"
	SignalAPIGatewayPattern       InfraSignal = "api_gateway_pattern"
	SignalBFFPattern              InfraSignal = "bff_pattern"
	SignalSagaPattern             InfraSignal = "saga_pattern"
	SignalOutboxPattern           InfraSignal = "outbox_pattern"
	SignalDeadLetterQueue         InfraSignal = "dead_letter_queue"
	SignalIdempotency             InfraSignal = "idempotency"
	SignalEventDrivenArchitecture InfraSignal = "event_driven"

	// Security Signals
	SignalJWT             InfraSignal = "jwt"
	SignalOAuth           InfraSignal = "oauth"
	SignalOAuth2          InfraSignal = "oauth2"
	SignalAPIKey          InfraSignal = "api_key"
	SignalRBAC            InfraSignal = "rbac"
	SignalSSL             InfraSignal = "ssl"
	SignalCORS            InfraSignal = "cors"
	SignalCSRF            InfraSignal = "csrf"
	SignalInputValidation InfraSignal = "input_validation"
	SignalHelmet          InfraSignal = "helmet"

	// Testing Signals
	SignalUnitTests        InfraSignal = "unit_tests"
	SignalIntegrationTests InfraSignal = "integration_tests"
	SignalE2ETests         InfraSignal = "e2e_tests"
	SignalTestCoverage     InfraSignal = "test_coverage"
	SignalMocking          InfraSignal = "mocking"
	SignalTestContainers   InfraSignal = "testcontainers"

	// Observability Signals
	SignalPrometheus        InfraSignal = "prometheus"
	SignalGrafana           InfraSignal = "grafana"
	SignalJaeger            InfraSignal = "jaeger"
	SignalZipkin            InfraSignal = "zipkin"
	SignalELKStack          InfraSignal = "elk_stack"
	SignalDatadog           InfraSignal = "datadog"
	SignalNewRelic          InfraSignal = "new_relic"
	SignalSentry            InfraSignal = "sentry"
	SignalStructuredLogging InfraSignal = "structured_logging"

	// Performance Signals
	SignalCaching         InfraSignal = "caching"
	SignalCDN             InfraSignal = "cdn"
	SignalCompression     InfraSignal = "compression"
	SignalConnectionPool  InfraSignal = "connection_pool"
	SignalAsyncProcessing InfraSignal = "async_processing"
	SignalWorkerQueues    InfraSignal = "worker_queues"
)

// InfrastructureSignals - All extracted infrastructure facts
type InfrastructureSignals struct {
	Signals       []InfraSignal                `json:"signals"`
	SignalDetails map[InfraSignal]SignalDetail `json:"signalDetails"`
	ServiceCount  int                          `json:"serviceCount"`
	ServiceNames  []string                     `json:"serviceNames"`
}

// SignalDetail - Evidence for a signal
type SignalDetail struct {
	Signal     InfraSignal `json:"signal"`
	Confidence float64     `json:"confidence"` // 0.0 - 1.0
	Evidence   []string    `json:"evidence"`   // File paths or code snippets
	Source     string      `json:"source"`     // Where detected: file, config, code
}

// HasSignal checks if a signal exists
func (is *InfrastructureSignals) HasSignal(signal InfraSignal) bool {
	for _, s := range is.Signals {
		if s == signal {
			return true
		}
	}
	return false
}

// AddSignal adds a signal with its evidence
func (is *InfrastructureSignals) AddSignal(signal InfraSignal, confidence float64, evidence []string, source string) {
	// Avoid duplicates
	if is.HasSignal(signal) {
		// Update if higher confidence
		if detail, ok := is.SignalDetails[signal]; ok && confidence > detail.Confidence {
			is.SignalDetails[signal] = SignalDetail{
				Signal:     signal,
				Confidence: confidence,
				Evidence:   append(detail.Evidence, evidence...),
				Source:     source,
			}
		}
		return
	}

	is.Signals = append(is.Signals, signal)
	if is.SignalDetails == nil {
		is.SignalDetails = make(map[InfraSignal]SignalDetail)
	}
	is.SignalDetails[signal] = SignalDetail{
		Signal:     signal,
		Confidence: confidence,
		Evidence:   evidence,
		Source:     source,
	}
}

// GetSignalConfidence returns confidence for a signal
func (is *InfrastructureSignals) GetSignalConfidence(signal InfraSignal) float64 {
	if detail, ok := is.SignalDetails[signal]; ok {
		return detail.Confidence
	}
	return 0.0
}
