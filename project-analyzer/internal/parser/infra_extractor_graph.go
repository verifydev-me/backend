package parser

import (
	"github.com/verifydev/project-analyzer/pkg/signals"
)

// ============================================
// ARCHITECTURE GRAPH GENERATION
// ============================================

// GenerateArchitectureGraph builds a visual representation of the system
func (e *InfraExtractor) GenerateArchitectureGraph() *signals.ArchitectureGraph {
	graph := &signals.ArchitectureGraph{
		Nodes: []signals.GraphNode{},
		Edges: []signals.GraphEdge{},
	}

	// Track existing nodes to avoid duplicates
	nodeMap := make(map[string]bool)

	addNode := func(id, label, typeStr, tech string) {
		if !nodeMap[id] {
			graph.Nodes = append(graph.Nodes, signals.GraphNode{
				ID:         id,
				Label:      label,
				Type:       typeStr,
				Technology: tech,
			})
			nodeMap[id] = true
		}
	}

	addEdge := func(source, target string) {
		// Only add if both exist
		if nodeMap[source] && nodeMap[target] {
			graph.Edges = append(graph.Edges, signals.GraphEdge{
				Source: source,
				Target: target,
				Type:   "connection",
			})
		}
	}

	// 1. Add Services (Source Nodes)
	for _, name := range e.signals.ServiceNames {
		// Determine tech for service based on signals found in that path
		// We approximate this by checking global signals, or defaulting to "Service"
		tech := "service"

		// Heuristic: Check if we found language specific signals
		if e.signals.HasSignal(signals.SignalGo) {
			tech = "go"
		}
		if e.signals.HasSignal(signals.SignalNode) {
			tech = "node"
		}
		if e.signals.HasSignal(signals.SignalPython) {
			tech = "python"
		}

		addNode(name, name, "service", tech)
	}

	// If no named services found (Monolith), create one "Main App" node
	if len(e.signals.ServiceNames) == 0 {
		addNode("main", "Main App", "service", "monolith")
	}

	// 2. Add Infrastructure Resources (Target Nodes)

	// Databases
	if e.signals.HasSignal(signals.SignalPostgres) {
		addNode("postgres", "PostgreSQL", "database", "postgres")
	}
	if e.signals.HasSignal(signals.SignalMySQL) {
		addNode("mysql", "MySQL", "database", "mysql")
	}
	if e.signals.HasSignal(signals.SignalMongoDB) {
		addNode("mongodb", "MongoDB", "database", "mongodb")
	}
	if e.signals.HasSignal(signals.SignalRedis) {
		addNode("redis", "Redis", "database", "redis")
	}

	// Queues
	if e.signals.HasSignal(signals.SignalRabbitMQ) {
		addNode("rabbitmq", "RabbitMQ", "queue", "rabbitmq")
	}
	if e.signals.HasSignal(signals.SignalKafka) {
		addNode("kafka", "Kafka", "queue", "kafka")
	}

	// Gateways
	if e.signals.HasSignal(signals.SignalNginx) {
		addNode("nginx", "Nginx Gateway", "gateway", "nginx")
	}

	// Frontend
	if e.signals.HasSignal(signals.SignalReact) || e.signals.HasSignal(signals.SignalNextJS) {
		addNode("frontend", "Frontend", "frontend", "react")
	}

	// 3. Create Implicit Edges
	// In a static analysis without full parsing, we assume:
	// Services -> Databases/Queues (if present)
	// Frontend -> Gateway -> Services (if present)

	services := e.signals.ServiceNames
	if len(services) == 0 {
		services = []string{"main"}
	}

	for _, svc := range services {
		// Link Service -> Database
		if nodeMap["postgres"] {
			addEdge(svc, "postgres")
		}
		if nodeMap["mysql"] {
			addEdge(svc, "mysql")
		}
		if nodeMap["mongodb"] {
			addEdge(svc, "mongodb")
		}
		if nodeMap["redis"] {
			addEdge(svc, "redis")
		}

		// Link Service -> Queue
		if nodeMap["rabbitmq"] {
			addEdge(svc, "rabbitmq")
		}
		if nodeMap["kafka"] {
			addEdge(svc, "kafka")
		}
	}

	// Link Frontend -> Services (or Gateway)
	if nodeMap["frontend"] {
		if nodeMap["nginx"] {
			addEdge("frontend", "nginx")
			// Link Gateway -> Services
			for _, svc := range services {
				addEdge("nginx", svc)
			}
		} else {
			// Direct link
			for _, svc := range services {
				addEdge("frontend", svc)
			}
		}
	}

	return graph
}
