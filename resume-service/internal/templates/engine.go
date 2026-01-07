package templates

import (
	"bytes"
	"fmt"
	"html/template"

	"github.com/verifydev/resume-service/internal/models"
)

// TemplateEngine handles resume template rendering
type TemplateEngine struct {
	templates map[string]*template.Template
}

// NewTemplateEngine creates a new template engine
func NewTemplateEngine() *TemplateEngine {
	return &TemplateEngine{
		templates: make(map[string]*template.Template),
	}
}

// LoadTemplates loads all resume templates
func (te *TemplateEngine) LoadTemplates() error {
	templateNames := []string{"modern", "classic", "developer", "corporate"}

	for _, name := range templateNames {
		tmpl := template.New(name)
		tmpl = tmpl.Funcs(template.FuncMap{
			"percentage": func(score int) string {
				return fmt.Sprintf("%d%%", score)
			},
			"skillBar": func(score int) string {
				filled := score / 10
				empty := 10 - filled
				bar := ""
				for i := 0; i < filled; i++ {
					bar += "█"
				}
				for i := 0; i < empty; i++ {
					bar += "░"
				}
				return bar
			},
		})

		// Parse inline template (in production, load from files)
		var err error
		tmpl, err = tmpl.Parse(getTemplateContent(name))
		if err != nil {
			return err
		}

		te.templates[name] = tmpl
	}

	return nil
}

// Render generates HTML from resume data
func (te *TemplateEngine) Render(data models.ResumeData) (string, error) {
	templateName := data.Template
	if templateName == "" {
		templateName = "modern"
	}

	tmpl, exists := te.templates[templateName]
	if !exists {
		tmpl = te.templates["modern"]
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", err
	}

	return buf.String(), nil
}

func getTemplateContent(name string) string {
	switch name {
	case "modern":
		return modernTemplate
	case "classic":
		return classicTemplate
	case "developer":
		return developerTemplate
	case "corporate":
		return corporateTemplate
	default:
		return modernTemplate
	}
}

const modernTemplate = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{.User.Name}} - Resume</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #6366f1;
            --primary-dark: #4f46e5;
            --bg: #0f172a;
            --card-bg: #1e293b;
            --text: #f8fafc;
            --text-muted: #94a3b8;
            --border: #334155;
            --success: #10b981;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Inter', sans-serif; 
            background: var(--bg); 
            color: var(--text);
            padding: 0;
            line-height: 1.5;
        }
        .paper {
            max-width: 850px;
            margin: 0 auto;
            background: var(--bg);
            min-height: 1100px;
            padding: 50px;
            position: relative;
        }
        
        /* Header */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            border-bottom: 2px solid var(--border);
            padding-bottom: 30px;
        }
        .header-left { flex: 1; }
        .name { 
            font-family: 'Outfit', sans-serif;
            font-size: 42px; 
            font-weight: 700; 
            letter-spacing: -1px;
            color: #fff;
            margin-bottom: 4px;
        }
        .bio { color: var(--primary); font-size: 18px; font-weight: 500; margin-bottom: 12px; }
        .contact-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            font-size: 13px;
            color: var(--text-muted);
        }
        .contact-item { display: flex; align-items: center; gap: 6px; }

        .header-right { text-align: right; }
        .aura-card {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
            border: 1px solid var(--primary);
            padding: 15px;
            border-radius: 12px;
            display: inline-block;
        }
        .aura-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 4px; }
        .aura-value { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 700; color: var(--primary); }
        .aura-level { font-size: 12px; font-weight: 600; padding: 2px 8px; background: var(--primary); color: #fff; border-radius: 4px; margin-top: 5px; display: inline-block; }

        /* Sections */
        .section { margin-bottom: 32px; }
        .section-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
        }
        .section-title {
            font-family: 'Outfit', sans-serif;
            font-size: 20px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #fff;
        }
        .section-line { flex: 1; height: 1px; background: var(--border); }

        /* Skills */
        .skills-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        .skill-pill {
            background: var(--card-bg);
            border: 1px solid var(--border);
            padding: 12px 16px;
            border-radius: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .skill-info .skill-name { font-weight: 600; font-size: 14px; margin-bottom: 4px; display: block; }
        .skill-bar-outer { width: 100px; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
        .skill-bar-inner { height: 100%; background: linear-gradient(90deg, var(--primary), #a855f7); border-radius: 3px; }
        .skill-meta { text-align: right; }
        .skill-score { font-size: 14px; font-weight: 700; color: var(--primary); }
        .skill-verified { color: var(--success); font-size: 10px; font-weight: 700; }

        /* Experience & Projects */
        .item { margin-bottom: 24px; }
        .item-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
        .item-title { font-weight: 700; font-size: 17px; color: #fff; }
        .item-subtitle { color: var(--primary); font-weight: 500; font-size: 15px; }
        .item-date { color: var(--text-muted); font-size: 13px; font-weight: 500; }
        .item-desc { color: var(--text-muted); font-size: 14px; line-height: 1.6; margin-top: 8px; }

        .project-card {
            background: rgba(30, 41, 59, 0.5);
            border: 1px solid var(--border);
            padding: 16px;
            border-radius: 12px;
            margin-bottom: 16px;
        }
        .tech-stack { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
        .tech-tag { font-size: 10px; padding: 2px 8px; background: var(--border); border-radius: 4px; color: var(--text); }

        /* Footer */
        .footer {
            position: absolute;
            bottom: 30px;
            left: 50px;
            right: 50px;
            text-align: center;
            border-top: 1px solid var(--border);
            padding-top: 15px;
            color: var(--text-muted);
            font-size: 11px;
        }
        .core-dots { display: flex; gap: 4px; margin-top: 8px; justify-content: flex-end; }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border); }
        .dot.active { background: var(--primary); box-shadow: 0 0 8px var(--primary); }
    </style>
</head>
<body>
    <div class="paper">
        <div class="header">
            <div class="header-left">
                <h1 class="name">{{.User.Name}}</h1>
                <div class="bio">{{if .User.Bio}}{{.User.Bio}}{{else}}Software Engineer{{end}}</div>
                <div class="contact-grid">
                    <div class="contact-item">📧 {{.User.Email}}</div>
                    {{if .User.Location}}<div class="contact-item">📍 {{.User.Location}}</div>{{end}}
                    {{if .User.Website}}<div class="contact-item">🌐 {{.User.Website}}</div>{{end}}
                    {{if .User.Username}}<div class="contact-item">🐱 github.com/{{.User.Username}}</div>{{end}}
                </div>
            </div>
            <div class="header-right">
                <div class="aura-card">
                    <div class="aura-label">VerifyDev Score</div>
                    <div class="aura-value">{{.AuraSummary.Total}}</div>
                    <div class="aura-level">{{.AuraSummary.Level}}</div>
                </div>
                <div class="core-dots">
                    <div class="dot {{if ge .User.CoreCount 1}}active{{end}}"></div>
                    <div class="dot {{if ge .User.CoreCount 2}}active{{end}}"></div>
                    <div class="dot {{if ge .User.CoreCount 3}}active{{end}}"></div>
                </div>
            </div>
        </div>

        {{if .Skills}}
        <div class="section">
            <div class="section-header">
                <h2 class="section-title">Verified Expertise</h2>
                <div class="section-line"></div>
            </div>
            <div class="skills-container">
                {{range .Skills}}
                <div class="skill-pill">
                    <div class="skill-info">
                        <span class="skill-name">{{.Name}}</span>
                        <div class="skill-bar-outer">
                            <div class="skill-bar-inner" style="width: {{.VerifiedScore}}%"></div>
                        </div>
                    </div>
                    <div class="skill-meta">
                        <div class="skill-score">{{.VerifiedScore}}%</div>
                        {{if .IsVerified}}<div class="skill-verified">VERIFIED</div>{{end}}
                    </div>
                </div>
                {{end}}
            </div>
        </div>
        {{end}}

        {{if .Experiences}}
        <div class="section">
            <div class="section-header">
                <h2 class="section-title">Professional Experience</h2>
                <div class="section-line"></div>
            </div>
            {{range .Experiences}}
            <div class="item">
                <div class="item-header">
                    <div>
                        <div class="item-title">{{.Position}}</div>
                        <div class="item-subtitle">{{.Company}}</div>
                    </div>
                    <div class="item-date">{{.StartDate}} — {{if .IsCurrent}}Present{{else}}{{.EndDate}}{{end}}</div>
                </div>
                {{if .Description}}<div class="item-desc">{{.Description}}</div>{{end}}
            </div>
            {{end}}
        </div>
        {{end}}

        {{if .Projects}}
        <div class="section">
            <div class="section-header">
                <h2 class="section-title">Top Analyzed Projects</h2>
                <div class="section-line"></div>
            </div>
            {{range .Projects}}
            <div class="project-card">
                <div class="item-header">
                    <div class="item-title">{{.RepoName}}</div>
                    <div class="skill-score">Score: {{.OverallScore}}</div>
                </div>
                {{if .Description}}<div class="item-desc">{{.Description}}</div>{{end}}
                <div class="tech-stack">
                    {{if .Language}}<span class="tech-tag" style="background: var(--primary)">{{.Language}}</span>{{end}}
                    {{range .Technologies}}
                    <span class="tech-tag">{{.}}</span>
                    {{end}}
                </div>
            </div>
            {{end}}
        </div>
        {{end}}

        <div class="footer">
            Generated via <b>VerifyDev.io</b> • Verified software engineering credentials powered by deep code analysis.
        </div>
    </div>
</body>
</html>`

const classicTemplate = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{.User.Name}} - Resume</title>
    <style>
        body { font-family: 'Times New Roman', serif; background: #fff; color: #000; padding: 40px; line-height: 1.4; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .name { font-size: 32px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
        .contact { font-size: 14px; margin-bottom: 5px; }
        .section-title { font-size: 16px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; margin: 20px 0 10px; }
        .item { margin-bottom: 15px; }
        .item-header { display: flex; justify-content: space-between; font-weight: bold; }
        .desc { font-size: 14px; margin-top: 5px; text-align: justify; }
        .skills { display: flex; flex-wrap: wrap; gap: 10px; font-size: 14px; }
        .score-box { font-size: 10px; color: #666; font-style: italic; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="name">{{.User.Name}}</div>
            <div class="contact">
                {{.User.Email}} | {{.User.Location}} | {{if .User.Website}}{{.User.Website}} | {{end}}github.com/{{.User.Username}}
            </div>
        </div>

        <div class="section-title">Education</div>
        {{range .Education}}
        <div class="item">
            <div class="item-header">
                <span>{{.Institution}}</span>
                <span>{{.StartYear}} - {{.EndYear}}</span>
            </div>
            <div style="font-style: italic;">{{.Degree}} in {{.Field}}</div>
        </div>
        {{end}}

        <div class="section-title">Work Experience</div>
        {{range .Experiences}}
        <div class="item">
            <div class="item-header">
                <span>{{.Position}}, {{.Company}}</span>
                <span>{{.StartDate}} - {{if .IsCurrent}}Present{{else}}{{.EndDate}}{{end}}</span>
            </div>
            <div class="desc">{{.Description}}</div>
        </div>
        {{end}}

        <div class="section-title">Technical Projects</div>
        {{range .Projects}}
        <div class="item">
            <div class="item-header">
                <span>{{.RepoName}} (Score: {{.OverallScore}}/100)</span>
            </div>
            <div class="desc">{{.Description}}</div>
            <div style="font-size: 12px; margin-top: 3px;"><b>Tech:</b> {{.Language}}, {{range $i, $t := .Technologies}}{{if $i}}, {{end}}{{$t}}{{end}}</div>
        </div>
        {{end}}

        <div class="section-title">Verified Skills</div>
        <div class="skills">
            {{range .Skills}}{{if ge .VerifiedScore 60}}
            <span>{{.Name}} ({{.VerifiedScore}}%)</span>
            {{end}}{{end}}
        </div>
    </div>
</body>
</html>`

const developerTemplate = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{.User.Name}} - Resume</title>
    <style>
        body { font-family: 'Monaco', 'Consolas', monospace; background: #121212; color: #00ff00; padding: 30px; line-height: 1.6; }
        .cmd { color: #fff; margin-bottom: 20px; }
        .header { border: 1px dashed #00ff00; padding: 20px; margin-bottom: 30px; }
        .title { color: #00d4ff; font-weight: bold; font-size: 24px; }
        .section-header { color: #ffff00; margin: 25px 0 10px; font-weight: bold; }
        .skill-item { display: inline-block; padding: 2px 8px; border: 1px solid #00ff00; margin-right: 5px; margin-bottom: 5px; font-size: 12px; }
        .project { border-left: 3px solid #00d4ff; padding-left: 15px; margin-bottom: 20px; }
        .date { color: #888; font-size: 12px; }
        .aura-meter { font-size: 14px; background: #333; padding: 10px; border-radius: 5px; border-left: 5px solid #ff00ff; }
    </style>
</head>
<body>
    <div class="cmd">admin@verifydev:~$ cat user_profile.json</div>
    <div class="header">
        <div class="title">{{.User.Name}}</div>
        <div>> Status: {{if .User.IsVerified}}VERIFIED{{else}}PENDING_VERIFICATION{{end}}</div>
        <div>> Location: {{.User.Location}}</div>
        <div>> GitHub: github.com/{{.User.Username}}</div>
        <br>
        <div class="aura-meter">
            Aura Summary: {{.AuraSummary.Total}} Points | Level: {{.AuraSummary.Level}}
        </div>
    </div>

    <div class="section-header">SKILLS_MATRIX:</div>
    <div>
        {{range .Skills}}
        <div class="skill-item">[{{.Name}} :: {{.VerifiedScore}}%]</div>
        {{end}}
    </div>

    <div class="section-header">PROJECT_HISTORY:</div>
    {{range .Projects}}
    <div class="project">
        <div style="color: #fff; font-weight: bold;">{{.RepoName}} (v{{.OverallScore}}.0)</div>
        <div class="date">{{.Language}} | Verified Analysis</div>
        <div style="color: #ccc;">{{.Description}}</div>
    </div>
    {{end}}

    <div class="section-header">EXPERIENCE_LOGS:</div>
    {{range .Experiences}}
    <div style="margin-bottom: 15px;">
        <div style="color: #fff;">>> {{.Position}} @ {{.Company}}</div>
        <div class="date">PERIOD: {{.StartDate}} - {{if .IsCurrent}}ACTIVE{{else}}{{.EndDate}}{{end}}</div>
        <div style="color: #aaa;">{{.Description}}</div>
    </div>
    {{end}}
</body>
</html>`

const corporateTemplate = modernTemplate // Placeholder
