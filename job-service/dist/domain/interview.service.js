"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interviewService = exports.InterviewService = void 0;
const client_js_1 = require("../prisma/client.js");
class InterviewService {
    // Schedule interview
    async scheduleInterview(data) {
        // Verify application exists and belongs to recruiter's job
        const application = await client_js_1.prisma.application.findUnique({
            where: { id: data.applicationId },
            include: { job: true },
        });
        if (!application) {
            throw new Error('Application not found');
        }
        if (application.job.recruiterId !== data.recruiterId) {
            throw new Error('Unauthorized');
        }
        const interview = await client_js_1.prisma.interview.create({
            data: {
                ...data,
                status: 'SCHEDULED',
            },
        });
        // Update application status and flag
        await client_js_1.prisma.application.update({
            where: { id: data.applicationId },
            data: {
                status: 'INTERVIEW',
                interviewScheduled: true,
            },
        });
        return interview;
    }
    // Get interview by ID
    async getInterviewById(interviewId) {
        return await client_js_1.prisma.interview.findUnique({
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
    async getUserInterviews(userId, status) {
        const where = { userId };
        if (status)
            where.status = status;
        return await client_js_1.prisma.interview.findMany({
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
    async getRecruiterInterviews(recruiterId, status) {
        const where = { recruiterId };
        if (status)
            where.status = status;
        return await client_js_1.prisma.interview.findMany({
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
    async updateInterview(interviewId, recruiterId, data) {
        const interview = await client_js_1.prisma.interview.findUnique({
            where: { id: interviewId },
        });
        if (!interview || interview.recruiterId !== recruiterId) {
            throw new Error('Interview not found or unauthorized');
        }
        return await client_js_1.prisma.interview.update({
            where: { id: interviewId },
            data,
        });
    }
    // Confirm interview (by candidate)
    async confirmInterview(interviewId, userId) {
        const interview = await client_js_1.prisma.interview.findUnique({
            where: { id: interviewId },
        });
        if (!interview || interview.userId !== userId) {
            throw new Error('Interview not found or unauthorized');
        }
        return await client_js_1.prisma.interview.update({
            where: { id: interviewId },
            data: { status: 'CONFIRMED' },
        });
    }
    // Reschedule interview
    async rescheduleInterview(interviewId, recruiterId, newScheduledAt, reason) {
        const interview = await client_js_1.prisma.interview.findUnique({
            where: { id: interviewId },
        });
        if (!interview || interview.recruiterId !== recruiterId) {
            throw new Error('Unauthorized');
        }
        return await client_js_1.prisma.interview.update({
            where: { id: interviewId },
            data: {
                scheduledAt: newScheduledAt,
                status: 'RESCHEDULED',
            },
        });
    }
    // Cancel interview
    async cancelInterview(interviewId, userId, reason) {
        const interview = await client_js_1.prisma.interview.findUnique({
            where: { id: interviewId },
        });
        if (!interview || (interview.userId !== userId && interview.recruiterId !== userId)) {
            throw new Error('Unauthorized');
        }
        return await client_js_1.prisma.interview.update({
            where: { id: interviewId },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
            },
        });
    }
    // Complete interview with feedback
    async completeInterview(interviewId, recruiterId, feedback, rating, notes) {
        const interview = await client_js_1.prisma.interview.findUnique({
            where: { id: interviewId },
        });
        if (!interview || interview.recruiterId !== recruiterId) {
            throw new Error('Unauthorized');
        }
        return await client_js_1.prisma.interview.update({
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
    async markNoShow(interviewId, recruiterId) {
        const interview = await client_js_1.prisma.interview.findUnique({
            where: { id: interviewId },
        });
        if (!interview || interview.recruiterId !== recruiterId) {
            throw new Error('Unauthorized');
        }
        return await client_js_1.prisma.interview.update({
            where: { id: interviewId },
            data: { status: 'NO_SHOW' },
        });
    }
    // Get upcoming interviews
    async getUpcomingInterviews(userId, isRecruiter = false) {
        const where = {
            status: { in: ['SCHEDULED', 'CONFIRMED'] },
            scheduledAt: { gte: new Date() },
        };
        if (isRecruiter) {
            where.recruiterId = userId;
        }
        else {
            where.userId = userId;
        }
        return await client_js_1.prisma.interview.findMany({
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
exports.InterviewService = InterviewService;
exports.interviewService = new InterviewService();
//# sourceMappingURL=interview.service.js.map