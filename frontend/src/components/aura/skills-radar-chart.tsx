import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Zap } from 'lucide-react'
import type { VerifiedSkill } from '@/types'

interface SkillsRadarChartProps {
  skills: VerifiedSkill[]
  className?: string
}

// Group skills by category and calculate averages
function getRadarData(skills: VerifiedSkill[]) {
  const categories = ['language', 'framework', 'database', 'devops', 'infrastructure', 'testing']
  
  return categories.map(category => {
    const categorySkills = skills.filter(s => s.category === category)
    const avgConfidence = categorySkills.length > 0 
      ? categorySkills.reduce((acc, s) => acc + (s.confidence || s.score || 0), 0) / categorySkills.length
      : 0
    
    return {
      category: category.charAt(0).toUpperCase() + category.slice(1),
      value: Math.round(avgConfidence * 100) / 100,
      fullMark: 100,
      count: categorySkills.length,
    }
  })
}

export function SkillsRadarChart({ skills, className }: SkillsRadarChartProps) {
  const radarData = getRadarData(skills)
  
  // Get top skills
  const topSkills = [...skills]
    .sort((a, b) => (b.confidence || b.score || 0) - (a.confidence || a.score || 0))
    .slice(0, 5)

  if (skills.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            Skills Radar
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Zap className="h-10 w-10 mb-2 opacity-50" />
          <p className="text-sm">No verified skills yet</p>
          <p className="text-xs">Analyze projects to verify your skills</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-primary" />
          Skills Radar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Radar Chart */}
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis 
                dataKey="category" 
                tick={{ fontSize: 10, fill: '#9ca3af' }}
              />
              <Radar
                name="Skills"
                dataKey="value"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.4}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>

          {/* Top Skills List */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground mb-3">Top Verified Skills</p>
            {topSkills.map((skill, index) => (
              <div key={skill.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
                  <span className="text-sm font-medium">{skill.name}</span>
                </div>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${
                    (skill.confidence || skill.score || 0) >= 80 
                      ? 'bg-green-500/20 text-green-400' 
                      : (skill.confidence || skill.score || 0) >= 60
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {Math.round(skill.confidence || skill.score || 0)}%
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Category Summary */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
          {radarData.filter(d => d.count > 0).map((item) => (
            <Badge key={item.category} variant="outline" className="text-xs">
              {item.category}: {item.count} skill{item.count > 1 ? 's' : ''}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default SkillsRadarChart
