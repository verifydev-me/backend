import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, AlertTriangle, Lightbulb, Code2, Layers } from 'lucide-react'
import type { ProjectFullAnalysis } from '@/types'

interface AnalysisResultsProps {
  analysis: ProjectFullAnalysis
}

export function AnalysisResults({ analysis }: AnalysisResultsProps) {
  const { bestPractices, optimizations, frameworkAnalysis, techStack } = analysis

  return (
    <div className="space-y-6">
      {/* Tech Stack */}
      {techStack && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Technology Stack
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {techStack.frameworks.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm font-medium text-muted-foreground w-24">Frameworks:</span>
                  {techStack.frameworks.map(f => (
                    <Badge key={f} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1">
                      {f}
                    </Badge>
                  ))}
                </div>
              )}
              {techStack.databases.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm font-medium text-muted-foreground w-24">Databases:</span>
                  {techStack.databases.map(d => (
                    <Badge key={d} variant="secondary" className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 px-3 py-1">
                      {d}
                    </Badge>
                  ))}
                </div>
              )}
              {techStack.tools.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm font-medium text-muted-foreground w-24">Tools:</span>
                  {techStack.tools.map(t => (
                    <Badge key={t} variant="secondary" className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Best Practices */}
        {bestPractices && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Best Practices
              </CardTitle>
              <CardDescription>
                Adherence score: <span className="font-bold text-foreground">{bestPractices.score}%</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {bestPractices.followed.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
                {bestPractices.missing.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <XCircle className="h-4 w-4 text-red-500/50 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Optimizations */}
        {optimizations && optimizations.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Suggested Improvements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {optimizations.map((opt, i) => (
                  <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                    <AlertTriangle className={`h-5 w-5 shrink-0 ${
                      opt.priority === 'high' ? 'text-red-500' : 
                      opt.priority === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                    }`} />
                    <div>
                      <h4 className="font-medium text-sm">{opt.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                      <Badge variant="outline" className="mt-2 text-[10px] h-5">
                        Impact: {opt.impact}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Framework Analysis (React Specific) */}
      {frameworkAnalysis && (
        <Card className="border-cyan-500/20 bg-cyan-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-cyan-400">
              <Code2 className="h-5 w-5" />
              {frameworkAnalysis.framework} Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-500" />
                  Patterns Detected
                </h4>
                <ul className="space-y-1">
                  {frameworkAnalysis.patternsDetected.map((pattern, i) => (
                    <li key={i} className="text-sm text-muted-foreground pl-6 relative">
                      <span className="absolute left-1 top-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500/50"></span>
                      {pattern}
                    </li>
                  ))}
                  {frameworkAnalysis.advancedUsage?.map((pattern, i) => (
                    <li key={`adv-${i}`} className="text-sm text-cyan-200/80 pl-6 relative font-medium">
                      <span className="absolute left-1 top-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                      {pattern}
                    </li>
                  ))}
                </ul>
              </div>
              
              {frameworkAnalysis.suggestions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Framework Suggestions
                  </h4>
                  <ul className="space-y-2">
                    {frameworkAnalysis.suggestions.map((sugg, i) => (
                      <li key={i} className="text-sm p-2 rounded bg-background/50 border border-border/50">
                        {sugg}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
