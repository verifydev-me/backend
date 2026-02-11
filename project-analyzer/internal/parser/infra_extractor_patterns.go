package parser

import (
	"github.com/verifydev/project-analyzer/pkg/signals"
)

// ============================================
// CODE PATTERN & ADVANCED EXTRACTION
// ============================================

// extractCodePatternSignals scans code for architecture patterns
func (e *InfraExtractor) extractCodePatternSignals() {
	// Check for producer/consumer patterns
	// CRITICAL FIX: Previous patterns were too generic — "publish", "emit", "sendMessage",
	// "subscribe", "onMessage" are extremely common in frontend code (chat, events, JSX props).
	// Now require message-queue-specific context (channel, queue, exchange, broker, amqp, kafka, etc.)
	if e.findCodePattern(`channel\.(publish|sendToQueue|assertQueue)|producer\.send|kafka\.produce|amqp.*publish|rabbitmq.*publish|nats\.publish`) {
		e.signals.AddSignal(signals.SignalMessageProducer, 0.8, []string{"Message publishing code detected"}, "code")
	}
	if e.findCodePattern(`channel\.(consume|ack|nack)|consumer\.run|kafka\.consumer|amqp.*consume|rabbitmq.*consume|nats\.subscribe`) {
		e.signals.AddSignal(signals.SignalMessageConsumer, 0.8, []string{"Message consuming code detected"}, "code")
	}

	// Both producer and consumer = async communication
	if e.signals.HasSignal(signals.SignalMessageProducer) && e.signals.HasSignal(signals.SignalMessageConsumer) {
		e.signals.AddSignal(signals.SignalAsyncCommunication, 0.85, []string{"Producer/Consumer pattern detected"}, "inference")
	}

	// Event sourcing patterns
	// CRITICAL FIX: "aggregate" alone is too generic — matches aggregatedDimensions, aggregateRating, etc.
	// Now requires actual event sourcing terms (AggregateRoot, EventStore, DomainEvent, ApplyEvent)
	if e.findCodePattern(`EventStore|EventSourcing|AggregateRoot|DomainEvent|ApplyEvent|EventBus\.publish`) {
		e.signals.AddSignal(signals.SignalEventSourcing, 0.8, []string{"Event sourcing pattern detected"}, "code")
	}

	// CQRS patterns
	if e.findCodePattern(`CommandHandler|QueryHandler|CQRS|Command.*Query`) {
		e.signals.AddSignal(signals.SignalCQRS, 0.8, []string{"CQRS pattern detected"}, "code")
	}

	// Circuit breaker
	// CRITICAL FIX: "fallback" and "retry" are extremely common in frontend code
	// (ErrorBoundary fallback, axios retry config, REST fallback, etc.)
	// Now requires actual circuit breaker library/pattern names
	if e.findCodePattern(`circuitBreaker|CircuitBreaker|circuit_breaker|opossum|cockatiel|Polly\.CircuitBreaker|gobreaker`) {
		e.signals.AddSignal(signals.SignalCircuitBreaker, 0.75, []string{"Circuit breaker pattern detected"}, "code")
	}

	// Rate limiting
	if e.findCodePattern(`rateLimiter|RateLimit|throttle|Throttle`) {
		e.signals.AddSignal(signals.SignalRateLimiting, 0.8, []string{"Rate limiting code detected"}, "code")
	}

	// Graceful shutdown
	if e.findCodePattern(`gracefulShutdown|SIGTERM|SIGINT|shutdown.*graceful`) {
		e.signals.AddSignal(signals.SignalGracefulShutdown, 0.8, []string{"Graceful shutdown handling detected"}, "code")
	}

	// Health endpoints
	if e.findCodePattern(`/health|/healthz|/ready|/live|healthCheck`) {
		e.signals.AddSignal(signals.SignalHealthEndpoints, 0.85, []string{"Health check endpoints detected"}, "code")
	}

	// API versioning — only count if this is a backend project defining routes
	// Frontend projects naturally have /v1/ in their API client URLs — that's not "API versioning"
	if e.projectType != "frontend" {
		if e.findCodePattern(`/v1/|/v2/|/api/v\d`) {
			e.signals.AddSignal(signals.SignalAPIVersioning, 0.85, []string{"API versioning detected"}, "code")
		}
	}

	// ===========================================
	// EXTREME LEVEL PATTERN DETECTION
	// ===========================================

	// Advanced Architecture Patterns
	if e.findCodePattern(`Repository\s*{|Repository\s*interface|IRepository|BaseRepository`) {
		e.signals.AddSignal(signals.SignalRepositoryPattern, 0.85, []string{"Repository pattern implementation detected"}, "code")
	}

	if e.findCodePattern(`Factory\s*{|Factory\s*method|AbstractFactory`) {
		e.signals.AddSignal(signals.SignalFactoryPattern, 0.8, []string{"Factory pattern implementation detected"}, "code")
	}

	// Singleton: Require explicit Singleton naming (getInstance is too generic)
	if e.findCodePattern(`Singleton\s*(struct|class|{)|singleton\s*=\s*sync\.Once`) {
		e.signals.AddSignal(signals.SignalSingletonPattern, 0.75, []string{"Singleton pattern implementation detected"}, "code")
	}

	if e.findCodePattern(`Observer\s*{|Subject\s*{|notifyObservers`) {
		e.signals.AddSignal(signals.SignalObserverPattern, 0.8, []string{"Observer pattern implementation detected"}, "code")
	}

	if e.findCodePattern(`Strategy\s*{|Strategy\s*interface|setStrategy`) {
		e.signals.AddSignal(signals.SignalStrategyPattern, 0.8, []string{"Strategy pattern implementation detected"}, "code")
	}

	// CRITICAL FIX: "Wrapper {" matches JSX <Wrapper> components in React code
	// Now requires class/struct/implements patterns, not just the word
	if e.findCodePattern(`class\s+\w*Decorator|Decorator\s*(struct|class|interface)|implements\s+Decorator`) {
		e.signals.AddSignal(signals.SignalDecoratorPattern, 0.8, []string{"Decorator pattern implementation detected"}, "code")
	}

	// CRITICAL FIX: "Adapter {" and "Wrapper {" too generic for frontend
	if e.findCodePattern(`class\s+\w*Adapter|Adapter\s*(struct|class|interface)|implements\s+Adapter|AdapterPattern`) {
		e.signals.AddSignal(signals.SignalAdapterPattern, 0.8, []string{"Adapter pattern implementation detected"}, "code")
	}

	if e.findCodePattern(`Facade\s*{`) {
		e.signals.AddSignal(signals.SignalFacadePattern, 0.8, []string{"Facade pattern implementation detected"}, "code")
	}

	// Builder: Require Builder class/struct with build() method (not generic 'return this')
	if e.findCodePattern(`Builder\s*(struct|class|{)`) && e.findCodePattern(`\.Build\(\)|Build\(\)\s*\w+`) {
		e.signals.AddSignal(signals.SignalBuilderPattern, 0.85, []string{"Builder pattern with Build() method detected"}, "code")
	}

	if e.findCodePattern(`DependencyInjection|DI\s+|Container\s*interface|Inject\(|@Inject`) {
		e.signals.AddSignal(signals.SignalDependencyInjection, 0.85, []string{"Dependency Injection pattern detected"}, "code")
	}

	if e.findCodePattern(`CleanArchitecture|UseCase|Interactor|Entity\s*{`) {
		e.signals.AddSignal(signals.SignalCleanArchitecture, 0.85, []string{"Clean Architecture pattern detected"}, "code")
	}

	// CRITICAL FIX: "Adapter struct" too generic — matches React/Go adapter components
	// Now requires explicit hexagonal architecture naming
	if e.findCodePattern(`HexagonalArchitecture|hexagonal.*architecture|ports.*adapters|Port\s*interface.*Adapter`) {
		e.signals.AddSignal(signals.SignalHexagonalArch, 0.85, []string{"Hexagonal Architecture pattern detected"}, "code")
	}

	if e.findCodePattern(`DomainDrivenDesign|DDD|AggregateRoot|ValueObject`) {
		e.signals.AddSignal(signals.SignalDDDPattern, 0.85, []string{"DDD pattern detected"}, "code")
	}

	if e.findCodePattern(`SOLID|SingleResponsibility|OpenClosed|Liskov|InterfaceSegregation|DependencyInversion`) {
		e.signals.AddSignal(signals.SignalSOLID, 0.85, []string{"SOLID principles keywords detected"}, "code")
	}

	// Security Patterns
	if e.findCodePattern(`inputValidation|Sanitize|ValidateBasic`) {
		e.signals.AddSignal(signals.SignalInputValidation, 0.85, []string{"Input validation implementation detected"}, "code")
	}

	if e.findCodePattern(`CSRF|CsrfToken|xsrf`) {
		e.signals.AddSignal(signals.SignalCSRF, 0.85, []string{"CSRF protection detected"}, "code")
	}

	if e.findCodePattern(`CORS|CorsConfig|Access-Control-Allow-Origin`) {
		e.signals.AddSignal(signals.SignalCORS, 0.85, []string{"CORS configuration detected"}, "code")
	}

	if e.findCodePattern(`Helmet|helmet\(\)`) {
		e.signals.AddSignal(signals.SignalHelmet, 0.9, []string{"Helmet security middleware detected"}, "code")
	}

	if e.findCodePattern(`OWASP|owasp`) {
		e.signals.AddSignal(signals.SignalOWASP, 0.8, []string{"OWASP security references detected"}, "code")
	}

	if e.findCodePattern(`Content-Security-Policy|X-Frame-Options|X-XSS-Protection`) {
		e.signals.AddSignal(signals.SignalSecurityHeaders, 0.9, []string{"Security headers implementation detected"}, "code")
	}

	// CRITICAL FIX: "$1" and "?" match literally every template string and ternary in JS/TS
	// Now requires actual SQL prepared statement patterns
	if e.findCodePattern(`PrepareStatement|PreparedStatement|sql\.Named|db\.Prepare|stmt\.Exec|parameterized.*query`) {
		e.signals.AddSignal(signals.SignalSQLInjection, 0.85, []string{"Prepared statements (SQLi prevention) detected"}, "code")
	}

	if e.findCodePattern(`EscapeString|SanitizeHTML|DOMPurify`) {
		e.signals.AddSignal(signals.SignalXSSPrevention, 0.85, []string{"XSS prevention implementation detected"}, "code")
	}

	// Require specific crypto algorithm or library usage, not just generic words
	if e.findCodePattern(`crypto\.createCipher|AES-256|RSA\.encrypt|cipher\.Block|crypto/aes|crypto/rsa|SubtleCrypto`) {
		e.signals.AddSignal(signals.SignalEncryption, 0.85, []string{"Encryption implementation detected"}, "code")
	}

	// CRITICAL FIX: "Hash" alone matches window.location.hash, URL hash routing, hash maps, etc.
	// Now requires actual password hashing / crypto hashing library usage
	if e.findCodePattern(`bcrypt|Bcrypt|Argon2|PBKDF2|Scrypt|crypto\.createHash|sha256|sha512|hashPassword`) {
		e.signals.AddSignal(signals.SignalHashing, 0.9, []string{"Hashing implementation detected"}, "code")
	}

	if e.findCodePattern(`RotateSecret|SecretRotation`) {
		e.signals.AddSignal(signals.SignalSecretRotation, 0.85, []string{"Secret rotation implementation detected"}, "code")
	}

	if e.findCodePattern(`MFA|TwoFactor|TOTP|Authenticator`) {
		e.signals.AddSignal(signals.SignalMFA, 0.9, []string{"MFA implementation detected"}, "code")
	}

	if e.findCodePattern(`AuditLog|AuditTrail|LogAction`) {
		e.signals.AddSignal(signals.SignalAuditLogging, 0.85, []string{"Audit logging implementation detected"}, "code")
	}

	if e.findCodePattern(`PenetrationTest|Pentest|Zap|Burp`) {
		e.signals.AddSignal(signals.SignalPenetrationTest, 0.8, []string{"Penetration testing references detected"}, "code")
	}
}

// extractCloudNativeSignals detects cloud-native patterns
func (e *InfraExtractor) extractCloudNativeSignals() {
	// CRITICAL FIX: "function.*handler" matches EVERY React event handler (onClick handler, etc.)
	// "lambda" can match variable names. "s3" matches CSS selectors.
	// Now requires actual serverless framework/SDK patterns
	if e.findCodePattern(`serverless\.yml|serverless\.ts|@aws-cdk|aws-lambda|exports\.handler\s*=|module\.exports\.handler|APIGatewayEvent|APIGatewayProxy`) {
		e.signals.AddSignal(signals.SignalServerless, 0.85, []string{"Serverless/Lambda code detected"}, "code")
	}

	// CRITICAL FIX: "s3" alone matches CSS class selectors, IDs, variable names.
	// Now requires actual AWS SDK import/usage patterns
	if e.findCodePattern(`aws-sdk|@aws-sdk|AWS\.SQS|AWS\.SNS|AWS\.DynamoDB|AWS\.S3|new\s+S3Client|new\s+SQSClient|new\s+DynamoDBClient`) {
		e.signals.AddSignal(signals.SignalAWS, 0.85, []string{"AWS services code detected"}, "code")
	}
}

// extractMLSignals detects machine learning patterns
func (e *InfraExtractor) extractMLSignals() {
	// Core ML frameworks - high confidence
	if e.findCodePattern(`tensorflow|keras|torch|pytorch|sklearn|scikit-learn`) {
		e.signals.AddSignal(signals.SignalML, 0.9, []string{"Machine learning libraries detected"}, "code")
	}

	// Data science libraries
	if e.findCodePattern(`pandas|numpy|dataframe`) {
		e.signals.AddSignal(signals.SignalPandas, 0.9, []string{"Data science libraries detected"}, "code")
	}

	// ML pipeline: Only trigger if ML library is also detected (avoid false positives)
	// Words like "Model", "Train", "Predict" are too generic on their own
	if e.signals.HasSignal(signals.SignalML) || e.signals.HasSignal(signals.SignalPandas) {
		if e.findCodePattern(`model\.fit|model\.predict|train_test_split|Pipeline\(|fit_transform`) {
			e.signals.AddSignal(signals.SignalMLPipeline, 0.85, []string{"ML pipeline operations detected"}, "code")
		}
	}

	// Additional ML signals - require specific imports
	if e.findCodePattern(`transformers|huggingface|langchain|llama_index|openai`) {
		e.signals.AddSignal(signals.SignalLLM, 0.9, []string{"LLM/AI framework detected"}, "code")
	}
}

// extractSearchSignals detects search/analytics
func (e *InfraExtractor) extractSearchSignals() {
	if e.findCodePattern(`elasticsearch|opensearch|algolia|meilisearch`) {
		e.signals.AddSignal(signals.SignalElasticsearch, 0.85, []string{"Search engine integration detected"}, "code")
	}

	if e.findCodePattern(`clickhouse|timescaledb|influxdb`) {
		e.signals.AddSignal(signals.SignalClickHouse, 0.85, []string{"Analytics database integration detected"}, "code")
	}
}

// extractTestingSignals detects advanced testing
func (e *InfraExtractor) extractTestingSignals() {
	if e.findCodePattern(`LoadTest|k6|locust|artillery`) {
		e.signals.AddSignal(signals.SignalLoadTesting, 0.9, []string{"Load testing code detected"}, "code")
	}

	// CRITICAL FIX: "bench" alone too generic. Require Go Benchmark functions or actual benchmark tools
	if e.findCodePattern(`func\s+Benchmark|b\.Run\(|b\.ResetTimer|benchmark\.js|vitest\.bench`) {
		e.signals.AddSignal(signals.SignalBenchmarking, 0.9, []string{"Benchmarking code detected"}, "code")
	}

	// CRITICAL FIX: "fuzz" alone too generic. Require Go Fuzz functions or actual fuzzing tools
	if e.findCodePattern(`func\s+Fuzz|f\.Fuzz\(|go-fuzz|jazzer|atheris`) {
		e.signals.AddSignal(signals.SignalFuzzTesting, 0.9, []string{"Fuzz testing code detected"}, "code")
	}

	// CRITICAL FIX: "Property" alone matches style.setProperty(), JSON-LD PropertyValue, etc.
	// Now requires actual property-based testing library names
	if e.findCodePattern(`QuickCheck|fast-check|fc\.property|rapid\.Check|gopter|hypothesis\.given|@given`) {
		e.signals.AddSignal(signals.SignalPropertyTesting, 0.85, []string{"Property-based testing detected"}, "code")
	}
}

// extractObservabilitySignals detects observability patterns
func (e *InfraExtractor) extractObservabilitySignals() {
	// Custom metrics
	// CRITICAL FIX: "Counter(" matches useAnimatedCounter(), AnimatedCounter, etc. in frontend code
	// Now requires actual Prometheus/metrics library patterns
	if e.findCodePattern(`prometheus\.NewCounter|prometheus\.NewHistogram|prometheus\.NewGauge|promauto\.|metrics\.New|prom\.Counter|statsd\.`) {
		e.signals.AddSignal(signals.SignalMetricsCollection, 0.85, []string{"Custom metrics collection detected"}, "code")
	}

	// Alerting
	if e.findCodePattern(`alertmanager|PagerDuty|opsgenie|alert.*rule`) {
		e.signals.AddSignal(signals.SignalAlerting, 0.85, []string{"Alerting configuration detected"}, "code")
	}

	// SLO/SLI
	if e.findCodePattern(`SLO|SLI|error.*budget|availability.*target`) {
		e.signals.AddSignal(signals.SignalSLO, 0.85, []string{"SLO/SLI implementation detected"}, "code")
	}
}
