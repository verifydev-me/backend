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
	SignalKong    InfraSignal = "kong"

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
	SignalHTTPFramework   InfraSignal = "http_framework"

	// Cloud-Native Signals
	SignalServerless     InfraSignal = "serverless"
	SignalLambda         InfraSignal = "aws_lambda"
	SignalCloudFunction  InfraSignal = "cloud_function"
	SignalFargate        InfraSignal = "fargate"
	SignalEKS            InfraSignal = "eks"
	SignalGKE            InfraSignal = "gke"
	SignalAKS            InfraSignal = "aks"
	SignalTerraform      InfraSignal = "terraform"
	SignalPulumi         InfraSignal = "pulumi"
	SignalCloudFormation InfraSignal = "cloudformation"
	SignalAnsible        InfraSignal = "ansible"

	// Service Mesh & Advanced Networking
	SignalIstio       InfraSignal = "istio"
	SignalLinkerd     InfraSignal = "linkerd"
	SignalConsul      InfraSignal = "consul"
	SignalVault       InfraSignal = "vault"
	SignalServiceMesh InfraSignal = "service_mesh"

	// Advanced Security Signals
	SignalOWASP           InfraSignal = "owasp"
	SignalSecurityHeaders InfraSignal = "security_headers"
	SignalSQLInjection    InfraSignal = "sql_injection_prevention"
	SignalXSSPrevention   InfraSignal = "xss_prevention"
	SignalEncryption      InfraSignal = "encryption"
	SignalHashing         InfraSignal = "hashing"
	SignalSecretRotation  InfraSignal = "secret_rotation"
	SignalMFA             InfraSignal = "mfa"
	SignalAuditLogging    InfraSignal = "audit_logging"
	SignalPenetrationTest InfraSignal = "penetration_testing"

	// Search & Analytics
	SignalElasticsearch InfraSignal = "elasticsearch"
	SignalOpenSearch    InfraSignal = "opensearch"
	SignalAlgolia       InfraSignal = "algolia"
	SignalMeiliSearch   InfraSignal = "meilisearch"
	SignalClickHouse    InfraSignal = "clickhouse"
	SignalTimescaleDB   InfraSignal = "timescaledb"

	// Real-time & Streaming
	SignalWebRTC           InfraSignal = "webrtc"
	SignalSocketIO         InfraSignal = "socketio"
	SignalSSE              InfraSignal = "sse"
	SignalStreamProcessing InfraSignal = "stream_processing"
	SignalApacheFlink      InfraSignal = "apache_flink"
	SignalApacheSpark      InfraSignal = "apache_spark"

	// Machine Learning & AI
	SignalTensorFlow   InfraSignal = "tensorflow"
	SignalPyTorch      InfraSignal = "pytorch"
	SignalMLPipeline   InfraSignal = "ml_pipeline"
	SignalFeatureStore InfraSignal = "feature_store"
	SignalModelServing InfraSignal = "model_serving"
	SignalMLOps        InfraSignal = "mlops"

	// Advanced Database Patterns
	SignalSharding      InfraSignal = "sharding"
	SignalReplication   InfraSignal = "replication"
	SignalReadReplica   InfraSignal = "read_replica"
	SignalMultiTenancy  InfraSignal = "multi_tenancy"
	SignalDataMigration InfraSignal = "data_migration"
	SignalDBVersioning  InfraSignal = "db_versioning"

	// Design Pattern Signals
	SignalRepositoryPattern   InfraSignal = "repository_pattern"
	SignalFactoryPattern      InfraSignal = "factory_pattern"
	SignalSingletonPattern    InfraSignal = "singleton_pattern"
	SignalObserverPattern     InfraSignal = "observer_pattern"
	SignalStrategyPattern     InfraSignal = "strategy_pattern"
	SignalDecoratorPattern    InfraSignal = "decorator_pattern"
	SignalAdapterPattern      InfraSignal = "adapter_pattern"
	SignalFacadePattern       InfraSignal = "facade_pattern"
	SignalBuilderPattern      InfraSignal = "builder_pattern"
	SignalDependencyInjection InfraSignal = "dependency_injection"
	SignalCleanArchitecture   InfraSignal = "clean_architecture"
	SignalHexagonalArch       InfraSignal = "hexagonal_architecture"
	SignalDDDPattern          InfraSignal = "ddd_pattern"
	SignalSOLID               InfraSignal = "solid_principles"

	// Code Quality Signals
	SignalCodeReview       InfraSignal = "code_review"
	SignalStaticAnalysis   InfraSignal = "static_analysis"
	SignalSecurityScan     InfraSignal = "security_scan"
	SignalDependabotSnyk   InfraSignal = "dependency_scanning"
	SignalCodeCoverage     InfraSignal = "code_coverage"
	SignalMutationTesting  InfraSignal = "mutation_testing"
	SignalContractTesting  InfraSignal = "contract_testing"
	SignalPropertyTesting  InfraSignal = "property_testing"
	SignalFuzzTesting      InfraSignal = "fuzz_testing"
	SignalBenchmarking     InfraSignal = "benchmarking"
	SignalLoadTesting      InfraSignal = "load_testing"
	SignalChaosEngineering InfraSignal = "chaos_engineering"

	// API & Protocol Signals
	SignalOpenAPI           InfraSignal = "openapi"
	SignalSwagger           InfraSignal = "swagger"
	SignalAsyncAPI          InfraSignal = "asyncapi"
	SignalProtobuf          InfraSignal = "protobuf"
	SignalAvro              InfraSignal = "avro"
	SignalJSONSchema        InfraSignal = "json_schema"
	SignalGraphQLFederation InfraSignal = "graphql_federation"

	// Advanced Caching
	SignalMultiLevelCache   InfraSignal = "multi_level_cache"
	SignalCacheInvalidation InfraSignal = "cache_invalidation"
	SignalDistributedCache  InfraSignal = "distributed_cache"
	SignalMemcached         InfraSignal = "memcached"

	// Feature Flags & Experimentation
	SignalFeatureFlags  InfraSignal = "feature_flags"
	SignalABTesting     InfraSignal = "ab_testing"
	SignalCanaryDeploy  InfraSignal = "canary_deployment"
	SignalBlueGreen     InfraSignal = "blue_green_deployment"
	SignalRollingUpdate InfraSignal = "rolling_update"

	// Compliance & Governance
	SignalGDPRCompliance    InfraSignal = "gdpr_compliance"
	SignalSOC2Compliance    InfraSignal = "soc2_compliance"
	SignalDataAnonymization InfraSignal = "data_anonymization"
	SignalDataRetention     InfraSignal = "data_retention"
	SignalAccessControl     InfraSignal = "access_control"

	// Additional Infrastructure as Code
	SignalIaC InfraSignal = "infrastructure_as_code"

	// Additional AWS Services
	SignalS3  InfraSignal = "aws_s3"
	SignalSNS InfraSignal = "aws_sns"

	// Additional ML/AI Signals
	SignalScikitLearn InfraSignal = "scikit_learn"
	SignalPandas      InfraSignal = "pandas"
	SignalNumpy       InfraSignal = "numpy"
	SignalMLflow      InfraSignal = "mlflow"
	SignalKubeflow    InfraSignal = "kubeflow"
	SignalML          InfraSignal = "machine_learning"
	SignalLLM         InfraSignal = "llm"
	SignalVectorDB    InfraSignal = "vector_database"
	SignalJupyter     InfraSignal = "jupyter"

	// Additional Database Signals
	SignalInfluxDB InfraSignal = "influxdb"

	// Additional Security Signals
	SignalPasswordHashing        InfraSignal = "password_hashing"
	SignalInputSanitization      InfraSignal = "input_sanitization"
	SignalSQLInjectionPrevention InfraSignal = "sql_injection_prevention_impl"
	SignalGDPR                   InfraSignal = "gdpr"
	SignalPCIDSS                 InfraSignal = "pci_dss"

	// Additional Architecture Signals
	SignalHexagonalArchitecture InfraSignal = "hexagonal_arch"
	SignalGRPC                  InfraSignal = "grpc"
	SignalGraphQL               InfraSignal = "graphql"
	SignalWebSocket             InfraSignal = "websocket"
	SignalETL                   InfraSignal = "etl"
	SignalBatchProcessing       InfraSignal = "batch_processing"
	SignalErrorHandling         InfraSignal = "error_handling"
	SignalTimeout               InfraSignal = "timeout"
	SignalI18n                  InfraSignal = "i18n"
	SignalAsyncPatterns         InfraSignal = "async_patterns"
	SignalConcurrencyControl    InfraSignal = "concurrency_control"
	SignalPagination            InfraSignal = "pagination"
	SignalLazyLoading           InfraSignal = "lazy_loading"
	SignalConnectionPooling     InfraSignal = "connection_pooling"
	SignalCodeDocumentation     InfraSignal = "code_documentation"

	// Additional Testing Signals
	SignalSnapshotTesting  InfraSignal = "snapshot_testing"
	SignalVisualRegression InfraSignal = "visual_regression"
	SignalAPITesting       InfraSignal = "api_testing"
	SignalBDD              InfraSignal = "bdd"
	SignalTDD              InfraSignal = "tdd"

	// Additional Observability Signals
	SignalOpenTelemetry InfraSignal = "opentelemetry"
	SignalLoki          InfraSignal = "loki"
	SignalAlerting      InfraSignal = "alerting"
	SignalSLO           InfraSignal = "slo"

	// Additional Deployment Signals
	SignalCanaryDeployment    InfraSignal = "canary"
	SignalArgoCD              InfraSignal = "argocd"
	SignalFlux                InfraSignal = "flux"
	SignalPreviewEnvironments InfraSignal = "preview_environments"
	SignalDatabaseMigrations  InfraSignal = "database_migrations"
	SignalRollback            InfraSignal = "rollback"

	// Project Quality Signals
	SignalIncompleteProject InfraSignal = "incomplete_project"
	SignalMonorepo          InfraSignal = "monorepo"
	SignalFrontendOnly      InfraSignal = "frontend_only"
	SignalBackendOnly       InfraSignal = "backend_only"

	// Frontend & Frameworks (Verification Targets)
	SignalReact        InfraSignal = "react"
	SignalNextJS       InfraSignal = "nextjs"
	SignalNestJS       InfraSignal = "nestjs"
	SignalVue          InfraSignal = "vue"
	SignalAngular      InfraSignal = "angular"
	SignalSvelte       InfraSignal = "svelte"
	SignalRedux        InfraSignal = "redux"
	SignalZustand      InfraSignal = "zustand"
	SignalReactQuery   InfraSignal = "react_query"
	SignalTailwind     InfraSignal = "tailwind"
	SignalFramerMotion InfraSignal = "framer_motion"
	SignalMaterialUI   InfraSignal = "material_ui"
	SignalChakraUI     InfraSignal = "chakra_ui"
	SignalFirebase     InfraSignal = "firebase"
	SignalSupabase     InfraSignal = "supabase"
	SignalJest         InfraSignal = "jest"
	SignalCypress      InfraSignal = "cypress"
	SignalPlaywright   InfraSignal = "playwright"

	// Backend Frameworks (Granular)
	SignalExpress InfraSignal = "express"
	SignalGin     InfraSignal = "gin"
	SignalDjango  InfraSignal = "django"
	SignalFlask   InfraSignal = "flask"
	SignalFastAPI InfraSignal = "fastapi"

	// Languages (detected as signals)
	SignalGo         InfraSignal = "go"
	SignalNode       InfraSignal = "node"
	SignalPython     InfraSignal = "python"
	SignalTypeScript InfraSignal = "typescript"
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
