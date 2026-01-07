import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/hooks/use-toast'
import { post, get } from '@/api/client'
import { useAuthStore } from '@/store/auth-store'
import { AuraBadge } from '@/components/aura-score'
import type { Job } from '@/types'
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  FileText,
  User,
  Mail,
  MapPin,
  Code,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from 'lucide-react'

const applicationSchema = z.object({
  coverLetter: z.string().min(50, 'Cover letter must be at least 50 characters').max(1000),
})

type ApplicationFormData = z.infer<typeof applicationSchema>

interface ApplyJobModalProps {
  job: Job
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ApplyJobModal({ job, open, onOpenChange }: ApplyJobModalProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<'form' | 'preview'>('form')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      coverLetter: '',
    },
  })

  const coverLetter = watch('coverLetter')

  // Fetch user profile for preview
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => get<any>('/v1/users/me'),
    enabled: open,
  })

  const applyMutation = useMutation({
    mutationFn: (data: ApplicationFormData) => {
      // Prepare application data with candidate info
      const applicationData = {
        coverLetter: data.coverLetter,
        candidateName: user?.name || userProfile?.name || 'Candidate',
        candidateEmail: user?.email || userProfile?.email || 'candidate@example.com',
        candidateAura: userProfile?.auraScore || 0,
        candidateCores: userProfile?.coreCount || 1,
        candidateSkills: userProfile?.skills?.map((s: any) => s.name) || [],
      }
      return post(`/v1/jobs/${job.id}/apply`, applicationData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', job.id] })
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      toast({
        title: 'Application submitted! 🎉',
        description: 'The recruiter will review your profile.',
      })
      onOpenChange(false)
      reset()
      setStep('form')
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to apply',
        description: error?.response?.data?.message || 'Please try again later.',
      })
    },
  })

  const onSubmit = (data: ApplicationFormData) => {
    if (step === 'form') {
      setStep('preview')
    } else {
      applyMutation.mutate(data)
    }
  }

  const handleBack = () => {
    setStep('form')
  }

  const handleClose = () => {
    onOpenChange(false)
    reset()
    setStep('form')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {step === 'form' ? 'Apply for this position' : 'Review your application'}
          </DialogTitle>
          <DialogDescription>
            {step === 'form'
              ? `Apply to ${job.title} at ${job.company}`
              : 'Review your application before submitting'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {step === 'form' ? (
            <>
              {/* Job Info Card */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{job.title}</h3>
                      <p className="text-sm text-muted-foreground">{job.company}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="secondary">{job.type}</Badge>
                        <Badge variant="secondary">{job.experienceLevel}</Badge>
                        <Badge variant="secondary">{job.location}</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cover Letter */}
              <div className="space-y-2">
                <Label htmlFor="coverLetter">
                  Cover Letter <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="coverLetter"
                  placeholder="Tell the recruiter why you're a great fit for this role... (minimum 50 characters)"
                  className="min-h-[200px] resize-none"
                  {...register('coverLetter')}
                />
                {errors.coverLetter && (
                  <p className="text-sm text-destructive">{errors.coverLetter.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {coverLetter?.length || 0} / 1000 characters
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!coverLetter || coverLetter.length < 50}>
                  Continue to Preview
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Preview Step */}
              <div className="space-y-6">
                {/* Job Info */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Applying to</h3>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="font-semibold text-lg">{job.title}</p>
                      <p className="text-sm text-muted-foreground">{job.company}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{job.type}</Badge>
                      <Badge>{job.experienceLevel}</Badge>
                      <Badge variant="outline">{job.location}</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Your Profile Preview */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Your Profile</h3>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xl">
                        {user?.name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{user?.name || 'User'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">{user?.email}</p>
                        </div>
                        {userProfile?.location && (
                          <div className="flex items-center gap-2 mt-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">{userProfile.location}</p>
                          </div>
                        )}
                      </div>
                      {userProfile?.auraScore && (
                        <AuraBadge score={userProfile.auraScore} level={userProfile.auraCores || 1} size="md" />
                      )}
                    </div>

                    <Separator />

                    {/* Skills */}
                    {userProfile?.skills && userProfile.skills.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Code className="h-4 w-4 text-primary" />
                          <p className="text-sm font-medium">Skills</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {userProfile.skills.slice(0, 10).map((skill: any) => (
                            <Badge key={skill.name} variant="secondary">
                              {skill.name}
                            </Badge>
                          ))}
                          {userProfile.skills.length > 10 && (
                            <Badge variant="outline">+{userProfile.skills.length - 10} more</Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Cover Letter Preview */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Cover Letter</h3>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{coverLetter}</p>
                  </CardContent>
                </Card>

                {/* Match Info */}
                {job.requiredSkills && job.requiredSkills.length > 0 && (
                  <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <Sparkles className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-sm mb-2">Skill Match</p>
                          <div className="flex flex-wrap gap-2">
                            {(job.requiredSkills as string[]).map((skill: string) => {
                              const userHasSkill = userProfile?.skills?.some(
                                (s: any) => s.name?.toLowerCase() === skill?.toLowerCase()
                              )
                              return (
                                <div key={skill} className="flex items-center gap-1">
                                  {userHasSkill ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <XCircle className="h-3 w-3 text-red-500" />
                                  )}
                                  <span className="text-xs">{skill}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between gap-3">
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Edit
                </Button>
                <Button type="submit" disabled={applyMutation.isPending}>
                  {applyMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Application
                      <CheckCircle2 className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
