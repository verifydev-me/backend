package templates

import (
	"bytes"
	"html/template"

	"github.com/verifydev/resume-service/internal/generator"
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
				return string(rune(score)) + "%"
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
func (te *TemplateEngine) Render(data generator.ResumeData) (string, error) {
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
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, sans-serif; 
            background: #0a0a0a; 
            color: #e0e0e0;
            padding: 40px;
        }
        .container { max-width: 800px; margin: 0 auto; }
        
        /* Header */
        .header {
            display: flex;
            align-items: center;
            gap: 24px;
            margin-bottom: 32px;
            padding-bottom: 24px;
            border-bottom: 1px solid #333;
        }
        .avatar {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            border: 3px solid #6366f1;
        }
        .header-info h1 { font-size: 28px; color: #fff; }
        .header-info .title { color: #a5a5a5; font-size: 16px; margin-top: 4px; }
        .header-info .location { color: #888; font-size: 14px; margin-top: 4px; }
        
        /* Aura Badge */
        .aura-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            padding: 8px 16px;
            border-radius: 20px;
            margin-top: 12px;
        }
        .aura-badge .level { font-weight: bold; }
        .aura-badge .score { opacity: 0.9; }
        
        /* Core Indicator */
        .core-indicator {
            display: flex;
            gap: 4px;
            margin-top: 8px;
        }
        .core { 
            width: 24px; 
            height: 24px; 
            border-radius: 50%; 
            background: #6366f1;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
        }
        .core.inactive { background: #333; }
        
        /* Section */
        .section { margin-bottom: 28px; }
        .section-title {
            font-size: 18px;
            color: #6366f1;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #333;
        }
        
        /* Skills */
        .skills-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .skill-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 14px;
            background: #1a1a1a;
            border-radius: 8px;
        }
        .skill-name { font-weight: 500; }
        .skill-score {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .skill-bar {
            width: 80px;
            height: 6px;
            background: #333;
            border-radius: 3px;
            overflow: hidden;
        }
        .skill-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #6366f1, #8b5cf6);
            border-radius: 3px;
        }
        .verified-badge {
            color: #22c55e;
            font-size: 12px;
        }
        
        /* Projects */
        .project-item {
            padding: 16px;
            background: #1a1a1a;
            border-radius: 8px;
            margin-bottom: 12px;
        }
        .project-header { display: flex; justify-content: space-between; align-items: start; }
        .project-name { font-weight: 600; color: #fff; }
        .project-score { 
            background: #6366f1; 
            padding: 4px 10px; 
            border-radius: 12px; 
            font-size: 12px;
        }
        .project-desc { color: #a5a5a5; font-size: 14px; margin-top: 8px; }
        .project-tech { 
            display: flex; 
            gap: 8px; 
            margin-top: 12px; 
            flex-wrap: wrap;
        }
        .tech-tag { 
            background: #333; 
            padding: 4px 10px; 
            border-radius: 4px; 
            font-size: 12px;
        }
        
        /* Experience */
        .exp-item { margin-bottom: 20px; }
        .exp-header { display: flex; justify-content: space-between; }
        .exp-role { font-weight: 600; color: #fff; }
        .exp-company { color: #a5a5a5; }
        .exp-date { color: #888; font-size: 14px; }
        .exp-desc { color: #a5a5a5; font-size: 14px; margin-top: 8px; line-height: 1.6; }
        
        /* Contact */
        .contact-row { 
            display: flex; 
            gap: 24px; 
            flex-wrap: wrap;
            color: #a5a5a5;
            font-size: 14px;
        }
        .contact-item { display: flex; align-items: center; gap: 6px; }
        
        /* Footer */
        .footer {
            text-align: center;
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid #333;
            color: #666;
            font-size: 12px;
        }
        .footer a { color: #6366f1; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            {{if .User.AvatarURL}}
            <img src="{{.User.AvatarURL}}" alt="{{.User.Name}}" class="avatar">
            {{end}}
            <div class="header-info">
                <h1>{{.User.Name}}</h1>
                {{if .User.Bio}}<div class="title">{{.User.Bio}}</div>{{end}}
                {{if .User.Location}}<div class="location">📍 {{.User.Location}}</div>{{end}}
                
                <div class="core-indicator">
                    {{range $i := slice 0 1 2}}
                        {{if lt $i $.User.CoreCount}}
                        <div class="core">⚡</div>
                        {{else}}
                        <div class="core inactive">⚡</div>
                        {{end}}
                    {{end}}
                </div>
                
                <div class="aura-badge">
                    <span class="level">{{.AuraSummary.Level}}</span>
                    <span class="score">{{.AuraSummary.Total}} Aura</span>
                </div>
            </div>
        </div>
        
        <!-- Contact -->
        <div class="section">
            <div class="contact-row">
                {{if .User.Email}}<span class="contact-item">📧 {{.User.Email}}</span>{{end}}
                {{if .User.Phone}}<span class="contact-item">📱 {{.User.Phone}}</span>{{end}}
                {{if .User.Website}}<span class="contact-item">🌐 {{.User.Website}}</span>{{end}}
                {{range .SocialLinks}}
                <span class="contact-item">{{.Platform}}: {{.URL}}</span>
                {{end}}
            </div>
        </div>
        
        <!-- Skills -->
        {{if .Skills}}
        <div class="section">
            <h2 class="section-title">✅ Verified Skills</h2>
            <div class="skills-grid">
                {{range .Skills}}
                <div class="skill-item">
                    <span class="skill-name">{{.Name}}</span>
                    <div class="skill-score">
                        <div class="skill-bar">
                            <div class="skill-bar-fill" style="width: {{.VerifiedScore}}%"></div>
                        </div>
                        <span>{{.VerifiedScore}}%</span>
                        {{if .IsVerified}}<span class="verified-badge">✓</span>{{end}}
                    </div>
                </div>
                {{end}}
            </div>
        </div>
        {{end}}
        
        <!-- Projects -->
        {{if .Projects}}
        <div class="section">
            <h2 class="section-title">🚀 Projects</h2>
            {{range .Projects}}
            <div class="project-item">
                <div class="project-header">
                    <span class="project-name">{{.RepoName}}</span>
                    <span class="project-score">Score: {{.OverallScore}}</span>
                </div>
                {{if .Description}}<div class="project-desc">{{.Description}}</div>{{end}}
                <div class="project-tech">
                    {{if .Language}}<span class="tech-tag">{{.Language}}</span>{{end}}
                    {{range .Technologies}}
                    <span class="tech-tag">{{.}}</span>
                    {{end}}
                </div>
            </div>
            {{end}}
        </div>
        {{end}}
        
        <!-- Experience -->
        {{if .Experiences}}
        <div class="section">
            <h2 class="section-title">💼 Experience</h2>
            {{range .Experiences}}
            <div class="exp-item">
                <div class="exp-header">
                    <div>
                        <div class="exp-role">{{.Position}}</div>
                        <div class="exp-company">{{.Company}}</div>
                    </div>
                    <div class="exp-date">{{.StartDate}} - {{if .IsCurrent}}Present{{else}}{{.EndDate}}{{end}}</div>
                </div>
                {{if .Description}}<div class="exp-desc">{{.Description}}</div>{{end}}
            </div>
            {{end}}
        </div>
        {{end}}
        
        <!-- Education -->
        {{if .Education}}
        <div class="section">
            <h2 class="section-title">🎓 Education</h2>
            {{range .Education}}
            <div class="exp-item">
                <div class="exp-header">
                    <div>
                        <div class="exp-role">{{.Degree}} in {{.Field}}</div>
                        <div class="exp-company">{{.Institution}}</div>
                    </div>
                    <div class="exp-date">{{.StartYear}} - {{.EndYear}}</div>
                </div>
            </div>
            {{end}}
        </div>
        {{end}}
        
        <!-- Footer -->
        <div class="footer">
            Generated by <a href="https://verifydev.io">VerifyDev</a> - Skills verified through code analysis
        </div>
    </div>
</body>
</html>`

const classicTemplate = modernTemplate   // Placeholder - would have different styling
const developerTemplate = modernTemplate // Placeholder
const corporateTemplate = modernTemplate // Placeholder
