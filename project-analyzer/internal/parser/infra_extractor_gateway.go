package parser

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/verifydev/project-analyzer/pkg/signals"
)

// scanGateway performs deep analysis of a gateway folder
func (e *InfraExtractor) scanGateway(gatewayPath string) {
	// 1. Detect Gateway Type
	if fileExists(filepath.Join(gatewayPath, "nginx.conf")) {
		e.analyzeNginxGateway(gatewayPath)
	} else if fileExists(filepath.Join(gatewayPath, "traefik.yaml")) || fileExists(filepath.Join(gatewayPath, "traefik.yml")) {
		e.signals.AddSignal(signals.SignalTraefik, 1.0, []string{"Found traefik configuration"}, "gateway_scan")
	} else if fileExists(filepath.Join(gatewayPath, "envoy.yaml")) {
		e.signals.AddSignal(signals.SignalEnvoy, 1.0, []string{"Found envoy configuration"}, "gateway_scan")
	}

	// 2. Detect API Management
	if fileExists(filepath.Join(gatewayPath, "kong.yaml")) {
		e.signals.AddSignal(signals.SignalKong, 1.0, []string{"Found kong configuration"}, "gateway_scan")
	}
}

// analyzeNginxGateway parses nginx config for signals
func (e *InfraExtractor) analyzeNginxGateway(gatewayPath string) {
	e.signals.AddSignal(signals.SignalNginx, 1.0, []string{"gateway/nginx.conf found"}, "gateway_scan")
	e.signals.AddSignal(signals.SignalAPIGatewayPattern, 1.0, []string{"Nginx used as Gateway"}, "gateway_structure")

	// Read main config
	configPath := filepath.Join(gatewayPath, "nginx.conf")
	content, err := os.ReadFile(configPath)
	if err == nil {
		e.extractNginxSignals(string(content), "nginx.conf")
	}

	// Read included configs in conf.d
	confD := filepath.Join(gatewayPath, "conf.d")
	if fileExists(confD) {
		entries, _ := os.ReadDir(confD)
		for _, entry := range entries {
			if strings.HasSuffix(entry.Name(), ".conf") {
				subConfig, err := os.ReadFile(filepath.Join(confD, entry.Name()))
				if err == nil {
					e.extractNginxSignals(string(subConfig), "conf.d/"+entry.Name())
				}
			}
		}
	}
}

// extractNginxSignals looks for patterns in nginx config
func (e *InfraExtractor) extractNginxSignals(content, filename string) {
	// 1. Upstreams (Service Discovery/Load Balancing)
	upstreamRegex := regexp.MustCompile(`upstream\s+(\w+)\s*{`)
	upstreams := upstreamRegex.FindAllStringSubmatch(content, -1)
	for _, match := range upstreams {
		if len(match) > 1 {
			e.signals.AddSignal(signals.SignalLoadBalancing, 0.9, []string{fmt.Sprintf("Upstream defined: %s in %s", match[1], filename)}, "nginx_config")

			// Detect service names from upstreams
			e.signals.ServiceNames = append(e.signals.ServiceNames, match[1])
		}
	}

	// 2. Security Headers
	if strings.Contains(content, "add_header X-Frame-Options") || strings.Contains(content, "add_header X-XSS-Protection") {
		e.signals.AddSignal(signals.SignalSecurityHeaders, 0.9, []string{"Security headers found in " + filename}, "nginx_config")
	}

	// 3. SSL/TLS
	if strings.Contains(content, "ssl_certificate") {
		e.signals.AddSignal(signals.SignalSSL, 1.0, []string{"SSL configuration found in " + filename}, "nginx_config")
	}

	// 4. Rate Limiting
	if strings.Contains(content, "limit_req_zone") || strings.Contains(content, "limit_req") {
		e.signals.AddSignal(signals.SignalRateLimiting, 0.95, []string{"Rate limiting config in " + filename}, "nginx_config")
	}

	// 5. Proxy Pass (Service Routing)
	proxyRegex := regexp.MustCompile(`proxy_pass\s+(http?://[\w-]+)`)
	proxies := proxyRegex.FindAllStringSubmatch(content, -1)
	for _, match := range proxies {
		if len(match) > 1 {
			evidence := fmt.Sprintf("Route to %s found in %s", match[1], filename)
			e.signals.AddSignal(signals.SignalAPIGatewayPattern, 0.8, []string{evidence}, "nginx_routes")
		}
	}

	// 6. WebSocket support
	if strings.Contains(content, "Upgrade $http_upgrade") && strings.Contains(content, "Connection \"upgrade\"") {
		e.signals.AddSignal(signals.SignalWebSocket, 0.9, []string{"WebSocket upgrade support in " + filename}, "nginx_config")
	}
}
