
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { post } from '@/api/client'
import { Plus, X, ArrowLeft, ShieldCheck } from 'lucide-react'

// Skill Categories matching backend
const CATEGORIES = [
  'LANGUAGE', 'FRAMEWORK', 'DATABASE', 'DEVOPS', 'TOOL', 'SOFT_SKILL', 'OTHER'
]

const LEVELS = [
  'BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'
]

interface EvidenceLink {
  url: string
  description: string
}

export default function ClaimSkills() {
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>('OTHER')
  const [level, setLevel] = useState<string>('BEGINNER')
  const [evidenceLinks, setEvidenceLinks] = useState<EvidenceLink[]>([{ url: '', description: '' }])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddLink = () => {
    setEvidenceLinks([...evidenceLinks, { url: '', description: '' }])
  }

  const handleRemoveLink = (index: number) => {
    setEvidenceLinks(evidenceLinks.filter((_, i) => i !== index))
  }

  const handleLinkChange = (index: number, field: keyof EvidenceLink, value: string) => {
    const newLinks = [...evidenceLinks]
    newLinks[index][field] = value
    setEvidenceLinks(newLinks)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return

    setIsSubmitting(true)
    try {
      const evidence = evidenceLinks.filter(l => l.url).map(l => ({
        url: l.url,
        description: l.description,
        label: 'Proof'
      }))

      await post('/v1/skills/manual', {
        name,
        category,
        selfDeclaredLevel: level,
        evidence
      })

      toast({
        title: 'Skill Claimed! 🎉',
        description: 'Your skill has been added to your profile.',
      })

      navigate('/profile')
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Failed to claim skill',
            description: error?.response?.data?.message || 'Something went wrong.'
        })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container max-w-2xl py-12 animate-in fade-in duration-500">
      <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate('/profile')}>
        <ArrowLeft className="w-4 h-4" /> Back to Profile
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
          Claim a Skill
        </h1>
        <p className="text-muted-foreground mt-2">
          Add skills you've used outside of our analyzed projects. Providing evidence increases trust.
        </p>
      </div>

      <Card className="p-6 border-primary/20 bg-card/50 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-2">
            <Label htmlFor="name">Skill Name <span className="text-destructive">*</span></Label>
            <Input 
              id="name" 
              placeholder="e.g. Rust, Kafka, Public Speaking" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             </div>

             <div className="space-y-2">
                <Label>Proficiency Level</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map(l => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label>Evidence / Proof</Label>
                <Badge variant="outline" className="bg-primary/5 text-primary">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    Recommended
                </Badge>
            </div>
            
            {evidenceLinks.map((link, index) => (
                <div key={index} className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
                     <div className="flex gap-2">
                        <Input 
                            placeholder="https://github.com/..." 
                            value={link.url}
                            onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                        />
                         {evidenceLinks.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveLink(index)}>
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                     </div>
                     <Input 
                        placeholder="Description (e.g. Built a microservice using Actix)" 
                        value={link.description}
                        onChange={(e) => handleLinkChange(index, 'description', e.target.value)}
                        className="text-sm"
                     />
                </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={handleAddLink} className="w-full gap-2 border-dashed">
                <Plus className="w-4 h-4" /> Add Another Link
            </Button>
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full h-11 text-lg gap-2" disabled={isSubmitting}>
              {isSubmitting ? 'Claiming...' : 'Claim Skill'}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-4">
                This skill will be marked as "Claimed" on your profile until verified by our system.
            </p>
          </div>

        </form>
      </Card>
    </div>
  )
}
