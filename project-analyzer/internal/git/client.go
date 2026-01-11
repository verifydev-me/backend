package git

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/rs/zerolog/log"
)

type GitClient struct {
	cloneDir    string
	githubToken string
}

func NewGitClient(cloneDir, githubToken string) *GitClient {
	// Ensure clone directory exists
	os.MkdirAll(cloneDir, 0755)
	return &GitClient{
		cloneDir:    cloneDir,
		githubToken: githubToken,
	}
}

// CloneRepo clones a repository and returns the path
func (g *GitClient) CloneRepo(repoURL, projectID, branch string) (string, error) {
	repoPath := filepath.Join(g.cloneDir, projectID)

	// Remove if exists (cleanup from failed previous attempt)
	os.RemoveAll(repoPath)

	log.Info().
		Str("url", repoURL).
		Str("path", repoPath).
		Str("branch", branch).
		Msg("Cloning repository (Optimized CLI)")

	// 1. Git Clone (Standard Depth=1)
	// We use full checkout (no sparse) to ensure we don't miss any files
	// regardless of folder naming (e.g. go-backend, node-backend)
	args := []string{"clone", "--depth=1", repoURL, repoPath}
	if branch != "" {
		args = append(args, "--branch", branch)
	}

	cmd := exec.Command("git", args...)
	// Handle Auth if token present
	if g.githubToken != "" {
		// Authorization header injection placeholder
	}

	if output, err := cmd.CombinedOutput(); err != nil {
		log.Error().Err(err).Str("output", string(output)).Msg("Git clone failed")
		return "", fmt.Errorf("git clone failed: %w", err)
	}

	// Previously used sparse-checkout here, but it caused issues with non-standard folder names.
	// Removed to prioritize accuracy over network optimization.

	log.Info().Str("path", repoPath).Msg("Repository cloned successfully (Full Depth=1)")
	return repoPath, nil
}

// DeleteRepo removes the cloned repository
func (g *GitClient) DeleteRepo(repoPath string) error {
	log.Debug().Str("path", repoPath).Msg("Deleting repository")
	return os.RemoveAll(repoPath)
}

// GetRepoSize returns the size of the repository in bytes
func (g *GitClient) GetRepoSize(repoPath string) (int64, error) {
	var size int64
	err := filepath.Walk(repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			size += info.Size()
		}
		return nil
	})
	return size, err
}
