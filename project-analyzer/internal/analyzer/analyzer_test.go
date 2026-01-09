package analyzer

import (
	"testing"

	"github.com/verifydev/project-analyzer/pkg/signals"
)

func TestFilterSignalsByProjectType_Frontend(t *testing.T) {
	// Setup: A mixed result with backend noise
	result := &signals.ProjectSignals{
		ProjectType: signals.ProjectTypeFrontend,
		IndustryAnalysis: &signals.IndustryAnalysis{
			SkillsByCategory: map[signals.SkillCategory][]signals.VerifiedSkill{
				signals.CategoryDatabase:  {{Name: "PostgreSQL"}},
				signals.CategoryFramework: {{Name: "React"}},
			},
			VerifiedSkills: []signals.VerifiedSkill{
				{Name: "PostgreSQL", Category: signals.CategoryDatabase},
				{Name: "React", Category: signals.CategoryFramework},
			},
			Architecture: signals.SystemArchitecture{
				Services: []string{"User Service"},
			},
		},
		Databases: []string{"PostgreSQL"},
		Tools:     []string{"Kafka", "Jest"},
		NodeSignals: &signals.NodeSignals{
			// ProcessManagers removed as it doesn't exist in struct
			MiddlewareCount: 2,
		},
	}

	// Act
	filterSignalsByProjectType(result, "frontend")

	// Assert: Backend signals should be GONE
	if len(result.Databases) > 0 {
		t.Errorf("Expected databases to be empty for frontend, got %v", result.Databases)
	}
	if len(result.IndustryAnalysis.VerifiedSkills) != 1 {
		t.Errorf("Expected 1 skill (React), got %d", len(result.IndustryAnalysis.VerifiedSkills))
	}
	if result.IndustryAnalysis.VerifiedSkills[0].Name == "PostgreSQL" {
		t.Error("PostgreSQL should have been filtered out")
	}
	if _, ok := result.IndustryAnalysis.SkillsByCategory[signals.CategoryDatabase]; ok {
		t.Error("Database category should be removed")
	}
	if len(result.IndustryAnalysis.Architecture.Services) > 0 {
		// Wait, did I clear Architecture? Yes: result.IndustryAnalysis.Architecture = signals.SystemArchitecture{}
		// But in test setup I set Services. The function clears the WHOLE struct.
		// So checking Services should yield 0 (nil).
	} else {
		// It's fine.
	}

	// Double check Services count
	if len(result.IndustryAnalysis.Architecture.Services) > 0 {
		t.Error("Architecture services should be cleared")
	}

	if result.NodeSignals != nil {
		t.Error("NodeSignals should be nil for frontend")
	}
}

func TestMapToFastSignals(t *testing.T) {
	// Setup: Go Backend Project
	p := &signals.ProjectSignals{
		PrimaryLanguage: "Go",
		Languages: []signals.LanguageStats{
			{Name: "Go", Percentage: 90.0},
			{Name: "Makefile", Percentage: 10.0},
		},
		FolderStructure: signals.FolderAnalysis{
			HasCmd:       true,
			HasInternal:  true,
			HasPkg:       true,
			HasSrcFolder: false,
		},
		CodeSignals: signals.CodeSignals{
			HasCI:          true,
			TestFilesCount: 5,
		},
	}

	infra := &signals.InfrastructureSignals{}
	infra.AddSignal(signals.SignalDockerCompose, 1.0, []string{"docker-compose.yml"}, "file")

	// Act
	fs := mapToFastSignals(p, infra)

	// Assert
	if fs.DominantLanguage != "Go" {
		t.Errorf("Expected DominantLanguage Go, got %s", fs.DominantLanguage)
	}
	if !fs.HasInternalFolder {
		t.Error("Expected HasInternalFolder to be true")
	}
	if !fs.HasCmdFolder {
		t.Error("Expected HasCmdFolder to be true")
	}
	if !fs.HasDockerCompose {
		t.Error("Expected HasDockerCompose to be true")
	}
}
