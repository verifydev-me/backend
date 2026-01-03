package generator

// ResumeData contains all data needed to generate a resume
type ResumeData struct {
	User        UserInfo     `json:"user"`
	Skills      []Skill      `json:"skills"`
	Projects    []Project    `json:"projects"`
	Experiences []Experience `json:"experiences"`
	Education   []Education  `json:"education"`
	SocialLinks []SocialLink `json:"socialLinks"`
	Template    string       `json:"template"` // modern, classic, developer, corporate
	AuraSummary AuraSummary  `json:"auraSummary"`
}

type UserInfo struct {
	ID         string `json:"id"`
	Username   string `json:"username"`
	Name       string `json:"name"`
	Email      string `json:"email"`
	AvatarURL  string `json:"avatarUrl"`
	Bio        string `json:"bio"`
	Location   string `json:"location"`
	Website    string `json:"website"`
	Phone      string `json:"phone"`
	CoreCount  int    `json:"coreCount"`
	AuraScore  int    `json:"auraScore"`
	IsVerified bool   `json:"isVerified"`
}

type Skill struct {
	Name          string `json:"name"`
	Category      string `json:"category"`
	VerifiedScore int    `json:"verifiedScore"`
	IsVerified    bool   `json:"isVerified"`
	ProjectCount  int    `json:"projectCount"`
}

type Project struct {
	RepoName     string   `json:"repoName"`
	Description  string   `json:"description"`
	Language     string   `json:"language"`
	Stars        int      `json:"stars"`
	OverallScore int      `json:"overallScore"`
	Technologies []string `json:"technologies"`
	GithubURL    string   `json:"githubUrl"`
	LiveURL      string   `json:"liveUrl"`
}

type Experience struct {
	Company     string `json:"company"`
	Position    string `json:"position"`
	Location    string `json:"location"`
	StartDate   string `json:"startDate"`
	EndDate     string `json:"endDate"`
	IsCurrent   bool   `json:"isCurrent"`
	Description string `json:"description"`
}

type Education struct {
	Institution string `json:"institution"`
	Degree      string `json:"degree"`
	Field       string `json:"field"`
	StartYear   int    `json:"startYear"`
	EndYear     int    `json:"endYear"`
	Grade       string `json:"grade"`
}

type SocialLink struct {
	Platform string `json:"platform"`
	URL      string `json:"url"`
	Username string `json:"username"`
}

type AuraSummary struct {
	Total      int    `json:"total"`
	Level      string `json:"level"`
	Percentile int    `json:"percentile"`
}

// GenerateRequest is received from RabbitMQ
type GenerateRequest struct {
	UserID    string `json:"userId"`
	Template  string `json:"template"`
	Format    string `json:"format"` // pdf, html
	RequestID string `json:"requestId"`
}

// GenerateResult is published to RabbitMQ after generation
type GenerateResult struct {
	UserID    string `json:"userId"`
	RequestID string `json:"requestId"`
	Success   bool   `json:"success"`
	PdfURL    string `json:"pdfUrl,omitempty"`
	Error     string `json:"error,omitempty"`
}
