import { prisma } from '../prisma/client.js';
import type { Interview, InterviewType, InterviewStatus } from '../../node_modules/.prisma/job-client/index.js';

export interface CreateInterviewDTO {
  applicationId: string;
  jobId: string;
  userId: string;
  recruiterId: string;
  title: string;
  description?: string;
  type: InterviewType;
  round: number;
  scheduledAt?: Date;
  duration: number;
  meetingUrl?: string;
  location?: string;
}

export class InterviewService {
  // Schedule interview
  async scheduleInterview(data: CreateInterviewDTO): Promise<Interview> {
    // Verify application exists and belongs to recruiter's job
    const application = await prisma.application.findUnique({
      where: { id: data.applicationId },
      include: { job: true },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    if (application.job.recruiterId !== data.recruiterId) {
      throw new Error('Unauthorized');
    }

    const interview = await prisma.interview.create({
      data: {
        ...data,
        status: 'SCHEDULED',
      },
    });

    // Update application status and flag
    await prisma.application.update({
      where: { id: data.applicationId },
      data: {
        status: 'INTERVIEW',
        interviewScheduled: true,
      },
    });

    return interview;
  }

  // Get interview by ID
  async getInterviewById(interviewId: string): Promise<Interview | null> {
    return await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        application: {
          include: {
            job: {
              include: {
                recruiter: {
                  select: {
                    name: true,
                    email: true,
                    organizationName: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  // Get interviews for user (candidate)
  async getUserInterviews(userId: string, status?: InterviewStatus) {
    const where: any = { userId };
    if (status) where.status = status;

    return await prisma.interview.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: {
        application: {
          include: {
            job: {
              select: {
                title: true,
                recruiter: {
                  select: {
                    name: true,
                    organizationName: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  // Get interviews for recruiter
  async getRecruiterInterviews(recruiterId: string, status?: InterviewStatus) {
    const where: any = { recruiterId };
    if (status) where.status = status;

    return await prisma.interview.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: {
        application: {
          select: {
            candidateName: true,
            candidateEmail: true,
            job: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });
  }

  // Update interview
  async updateInterview(
    interviewId: string,
    recruiterId: string,
    data: Partial<CreateInterviewDTO>
  ): Promise<Interview> {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview || interview.recruiterId !== recruiterId) {
      throw new Error('Interview not found or unauthorized');
    }

    return await prisma.interview.update({
      where: { id: interviewId },
      data,
    });
  }

  // Confirm interview (by candidate)
  async confirmInterview(interviewId: string, userId: string): Promise<Interview> {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview || interview.userId !== userId) {
      throw new Error('Interview not found or unauthorized');
    }

    return await prisma.interview.update({
      where: { id: interviewId },
      data: { status: 'CONFIRMED' },
    });
  }

  // Reschedule interview
  async rescheduleInterview(
    interviewId: string,
    recruiterId: string,
    newScheduledAt: Date,
    reason?: string
  ): Promise<Interview> {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview || interview.recruiterId !== recruiterId) {
      throw new Error('Unauthorized');
    }

    return await prisma.interview.update({
      where: { id: interviewId },
      data: {
        scheduledAt: newScheduledAt,
        status: 'RESCHEDULED',
      },
    });
  }

  // Cancel interview
  async cancelInterview(interviewId: string, userId: string, reason: string): Promise<Interview> {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview || (interview.userId !== userId && interview.recruiterId !== userId)) {
      throw new Error('Unauthorized');
    }

    return await prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });
  }

  // Complete interview with feedback
  async completeInterview(
    interviewId: string,
    recruiterId: string,
    feedback: string,
    rating?: number,
    notes?: string
  ): Promise<Interview> {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview || interview.recruiterId !== recruiterId) {
      throw new Error('Unauthorized');
    }

    return await prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        feedback,
        rating,
        interviewerNotes: notes,
      },
    });
  }

  // Mark as no-show
  async markNoShow(interviewId: string, recruiterId: string): Promise<Interview> {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview || interview.recruiterId !== recruiterId) {
      throw new Error('Unauthorized');
    }

    return await prisma.interview.update({
      where: { id: interviewId },
      data: { status: 'NO_SHOW' },
    });
  }

  // Get upcoming interviews
  async getUpcomingInterviews(userId: string, isRecruiter = false) {
    const where: any = {
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
      scheduledAt: { gte: new Date() },
    };

    if (isRecruiter) {
      where.recruiterId = userId;
    } else {
      where.userId = userId;
    }

    return await prisma.interview.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      take: 10,
      include: {
        application: {
          include: {
            job: {
              select: {
                title: true,
                recruiter: {
                  select: {
                    name: true,
                    organizationName: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }
}

export const interviewService = new InterviewService();
