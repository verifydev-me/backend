# 🧪 Ultimate Verification Prompt for Project Analyzer

**Objective**: Verify the Project Analyzer Engine is **100% Accurate, Robust, and Hallucination-Free** across all possible project structures, tech stacks, and edge cases.

---

## 📋 Instructions for the AI Agent

You are a **QA Automation Specialist** tasked with breaking the engine. Do not assume it works. Assume it is broken until proven perfect.

### 1. 🏗️ Construct The "Impossible" Test Suite
Create a temporary test harness with the following challenging scenarios. Do NOT use standard templates. Use these edge cases:

*   **Scenario A: The "Ghost" Next.js App**
    *   Structure: `app/dashboard/page.tsx`, `next.config.js`.
    *   Constraint: **NO `package.json`**.
    *   *Goal*: Must detect `Next.js`, `React`, `TypeScript`.
*   **Scenario B: The "Hidden" Backend**
    *   Structure: `api/v1/users/manage.py`.
    *   Constraint: **NO `requirements.txt`**, file is 5 levels deep.
    *   *Goal*: Must detect `Django`, `Python`.
*   **Scenario C: The "Empty" Monorepo**
    *   Structure: `packages/ui` (empty), `packages/core` (binary files only).
    *   *Goal*: Must return `SignalIncompleteProject` or correct "Empty" status. **Zero skills detected**.
*   **Scenario D: The "Polyglot Chaos"**
    *   Structure: `rust-cli/src/main.rs`, `scripts/deploy.py`, `web/angular.json`.
    *   *Goal*: Must detect `Rust`, `Python`, `Angular`, `TypeScript`, AND `Microservices Architecture`.

### 2. 🚀 Execution & Audit Analysis
Run the engine against these folders. For EACH result, apply this **Truth Table**:

| Detection Metric | Requirement | Failure Condition |
| :--- | :--- | :--- |
| **Primary Language** | Must match the language with most source code bytes (or lines) | Wrong language = FAIL |
| **All Skills** | Every detected skill MUST have evidence (file or config) | Generated skill without file = HALLUCINATION (FAIL) |
| **Missing Skills** | Every config file (`nest-cli.json`, `manage.py`) MUST trigger a skill | Missing skill = BLIND SPOT (FAIL) |
| **Architecture** | Multiple distinct frameworks/langs = `microservices` or `monorepo` | Labeled `monolith` when clearly distributed = FAIL |

### 3. 🔍 Deep Code Inspection (Whitebox Testing)
Verify the internal logic (`infra_extractor_*.go`):
*   Does it rely *only* on filenames? (Bad) -> Ensure it checks specific paths or patterns.
*   Does it handle `JSON` parsing errors gracefully? (Good) -> Create a malformed `package.json`.
*   Does it handle large files? (Good) -> Create a 100MB dummy file.

### 4. 📝 Final Verdict Report
Generate a report in this format:
*   **Accuracy Score**: (0-100%)
*   **Robustness**: (Pass/Fail) - Did it panic on binary/empty files?
*   **Edge Case Coverage**: (List passed edge cases)
*   **Recommendations**: Specific logic improvements.

---

**Copy and paste this prompt to an AI agent to initiate the Deep Verification Protocol.**
