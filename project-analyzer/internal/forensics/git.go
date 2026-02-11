package forensics

import (
	"bytes"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/verifydev/project-analyzer/pkg/signals"
)

// ============================================
// GIT FORENSICS (AUTHENTICITY ENGINE V2)
// ============================================

// GitAnalyzer handles authenticity verification
type GitAnalyzer struct {
	repoPath string
}

func NewGitAnalyzer(repoPath string) *GitAnalyzer {
	return &GitAnalyzer{repoPath: repoPath}
}

// Analyze method executes the V2 forensics logic
func (g *GitAnalyzer) Analyze(totalLOC int) (*signals.GitForensics, *signals.AuthorshipVerdict) {
	forensics := &signals.GitForensics{
		IsPremiumFeature: true, // Default to true for now as per updated specs
	}

	// 1. Get raw log data
	logData, err := g.getGitLog()
	if err != nil {
		// If no git history, assume snapshot but low confidence
		return forensics, &signals.AuthorshipVerdict{
			Level:      "SNAPSHOT",
			Confidence: "LOW",
			Reasons:    []string{"No git history found"},
		}
	}

	// 2. Parse Commits
	commits := g.parseCommits(logData)
	forensics.CommitCount = len(commits)

	if forensics.CommitCount == 0 {
		return forensics, &signals.AuthorshipVerdict{
			Level:      "SNAPSHOT",
			Confidence: "LOW",
			Reasons:    []string{"Git initialized but no commits found"},
		}
	}

	// 3. Temporal Analysis
	// Commits are ordered recent -> old (default git log)
	forensics.LastCommitDate = commits[0].Date.Format(time.RFC3339)
	forensics.FirstCommitDate = commits[len(commits)-1].Date.Format(time.RFC3339)

	lastTime := commits[0].Date
	firstTime := commits[len(commits)-1].Date
	timeGap := lastTime.Sub(firstTime)

	// 4. Semantic & Authorship Analysis
	maxDiffLines := 0
	authorCounts := make(map[string]int)

	for _, c := range commits {
		// Semantics
		msg := strings.ToLower(c.Message)
		if strings.Contains(msg, "refactor") || strings.Contains(msg, "fix") ||
			strings.Contains(msg, "clean") || strings.Contains(msg, "optimize") ||
			strings.Contains(msg, "test") {
			forensics.RefactorCount++
		}

		// Authorship
		authorCounts[c.Author]++

		// Diff Size (Approximate from stat)
		if c.DiffLines > maxDiffLines {
			maxDiffLines = c.DiffLines
		}
	}

	// Calculate Ratios
	if totalLOC > 0 {
		forensics.LargestCommitRatio = float64(maxDiffLines) / float64(totalLOC)
	} else if forensics.CommitCount > 0 {
		// Fallback if LOC is 0 (unlikely)
		forensics.LargestCommitRatio = float64(maxDiffLines) / 1000.0
	}

	// Calculate Primary Author Pct
	maxAuthorCommits := 0
	for _, count := range authorCounts {
		if count > maxAuthorCommits {
			maxAuthorCommits = count
		}
	}
	if forensics.CommitCount > 0 {
		forensics.PrimaryAuthorPct = float64(maxAuthorCommits) / float64(forensics.CommitCount)
	}

	// 5. Generate Verdict (The Golden Rule Logic)
	verdict := g.generateVerdict(forensics, timeGap)

	return forensics, verdict
}

func (g *GitAnalyzer) generateVerdict(f *signals.GitForensics, gap time.Duration) *signals.AuthorshipVerdict {
	reasons := []string{}
	level := "ORGANIC"
	confidence := "HIGH"

	// --- SNAPSHOT DETECTION (Red Flags) ---
	isSnapshot := false

	// Rule 1: Massive Diff Dump
	if f.LargestCommitRatio > 0.80 {
		isSnapshot = true
		reasons = append(reasons, "Over 80% of code introduced in a single commit")
	}

	// Rule 2: Zero Time Gap + No Refactors (Automated/Quick Dump)
	if gap.Hours() < 24 && f.RefactorCount == 0 && f.CommitCount < 5 {
		isSnapshot = true
		reasons = append(reasons, "Project completed in <24h with no refactoring evidence")
	}

	if isSnapshot {
		return &signals.AuthorshipVerdict{
			Level:      "SNAPSHOT",
			Confidence: "HIGH",
			Reasons:    reasons,
		}
	}

	// --- MODERN ORGANIC DETECTION (Green Flags) ---

	// Rule 3: Refactoring Evidence (Strongest Signal)
	if f.RefactorCount > 0 {
		reasons = append(reasons, "Evidence of refactoring and code cleanup")
	}

	// Rule 4: Temporal Spread
	if gap.Hours() > 48 { // > 2 Days
		reasons = append(reasons, "Development spread across multiple days")
	}

	// Rule 5: Commit Shape
	if f.LargestCommitRatio < 0.40 {
		reasons = append(reasons, "Codebase built incrementally (largest commit < 40%)")
	}

	// --- UNCLEAR / TEAM DETECTION ---
	if f.PrimaryAuthorPct < 0.50 {
		level = "UNCLEAR"
		confidence = "MEDIUM"
		reasons = append(reasons, "Multiple major contributors detected (Team project?)")
	}

	// If no strong positive signals for Organic, downgrade confidence
	if len(reasons) == 0 && level == "ORGANIC" {
		confidence = "LOW"
		reasons = append(reasons, "Insufficient history to confirm organic growth")
	}

	return &signals.AuthorshipVerdict{
		Level:      level,
		Confidence: confidence,
		Reasons:    reasons,
	}
}

// ---------------------------------------------------------
// GIT HELPERS
// ---------------------------------------------------------

type commitInfo struct {
	Author    string
	Date      time.Time
	Message   string
	DiffLines int
}

func (g *GitAnalyzer) getGitLog() (string, error) {
	// git log --pretty=format:"%an|%ad|%s" --date=iso --stat
	// Limits to last 100 commits to avoid huge overhead on mammoth repos
	cmd := exec.Command("git", "-C", g.repoPath, "log", "-n", "100", "--pretty=format:PARSER_SEP|%an|%ad|%s", "--date=iso", "--stat")
	var out bytes.Buffer
	cmd.Stdout = &out
	err := cmd.Run()
	if err != nil {
		return "", err
	}
	return out.String(), nil
}

func (g *GitAnalyzer) parseCommits(logData string) []commitInfo {
	commits := []commitInfo{}
	lines := strings.Split(logData, "\n")

	var currentCommit *commitInfo

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		if strings.HasPrefix(line, "PARSER_SEP|") {
			// Save previous if exists
			if currentCommit != nil {
				commits = append(commits, *currentCommit)
			}

			// Start new commit
			parts := strings.Split(line, "|")
			if len(parts) >= 4 {
				date, _ := time.Parse("2006-01-02 15:04:05 -0700", parts[2])
				currentCommit = &commitInfo{
					Author:    parts[1],
					Date:      date,
					Message:   parts[3],
					DiffLines: 0,
				}
			}
		} else if currentCommit != nil {
			// Parse stat line: " 5 files changed, 100 insertions(+), 50 deletions(-)"
			// We want total changes (insertions + deletions) as a proxy for "Diff Size"
			if strings.Contains(line, "changed") && (strings.Contains(line, "insertion") || strings.Contains(line, "deletion")) {
				// Extract insertions
				reIns := regexp.MustCompile(`(\d+) insertion`)
				insMatch := reIns.FindStringSubmatch(line)
				insertions := 0
				if len(insMatch) > 1 {
					insertions, _ = strconv.Atoi(insMatch[1])
				}

				// Extract deletions (was missing — caused DiffLines to be ~50% too low)
				reDel := regexp.MustCompile(`(\d+) deletion`)
				delMatch := reDel.FindStringSubmatch(line)
				deletions := 0
				if len(delMatch) > 1 {
					deletions, _ = strconv.Atoi(delMatch[1])
				}

				currentCommit.DiffLines += insertions + deletions
			}
		}
	}

	// Add last one
	if currentCommit != nil {
		commits = append(commits, *currentCommit)
	}

	return commits
}
