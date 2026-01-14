package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/verifydev/project-analyzer/internal/intelligence"
)

func main() {
	// Point to the root of the verify-stack repo
	repoPath := "/Users/keshavsharma/verify-stack"
	fmt.Printf("Scanning repository at: %s\n", repoPath)

	// Run Signal Scan
	scanner := intelligence.NewSignalScanner(repoPath)
	signals, confidence, err := scanner.Scan()
	if err != nil {
		fmt.Printf("Error scanning: %v\n", err)
		os.Exit(1)
	}

	// Run Usage Verification
	fmt.Println("Running Usage Verification...")
	verdicts := intelligence.VerifyAllUsage(repoPath, signals)
	verdictsJSON, _ := json.MarshalIndent(verdicts, "", "  ")

	// Pretty print results
	sigJSON, _ := json.MarshalIndent(signals, "", "  ")
	confJSON, _ := json.MarshalIndent(confidence, "", "  ")

	fmt.Println("---------------------------------------------------")
	fmt.Println("DETECTED SIGNALS:")
	fmt.Println(string(sigJSON))
	fmt.Println("---------------------------------------------------")
	fmt.Println("VERIFICATION VERDICTS:")
	fmt.Println(string(verdictsJSON))
	fmt.Println("---------------------------------------------------")
	fmt.Println("CONFIDENCE SCORES:")
	fmt.Println(string(confJSON))
	fmt.Println("---------------------------------------------------")
}
