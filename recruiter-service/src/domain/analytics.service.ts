import prisma from '../prisma/client.js';
import { logger } from '../utils/logger.js';

/**
 * Recruiter Dashboard Stats
 */
export interface RecruiterDashboardStats {
  // Job Performance
  jobs: {
    total: number;
    active: number;
    closed: number;
    draft: number;
  };
  
  // Application Metrics
  applications: {
    total: number;
    pending: number;
    reviewing: number;
    shortlisted: number;
    rejected: number;
    hired: number;
    thisWeek: number;
    lastWeek: number;
    trend: 'UP' | 'DOWN' | 'STABLE';
  };
  
  // Candidate Engagement
  candidates: {
    saved: number;
    contacted: number;
    interviewed: number;
    profilesViewed: number;
  };
  
  // Interview Metrics
  interviews: {
    scheduled: number;
    upcoming: number;
    completed: number;
    cancelled: number;
    avgRating: number;
  };
  
  // Messages
  messages: {
    sent: number;
    received: number;
    unread: number;
    responseRate: number;
  };
  
  // Conversion Funnel
  funnel: {
    viewToSave: number;       // % of viewed profiles saved
    saveToContact: number;    // % of saved candidates contacted
    contactToInterview: number;
    interviewToOffer: number;
    offerToHire: number;
  };
  
  // Top Performers
  topPerformingJobs: {
    id: string;
    title: string;
    applications: number;
    matchRate: number;
  }[];
  
  // Recent Activity
  recentActivity: {
    type: string;
    description: string;
    timestamp: Date;
  }[];
}

/**
 * Job Performance Analytics
 */
export interface JobPerformanceStats {
  jobId: string;
  title: string;
  
  // Views & Applications
  views: number;
  uniqueViews: number;
  applications: number;
  conversionRate: number; // applications / views
  
  // Application Breakdown
  applicationsByStatus: {
    pending: number;
    reviewing: number;
    shortlisted: number;
    rejected: number;
    hired: number;
  };
  
  // Time Metrics
  avgTimeToFirstApplication: number; // hours
  avgTimeToHire: number; // days
  
  // Match Quality
  avgMatchScore: number;
  matchScoreDistribution: {
    excellent: number; // 80-100
    good: number;      // 60-79
    fair: number;      // 40-59
    poor: number;      // 0-39
  };
  
  // Source Analytics
  applicationsBySource: {
    direct: number;
    search: number;
    recommendation: number;
  };
  
  // Skill Analytics
  topApplicantSkills: {
    skill: string;
    count: number;
    avgScore: number;
  }[];
  
  // Timeline
  applicationsOverTime: {
    date: string;
    count: number;
  }[];
}

/**
 * Analytics Service
 * Provides comprehensive analytics for recruiters and the platform
 */
export class AnalyticsService {
  /**
   * Get recruiter dashboard stats
   */
  static async getRecruiterDashboard(
    recruiterId: string,
    organizationId: string
  ): Promise<RecruiterDashboardStats> {
    logger.info({ recruiterId }, 'Fetching recruiter dashboard stats');

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Parallel queries for efficiency
    const [
      // Saved candidates
      savedCount,
      contactedCount,
      
      // Interviews
      interviewStats,
      upcomingInterviews,
      completedInterviews,
      
      // Messages
      sentMessages,
      receivedMessages,
      unreadMessages,
      
      // Recent Activity (last 10)
      recentMessages,
      recentInterviews,
    ] = await Promise.all([
      // Saved candidates count
      prisma.savedCandidate.count({
        where: { recruiterId },
      }),
      
      // Contacted candidates
      prisma.savedCandidate.count({
        where: { recruiterId, status: 'CONTACTED' },
      }),
      
      // Interview stats
      prisma.interview.groupBy({
        by: ['status'],
        where: { recruiterId },
        _count: { id: true },
      }),
      
      // Upcoming interviews
      prisma.interview.count({
        where: {
          recruiterId,
          status: 'CONFIRMED',
          selectedSlot: { gte: now, lte: sevenDaysFromNow },
        },
      }),
      
      // Completed interviews with rating
      prisma.interview.aggregate({
        where: { recruiterId, status: 'COMPLETED' },
        _count: { id: true },
        _avg: { rating: true },
      }),
      
      // Sent messages
      prisma.legacyMessage.count({
        where: { recruiterId, direction: 'RECRUITER_TO_CANDIDATE' },
      }),
      
      // Received messages
      prisma.legacyMessage.count({
        where: { recruiterId, direction: 'CANDIDATE_TO_RECRUITER' },
      }),
      
      // Unread messages
      prisma.legacyMessage.count({
        where: { recruiterId, direction: 'CANDIDATE_TO_RECRUITER', readAt: null },
      }),
      
      // Recent messages
      prisma.legacyMessage.findMany({
        where: { recruiterId },
        orderBy: { sentAt: 'desc' },
        take: 5,
        select: { id: true, subject: true, sentAt: true, direction: true },
      }),
      
      // Recent interviews
      prisma.interview.findMany({
        where: { recruiterId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, createdAt: true, status: true },
      }),
    ]);

    // Process interview stats
    const interviewStatusCounts = interviewStats.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Calculate response rate
    const responseRate = sentMessages > 0 
      ? Math.round((receivedMessages / sentMessages) * 100)
      : 0;

    // Build recent activity
    const recentActivity = [
      ...recentMessages.map(m => ({
        type: m.direction === 'RECRUITER_TO_CANDIDATE' ? 'MESSAGE_SENT' : 'MESSAGE_RECEIVED',
        description: `Message: ${m.subject.substring(0, 50)}...`,
        timestamp: m.sentAt,
      })),
      ...recentInterviews.map(i => ({
        type: 'INTERVIEW',
        description: `Interview "${i.title}" - ${i.status}`,
        timestamp: i.createdAt,
      })),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);

    return {
      jobs: {
        total: 0, // Will be fetched from job-service
        active: 0,
        closed: 0,
        draft: 0,
      },
      
      applications: {
        total: 0, // Will be fetched from job-service
        pending: 0,
        reviewing: 0,
        shortlisted: 0,
        rejected: 0,
        hired: 0,
        thisWeek: 0,
        lastWeek: 0,
        trend: 'STABLE',
      },
      
      candidates: {
        saved: savedCount,
        contacted: contactedCount,
        interviewed: completedInterviews._count.id,
        profilesViewed: savedCount * 2, // Approximation
      },
      
      interviews: {
        scheduled: interviewStatusCounts['PENDING'] || 0,
        upcoming: upcomingInterviews,
        completed: completedInterviews._count.id,
        cancelled: interviewStatusCounts['CANCELLED'] || 0,
        avgRating: completedInterviews._avg.rating || 0,
      },
      
      messages: {
        sent: sentMessages,
        received: receivedMessages,
        unread: unreadMessages,
        responseRate,
      },
      
      funnel: {
        viewToSave: savedCount > 0 ? 25 : 0, // Placeholder
        saveToContact: savedCount > 0 ? Math.round((contactedCount / savedCount) * 100) : 0,
        contactToInterview: contactedCount > 0 ? Math.round((completedInterviews._count.id / contactedCount) * 100) : 0,
        interviewToOffer: 0, // Needs job-service data
        offerToHire: 0,
      },
      
      topPerformingJobs: [], // Will be fetched from job-service
      
      recentActivity,
    };
  }

  /**
   * Get interview statistics
   */
  static async getInterviewAnalytics(
    recruiterId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    avgDuration: number;
    avgRating: number;
    completionRate: number;
    noShowRate: number;
    weeklyTrend: { week: string; count: number }[];
  }> {
    const where: any = { recruiterId };
    
    if (dateRange) {
      where.createdAt = {
        gte: dateRange.start,
        lte: dateRange.end,
      };
    }

    const [
      total,
      byType,
      byStatus,
      aggregates,
      completed,
      noShow,
    ] = await Promise.all([
      prisma.interview.count({ where }),
      prisma.interview.groupBy({
        by: ['type'],
        where,
        _count: { id: true },
      }),
      prisma.interview.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      prisma.interview.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _avg: { duration: true, rating: true },
      }),
      prisma.interview.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.interview.count({ where: { ...where, status: 'NO_SHOW' } }),
    ]);

    const typeMap = byType.reduce((acc, curr) => {
      acc[curr.type] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    const statusMap = byStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      byType: typeMap,
      byStatus: statusMap,
      avgDuration: aggregates._avg.duration || 60,
      avgRating: Math.round((aggregates._avg.rating || 0) * 10) / 10,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      noShowRate: total > 0 ? Math.round((noShow / total) * 100) : 0,
      weeklyTrend: [], // Would need date aggregation
    };
  }

  /**
   * Get message analytics
   */
  static async getMessageAnalytics(
    recruiterId: string
  ): Promise<{
    totalSent: number;
    totalReceived: number;
    responseRate: number;
    avgResponseTime: number; // hours
    byCategory: Record<string, number>;
    topCandidates: { candidateId: string; messageCount: number }[];
    weeklyVolume: { week: string; sent: number; received: number }[];
  }> {
    const [sentCount, receivedCount, topCandidates] = await Promise.all([
      prisma.legacyMessage.count({
        where: { recruiterId, direction: 'RECRUITER_TO_CANDIDATE' },
      }),
      prisma.legacyMessage.count({
        where: { recruiterId, direction: 'CANDIDATE_TO_RECRUITER' },
      }),
      prisma.legacyMessage.groupBy({
        by: ['candidateId'],
        where: { recruiterId },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      totalSent: sentCount,
      totalReceived: receivedCount,
      responseRate: sentCount > 0 ? Math.round((receivedCount / sentCount) * 100) : 0,
      avgResponseTime: 4.5, // Placeholder - would need timestamp comparison
      byCategory: {},
      topCandidates: topCandidates.map(c => ({
        candidateId: c.candidateId,
        messageCount: c._count.id,
      })),
      weeklyVolume: [],
    };
  }

  /**
   * Get saved candidates analytics
   */
  static async getSavedCandidatesAnalytics(
    recruiterId: string
  ): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byTags: { tag: string; count: number }[];
    avgRating: number;
    conversionRate: number;
    recentlySaved: number;
  }> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [total, byStatus, aggregates, recentlySaved] = await Promise.all([
      prisma.savedCandidate.count({ where: { recruiterId } }),
      prisma.savedCandidate.groupBy({
        by: ['status'],
        where: { recruiterId },
        _count: { id: true },
      }),
      prisma.savedCandidate.aggregate({
        where: { recruiterId, rating: { not: null } },
        _avg: { rating: true },
      }),
      prisma.savedCandidate.count({
        where: { recruiterId, savedAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    const statusMap = byStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    const contacted = statusMap['CONTACTED'] || 0;
    const interested = statusMap['INTERESTED'] || 0;

    return {
      total,
      byStatus: statusMap,
      byTags: [], // Would need array aggregation
      avgRating: Math.round((aggregates._avg.rating || 0) * 10) / 10,
      conversionRate: total > 0 ? Math.round(((contacted + interested) / total) * 100) : 0,
      recentlySaved,
    };
  }

  /**
   * Get template usage analytics
   */
  static async getTemplateAnalytics(
    recruiterId: string
  ): Promise<{
    totalTemplates: number;
    customTemplates: number;
    systemTemplates: number;
    mostUsedCategory: string;
  }> {
    const [custom, system] = await Promise.all([
      prisma.messageTemplate.count({ where: { recruiterId } }),
      prisma.messageTemplate.count({ where: { isPublic: true } }),
    ]);

    return {
      totalTemplates: custom + system,
      customTemplates: custom,
      systemTemplates: system,
      mostUsedCategory: 'JOB_INVITATION', // Placeholder
    };
  }

  /**
   * Get activity timeline
   */
  static async getActivityTimeline(
    recruiterId: string,
    limit = 20
  ): Promise<{
    type: string;
    title: string;
    description: string;
    timestamp: Date;
    metadata: Record<string, any>;
  }[]> {
    const [messages, interviews, savedCandidates, feedback] = await Promise.all([
      prisma.legacyMessage.findMany({
        where: { recruiterId },
        orderBy: { sentAt: 'desc' },
        take: limit,
        select: {
          id: true,
          subject: true,
          direction: true,
          sentAt: true,
          candidateId: true,
        },
      }),
      prisma.interview.findMany({
        where: { recruiterId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          candidateId: true,
        },
      }),
      prisma.savedCandidate.findMany({
        where: { recruiterId },
        orderBy: { savedAt: 'desc' },
        take: limit,
        select: {
          id: true,
          candidateId: true,
          status: true,
          savedAt: true,
        },
      }),
      prisma.candidateFeedback.findMany({
        where: { recruiterId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          category: true,
          status: true,
          createdAt: true,
          candidateId: true,
        },
      }),
    ]);

    const activities = [
      ...messages.map(m => ({
        type: m.direction === 'RECRUITER_TO_CANDIDATE' ? 'MESSAGE_SENT' : 'MESSAGE_RECEIVED',
        title: m.direction === 'RECRUITER_TO_CANDIDATE' ? 'Message Sent' : 'Message Received',
        description: m.subject.substring(0, 100),
        timestamp: m.sentAt,
        metadata: { messageId: m.id, candidateId: m.candidateId },
      })),
      ...interviews.map(i => ({
        type: `INTERVIEW_${i.status}`,
        title: `Interview ${i.status.toLowerCase().replace('_', ' ')}`,
        description: i.title,
        timestamp: i.createdAt,
        metadata: { interviewId: i.id, candidateId: i.candidateId },
      })),
      ...savedCandidates.map(s => ({
        type: `CANDIDATE_${s.status}`,
        title: `Candidate ${s.status.toLowerCase()}`,
        description: `Candidate saved`,
        timestamp: s.savedAt,
        metadata: { candidateId: s.candidateId },
      })),
      ...feedback.map(f => ({
        type: `FEEDBACK_${f.status}`,
        title: `Feedback ${f.category.toLowerCase().replace('_', ' ')}`,
        description: `Feedback ${f.status.toLowerCase()}`,
        timestamp: f.createdAt,
        metadata: { feedbackId: f.id, candidateId: f.candidateId },
      })),
    ];

    // Sort by timestamp and limit
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get summary metrics for quick dashboard
   */
  static async getQuickMetrics(
    recruiterId: string
  ): Promise<{
    savedCandidates: number;
    pendingInterviews: number;
    unreadMessages: number;
    thisWeekInterviews: number;
  }> {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [saved, pending, unread, upcoming] = await Promise.all([
      prisma.savedCandidate.count({ where: { recruiterId } }),
      prisma.interview.count({ where: { recruiterId, status: 'PENDING' } }),
      prisma.legacyMessage.count({
        where: { recruiterId, direction: 'CANDIDATE_TO_RECRUITER', readAt: null },
      }),
      prisma.interview.count({
        where: {
          recruiterId,
          status: 'CONFIRMED',
          selectedSlot: { gte: now, lte: weekFromNow },
        },
      }),
    ]);

    return {
      savedCandidates: saved,
      pendingInterviews: pending,
      unreadMessages: unread,
      thisWeekInterviews: upcoming,
    };
  }
}

export default AnalyticsService;
