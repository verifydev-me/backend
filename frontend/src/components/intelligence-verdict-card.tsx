import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  Brain, 
  CheckCircle, 
  AlertTriangle, 
  Target, 
  Zap, 
  Award,
  TrendingUp,
  Clock,
  Lightbulb
} from 'lucide-react'
import { IntelligenceVerdict, HireSignal } from '@/types'

interface IntelligenceVerdictCardProps {
  verdict: IntelligenceVerdict
}

const getHireSignalColor = (signal: HireSignal) => {
  switch (signal) {
    case 'STRONG_HIRE':
      return 'bg-green-500 text-white border-green-600'
    case 'HIRE':
      return 'bg-blue-500 text-white border-blue-600'
    case 'BORDERLINE':
      return 'bg-yellow-500 text-black border-yellow-600'
    case 'NO_HIRE':
      return 'bg-red-500 text-white border-red-600'
  }
}

const getHireSignalLabel = (signal: HireSignal) => {
  switch (signal) {
    case 'STRONG_HIRE': return '🔥 Strong Hire'
    case 'HIRE': return '✅ Hire'
    case 'BORDERLINE': return '⚠️ Borderline'
    case 'NO_HIRE': return '❌ No Hire'
  }
}

export function IntelligenceVerdictCard({ verdict }: IntelligenceVerdictCardProps) {
  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Intelligence Verdict
          </CardTitle>
          <Badge className={`px-3 py-1 text-sm font-semibold ${getHireSignalColor(verdict.hireSignal)}`}>
            {getHireSignalLabel(verdict.hireSignal)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="space-y-2">
          <p className="text-lg font-medium text-foreground">{verdict.projectIntentSummary}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
              {verdict.developerLevel}
            </Badge>
            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">
              {verdict.projectIntent}
            </Badge>
          </div>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Architecture Maturity</span>
              <span className="font-semibold">{verdict.architectureMaturity}/10</span>
            </div>
            <Progress value={verdict.architectureMaturity * 10} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Score</span>
              <span className="font-semibold">{Math.round(verdict.overallScore)}%</span>
            </div>
            <Progress value={verdict.overallScore} className="h-2" />
          </div>
        </div>

        {/* Tech Stack */}
        {verdict.techStackSnapshot && verdict.techStackSnapshot.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Zap className="h-4 w-4" /> Tech Stack
            </h4>
            <div className="flex flex-wrap gap-2">
              {verdict.techStackSnapshot.map((tech: string) => (
                <Badge key={tech} variant="secondary">{tech}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Strengths & Risks */}
        <div className="grid md:grid-cols-2 gap-4">
          {verdict.strengthSignals && verdict.strengthSignals.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-green-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> Strengths
              </h4>
              <ul className="space-y-1">
                {verdict.strengthSignals.map((signal: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-1">
                    <span className="text-green-500">•</span> {signal}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {verdict.riskSignals && verdict.riskSignals.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" /> Risks
              </h4>
              <ul className="space-y-1">
                {verdict.riskSignals.map((signal: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-1">
                    <span className="text-red-500">•</span> {signal}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Suggestions */}
        {verdict.suggestions && verdict.suggestions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Lightbulb className="h-4 w-4" /> Top Suggestions
            </h4>
            <div className="space-y-2">
              {verdict.suggestions.slice(0, 5).map((suggestion, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      Impact: {suggestion.impactScore}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Effort: {suggestion.effortScore}
                    </Badge>
                  </div>
                  <span className="text-sm flex-1">{suggestion.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extracted Skills */}
        {verdict.extractedSkills && verdict.extractedSkills.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Award className="h-4 w-4" /> Extracted Skills
            </h4>
            <div className="flex flex-wrap gap-2">
              {verdict.extractedSkills.map((skill, i) => (
                <Badge 
                  key={i} 
                  variant={skill.resumeReady ? "default" : "outline"}
                  className={skill.resumeReady ? "bg-primary/80" : ""}
                >
                  {skill.name} ({skill.confidence}%)
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Senior Engineer Verdict */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <h4 className="text-sm font-medium text-primary flex items-center gap-1 mb-2">
            <Target className="h-4 w-4" /> Senior Engineer Assessment
          </h4>
          <p className="text-sm text-foreground/90 leading-relaxed">
            {verdict.seniorEngineerVerdict}
          </p>
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Analysis: {verdict.analysisTimeMs}ms
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Modules: {verdict.modulesExecuted?.length || 0} run, {verdict.modulesSkipped?.length || 0} skipped
          </div>
          {verdict.earlyTermination && (
            <Badge variant="outline" className="text-xs">Early Exit: {verdict.exitReason}</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
