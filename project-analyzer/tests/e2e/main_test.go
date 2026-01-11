package e2e

import (
	"path/filepath"
	"runtime"
	"testing"

	"github.com/verifydev/project-analyzer/internal/parser"
	"github.com/verifydev/project-analyzer/pkg/signals"
)

func getFixturePath(fixtureName string) string {
	_, filename, _, _ := runtime.Caller(0)
	return filepath.Join(filepath.Dir(filepath.Dir(filename)), "fixtures", fixtureName)
}

func TestGhostReact(t *testing.T) {
	path := getFixturePath("ghost-react")

	infraExtractor := parser.NewInfraExtractor(path, "")
	infraSignals := infraExtractor.Extract()
	t.Logf("Signals: %v", infraSignals.Signals)

	found := false
	for _, sig := range infraSignals.Signals {
		if sig == signals.SignalReact {
			found = true
			break
		}
	}
	if !found {
		t.Error("BLIND SPOT: React not detected from .jsx files alone")
	} else {
		t.Log("✅ React detected from .jsx files")
	}
}

func TestGhostBackends(t *testing.T) {
	// Laravel
	pathLaravel := getFixturePath("ghost-laravel")
	extractorLaravel := parser.NewInfraExtractor(pathLaravel, "")
	signalsLaravel := extractorLaravel.Extract()
	foundLaravel := false
	for _, sig := range signalsLaravel.Signals {
		if sig == signals.SignalLaravel {
			foundLaravel = true
			break
		}
	}
	if !foundLaravel {
		t.Error("BLIND SPOT: Laravel not detected from artisan file")
	} else {
		t.Log("✅ Laravel detected from artisan file")
	}

	// Rails
	pathRails := getFixturePath("ghost-rails")
	extractorRails := parser.NewInfraExtractor(pathRails, "")
	signalsRails := extractorRails.Extract()
	foundRails := false
	for _, sig := range signalsRails.Signals {
		if sig == signals.SignalRails {
			foundRails = true
			break
		}
	}
	if !foundRails {
		t.Error("BLIND SPOT: Rails not detected from config.ru")
	} else {
		t.Log("✅ Rails detected from config.ru")
	}
}
