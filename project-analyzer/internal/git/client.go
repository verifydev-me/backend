package git

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/transport/http"
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
		Msg("Cloning repository")

	// Clone options
	cloneOpts := &git.CloneOptions{
		URL:          repoURL,
		Depth:        1, // Shallow clone for speed
		SingleBranch: true,
		Progress:     nil,
	}

	// Set branch if specified
	if branch != "" {
		cloneOpts.ReferenceName = plumbing.ReferenceName("refs/heads/" + branch)
	}

	// Add auth for private repos
	if g.githubToken != "" {
		cloneOpts.Auth = &http.BasicAuth{
			Username: "x-access-token", // GitHub uses this for token auth
			Password: g.githubToken,
		}
	}

	_, err := git.PlainClone(repoPath, false, cloneOpts)
	if err != nil {
		return "", fmt.Errorf("failed to clone repo: %w", err)
	}

	log.Info().Str("path", repoPath).Msg("Repository cloned successfully")
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
