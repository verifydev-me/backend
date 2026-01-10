/**
 * Job Posting Page for Recruiters
 */

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { toast } from '@/hooks/use-toast'
import { createJob } from '@/api/services/recruiter-job.service'
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  DollarSign,
  Plus,
  X,
  Eye,
  Send,
  Loader2,
} from 'lucide-react'

const jobSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(50, 'Description must be at least 50 characters'),
  location: z.string().min(2, 'Location is required'),
  isRemote: z.boolean(),
  type: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']),
  level: z.enum(['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD']),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  currency: z.string().default('USD'),
  applicationDeadline: z.string().optional(),
})

type JobFormData = z.infer<typeof jobSchema>

const POPULAR_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Go',
  'Java', 'PostgreSQL', 'MongoDB', 'Docker', 'Kubernetes', 'AWS',
  'GraphQL', 'REST API', 'Git', 'CI/CD', 'Agile', 'Testing',
]

export default function JobPostingPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [requiredSkills, setRequiredSkills] = useState<string[]>([])
  const [preferredSkills, setPreferredSkills] = useState<string[]>([])
  const [responsibilities, setResponsibilities] = useState<string[]>([''])
  const [qualifications] = useState<string[]>([''])
  const [benefits, setBenefits] = useState<string[]>([''])
  const [customSkill, setCustomSkill] = useState('')
  const [customPreferredSkill, setCustomPreferredSkill] = useState('')

  const form = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      isRemote: false,
      type: 'FULL_TIME',
      level: 'MID',
      currency: 'USD',
    },
  })

  // Watch form for preview
  form.watch()

  const addRequiredSkill = (skill: string) => {
    if (!requiredSkills.includes(skill)) {
      setRequiredSkills([...requiredSkills, skill])
    }
  }

  const removeRequiredSkill = (skill: string) => {
    setRequiredSkills(requiredSkills.filter(s => s !== skill))
  }

  const addPreferredSkill = (skill: string) => {
    if (!preferredSkills.includes(skill)) {
      setPreferredSkills([...preferredSkills, skill])
    }
  }

  const removePreferredSkill = (skill: string) => {
    setPreferredSkills(preferredSkills.filter(s => s !== skill))
  }

  const addCustomSkillToRequired = () => {
    if (customSkill.trim() && !requiredSkills.includes(customSkill.trim())) {
      addRequiredSkill(customSkill.trim())
      setCustomSkill('')
    }
  }

  const addCustomSkillToPreferred = () => {
    if (customPreferredSkill.trim() && !preferredSkills.includes(customPreferredSkill.trim())) {
      addPreferredSkill(customPreferredSkill.trim())
      setCustomPreferredSkill('')
    }
  }

  const updateListItem = (
    list: string[],
    setList: (items: string[]) => void,
    index: number,
    value: string
  ) => {
    const newList = [...list]
    newList[index] = value
    setList(newList)
  }

  const addListItem = (list: string[], setList: (items: string[]) => void) => {
    setList([...list, ''])
  }

  const removeListItem = (list: string[], setList: (items: string[]) => void, index: number) => {
    if (list.length > 1) {
      setList(list.filter((_, i) => i !== index))
    }
  }

  const onSubmit = async (data: JobFormData) => {
    if (requiredSkills.length === 0) {
      toast({
        title: 'Required skills needed',
        description: 'Please add at least one required skill',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await createJob({
        title: data.title,
        description: data.description,
        location: data.location,
        isRemote: data.isRemote,
        type: data.type,
        level: data.level,
        salaryMin: data.salaryMin,
        salaryMax: data.salaryMax,
        salaryCurrency: data.currency,
        requiredSkills: requiredSkills,
        preferredSkills: preferredSkills,
        responsibilities: responsibilities.filter((r: string) => r.trim()).join('\n'),
        requirements: qualifications.filter((q: string) => q.trim()).join('\n'),
      })

      toast({
        title: 'Job posted successfully! 🎉',
        description: 'Your job listing is now live.',
      })
      navigate('/recruiter/jobs')
    } catch (error: any) {
      toast({
        title: 'Failed to post job',
        description: error?.response?.data?.message || error?.message || 'Please try again',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/recruiter/jobs"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to jobs
        </Link>
        <h1 className="text-3xl font-bold mb-2">Post a New Job</h1>
        <p className="text-muted-foreground">
          Create a job listing to attract verified developers
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Senior Frontend Developer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the role, team, and what makes this opportunity exciting..."
                        className="min-h-32"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employment Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="FULL_TIME">Full Time</SelectItem>
                          <SelectItem value="PART_TIME">Part Time</SelectItem>
                          <SelectItem value="CONTRACT">Contract</SelectItem>
                          <SelectItem value="INTERNSHIP">Internship</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ENTRY">Entry Level</SelectItem>
                          <SelectItem value="JUNIOR">Junior</SelectItem>
                          <SelectItem value="MID">Mid Level</SelectItem>
                          <SelectItem value="SENIOR">Senior</SelectItem>
                          <SelectItem value="LEAD">Lead</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Location & Remote */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. San Francisco, CA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isRemote"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Remote Work</FormLabel>
                        <FormDescription>
                          Allow candidates to work remotely
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Salary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Compensation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="salaryMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Salary</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="50000"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="salaryMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Salary</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="100000"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                          <SelectItem value="INR">INR (₹)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Required Skills</CardTitle>
              <CardDescription>
                Add skills that candidates must have
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom skill..."
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSkillToRequired())}
                />
                <Button type="button" variant="outline" onClick={addCustomSkillToRequired}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {POPULAR_SKILLS.map(skill => (
                  <Badge
                    key={skill}
                    variant={requiredSkills.includes(skill) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() =>
                      requiredSkills.includes(skill)
                        ? removeRequiredSkill(skill)
                        : addRequiredSkill(skill)
                    }
                  >
                    {skill}
                    {requiredSkills.includes(skill) && <X className="ml-1 w-3 h-3" />}
                  </Badge>
                ))}
              </div>

              {requiredSkills.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Selected Required Skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {requiredSkills.map(skill => (
                      <Badge key={skill} className="gap-1">
                        {skill}
                        <button type="button" onClick={() => removeRequiredSkill(skill)}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preferred Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Preferred Skills (Optional)</CardTitle>
              <CardDescription>
                Nice-to-have skills that give candidates an edge
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom skill..."
                  value={customPreferredSkill}
                  onChange={(e) => setCustomPreferredSkill(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSkillToPreferred())}
                />
                <Button type="button" variant="outline" onClick={addCustomSkillToPreferred}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {POPULAR_SKILLS.filter(s => !requiredSkills.includes(s)).map(skill => (
                  <Badge
                    key={skill}
                    variant={preferredSkills.includes(skill) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() =>
                      preferredSkills.includes(skill)
                        ? removePreferredSkill(skill)
                        : addPreferredSkill(skill)
                    }
                  >
                    {skill}
                    {preferredSkills.includes(skill) && <X className="ml-1 w-3 h-3" />}
                  </Badge>
                ))}
              </div>

              {preferredSkills.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Selected Preferred Skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {preferredSkills.map(skill => (
                      <Badge key={skill} className="gap-1">
                        {skill}
                        <button type="button" onClick={() => removePreferredSkill(skill)}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Responsibilities */}
          <Card>
            <CardHeader>
              <CardTitle>Responsibilities</CardTitle>
              <CardDescription>
                What will the candidate be doing?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {responsibilities.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="e.g. Build and maintain web applications..."
                    value={item}
                    onChange={(e) => updateListItem(responsibilities, setResponsibilities, index, e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeListItem(responsibilities, setResponsibilities, index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => addListItem(responsibilities, setResponsibilities)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Responsibility
              </Button>
            </CardContent>
          </Card>

          {/* Benefits */}
          <Card>
            <CardHeader>
              <CardTitle>Benefits (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {benefits.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="e.g. Health insurance, 401k, unlimited PTO..."
                    value={item}
                    onChange={(e) => updateListItem(benefits, setBenefits, index, e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeListItem(benefits, setBenefits, index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => addListItem(benefits, setBenefits)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Benefit
              </Button>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setShowPreview(!showPreview)}>
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? 'Hide Preview' : 'Preview'}
            </Button>
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Post Job
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}
