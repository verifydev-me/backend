import { z } from 'zod';

// Update profile validation
export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  website: z.string().url().max(200).optional().or(z.literal('')),
  twitterHandle: z.string().max(50).optional(),
});

// Update settings validation
export const updateSettingsSchema = z.object({
  isPublic: z.boolean().optional(),
  isOpenToWork: z.boolean().optional(),
});

// Username validation
export const usernameParamSchema = z.object({
  username: z.string().min(1).max(100),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
