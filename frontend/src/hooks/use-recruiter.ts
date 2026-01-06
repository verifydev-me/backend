/**
 * Recruiter React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'
import { useRecruiterStore } from '@/store/recruiter-store'
import * as recruiterService from '@/api/services/recruiter.service'
import type {
  RecruiterRegisterData,
  RecruiterLoginData,
  CandidateSearchFilters,
  ShortlistCandidate,
  UpdateRecruiterProfileData,
} from '@/api/services/recruiter.service'

// Query Keys
export const recruiterKeys = {
  all: ['recruiter'] as const,
  auth: () => [...recruiterKeys.all, 'auth'] as const,
  me: () => [...recruiterKeys.auth(), 'me'] as const,
  dashboard: () => [...recruiterKeys.all, 'dashboard'] as const,
  candidates: () => [...recruiterKeys.all, 'candidates'] as const,
  candidateSearch: (filters: CandidateSearchFilters) => 
    [...recruiterKeys.candidates(), 'search', filters] as const,
  candidateProfile: (userId: string) => 
    [...recruiterKeys.candidates(), 'profile', userId] as const,
  candidateFullProfile: (userId: string) => 
    [...recruiterKeys.candidates(), 'full-profile', userId] as const,
  candidateResume: (userId: string) => 
    [...recruiterKeys.candidates(), 'resume', userId] as const,
  shortlist: () => [...recruiterKeys.all, 'shortlist'] as const,
}

// ============================================
// AUTHENTICATION HOOKS
// ============================================

export const useRecruiterRegister = () => {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (data: RecruiterRegisterData) => recruiterService.registerRecruiter(data),
    onSuccess: (data: any) => {
      // Access direct state setter because the store might not have setRecruiter yet
      useRecruiterStore.setState({ 
        recruiter: data.recruiter, 
        accessToken: data.accessToken, 
        isAuthenticated: true 
      })

      toast({
        title: 'Account created! 🎉',
        description: 'Welcome to VerifyDev Recruiter Dashboard.',
      })
      navigate('/recruiter/dashboard')
    },
    onError: (error: any) => {
      toast({
        title: 'Registration failed',
        description: error?.response?.data?.message || 'Please try again.',
        variant: 'destructive',
      })
    },
  })
}

export const useRecruiterLogin = () => {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (data: RecruiterLoginData) => recruiterService.loginRecruiter(data),
    onSuccess: (data: any) => {
      useRecruiterStore.setState({ 
        recruiter: data.recruiter, 
        accessToken: data.accessToken, 
        isAuthenticated: true 
      })

      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      })
      navigate('/recruiter/dashboard')
    },
    onError: (error: any) => {
      toast({
        title: 'Login failed',
        description: error?.response?.data?.message || 'Invalid credentials.',
        variant: 'destructive',
      })
    },
  })
}

export const useCurrentRecruiter = () => {
  const { isAuthenticated } = useRecruiterStore()
  
  return useQuery({
    queryKey: recruiterKeys.me(),
    queryFn: recruiterService.getCurrentRecruiter,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useUpdateRecruiterProfile = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateRecruiterProfileData) => recruiterService.updateRecruiterProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recruiterKeys.me() })
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      })
    },
  })
}

export const useRecruiterLogout = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { logout: clearAuth } = useRecruiterStore()

  return useMutation({
    mutationFn: recruiterService.logoutRecruiter,
    onSuccess: () => {
      clearAuth()
      queryClient.clear()
      navigate('/recruiter/login')
    },
  })
}

// ============================================
// DASHBOARD HOOKS
// ============================================

export const useRecruiterDashboard = () => {
  return useQuery({
    queryKey: recruiterKeys.dashboard(),
    queryFn: recruiterService.getRecruiterDashboard,
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

// ============================================
// CANDIDATE SEARCH HOOKS
// ============================================

export const useSearchCandidates = (filters: CandidateSearchFilters) => {
  return useQuery({
    queryKey: recruiterKeys.candidateSearch(filters),
    queryFn: () => recruiterService.searchCandidates(filters),
    placeholderData: (previousData) => previousData,
  })
}

export const useCandidateProfile = (userId: string) => {
  return useQuery({
    queryKey: recruiterKeys.candidateProfile(userId),
    queryFn: () => recruiterService.getCandidateProfile(userId),
    enabled: !!userId,
  })
}

export const useFullCandidateProfile = (userId: string) => {
  return useQuery({
    queryKey: recruiterKeys.candidateFullProfile(userId),
    queryFn: () => recruiterService.getFullCandidateProfile(userId),
    enabled: !!userId,
  })
}

export const useCandidateResume = (userId: string) => {
  return useQuery({
    queryKey: recruiterKeys.candidateResume(userId),
    queryFn: () => recruiterService.getCandidateResume(userId),
    enabled: !!userId,
  })
}

// ============================================
// SHORTLIST HOOKS
// ============================================

export const useShortlistCandidate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ShortlistCandidate) => recruiterService.shortlistCandidate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recruiterKeys.shortlist() })
      toast({
        title: 'Candidate shortlisted',
        description: 'The candidate has been added to your shortlist.',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to shortlist candidate. Please try again.',
        variant: 'destructive',
      })
    },
  })
}

export const useShortlist = () => {
  return useQuery({
    queryKey: recruiterKeys.shortlist(),
    queryFn: recruiterService.getShortlist,
    initialData: [],
    select: (data) => Array.isArray(data) ? data : [],
  })
}
