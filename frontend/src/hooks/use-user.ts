/**
 * User React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
import * as userService from '@/api/services/user.service'
import type {
  UpdateProfileData,
  OnboardingStep1Data,
  OnboardingStep2Data,
  AnalyzeProjectData,
} from '@/api/services/user.service'

// Query Keys
export const userKeys = {
  all: ['user'] as const,
  profile: () => [...userKeys.all, 'profile'] as const,
  publicProfile: (username: string) => [...userKeys.all, 'public', username] as const,
  onboarding: () => [...userKeys.all, 'onboarding'] as const,
  repos: () => [...userKeys.all, 'repos'] as const,
  projects: () => [...userKeys.all, 'projects'] as const,
  skills: () => [...userKeys.all, 'skills'] as const,
  aura: () => [...userKeys.all, 'aura'] as const,
  publicAura: (username: string) => [...userKeys.all, 'aura', username] as const,
  settings: () => [...userKeys.all, 'settings'] as const,
}

// ============================================
// PROFILE HOOKS
// ============================================

export const useMyProfile = () => {
  return useQuery({
    queryKey: userKeys.profile(),
    queryFn: userService.getMyProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const usePublicProfile = (username: string) => {
  return useQuery({
    queryKey: userKeys.publicProfile(username),
    queryFn: () => userService.getPublicProfile(username),
    enabled: !!username,
  })
}

export const useUpdateProfile = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateProfileData) => userService.updateMyProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.profile() })
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

export const useSyncGitHub = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userService.syncGitHub,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.profile() })
      queryClient.invalidateQueries({ queryKey: userKeys.repos() })
      queryClient.invalidateQueries({ queryKey: userKeys.projects() })
      toast({
        title: 'GitHub synced',
        description: 'Your GitHub data has been synced successfully.',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to sync GitHub. Please try again.',
        variant: 'destructive',
      })
    },
  })
}

// ============================================
// ONBOARDING HOOKS
// ============================================

export const useOnboardingStatus = () => {
  return useQuery({
    queryKey: userKeys.onboarding(),
    queryFn: userService.getOnboardingStatus,
  })
}

export const useUpdateOnboardingStep1 = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: OnboardingStep1Data) => userService.updateOnboardingStep1(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.onboarding() })
      queryClient.invalidateQueries({ queryKey: userKeys.profile() })
    },
  })
}

export const useUpdateOnboardingStep2 = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: OnboardingStep2Data) => userService.updateOnboardingStep2(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.onboarding() })
      queryClient.invalidateQueries({ queryKey: userKeys.profile() })
    },
  })
}

export const useSkipOnboardingStep2 = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userService.skipOnboardingStep2,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.onboarding() })
    },
  })
}

export const useCompleteOnboarding = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userService.completeOnboarding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.onboarding() })
      queryClient.invalidateQueries({ queryKey: userKeys.profile() })
      toast({
        title: 'Welcome to VerifyDev! 🎉',
        description: 'Your profile is ready. Start exploring opportunities!',
      })
    },
  })
}

// ============================================
// PROJECT HOOKS
// ============================================

export const useAvailableRepos = () => {
  return useQuery({
    queryKey: userKeys.repos(),
    queryFn: userService.getAvailableRepos,
  })
}

export const useMyProjects = () => {
  return useQuery({
    queryKey: userKeys.projects(),
    queryFn: userService.getMyProjects,
  })
}

export const useAnalyzeProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AnalyzeProjectData) => userService.analyzeProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.projects() })
      queryClient.invalidateQueries({ queryKey: userKeys.skills() })
      queryClient.invalidateQueries({ queryKey: userKeys.aura() })
      toast({
        title: 'Project analysis started',
        description: 'Your project is being analyzed. This may take a few minutes.',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to start project analysis. Please try again.',
        variant: 'destructive',
      })
    },
  })
}

// ============================================
// SKILLS HOOKS
// ============================================

export const useMySkills = () => {
  return useQuery({
    queryKey: userKeys.skills(),
    queryFn: userService.getMySkills,
  })
}

// ============================================
// AURA HOOKS
// ============================================

export const useMyAura = () => {
  return useQuery({
    queryKey: userKeys.aura(),
    queryFn: userService.getMyAura,
  })
}

export const usePublicAura = (username: string) => {
  return useQuery({
    queryKey: userKeys.publicAura(username),
    queryFn: () => userService.getPublicAura(username),
    enabled: !!username,
  })
}

// ============================================
// SETTINGS HOOKS
// ============================================

export const useSettings = () => {
  return useQuery({
    queryKey: userKeys.settings(),
    queryFn: userService.getSettings,
  })
}

export const useUpdateSettings = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userService.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.settings() })
      toast({
        title: 'Settings updated',
        description: 'Your settings have been saved.',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update settings. Please try again.',
        variant: 'destructive',
      })
    },
  })
}
