import axios from 'axios';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { Job, UserSkill } from '../types/index.js';

interface SearchParams {
  tech?: string;
  role?: string;
  type?: string;
  experience?: string;
  limit?: number;
}

interface CountParams {
  tech?: string;
  role?: string;
  type?: string;
}

// Map role names to job categories
const ROLE_TO_CATEGORY: Record<string, string> = {
  'backend': 'BACKEND',
  'frontend': 'FRONTEND',
  'fullstack': 'FULLSTACK',
  'full-stack': 'FULLSTACK',
  'mobile': 'MOBILE',
  'devops': 'DEVOPS',
  'data': 'DATA_ENGINEERING',
  'ml': 'MACHINE_LEARNING',
  'ai': 'MACHINE_LEARNING',
  'security': 'SECURITY',
  'design': 'DESIGN',
  'qa': 'QA',
  'testing': 'QA',
};

// Map experience levels
const EXPERIENCE_TO_LEVEL: Record<string, string> = {
  'entry': 'ENTRY',
  'junior': 'JUNIOR',
  'mid': 'MID',
  'middle': 'MID',
  'senior': 'SENIOR',
  'lead': 'LEAD',
  'principal': 'PRINCIPAL',
};

class JobQueryService {
  private jobServiceUrl: string;
  private userServiceUrl: string;

  constructor() {
    this.jobServiceUrl = config.services.jobService;
    this.userServiceUrl = config.services.userService;
  }

  /**
   * Search jobs with filters
   */
  async searchJobs(params: SearchParams): Promise<{ jobs: Job[]; total: number } | { error: string }> {
    try {
      const queryParams = new URLSearchParams();
      
      // Map filters to API parameters
      if (params.tech) {
        queryParams.append('skills', params.tech);
      }
      if (params.role && ROLE_TO_CATEGORY[params.role.toLowerCase()]) {
        queryParams.append('category', ROLE_TO_CATEGORY[params.role.toLowerCase()]);
      }
      if (params.type) {
        if (params.type === 'remote') {
          queryParams.append('isRemote', 'true');
        } else if (params.type === 'onsite') {
          queryParams.append('isRemote', 'false');
        }
      }
      if (params.experience && EXPERIENCE_TO_LEVEL[params.experience.toLowerCase()]) {
        queryParams.append('level', EXPERIENCE_TO_LEVEL[params.experience.toLowerCase()]);
      }
      queryParams.append('limit', String(params.limit || 5));

      const url = `${this.jobServiceUrl}/api/v1/jobs/search?${queryParams.toString()}`;
      logger.debug({ url }, 'Searching jobs');

      const response = await axios.get(url, { timeout: 5000 });
      
      return {
        jobs: response.data.data?.jobs || response.data.jobs || [],
        total: response.data.data?.total || response.data.total || 0
      };
    } catch (error) {
      logger.error({ error }, 'Error searching jobs');
      return { error: 'Failed to fetch jobs. Please try again.' };
    }
  }

  /**
   * Count jobs matching criteria
   */
  async countJobs(params: CountParams): Promise<{ count: number; filters: CountParams } | { error: string }> {
    try {
      const result = await this.searchJobs({ ...params, limit: 1 });
      
      if ('error' in result) {
        return result;
      }

      return {
        count: result.total,
        filters: params
      };
    } catch (error) {
      logger.error({ error }, 'Error counting jobs');
      return { error: 'Failed to count jobs. Please try again.' };
    }
  }

  /**
   * Get jobs matched to user's profile
   */
  async getMatchedJobs(userId: string, limit: number = 5): Promise<{ jobs: Job[]; total: number; userSkills: string[] } | { error: string }> {
    try {
      // Get user skills first
      const skillsUrl = `${this.userServiceUrl}/api/v1/users/${userId}/skills-summary`;
      logger.debug({ skillsUrl }, 'Fetching user skills');

      let userSkills: string[] = [];
      try {
        const skillsResponse = await axios.get(skillsUrl, { timeout: 3000 });
        userSkills = skillsResponse.data.data?.skills?.map((s: UserSkill) => s.name) || [];
      } catch (error) {
        logger.warn({ error, userId }, 'Could not fetch user skills');
      }

      // Get matched jobs from job-service
      const matchedUrl = `${this.jobServiceUrl}/api/v1/jobs/matched`;
      const response = await axios.get(matchedUrl, {
        headers: { 'x-user-id': userId },
        params: { limit },
        timeout: 5000
      });

      return {
        jobs: response.data.data?.jobs || response.data.jobs || [],
        total: response.data.data?.total || response.data.total || 0,
        userSkills
      };
    } catch (error) {
      logger.error({ error, userId }, 'Error getting matched jobs');
      
      // Fallback to regular search if matched endpoint fails
      return await this.searchJobs({ limit });
    }
  }

  /**
   * Get job details
   */
  async getJobDetails(jobId: string): Promise<Job | { error: string }> {
    try {
      const url = `${this.jobServiceUrl}/api/v1/jobs/${jobId}`;
      logger.debug({ url }, 'Getting job details');

      const response = await axios.get(url, { timeout: 5000 });
      return response.data.data || response.data;
    } catch (error) {
      logger.error({ error, jobId }, 'Error getting job details');
      return { error: 'Job not found or failed to fetch details.' };
    }
  }

  /**
   * Apply to a job
   */
  async applyToJob(userId: string, jobId: string): Promise<{ success: boolean; message: string }> {
    try {
      const url = `${this.jobServiceUrl}/api/v1/jobs/${jobId}/apply`;
      logger.info({ userId, jobId }, 'Applying to job');

      await axios.post(url, {}, {
        headers: { 
          'x-user-id': userId,
          'Authorization': `Bearer internal-service-token`
        },
        timeout: 5000
      });

      return {
        success: true,
        message: 'Successfully applied to the job!'
      };
    } catch (error: any) {
      logger.error({ error, userId, jobId }, 'Error applying to job');
      
      // Handle specific error cases
      if (error.response?.status === 409) {
        return { success: false, message: 'You have already applied to this job.' };
      }
      if (error.response?.status === 404) {
        return { success: false, message: 'Job not found.' };
      }
      if (error.response?.status === 401) {
        return { success: false, message: 'Please link your VerifyDev account first.' };
      }

      return { 
        success: false, 
        message: 'Failed to apply. Please try through the app.' 
      };
    }
  }
}

export const jobQueryService = new JobQueryService();
