import { v } from "convex/values";
import { query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Get user profiles for sales intelligence - shows which users have engaged with documents
export const getUserProfiles = query({
    args: {
        timeRange: v.optional(v.number()), // Days to look back (default 7)
        minSessions: v.optional(v.number()), // Minimum sessions to show (default 1)
    },
    handler: async (ctx, args) => {
        const timeRange = args.timeRange || 7;
        const minSessions = args.minSessions || 1;
        const cutoffTime = Date.now() - timeRange * 24 * 60 * 60 * 1000;

        // Get all document sessions in the time range
        const sessions = await ctx.db
            .query("analyticsSessions")
            .withIndex("by_document_and_time")
            .filter((q) => q.and(q.neq(q.field("documentId"), undefined),
                q.gte(q.field("startTime"), cutoffTime)))
            .collect();

        if (sessions.length === 0) {
            return { users: [], totalUsers: 0, timeRange };
        }

        // Group sessions by user (browserId)
        const userGroups = new Map<string, typeof sessions>();
        sessions.forEach(session => {
            const userId = session.browserId;
            const userSessions = userGroups.get(userId) || [];
            userSessions.push(session);
            userGroups.set(userId, userSessions);
        });

        // Create user profiles with document engagement data
        const userProfiles = [];

        for (const [browserId, userSessions] of userGroups.entries()) {
            if (userSessions.length < minSessions) continue;

            // Get unique documents and their engagement metrics
            const documentEngagement = new Map<string, {
                documentId: string;
                documentTitle: string;
                sessions: number;
                totalDuration: number;
                totalScrollDepth: number;
                firstVisit: number;
                lastVisit: number;
                averageEngagement: number;
            }>();

            for (const session of userSessions) {
                if (!session.documentId) continue;

                const docId = session.documentId;
                const existing = documentEngagement.get(docId)

                if (!existing) continue;

                existing.sessions++;
                existing.totalDuration += session.duration || 0;
                existing.totalScrollDepth += session.maxScrollPercentage || 0;
                existing.firstVisit = Math.min(existing.firstVisit, session.startTime);
                existing.lastVisit = Math.max(existing.lastVisit, session.startTime);

                documentEngagement.set(docId, existing);
            }

            // Calculate averages and get document titles
            const documentsWithDetails = [];
            for (const [docId, document] of documentEngagement.entries()) {
                // Get document details
                const avgScrollDepth = document.sessions > 0
                    ? Math.round(document.totalScrollDepth / document.sessions)
                    : 0;

                const avgDuration = document.sessions > 0
                    ? Math.round(document.totalDuration / document.sessions)
                    : 0;

                // Calculate engagement score (0-100)
                const engagementScore = Math.min(
                    Math.round((avgScrollDepth * 0.6) + (Math.min(avgDuration / 60, 10) * 4)),
                    100
                );

                documentsWithDetails.push({
                    ...document,
                    averageScrollDepth: avgScrollDepth,
                    averageDuration: avgDuration,
                    engagementScore,
                });
            }

            // Sort documents by engagement score
            documentsWithDetails.sort((a, b) => b.engagementScore - a.engagementScore);

            // Get user metadata
            const firstSession = userSessions.reduce((earliest, session) =>
                session.startTime < earliest.startTime ? session : earliest
            );
            const lastSession = userSessions.reduce((latest, session) =>
                session.startTime > latest.startTime ? session : latest
            );

            const totalDuration = userSessions.reduce((sum, session) => sum + (session.duration || 0), 0);
            const totalSessions = userSessions.length;
            const uniqueDocuments = documentEngagement.size;

            // Check if user is identified (has userId)
            const identifiedUserId = userSessions.find(s => s.userId)?.userId;

            // Calculate overall engagement level
            const avgEngagementScore = documentsWithDetails.length > 0
                ? Math.round(documentsWithDetails.reduce((sum, doc) => sum + doc.engagementScore, 0) / documentsWithDetails.length)
                : 0;

            let engagementLevel = 'Low';
            if (avgEngagementScore >= 70) engagementLevel = 'High';
            else if (avgEngagementScore >= 50) engagementLevel = 'Medium';

            // Determine device type
            const isMobile = firstSession.userAgent?.includes('Mobile') || firstSession.viewport?.width < 768;

            userProfiles.push({
                browserId,
                userId: identifiedUserId,
                displayName: identifiedUserId || `Browser ${browserId.slice(-8)}`,
                isIdentified: !!identifiedUserId,

                // Engagement summary
                totalSessions,
                uniqueDocuments,
                totalDuration,
                averageDuration: Math.round(totalDuration / totalSessions),
                engagementLevel,
                engagementScore: avgEngagementScore,

                // Document details (top 3 for summary)
                topDocuments: documentsWithDetails.slice(0, 3),
                allDocuments: documentsWithDetails,

                // Activity timeline
                firstVisit: firstSession.startTime,
                lastVisit: lastSession.startTime,
                daysSinceFirstVisit: Math.ceil((Date.now() - firstSession.startTime) / (24 * 60 * 60 * 1000)),
                daysSinceLastVisit: Math.ceil((Date.now() - lastSession.startTime) / (24 * 60 * 60 * 1000)),

                // User context
                device: isMobile ? 'Mobile' : 'Desktop',
                userAgent: firstSession.userAgent || '',
                referrer: firstSession.referrer || 'Direct',
            });
        }

        // Sort by engagement score and last visit
        userProfiles.sort((a, b) => {
            // Prioritize recent high-engagement users
            const aScore = a.engagementScore + (a.daysSinceLastVisit <= 1 ? 20 : 0);
            const bScore = b.engagementScore + (b.daysSinceLastVisit <= 1 ? 20 : 0);
            return bScore - aScore;
        });

        return {
            users: userProfiles,
            totalUsers: userProfiles.length,
            timeRange,
            summary: {
                totalSessions: sessions.length,
                identifiedUsers: userProfiles.filter(u => u.isIdentified).length,
                highEngagementUsers: userProfiles.filter(u => u.engagementLevel === 'High').length,
                recentUsers: userProfiles.filter(u => u.daysSinceLastVisit <= 1).length,
            }
        };
    },
});

// Get detailed document history for a specific user - perfect for sales outreach prep
export const getUserDocumentHistory = query({
    args: {
        browserId: v.string(),
        timeRange: v.optional(v.number()), // Days to look back (default 30)
    },
    handler: async (ctx, args) => {
        const timeRange = args.timeRange || 30;
        const cutoffTime = Date.now() - timeRange * 24 * 60 * 60 * 1000;

        // Get all document sessions for this user
        const sessions = await ctx.db
            .query("analyticsSessions")
            .withIndex("by_browser", (q) => q.eq("browserId", args.browserId))
            .filter((q) =>
                q.and(
                    q.gte(q.field("startTime"), cutoffTime),
                    q.neq(q.field("documentId"), undefined)
                )
            )
            .collect();

        if (sessions.length === 0) {
            return null;
        }

        // Group sessions by document
        const documentSessions = new Map<string, typeof sessions>();
        sessions.forEach(session => {
            if (!session.documentId) return;
            const docSessions = documentSessions.get(session.documentId) || [];
            docSessions.push(session);
            documentSessions.set(session.documentId, docSessions);
        });

        // Build detailed document engagement history
        const documentHistory = [];

        for (const [docId, docSessions] of documentSessions.entries()) {
            // Get document details
            const document = await ctx.db.get(docId as Id<"documents">);
            if (!document) continue;

            // Sort sessions by date
            const sortedSessions = docSessions.sort((a, b) => a.startTime - b.startTime);

            // Calculate engagement metrics
            const totalSessions = docSessions.length;
            const totalDuration = docSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
            const avgDuration = Math.round(totalDuration / totalSessions);
            const avgScrollDepth = Math.round(
                docSessions.reduce((sum, s) => sum + (s.maxScrollPercentage || 0), 0) / totalSessions
            );

            // Engagement progression analysis
            const firstVisit = sortedSessions[0];
            const lastVisit = sortedSessions[sortedSessions.length - 1];
            const isReturningReader = totalSessions > 1;

            // Reading pattern analysis
            const deepReads = docSessions.filter(s => (s.maxScrollPercentage || 0) > 70).length;
            const quickScans = docSessions.filter(s => (s.duration || 0) < 30).length;
            const thoroughReads = docSessions.filter(s =>
                (s.maxScrollPercentage || 0) > 70 && (s.duration || 0) > 120
            ).length;

            // Calculate interest level
            let interestLevel = 'Low';
            if (thoroughReads > 0 || (avgScrollDepth > 70 && avgDuration > 120)) {
                interestLevel = 'High';
            } else if (isReturningReader || avgScrollDepth > 50) {
                interestLevel = 'Medium';
            }

            // Engagement trend (improving/declining)
            let engagementTrend = 'Stable';
            if (totalSessions > 1) {
                const recentSessions = sortedSessions.slice(-2);
                const oldSessions = sortedSessions.slice(0, 2);

                const recentAvgScroll = recentSessions.reduce((sum, s) => sum + (s.maxScrollPercentage || 0), 0) / recentSessions.length;
                const oldAvgScroll = oldSessions.reduce((sum, s) => sum + (s.maxScrollPercentage || 0), 0) / oldSessions.length;

                if (recentAvgScroll > oldAvgScroll + 15) engagementTrend = 'Improving';
                else if (recentAvgScroll < oldAvgScroll - 15) engagementTrend = 'Declining';
            }

            documentHistory.push({
                document: {
                    id: document._id,
                    title: document.title,
                    slug: document.slug,
                    description: document.description,
                },

                // Engagement summary
                totalSessions,
                totalDuration,
                avgDuration,
                avgScrollDepth,
                interestLevel,
                engagementTrend,

                // Reading patterns
                isReturningReader,
                deepReads,
                quickScans,
                thoroughReads,

                // Timeline
                firstVisit: firstVisit.startTime,
                lastVisit: lastVisit.startTime,
                daysSinceFirstVisit: Math.ceil((Date.now() - firstVisit.startTime) / (24 * 60 * 60 * 1000)),
                daysSinceLastVisit: Math.ceil((Date.now() - lastVisit.startTime) / (24 * 60 * 60 * 1000)),

                // Session details (for timeline view)
                sessions: sortedSessions.map(session => ({
                    sessionId: session.sessionId,
                    startTime: session.startTime,
                    duration: session.duration || 0,
                    scrollDepth: session.maxScrollPercentage || 0,
                    referrer: session.referrer,
                    userAgent: session.userAgent,
                })),
            });
        }

        // Sort by interest level and recency
        documentHistory.sort((a, b) => {
            const aScore = (a.interestLevel === 'High' ? 3 : a.interestLevel === 'Medium' ? 2 : 1) * 10 +
                (a.daysSinceLastVisit <= 3 ? 5 : 0);
            const bScore = (b.interestLevel === 'High' ? 3 : b.interestLevel === 'Medium' ? 2 : 1) * 10 +
                (b.daysSinceLastVisit <= 3 ? 5 : 0);
            return bScore - aScore;
        });

        // User summary for sales context
        const userSummary = {
            browserId: args.browserId,
            userId: sessions.find(s => s.userId)?.userId,
            totalDocuments: documentHistory.length,
            totalSessions: sessions.length,
            totalTimeSpent: sessions.reduce((sum, s) => sum + (s.duration || 0), 0),
            firstVisit: Math.min(...sessions.map(s => s.startTime)),
            lastVisit: Math.max(...sessions.map(s => s.startTime)),

            // Sales insights
            topInterest: documentHistory.filter(d => d.interestLevel === 'High').length,
            returningReader: documentHistory.filter(d => d.isReturningReader).length,
            recentActivity: documentHistory.filter(d => d.daysSinceLastVisit <= 3).length,

            // Communication context
            preferredDevice: sessions[0]?.viewport?.width < 768 ? 'Mobile' : 'Desktop',
            timeZoneActivity: getActivityPattern(sessions),
        };

        return {
            user: userSummary,
            documentHistory,
            salesInsights: generateSalesInsights(userSummary, documentHistory),
        };
    },
});

// Helper function to analyze activity patterns
function getActivityPattern(sessions: any[]) {
    const hourCounts = new Array(24).fill(0);

    sessions.forEach(session => {
        const hour = new Date(session.startTime).getHours();
        hourCounts[hour]++;
    });

    const maxCount = Math.max(...hourCounts);
    const peakHour = hourCounts.indexOf(maxCount);

    if (peakHour >= 9 && peakHour <= 17) return 'Business Hours';
    if (peakHour >= 18 && peakHour <= 22) return 'Evening';
    if (peakHour >= 6 && peakHour <= 8) return 'Early Morning';
    return 'Late Night';
}

// Generate sales insights and talking points
function generateSalesInsights(user: any, documentHistory: any[]) {
    const insights = [];

    // Interest level insights
    const highInterestDocs = documentHistory.filter(d => d.interestLevel === 'High');
    if (highInterestDocs.length > 0) {
        insights.push({
            type: 'High Interest',
            message: `Showed deep engagement with ${highInterestDocs.length} document(s), particularly "${highInterestDocs[0].document.title}"`,
            actionable: true,
        });
    }

    // Returning reader insights  
    const returningDocs = documentHistory.filter(d => d.isReturningReader);
    if (returningDocs.length > 0) {
        insights.push({
            type: 'Returning Reader',
            message: `Returned to read ${returningDocs.length} document(s) multiple times - shows sustained interest`,
            actionable: true,
        });
    }

    // Recent activity
    if (user.recentActivity > 0) {
        insights.push({
            type: 'Recent Activity',
            message: `Active within the last 3 days - good timing for outreach`,
            actionable: true,
        });
    }

    // Reading progression
    const improvingDocs = documentHistory.filter(d => d.engagementTrend === 'Improving');
    if (improvingDocs.length > 0) {
        insights.push({
            type: 'Growing Interest',
            message: `Engagement is increasing over time - becoming more interested`,
            actionable: true,
        });
    }

    // Content preferences
    const topDoc = documentHistory[0];
    if (topDoc) {
        insights.push({
            type: 'Content Preference',
            message: `Most interested in "${topDoc.document.title}" - use as conversation starter`,
            actionable: true,
        });
    }

    return insights;
} 