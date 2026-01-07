import prisma from '../prisma/client.js';
import { logger } from '../utils/logger.js';
import type { InterviewType, InterviewStatus } from '@prisma/client';

/**
 * Schedule Interview Input
 */
export interface ScheduleInterviewInput {
  recruiterId: string;
  candidateId: string;
  jobId: string;
  title: string;
  description?: string;
  type?: InterviewType;
  proposedSlots: Date[];
  duration?: number;
  timezone?: string;
  meetingLink?: string;
  location?: string;
  instructions?: string;
  interviewers?: string[];
}

/**
 * Interview with metadata
 */
export interface InterviewWithMeta {
  id: string;
  recruiterId: string;
  candidateId: string;
  jobId: string;
  title: string;
  description: string | null;
  type: InterviewType;
  proposedSlots: Date[];
  selectedSlot: Date | null;
  duration: number;
  timezone: string;
  meetingLink: string | null;
  location: string | null;
  instructions: string | null;
  interviewers: string[];
  status: InterviewStatus;
  recruiterFeedback: string | null;
  rating: number | null;
  createdAt: Date;
  confirmedAt: Date | null;
  recruiterName?: string;
}

/**
 * Interview Service
 * Handles interview scheduling and management
 */
export class InterviewService {
  /**
   * Schedule a new interview
   */
  static async scheduleInterview(input: ScheduleInterviewInput): Promise<InterviewWithMeta> {
    logger.info({ 
      recruiterId: input.recruiterId, 
      candidateId: input.candidateId,
      jobId: input.jobId,
    }, 'Scheduling interview');

    const interview = await prisma.interview.create({
      data: {
        recruiterId: input.recruiterId,
        candidateId: input.candidateId,
        jobId: input.jobId,
        title: input.title,
        description: input.description,
        type: input.type || 'VIDEO',
        proposedSlots: input.proposedSlots,
        duration: input.duration || 60,
        timezone: input.timezone || 'Asia/Kolkata',
        meetingLink: input.meetingLink,
        location: input.location,
        instructions: input.instructions,
        interviewers: input.interviewers || [],
        status: 'PENDING',
      },
      include: {
        recruiter: {
          select: { name: true },
        },
      },
    });

    return this.formatInterview(interview);
  }

  /**
   * Get interviews for a recruiter
   */
  static async getInterviews(
    recruiterId: string,
    options: {
      status?: InterviewStatus;
      candidateId?: string;
      jobId?: string;
      upcoming?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ interviews: InterviewWithMeta[]; total: number }> {
    const { status, candidateId, jobId, upcoming, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: any = { recruiterId };

    if (status) {
      where.status = status;
    }

    if (candidateId) {
      where.candidateId = candidateId;
    }

    if (jobId) {
      where.jobId = jobId;
    }

    if (upcoming) {
      where.selectedSlot = { gte: new Date() };
      where.status = { in: ['PENDING', 'CONFIRMED'] };
    }

    const [interviews, total] = await Promise.all([
      prisma.interview.findMany({
        where,
        include: {
          recruiter: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.interview.count({ where }),
    ]);

    return {
      interviews: interviews.map((i) => this.formatInterview(i)),
      total,
    };
  }

  /**
   * Get single interview details
   */
  static async getInterview(interviewId: string, recruiterId: string): Promise<InterviewWithMeta | null> {
    const interview = await prisma.interview.findFirst({
      where: {
        id: interviewId,
        recruiterId,
      },
      include: {
        recruiter: {
          select: { name: true },
        },
      },
    });

    if (!interview) return null;

    return this.formatInterview(interview);
  }

  /**
   * Candidate confirms a slot
   */
  static async confirmSlot(
    interviewId: string,
    selectedSlot: Date,
    candidateId: string
  ): Promise<InterviewWithMeta | null> {
    // Verify interview exists and belongs to candidate
    const existing = await prisma.interview.findFirst({
      where: {
        id: interviewId,
        candidateId,
        status: 'PENDING',
      },
    });

    if (!existing) {
      logger.warn({ interviewId, candidateId }, 'Interview not found or not pending');
      return null;
    }

    // Verify selected slot is one of the proposed slots
    const isValidSlot = existing.proposedSlots.some(
      (slot) => new Date(slot).getTime() === new Date(selectedSlot).getTime()
    );

    if (!isValidSlot) {
      logger.warn({ interviewId, selectedSlot }, 'Invalid slot selected');
      return null;
    }

    const interview = await prisma.interview.update({
      where: { id: interviewId },
      data: {
        selectedSlot,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
      include: {
        recruiter: {
          select: { name: true },
        },
      },
    });

    return this.formatInterview(interview);
  }

  /**
   * Recruiter updates interview
   */
  static async updateInterview(
    interviewId: string,
    recruiterId: string,
    data: {
      title?: string;
      description?: string;
      type?: InterviewType;
      proposedSlots?: Date[];
      duration?: number;
      meetingLink?: string;
      location?: string;
      instructions?: string;
      interviewers?: string[];
    }
  ): Promise<InterviewWithMeta | null> {
    const interview = await prisma.interview.updateMany({
      where: {
        id: interviewId,
        recruiterId,
      },
      data,
    });

    if (interview.count === 0) return null;

    return this.getInterview(interviewId, recruiterId);
  }

  /**
   * Reschedule interview (propose new slots)
   */
  static async rescheduleInterview(
    interviewId: string,
    recruiterId: string,
    newSlots: Date[]
  ): Promise<InterviewWithMeta | null> {
    const result = await prisma.interview.updateMany({
      where: {
        id: interviewId,
        recruiterId,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      data: {
        proposedSlots: newSlots,
        selectedSlot: null,
        status: 'RESCHEDULED',
        confirmedAt: null,
      },
    });

    if (result.count === 0) return null;

    return this.getInterview(interviewId, recruiterId);
  }

  /**
   * Cancel interview
   */
  static async cancelInterview(
    interviewId: string,
    recruiterId: string,
    reason?: string
  ): Promise<boolean> {
    const result = await prisma.interview.updateMany({
      where: {
        id: interviewId,
        recruiterId,
        status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] },
      },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        recruiterFeedback: reason,
      },
    });

    return result.count > 0;
  }

  /**
   * Mark interview as completed with feedback
   */
  static async completeInterview(
    interviewId: string,
    recruiterId: string,
    feedback: {
      recruiterFeedback?: string;
      rating?: number;
    }
  ): Promise<InterviewWithMeta | null> {
    const result = await prisma.interview.updateMany({
      where: {
        id: interviewId,
        recruiterId,
        status: 'CONFIRMED',
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        recruiterFeedback: feedback.recruiterFeedback,
        rating: feedback.rating,
      },
    });

    if (result.count === 0) return null;

    return this.getInterview(interviewId, recruiterId);
  }

  /**
   * Mark no-show
   */
  static async markNoShow(interviewId: string, recruiterId: string): Promise<boolean> {
    const result = await prisma.interview.updateMany({
      where: {
        id: interviewId,
        recruiterId,
        status: 'CONFIRMED',
      },
      data: {
        status: 'NO_SHOW',
        completedAt: new Date(),
      },
    });

    return result.count > 0;
  }

  /**
   * Get upcoming interviews (next 7 days)
   */
  static async getUpcomingInterviews(
    recruiterId: string,
    days = 7
  ): Promise<InterviewWithMeta[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const interviews = await prisma.interview.findMany({
      where: {
        recruiterId,
        status: 'CONFIRMED',
        selectedSlot: {
          gte: new Date(),
          lte: futureDate,
        },
      },
      include: {
        recruiter: {
          select: { name: true },
        },
      },
      orderBy: { selectedSlot: 'asc' },
    });

    return interviews.map((i) => this.formatInterview(i));
  }

  /**
   * Get interview stats for dashboard
   */
  static async getInterviewStats(recruiterId: string): Promise<{
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    upcoming: number;
  }> {
    const now = new Date();

    const [pending, confirmed, completed, cancelled, upcoming] = await Promise.all([
      prisma.interview.count({ where: { recruiterId, status: 'PENDING' } }),
      prisma.interview.count({ where: { recruiterId, status: 'CONFIRMED' } }),
      prisma.interview.count({ where: { recruiterId, status: 'COMPLETED' } }),
      prisma.interview.count({ where: { recruiterId, status: 'CANCELLED' } }),
      prisma.interview.count({
        where: {
          recruiterId,
          status: 'CONFIRMED',
          selectedSlot: { gte: now },
        },
      }),
    ]);

    return { pending, confirmed, completed, cancelled, upcoming };
  }

  /**
   * Format interview for response
   */
  private static formatInterview(interview: any): InterviewWithMeta {
    return {
      id: interview.id,
      recruiterId: interview.recruiterId,
      candidateId: interview.candidateId,
      jobId: interview.jobId,
      title: interview.title,
      description: interview.description,
      type: interview.type,
      proposedSlots: interview.proposedSlots,
      selectedSlot: interview.selectedSlot,
      duration: interview.duration,
      timezone: interview.timezone,
      meetingLink: interview.meetingLink,
      location: interview.location,
      instructions: interview.instructions,
      interviewers: interview.interviewers,
      status: interview.status,
      recruiterFeedback: interview.recruiterFeedback,
      rating: interview.rating,
      createdAt: interview.createdAt,
      confirmedAt: interview.confirmedAt,
      recruiterName: interview.recruiter?.name,
    };
  }
}

export default InterviewService;
