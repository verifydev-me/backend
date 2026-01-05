/**
 * Job React Query Hooks
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
import * as jobService from '@/api/services/job.service'
import type { JobSearchFilters, ApplyToJobData, PaginatedJobs } from '@/api/services/job.service'

// Query Keys
export const jobKeys = {
  all: ['jobs'] as const,
  lists: () => [...jobKeys.all, 'list'] as const,
  list: (filters: JobSearchFilters) => [...jobKeys.lists(), filters] as const,
  matched: () => [...jobKeys.all, 'matched'] as const,
  recommended: () => [...jobKeys.all, 'recommended'] as const,
  detail: (id: string) => [...jobKeys.all, 'detail', id] as const,
  withMatch: (id: string) => [...jobKeys.all, 'with-match', id] as const,
  canApply: (id: string) => [...jobKeys.all, 'can-apply', id] as const,
  applications: () => ['applications'] as const,
  applicationsList: (page: number) => [...jobKeys.applications(), 'list', page] as const,
  applicationDetail: (id: string) => [...jobKeys.applications(), 'detail', id] as const,
}

// ============================================
// JOB DISCOVERY HOOKS
// ============================================

export const useJobs = (page = 1, limit = 20) => {
  return useQuery({
    queryKey: jobKeys.list({ page, limit }),
    queryFn: () => jobService.listJobs(page, limit),
    placeholderData: (previousData) => previousData,
  })
}

export const useJobSearch = (filters: JobSearchFilters) => {
  return useQuery({
    queryKey: jobKeys.list(filters),
    queryFn: () => jobService.searchJobs(filters),
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Infinite scroll for job search
 */
export const useInfiniteJobSearch = (filters: Omit<JobSearchFilters, 'page'>) => {
  return useInfiniteQuery({
    queryKey: jobKeys.list(filters),
    queryFn: ({ pageParam }) => jobService.searchJobs({ ...filters, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: PaginatedJobs) => {
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1
      }
      return undefined
    },
  })
}

export const useMatchedJobs = (page = 1, limit = 20) => {
  return useQuery({
    queryKey: jobKeys.matched(),
    queryFn: () => jobService.getMatchedJobs(page, limit),
    placeholderData: (previousData) => previousData,
  })
}

export const useRecommendedJobs = (limit = 10) => {
  return useQuery({
    queryKey: jobKeys.recommended(),
    queryFn: () => jobService.getRecommendedJobs(limit),
  })
}

export const useJob = (jobId: string) => {
  return useQuery({
    queryKey: jobKeys.detail(jobId),
    queryFn: () => jobService.getJob(jobId),
    enabled: !!jobId,
  })
}

export const useJobWithMatch = (jobId: string) => {
  return useQuery({
    queryKey: jobKeys.withMatch(jobId),
    queryFn: () => jobService.getJobWithMatch(jobId),
    enabled: !!jobId,
  })
}

export const useCanApplyToJob = (jobId: string) => {
  return useQuery({
    queryKey: jobKeys.canApply(jobId),
    queryFn: () => jobService.canApplyToJob(jobId),
    enabled: !!jobId,
  })
}

// ============================================
// APPLICATION HOOKS
// ============================================

export const useApplyToJob = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ jobId, data }: { jobId: string; data: ApplyToJobData }) =>
      jobService.applyToJob(jobId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.canApply(variables.jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.applications() })
      toast({
        title: 'Application submitted! 🎉',
        description: 'Your application has been sent to the recruiter.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Application failed',
        description: error?.response?.data?.message || 'Failed to submit application. Please try again.',
        variant: 'destructive',
      })
    },
  })
}

export const useMyApplications = (page = 1, limit = 20) => {
  return useQuery({
    queryKey: jobKeys.applicationsList(page),
    queryFn: () => jobService.getMyApplications(page, limit),
    placeholderData: (previousData) => previousData,
  })
}

export const useApplication = (applicationId: string) => {
  return useQuery({
    queryKey: jobKeys.applicationDetail(applicationId),
    queryFn: () => jobService.getApplication(applicationId),
    enabled: !!applicationId,
  })
}

export const useWithdrawApplication = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (applicationId: string) => jobService.withdrawApplication(applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.applications() })
      toast({
        title: 'Application withdrawn',
        description: 'Your application has been withdrawn.',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to withdraw application. Please try again.',
        variant: 'destructive',
      })
    },
  })
}
