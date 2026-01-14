package signals

// ============================================
// SIGNAL ALIASES FOR DIMENSION EXTRACTOR
// Maps readable names to actual signal constants
// ============================================

// Project Structure Signals
const (
	HasREADME         = SignalCodeDocumentation
	HasGitignore      = InfraSignal("gitignore")
	HasEditorConfig   = InfraSignal("editorconfig")
	HasLinterConfig   = InfraSignal("linter_config")
	HasPrettierConfig = InfraSignal("prettier_config")
	HasEslintConfig   = InfraSignal("eslint_config")
)

// Type Safety Signals
const (
	HasTypeScript      = SignalTypeScript
	UsesStrictTyping   = InfraSignal("strict_typing")
	HasTypeAnnotations = InfraSignal("type_annotations")
	HasTypeDefinitions = InfraSignal("type_definitions")
)

// Error Handling Signals
const (
	HasErrorHandling    = SignalErrorHandling
	HasTryCatchPatterns = InfraSignal("try_catch_patterns")
	HasCustomErrors     = InfraSignal("custom_errors")
)

// Environment Signals
const (
	HasEnvExample       = InfraSignal("env_example")
	HasDotEnvFiles      = InfraSignal("dotenv_files")
	HasHardcodedSecrets = InfraSignal("hardcoded_secrets")
)

// Design Pattern Signals
const (
	UsesDependencyInjection = SignalDependencyInjection
	UsesFactoryPattern      = SignalFactoryPattern
	UsesRepositoryPattern   = SignalRepositoryPattern
	UsesDecoratorPattern    = SignalDecoratorPattern
	UsesObserverPattern     = SignalObserverPattern
)

// Async & Concurrency Signals
const (
	HasAsyncPatterns       = SignalAsyncPatterns
	HasConcurrencyPatterns = SignalConcurrencyControl
	HasQueues              = SignalWorkerQueues
	HasMessageQueues       = InfraSignal("message_queues")
)

// Validation Signals
const (
	HasValidation       = SignalInputValidation
	HasSchemaValidation = InfraSignal("schema_validation")
	HasSanitization     = SignalInputSanitization
)

// Caching Signals
const (
	HasCaching     = SignalCaching
	HasRedis       = SignalRedis
	HasMemoization = InfraSignal("memoization")
)

// API Documentation Signals
const (
	HasOpenAPI = SignalOpenAPI
	HasSwagger = SignalSwagger
	HasGraphQL = SignalGraphQL
)

// CI/CD Signals
const (
	HasGithubActions = SignalGitHubActions
	HasGitlabCI      = SignalGitLabCI
	HasJenkinsfile   = SignalJenkins
	HasCircleCI      = SignalCircleCI
	HasMultiStageCI  = InfraSignal("multi_stage_ci")
)

// Container Signals
const (
	HasDockerfile       = SignalDocker
	HasDockerCompose    = SignalDockerCompose
	HasMultiStageDocker = InfraSignal("multi_stage_docker")
)

// Logging & Monitoring Signals
const (
	HasLogging           = InfraSignal("logging")
	HasStructuredLogging = SignalStructuredLogging
	HasPrometheus        = SignalPrometheus
	HasMetrics           = SignalMetricsCollection
)

// Health & Readiness Signals
const (
	HasHealthEndpoint = SignalHealthEndpoints
	HasReadinessProbe = InfraSignal("readiness_probe")
)

// Configuration Signals
const (
	HasConfigFiles       = SignalConfigManagement
	HasSecretsManagement = SignalSecretManagement
)

// Testing Signals
const (
	HasUnitTests        = SignalUnitTests
	HasIntegrationTests = SignalIntegrationTests
	HasE2ETests         = SignalE2ETests
	HasAPITests         = SignalAPITesting
	HasPlaywright       = SignalPlaywright
	HasCypress          = SignalCypress
	HasMocking          = SignalMocking
	HasFixtures         = InfraSignal("test_fixtures")
	HasTestFactories    = InfraSignal("test_factories")
	HasJest             = SignalJest
	HasVitest           = InfraSignal("vitest")
	HasPytest           = InfraSignal("pytest")
	HasTestConfig       = InfraSignal("test_config")
)

// Architecture Signals
const (
	HasCleanArchitecture    = SignalCleanArchitecture
	HasLayeredArchitecture  = InfraSignal("layered_architecture")
	HasModularStructure     = InfraSignal("modular_structure")
	HasMigrations           = SignalDatabaseMigrations
	HasORM                  = InfraSignal("orm")
	HasDatabaseIndexing     = InfraSignal("database_indexing")
	HasRestfulAPI           = InfraSignal("restful_api")
	HasAPIVersioning        = SignalAPIVersioning
	HasMiddleware           = InfraSignal("middleware")
	HasServicesLayer        = InfraSignal("services_layer")
	HasControllersLayer     = InfraSignal("controllers_layer")
	HasServiceCommunication = InfraSignal("service_communication")
)

// Infrastructure Signals
const (
	HasKubernetes    = SignalKubernetes
	HasHelm          = SignalHelm
	HasTerraform     = SignalTerraform
	HasAWS           = SignalAWS
	HasGCP           = SignalGCP
	HasAzure         = SignalAzure
	HasNginx         = SignalNginx
	HasTraefik       = SignalTraefik
	HasCaddy         = InfraSignal("caddy")
	HasLoadBalancing = SignalLoadBalancing
	HasPostgres      = SignalPostgres
	HasMySQL         = SignalMySQL
	HasMongoDB       = SignalMongoDB
	HasCassandra     = SignalCassandra
	HasRabbitMQ      = SignalRabbitMQ
	HasKafka         = SignalKafka
	HasBullMQ        = InfraSignal("bullmq")
	HasSidekiq       = InfraSignal("sidekiq")
)

// Framework Signals
const (
	HasReact      = SignalReact
	HasVue        = SignalVue
	HasAngular    = SignalAngular
	HasNextJS     = SignalNextJS
	HasSvelte     = SignalSvelte
	HasExpress    = SignalExpress
	HasDjango     = SignalDjango
	HasFastAPI    = SignalFastAPI
	HasGin        = SignalGin
	HasSpringBoot = SignalSpring
)
