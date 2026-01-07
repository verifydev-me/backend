package generator

import (
	"context"
	"fmt"
	"time"

	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/chromedp"
	"github.com/rs/zerolog/log"

	"github.com/verifydev/resume-service/internal/models"
	"github.com/verifydev/resume-service/internal/templates"
)

// PDFGenerator generates PDFs from HTML
type PDFGenerator struct {
	templateEngine *templates.TemplateEngine
	timeout        time.Duration
}

// NewPDFGenerator creates a new PDF generator
func NewPDFGenerator(timeout time.Duration) (*PDFGenerator, error) {
	engine := templates.NewTemplateEngine()
	if err := engine.LoadTemplates(); err != nil {
		return nil, fmt.Errorf("failed to load templates: %w", err)
	}

	return &PDFGenerator{
		templateEngine: engine,
		timeout:        timeout,
	}, nil
}

// Generate creates a PDF from resume data
func (g *PDFGenerator) Generate(ctx context.Context, data models.ResumeData) ([]byte, error) {
	log.Info().Str("userId", data.User.ID).Msg("Generating PDF")
	startTime := time.Now()

	// 1. Render HTML from template
	html, err := g.templateEngine.Render(data)
	if err != nil {
		return nil, fmt.Errorf("failed to render template: %w", err)
	}

	// 2. Convert HTML to PDF using chromedp
	pdf, err := g.htmlToPDF(ctx, html)
	if err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}

	log.Info().
		Str("userId", data.User.ID).
		Dur("duration", time.Since(startTime)).
		Int("sizeBytes", len(pdf)).
		Msg("PDF generated successfully")

	return pdf, nil
}

// GenerateHTML generates HTML from resume data without converting to PDF
func (g *PDFGenerator) GenerateHTML(data models.ResumeData) (string, error) {
	html, err := g.templateEngine.Render(data)
	if err != nil {
		return "", fmt.Errorf("failed to render template: %w", err)
	}
	return html, nil
}

// htmlToPDF converts HTML to PDF using headless Chrome
func (g *PDFGenerator) htmlToPDF(ctx context.Context, html string) ([]byte, error) {
	// Create context with timeout
	ctx, cancel := context.WithTimeout(ctx, g.timeout)
	defer cancel()

	// Create Chrome instance
	allocCtx, allocCancel := chromedp.NewExecAllocator(ctx,
		append(chromedp.DefaultExecAllocatorOptions[:],
			chromedp.Flag("headless", true),
			chromedp.Flag("disable-gpu", true),
			chromedp.Flag("no-sandbox", true),
			chromedp.Flag("disable-dev-shm-usage", true),
		)...,
	)
	defer allocCancel()

	chromeCtx, chromeCancel := chromedp.NewContext(allocCtx)
	defer chromeCancel()

	var pdfBuf []byte

	// Navigate to HTML and print to PDF
	if err := chromedp.Run(chromeCtx,
		chromedp.Navigate("about:blank"),
		chromedp.ActionFunc(func(ctx context.Context) error {
			return chromedp.Evaluate(`document.open(); document.write(`+"`"+html+"`"+`); document.close();`, nil).Do(ctx)
		}),
		chromedp.ActionFunc(func(ctx context.Context) error {
			var err error
			pdfBuf, _, err = page.PrintToPDF().
				WithPrintBackground(true).
				WithPreferCSSPageSize(true).
				WithMarginTop(0.4).
				WithMarginBottom(0.4).
				WithMarginLeft(0.4).
				WithMarginRight(0.4).
				WithScale(1.0).
				Do(ctx)
			return err
		}),
	); err != nil {
		return nil, err
	}

	return pdfBuf, nil
}
