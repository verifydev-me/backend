package git

import (
	"context"
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
func (g *GitClient) CloneRepo(ctx context.Context, repoURL, projectID, branch, token, basePath string) (string, error) {
	repoPath := filepath.Join(g.cloneDir, projectID)

	// Remove if exists (cleanup from failed previous attempt)
	os.RemoveAll(repoPath)

	log.Info().
		Str("url", repoURL).
		Str("path", repoPath).
		Str("branch", branch).
		Str("basePath", basePath).
		Msg("Cloning repository (Sparse Optimized)")

	// 1. Git Clone (Standard Depth=1)
	// We use full checkout (no sparse) to ensure we don't miss any files
	// regardless of folder naming (e.g. go-backend, node-backend)
	// Handle Auth if token present
	finalURL := repoURL

	// Use passed token if available, otherwise use global token
	authToken := token
	if authToken == "" {
		authToken = g.githubToken
	}

	if authToken != "" {
		// Inject token into URL: https://oauth2:token@github.com/...
		// This avoids prompts and authenticates the request
		// We use simple string manipulation or url package to be safe
		// But for now, simple injection is robust enough for standard GitHub URLs
		// format: https://<token>@github.com/...
		// Using x-access-token for fine-grained tokens or just the token as user

		// Safer way: git -c http.extraHeader="Authorization: Basic <base64>"
		// But embedding in URL is more compatible with simple clone commands
		// We'll use the URL approach: https://oauth2:<token>@github.com

		// Simple insertion after https://
		if len(repoURL) > 8 && repoURL[:8] == "https://" {
			finalURL = "https://oauth2:" + authToken + "@" + repoURL[8:]
		}
	}

	// Use sparse-checkout to only clone the requested base path
	// This respects the user's request to "only clone what is selected"

	// 1. Initialize empty repo
	initCmd := exec.CommandContext(ctx, "git", "init", repoPath)
	if out, err := initCmd.CombinedOutput(); err != nil {
		log.Error().Err(err).Str("output", string(out)).Msg("Git init failed")
		return "", fmt.Errorf("git init failed: %w", err)
	}

	// 2. Add remote
	remoteCmd := exec.CommandContext(ctx, "git", "-C", repoPath, "remote", "add", "origin", finalURL)
	if out, err := remoteCmd.CombinedOutput(); err != nil {
		log.Error().Err(err).Str("output", string(out)).Msg("Git remote add failed")
		return "", fmt.Errorf("git remote add failed: %w", err)
	}

	// 3. Configure sparse-checkout
	if basePath != "" {
		log.Info().Str("basePath", basePath).Msg("Configuring sparse-checkout")
		// Add --skip-checks to allow paths with special characters like brackets [ ]
		// which git interprets as patterns otherwise.
		sparseCmd := exec.CommandContext(ctx, "git", "-C", repoPath, "sparse-checkout", "set", "--skip-checks", basePath)
		if out, err := sparseCmd.CombinedOutput(); err != nil {
			// Fallback: Try quoting if skip-checks fails or is not supported (older git)
			// But since we saw the error suggesting it, we assume it's supported.
			log.Error().Err(err).Str("output", string(out)).Msg("Git sparse-checkout set failed")
			// Double check validation: if it fails, maybe just try without it?
			// No, the error was explicit.
			return "", fmt.Errorf("sparse-checkout failed: %w", err)
		}
	} else {
		// If no base path, we still want to benefit from "blob:none" filter if possible,
		// but since we are doing depth 1, that's already optimized.
		// Standard clone is fine if no basePath, but we are using this manual flow now.
	}

	// 4. Fetch specific branch with Partial Clone optimization
	// 'git pull' doesn't always support --filter directly in older versions, so we use fetch + checkout
	// --filter=blob:none ensures we don't download unnecessary files
	log.Info().Msg("Fetching content (Partial Clone)...")
	fetchArgs := []string{"-C", repoPath, "fetch", "--depth", "1", "--filter=blob:none", "origin"}
	if branch != "" {
		fetchArgs = append(fetchArgs, branch)
	}

	fetchCmd := exec.CommandContext(ctx, "git", fetchArgs...)
	if out, err := fetchCmd.CombinedOutput(); err != nil {
		log.Error().Err(err).Str("output", string(out)).Msg("Git fetch failed")
		return "", fmt.Errorf("git fetch failed: %w", err)
	}

	// 5. Checkout the fetched content
	// Since we fetched specific branch to FETCH_HEAD (or remote tracking), we checkout via reset or directly
	// Simplest for 'depth 1' single branch is usually:
	checkoutCmd := exec.CommandContext(ctx, "git", "-C", repoPath, "checkout", "FETCH_HEAD")
	if out, err := checkoutCmd.CombinedOutput(); err != nil {
		log.Error().Err(err).Str("output", string(out)).Msg("Git checkout failed")
		return "", fmt.Errorf("git checkout failed: %w", err)
	}

	log.Info().Str("path", repoPath).Msg("Repository cloned successfully (Sparse + Partial Fetch)")
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
