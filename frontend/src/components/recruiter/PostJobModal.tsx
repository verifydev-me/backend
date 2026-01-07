import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/hooks/use-toast'
import { 
  createJob, 
  validateJobForm, 
  calculateJobCompleteness 
} from '@/api/services/recruiter-job.service'
import type { CreateJobRequest, JobType, ExperienceLevel, JobSkill } from '@/types/job'
import { 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Code,
  FileText,
  ChevronRight,
  ChevronLeft,
  Eye,
  Loader2,
  Plus,
  X,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'

interface PostJobModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const jobTypes: { value: JobType; label: string }[] = [
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'FREELANCE', label: 'Freelance' },
]

const experienceLevels: { value: ExperienceLevel; label: string }[] = [
  { value: 'ENTRY', label: 'Entry Level' },
  { value: 'JUNIOR', label: 'Junior' },
  { value: 'MID', label: 'Mid Level' },
  { value: 'SENIOR', label: 'Senior' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'PRINCIPAL', label: 'Principal' },
]

export function PostJobModal({ open, onOpenChange }: PostJobModalProps) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<Partial<CreateJobRequest>>({
    type: 'FULL_TIME',
    level: 'MID',
    isRemote: false,
    salaryCurrency: 'USD',
    requiredSkills: [],
    preferredSkills: [],
    minAuraScore: 0,
    minCoreCount: 1,
  })
  const [skillInput, setSkillInput] = useState('')
  const [preferredSkillInput, setPreferredSkillInput] = useState('')

  const completeness = calculateJobCompleteness(formData)

  const createJobMutation = useMutation({
    mutationFn: createJob,
    onSuccess: () => {
      toast({
        title: 'Job posted successfully! 🎉',
        description: 'Your job is now live and visible to candidates.',
      })
      queryClient.invalidateQueries({ queryKey: ['recruiter-jobs'] })
      onOpenChange(false)
      resetForm()
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to post job',
        description: error?.response?.data?.message || 'Something went wrong',
      })
    },
  })

  const resetForm = () => {
    setFormData({
      type: 'FULL_TIME',
      level: 'MID',
      isRemote: false,
      salaryCurrency: 'USD',
      requiredSkills: [],
      preferredSkills: [],
      minAuraScore: 0,
      minCoreCount: 1,
    })
    setStep(1)
  }

  const handleAddSkill = () => {
    if (skillInput.trim() && formData.requiredSkills) {
      const newSkill: JobSkill = {
        skillName: skillInput.trim(),
        minScore: 50,
        isRequired: true,
      }
      setFormData({
        ...formData,
        requiredSkills: [...formData.requiredSkills, newSkill],
      })
      setSkillInput('')
    }
  }

  const handleRemoveSkill = (index: number) => {
    if (formData.requiredSkills) {
      setFormData({
        ...formData,
        requiredSkills: formData.requiredSkills.filter((_, i) => i !== index),
      })
    }
  }

  const handleAddPreferredSkill = () => {
    if (preferredSkillInput.trim() && formData.preferredSkills) {
      setFormData({
        ...formData,
        preferredSkills: [...formData.preferredSkills, preferredSkillInput.trim()],
      })
      setPreferredSkillInput('')
    }
  }

  const handleRemovePreferredSkill = (index: number) => {
    if (formData.preferredSkills) {
      setFormData({
        ...formData,
        preferredSkills: formData.preferredSkills.filter((_, i) => i !== index),
      })
    }
  }

  const handleSubmit = () => {
    const { valid, errors } = validateJobForm(formData)
    
    if (!valid) {
      toast({
        variant: 'destructive',
        title: 'Validation failed',
        description: Object.values(errors)[0],
      })
      return
    }

    createJobMutation.mutate(formData as CreateJobRequest)
  }

  const nextStep = () => {
    if (step < 4) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  const stepVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    }),
  }

  const [direction, setDirection] = useState(0)

  const handleNextStep = () => {
    setDirection(1)
    nextStep()
  }

  const handlePrevStep = () => {
    setDirection(-1)
    prevStep()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 gap-0 border-border/50 bg-background/95 backdrop-blur-2xl">
        {/* Header with glassmorphism */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent blur-2xl" />
          <DialogHeader className="relative p-6 pb-4 border-b border-border/50 bg-card/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg">
                <Briefcase className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <DialogTitle className="text-2xl">Post a New Job</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  Fill in the details to create your job posting
                </DialogDescription>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Step {step} of 4
                </span>
                <span className="text-xs font-medium text-primary">
                  {completeness}% Complete
                </span>
              </div>
              <Progress value={(step / 4) * 100} className="h-2 bg-muted/30" />
            </div>
          </DialogHeader>
        </div>

        {/* Form content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
            >
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Basic Information
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Job Title *</label>
                        <Input 
                          placeholder="e.g. Senior Full Stack Engineer"
                          value={formData.title || ''}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="bg-background/50"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Job Type *</label>
                          <Select
                            value={formData.type}
                            onValueChange={(value: JobType) => setFormData({ ...formData, type: value })}
                          >
                            <SelectTrigger className="bg-background/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {jobTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">Experience Level *</label>
                          <Select
                            value={formData.level}
                            onValueChange={(value: ExperienceLevel) => setFormData({ ...formData, level: value })}
                          >
                            <SelectTrigger className="bg-background/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {experienceLevels.map((level) => (
                                <SelectItem key={level.value} value={level.value}>
                                  {level.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Description *</label>
                        <Textarea 
                          placeholder="Describe the role, what you're looking for, and why candidates should join your team..."
                          value={formData.description || ''}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={6}
                          className="bg-background/50"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {formData.description?.length || 0}/10000 • Minimum 50 characters
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Location & Compensation */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      Location & Compensation
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Location *</label>
                        <Input 
                          placeholder="e.g. San Francisco, CA or Remote"
                          value={formData.location || ''}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className="bg-background/50"
                        />
                      </div>

                      <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                        <Switch
                          checked={formData.isRemote}
                          onCheckedChange={(checked) => setFormData({ ...formData, isRemote: checked })}
                        />
                        <div>
                          <p className="font-medium text-sm">Remote Work Available</p>
                          <p className="text-xs text-muted-foreground">This position can be performed remotely</p>
                        </div>
                      </div>

                      <Separator className="bg-border/50" />

                      <div>
                        <label className="text-sm font-medium mb-4 block flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Salary Range (Optional)
                        </label>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs text-muted-foreground mb-2 block">Currency</label>
                            <Select
                              value={formData.salaryCurrency}
                              onValueChange={(value) => setFormData({ ...formData, salaryCurrency: value })}
                            >
                              <SelectTrigger className="bg-background/50">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USD">USD ($)</SelectItem>
                                <SelectItem value="EUR">EUR (€)</SelectItem>
                                <SelectItem value="GBP">GBP (£)</SelectItem>
                                <SelectItem value="INR">INR (₹)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-2 block">Minimum</label>
                            <Input 
                              type="number"
                              placeholder="50000"
                              value={formData.salaryMin || ''}
                              onChange={(e) => setFormData({ ...formData, salaryMin: parseInt(e.target.value) || undefined })}
                              className="bg-background/50"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-2 block">Maximum</label>
                            <Input 
                              type="number"
                              placeholder="120000"
                              value={formData.salaryMax || ''}
                              onChange={(e) => setFormData({ ...formData, salaryMax: parseInt(e.target.value) || undefined })}
                              className="bg-background/50"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Skills & Requirements */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Code className="h-5 w-5 text-primary" />
                      Skills & Requirements
                    </h3>
                    
                    <div className="space-y-6">
                      {/* Required Skills */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">Required Skills *</label>
                        <div className="flex gap-2 mb-3">
                          <Input 
                            placeholder="e.g. React, Node.js, TypeScript"
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                            className="bg-background/50"
                          />
                          <Button type="button" onClick={handleAddSkill} variant="outline" size="icon">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {formData.requiredSkills?.map((skill, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                            >
                              <Badge className="gap-1 pr-1" variant="secondary">
                                {skill.skillName}
                                <button
                                  onClick={() => handleRemoveSkill(idx)}
                                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Preferred Skills */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">Preferred Skills (Optional)</label>
                        <div className="flex gap-2 mb-3">
                          <Input 
                            placeholder="e.g. GraphQL, Docker, AWS"
                            value={preferredSkillInput}
                            onChange={(e) => setPreferredSkillInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPreferredSkill())}
                            className="bg-background/50"
                          />
                          <Button type="button" onClick={handleAddPreferredSkill} variant="outline" size="icon">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {formData.preferredSkills?.map((skill, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                            >
                              <Badge className="gap-1 pr-1" variant="outline">
                                {skill}
                                <button
                                  onClick={() => handleRemovePreferredSkill(idx)}
                                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      <Separator className="bg-border/50" />

                      {/* Requirements & Responsibilities */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">Requirements *</label>
                        <Textarea 
                          placeholder="List the key requirements for this role..."
                          value={formData.requirements || ''}
                          onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                          rows={5}
                          className="bg-background/50"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Responsibilities *</label>
                        <Textarea 
                          placeholder="Describe what the candidate will be responsible for..."
                          value={formData.responsibilities || ''}
                          onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                          rows={5}
                          className="bg-background/50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Eye className="h-5 w-5 text-primary" />
                      Review & Publish
                    </h3>
                    
                    <div className="space-y-4">
                      {/* Completeness indicator */}
                      <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            <span className="font-semibold">Job Posting Strength</span>
                          </div>
                          <span className="text-sm font-bold text-primary">{completeness}%</span>
                        </div>
                        <Progress value={completeness} className="h-2 bg-background/50" />
                        <p className="text-xs text-muted-foreground mt-2">
                          {completeness === 100 
                            ? '✅ Your job posting is complete and ready to publish!' 
                            : '⚠️ Complete all required fields to publish'}
                        </p>
                      </div>

                      {/* Summary */}
                      <div className="space-y-3">
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                          <h4 className="font-semibold mb-2">{formData.title || 'Job Title'}</h4>
                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            <Badge variant="secondary">{formData.type}</Badge>
                            <Badge variant="secondary">{formData.level}</Badge>
                            <Badge variant="outline">{formData.location}</Badge>
                            {formData.isRemote && <Badge variant="outline">Remote</Badge>}
                          </div>
                        </div>

                        {formData.requiredSkills && formData.requiredSkills.length > 0 && (
                          <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                            <h4 className="font-semibold mb-2 text-sm">Required Skills ({formData.requiredSkills.length})</h4>
                            <div className="flex flex-wrap gap-2">
                              {formData.requiredSkills.slice(0, 5).map((skill, idx) => (
                                <Badge key={idx} variant="secondary">{skill.skillName}</Badge>
                              ))}
                              {formData.requiredSkills.length > 5 && (
                                <Badge variant="outline">+{formData.requiredSkills.length - 5} more</Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer with actions */}
        <div className="p-6 pt-4 border-t border-border/50 bg-card/30 flex items-center justify-between">
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={handlePrevStep}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            {step < 4 ? (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button onClick={handleNextStep} className="shadow-lg shadow-primary/30">
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </motion.div>
            ) : (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={handleSubmit}
                  disabled={createJobMutation.isPending || completeness < 100}
                  className="shadow-lg shadow-primary/30 bg-gradient-to-r from-primary to-primary/80"
                >
                  {createJobMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Publish Job
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
