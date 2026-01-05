/**
 * Resume React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
import * as resumeService from '@/api/services/resume.service'
import type { GenerateResumeRequest } from '@/api/services/resume.service'

// Query Keys
export const resumeKeys = {
  all: ['resume'] as const,
  data: () => [...resumeKeys.all, 'data'] as const,
  generations: () => [...resumeKeys.all, 'generations'] as const,
  status: (id: string) => [...resumeKeys.all, 'status', id] as const,
  public: (token: string) => [...resumeKeys.all, 'public', token] as const,
}

// ============================================
// RESUME HOOKS
// ============================================

export const useMyResumeData = () => {
  return useQuery({
    queryKey: resumeKeys.data(),
    queryFn: resumeService.getMyResumeData,
  })
}

export const useGenerateResume = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: GenerateResumeRequest) => resumeService.generateResume(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resumeKeys.generations() })
      toast({
        title: 'Resume generation started',
        description: 'Your resume is being generated. This may take a few moments.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Generation failed',
        description: error?.response?.data?.message || 'Failed to generate resume. Please try again.',
        variant: 'destructive',
      })
    },
  })
}

export const useResumeStatus = (resumeId: string) => {
  return useQuery({
    queryKey: resumeKeys.status(resumeId),
    queryFn: () => resumeService.getResumeStatus(resumeId),
    enabled: !!resumeId,
    refetchInterval: (query) => {
      // Stop polling if completed or failed
      const data = query.state.data
      if (data?.status === 'COMPLETED' || data?.status === 'FAILED') {
        return false
      }
      return 2000 // Poll every 2 seconds while generating
    },
  })
}

export const useMyResumes = () => {
  return useQuery({
    queryKey: resumeKeys.generations(),
    queryFn: resumeService.getMyResumes,
  })
}

export const usePublicResume = (token: string) => {
  return useQuery({
    queryKey: resumeKeys.public(token),
    queryFn: () => resumeService.getPublicResume(token),
    enabled: !!token,
  })
}

export const useCreatePublicResumeLink = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ resumeId, expiresInDays }: { resumeId: string; expiresInDays?: number }) =>
      resumeService.createPublicResumeLink(resumeId, expiresInDays),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: resumeKeys.generations() })
      toast({
        title: 'Public link created',
        description: 'Your resume can now be shared publicly.',
      })
      
      // Copy to clipboard
      navigator.clipboard.writeText(data.publicUrl)
      toast({
        title: 'Link copied!',
        description: 'The public link has been copied to your clipboard.',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create public link. Please try again.',
        variant: 'destructive',
      })
    },
  })
}

export const useDeleteResume = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (resumeId: string) => resumeService.deleteResume(resumeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resumeKeys.generations() })
      toast({
        title: 'Resume deleted',
        description: 'The resume has been deleted successfully.',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete resume. Please try again.',
        variant: 'destructive',
      })
    },
  })
}
