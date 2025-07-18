import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

// Save complete scroll analytics session
export const saveCompleteSession = action({
    args: {
        sessionId: v.string(),
        documentId: v.id("documents"),
        browserId: v.string(),
        userId: v.optional(v.string()),
        startTime: v.number(),
        endTime: v.number(),
        duration: v.number(),
        maxScrollPercentage: v.number(),
        userAgent: v.string(),
        referrer: v.optional(v.string()),
        viewport: v.object({
            width: v.number(),
            height: v.number(),
        }),
        scrollEvents: v.array(
            v.object({
                timestamp: v.number(),
                scrollY: v.number(),
                scrollPercentage: v.number(),
                viewportHeight: v.number(),
                documentHeight: v.number(),
            })
        ),
    },
    handler: async (ctx, args) => {
        // Store detailed scroll events as JSON file for future advanced analysis
        const scrollEventsBlob = new Blob([JSON.stringify(args.scrollEvents, null, 2)], {
            type: "application/json",
        });
        const scrollEventsFileId = await ctx.storage.store(scrollEventsBlob);

        // Also count events for quick access
        const scrollEventCount = args.scrollEvents.length;

        // Store session data in database with both aggregated metrics and detailed event file reference
        const { scrollEvents, ...sessionData } = args;
        const sessionId: Id<"analyticsSessions"> = await ctx.runMutation(api.analytics.saveSessionMetrics, {
            ...sessionData,
            scrollEventCount,
            scrollEventsFileId,
        });

        console.log(`✅ Stored scroll analytics session: ${args.sessionId}, Events: ${scrollEventCount}, Max scroll: ${args.maxScrollPercentage}%`);

        return {
            sessionId,
            scrollEventsFileId,
            eventsStored: scrollEventCount,
        };
    },
});

export const saveSessionMetrics = mutation({
    args: {
        documentId: v.id("documents"),
        sessionId: v.string(),
        browserId: v.string(),
        userId: v.optional(v.string()),
        userAgent: v.string(),
        referrer: v.optional(v.string()),
        viewport: v.object({
            width: v.number(),
            height: v.number(),
        }),
        startTime: v.number(),
        endTime: v.number(),
        duration: v.number(),
        maxScrollPercentage: v.number(),
        scrollEventCount: v.optional(v.number()),
        scrollEventsFileId: v.optional(v.id("_storage")),
    },
    handler: async (ctx, args): Promise<Id<"analyticsSessions">> => {
        // Store session data in database, marked as unprocessed
        const sessionId = await ctx.db.insert("analyticsSessions", {
            documentId: args.documentId,
            sessionId: args.sessionId,
            browserId: args.browserId,
            userId: args.userId,
            userAgent: args.userAgent,
            referrer: args.referrer,
            startTime: args.startTime,
            endTime: args.endTime,
            duration: args.duration,
            maxScrollPercentage: args.maxScrollPercentage,
            scrollEventCount: args.scrollEventCount,
            scrollEventsFileId: args.scrollEventsFileId,
            viewport: args.viewport,
            processed: false, // Mark as unprocessed
            createdAt: Date.now(),
        });

        return sessionId;
    },
});

// Get scroll analytics summary for a document
export const getScrollAnalytics = query({
    args: {
        documentId: v.id("documents"),
        timeRange: v.optional(v.number()), // Days to look back (default 30)
    },
    handler: async (ctx, args) => {
        const timeRange = args.timeRange || 30;
        const cutoffTime = Date.now() - timeRange * 24 * 60 * 60 * 1000;

        try {
            // Get all scroll analytics sessions for this document in the time range
            const sessions = await ctx.db
                .query("analyticsSessions")
                .withIndex("by_document_and_time", (q) =>
                    q.eq("documentId", args.documentId).gte("startTime", cutoffTime),
                )
                .collect();

            if (sessions.length === 0) {
                return {
                    totalSessions: 0,
                    uniqueVisitors: 0,
                    totalTimeSpent: 0,
                    averageTimeSpent: 0,
                    averageScrollDepth: 0,
                    completionRate: 0,
                    scrollDepthDistribution: [],
                    recentSessions: [],
                };
            }

            // Calculate metrics
            const totalSessions = sessions.length;
            const uniqueVisitors = new Set(sessions.map(s => s.browserId)).size;
            const totalTimeSpent = sessions.reduce((sum, s) => sum + s.duration, 0);
            const averageTimeSpent = totalTimeSpent / totalSessions;
            const averageScrollDepth = sessions.reduce((sum, s) => sum + s.maxScrollPercentage, 0) / totalSessions;
            const completionRate = sessions.filter(s => s.maxScrollPercentage >= 90).length / totalSessions;

            // Calculate scroll depth distribution
            const scrollDepthDistribution = [
                { range: "0-25%", count: sessions.filter(s => s.maxScrollPercentage >= 0 && s.maxScrollPercentage < 25).length },
                { range: "25-50%", count: sessions.filter(s => s.maxScrollPercentage >= 25 && s.maxScrollPercentage < 50).length },
                { range: "50-75%", count: sessions.filter(s => s.maxScrollPercentage >= 50 && s.maxScrollPercentage < 75).length },
                { range: "75-100%", count: sessions.filter(s => s.maxScrollPercentage >= 75).length },
            ];

            // Get recent sessions for detail view
            const recentSessions = sessions
                .sort((a, b) => b.startTime - a.startTime)
                .slice(0, 10)
                .map(s => ({
                    sessionId: s.sessionId,
                    browserId: s.browserId.slice(-8), // Last 8 chars for privacy
                    duration: s.duration,
                    maxScrollPercentage: s.maxScrollPercentage,
                    startTime: s.startTime,
                    userAgent: s.userAgent.split(' ')[0], // First part only
                }));

            return {
                totalSessions,
                uniqueVisitors,
                totalTimeSpent,
                averageTimeSpent: Math.round(averageTimeSpent),
                averageScrollDepth: Math.round(averageScrollDepth),
                completionRate: Math.round(completionRate * 100),
                scrollDepthDistribution,
                recentSessions,
            };
        } catch (error) {
            console.error('Failed to get scroll analytics:', error);
            return {
                totalSessions: 0,
                uniqueVisitors: 0,
                totalTimeSpent: 0,
                averageTimeSpent: 0,
                averageScrollDepth: 0,
                completionRate: 0,
                scrollDepthDistribution: [],
                recentSessions: [],
            };
        }
    },
});

// Process unprocessed sessions and update aggregated analytics
export const processAndGetDocumentAnalytics = mutation({
    args: {
        documentId: v.id("documents"),
        timeRange: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const timeRange = args.timeRange || 7;

        // Get unprocessed sessions for this document
        const unprocessedSessions = await ctx.db
            .query("analyticsSessions")
            .withIndex("by_document_and_processed", (q) =>
                q.eq("documentId", args.documentId).eq("processed", false),
            )
            .collect();

        if (unprocessedSessions.length > 0) {
            console.log(`Processing ${unprocessedSessions.length} unprocessed sessions for document ${args.documentId}`);

            // Mark sessions as processed
            for (const session of unprocessedSessions) {
                await ctx.db.patch(session._id, { processed: true });
            }
        }

        // Return current analytics data directly from sessions
        const cutoffTime = Date.now() - timeRange * 24 * 60 * 60 * 1000;
        const allSessions = await ctx.db
            .query("analyticsSessions")
            .withIndex("by_document_and_time", (q) =>
                q.eq("documentId", args.documentId).gte("startTime", cutoffTime),
            )
            .collect();

        return calculateAnalyticsFromSessions(allSessions);
    },
});

// Helper function to calculate analytics from sessions
function calculateAnalyticsFromSessions(sessions: any[]) {
    if (sessions.length === 0) {
        return {
            totalSessions: 0,
            uniqueVisitors: 0,
            totalTimeSpent: 0,
            averageTimeSpent: 0,
            averageScrollDepth: 0,
            completionRate: 0,
            bounceRate: 0,
            dailyStats: [],
            topReferrers: [],
            deviceBreakdown: [],
        };
    }

    const totalSessions = sessions.length;
    const uniqueVisitors = new Set(sessions.map(s => s.browserId)).size;
    const totalTimeSpent = sessions.reduce((sum, s) => sum + s.duration, 0);
    const averageTimeSpent = Math.round(totalTimeSpent / totalSessions);
    const averageScrollDepth = Math.round(sessions.reduce((sum, s) => sum + s.maxScrollPercentage, 0) / totalSessions);
    const completionRate = Math.round((sessions.filter(s => s.maxScrollPercentage >= 90).length / totalSessions) * 100);
    const bounceRate = Math.round((sessions.filter(s => s.duration < 10).length / totalSessions) * 100);

    // Daily stats for the last 7 days
    const dailyStats = [];
    for (let i = 6; i >= 0; i--) {
        const dayStart = Date.now() - (i * 24 * 60 * 60 * 1000);
        const dayEnd = dayStart + (24 * 60 * 60 * 1000);
        const daySessions = sessions.filter(s => s.startTime >= dayStart && s.startTime < dayEnd);

        dailyStats.push({
            date: new Date(dayStart).toISOString().split('T')[0],
            sessions: daySessions.length,
            uniqueVisitors: new Set(daySessions.map(s => s.browserId)).size,
            averageTimeSpent: daySessions.length > 0
                ? Math.round(daySessions.reduce((sum, s) => sum + s.duration, 0) / daySessions.length)
                : 0,
            averageScrollDepth: daySessions.length > 0
                ? Math.round(daySessions.reduce((sum, s) => sum + s.maxScrollPercentage, 0) / daySessions.length)
                : 0,
        });
    }

    // Top referrers
    const referrerCounts = new Map();
    sessions.forEach(s => {
        const referrer = s.referrer || 'Direct';
        let domain = 'Direct';
        try {
            if (referrer !== 'Direct') {
                domain = new URL(referrer).hostname;
            }
        } catch {
            domain = 'Direct';
        }
        referrerCounts.set(domain, (referrerCounts.get(domain) || 0) + 1);
    });

    const topReferrers = Array.from(referrerCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([domain, count]) => ({ domain, count, percentage: Math.round((count / totalSessions) * 100) }));

    // Device breakdown
    const deviceCounts = new Map();
    sessions.forEach(s => {
        const isMobile = s.userAgent.includes('Mobile') || s.viewport.width < 768;
        const isTablet = !isMobile && s.viewport.width < 1024;
        const device = isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop';
        deviceCounts.set(device, (deviceCounts.get(device) || 0) + 1);
    });

    const deviceBreakdown = Array.from(deviceCounts.entries())
        .map(([device, count]) => ({ device, count, percentage: Math.round((count / totalSessions) * 100) }));

    return {
        totalSessions,
        uniqueVisitors,
        totalTimeSpent,
        averageTimeSpent,
        averageScrollDepth,
        completionRate,
        bounceRate,
        dailyStats,
        topReferrers,
        deviceBreakdown,
    };
}

// Get detailed heatmap data for a document
export const getDocumentHeatmapData = query({
    args: {
        documentId: v.id("documents"),
        timeRange: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const timeRange = args.timeRange || 30;
        const cutoffTime = Date.now() - timeRange * 24 * 60 * 60 * 1000;

        // Get sessions from the timerange for direct calculation (since we don't store events)
        const sessions = await ctx.db
            .query("analyticsSessions")
            .withIndex("by_document_and_time", (q) =>
                q.eq("documentId", args.documentId).gte("startTime", cutoffTime),
            )
            .collect();

        if (sessions.length === 0) {
            return {
                scrollHeatmapData: [],
                paragraphEngagement: {},
                totalSessions: 0,
                uniqueVisitors: 0,
            };
        }

        // Create scroll depth heatmap based on actual viewport percentages
        const scrollDepthData: any[] = [];

        // Group sessions by their max scroll percentage in 10% increments
        for (let i = 0; i <= 100; i += 10) {
            const sessionsReachedThisDepth = sessions.filter(s => s.maxScrollPercentage >= i);
            const reachPercentage = sessions.length > 0 ? (sessionsReachedThisDepth.length / sessions.length) * 100 : 0;

            scrollDepthData.push({
                scrollDepth: i,
                sessionsReached: sessionsReachedThisDepth.length,
                totalSessions: sessions.length,
                reachPercentage: Math.round(reachPercentage),
                dropoffFromPrevious: i > 0 ?
                    scrollDepthData[scrollDepthData.length - 1]?.reachPercentage - Math.round(reachPercentage) : 0,
            });
        }

        // Calculate viewport-based engagement for the heatmap overlay
        // This will be used by the frontend to apply heatmap colors based on actual scroll position
        const viewportEngagement: Record<string, any> = {};

        // Create engagement data for every 5% of the viewport
        for (let i = 0; i <= 100; i += 5) {
            const sessionsReachedThisPoint = sessions.filter(s => s.maxScrollPercentage >= i);
            const reachPercentage = sessions.length > 0 ? (sessionsReachedThisPoint.length / sessions.length) * 100 : 0;

            viewportEngagement[`viewport-${i}`] = {
                scrollDepth: i,
                sessionsReached: sessionsReachedThisPoint.length,
                totalSessions: sessions.length,
                reachPercentage: Math.round(reachPercentage),
                uniqueVisitors: new Set(sessionsReachedThisPoint.map(s => s.browserId)).size,
                engagementScore: Math.round(reachPercentage),
            };
        }

        return {
            scrollDepthData,
            viewportEngagement,
            totalSessions: sessions.length,
            uniqueVisitors: new Set(sessions.map(s => s.browserId)).size,
        };
    },
});

export const getDocumentAnalytics = query({
    args: {
        documentId: v.id("documents"),
        timeRange: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const timeRange = args.timeRange || 30;
        const cutoffTime = Date.now() - timeRange * 24 * 60 * 60 * 1000;

        const sessions = await ctx.db
            .query("analyticsSessions")
            .withIndex("by_document_and_time", (q) =>
                q.eq("documentId", args.documentId).gte("startTime", cutoffTime),
            )
            .collect();

        return calculateAnalyticsFromSessions(sessions);
    },
});

// Get session details (including scroll events file reference)
export const getSessionDetails = query({
    args: {
        sessionId: v.string(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("analyticsSessions")
            .filter(q => q.eq(q.field("sessionId"), args.sessionId))
            .first();

        return session;
    },
});

// Get detailed scroll events for a specific session (for advanced analysis)
export const getSessionScrollEvents = action({
    args: {
        sessionId: v.string(),
    },
    handler: async (ctx, args): Promise<{
        session: Doc<"analyticsSessions">;
        scrollEvents: any;
    } | null> => {
        // First get the session to find the file ID
        const sessions = await ctx.runQuery(api.analytics.getSessionsForScrollEvents, {
            sessionId: args.sessionId,
        });

        if (!sessions || sessions.length === 0) {
            return null;
        }

        const session = sessions[0];
        if (!session.scrollEventsFileId) {
            return null;
        }

        try {
            const scrollEventsBlob = await ctx.storage.get(session.scrollEventsFileId);
            if (!scrollEventsBlob) {
                return null;
            }

            const scrollEventsText = await scrollEventsBlob.text();
            const scrollEvents = JSON.parse(scrollEventsText);

            return {
                session,
                scrollEvents,
            };
        } catch (error) {
            console.error(`Failed to load scroll events for session ${args.sessionId}:`, error);
            return null;
        }
    },
});

// Helper query for getting sessions for scroll event retrieval
export const getSessionsForScrollEvents = query({
    args: {
        sessionId: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("analyticsSessions")
            .filter(q => q.eq(q.field("sessionId"), args.sessionId))
            .collect();
    },
});

// Enhanced paragraph engagement analysis
export const getDocumentParagraphEngagement = query({
    args: {
        documentId: v.id("documents"),
        timeRange: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const timeRange = args.timeRange || 30;
        const cutoffTime = Date.now() - timeRange * 24 * 60 * 60 * 1000;

        // Get document content to analyze structure
        const document = await ctx.db.get(args.documentId);
        if (!document) {
            return { paragraphMetrics: [], documentStructure: null };
        }

        // Get all sessions for this document
        const sessions = await ctx.db
            .query("analyticsSessions")
            .withIndex("by_document_and_time", (q) =>
                q.eq("documentId", args.documentId).gte("startTime", cutoffTime),
            )
            .collect();

        if (sessions.length === 0) {
            return { paragraphMetrics: [], documentStructure: null };
        }

        // Analyze document structure from content
        const documentStructure = analyzeDocumentStructure(document.content);

        // Calculate engagement metrics for each paragraph based on scroll patterns
        const paragraphMetrics = [];

        for (let i = 0; i < documentStructure.paragraphs.length; i++) {
            const paragraph = documentStructure.paragraphs[i];

            // Calculate scroll percentage range for this paragraph
            const startPercentage = (i / documentStructure.paragraphs.length) * 100;
            const endPercentage = ((i + 1) / documentStructure.paragraphs.length) * 100;

            // Count sessions that reached this paragraph
            const sessionsReached = sessions.filter(s => s.maxScrollPercentage >= startPercentage);
            const sessionsCompleted = sessions.filter(s => s.maxScrollPercentage >= endPercentage);

            // Calculate reading time estimate (simplified)
            const estimatedReadingTime = estimateReadingTime(paragraph.content);

            paragraphMetrics.push({
                id: `paragraph-${i}`,
                content: paragraph.content.substring(0, 100) + '...', // Preview
                type: paragraph.type,
                startPercentage,
                endPercentage,
                sessionsReached: sessionsReached.length,
                sessionsCompleted: sessionsCompleted.length,
                completionRate: sessionsReached.length > 0 ? (sessionsCompleted.length / sessionsReached.length) * 100 : 0,
                dropoffRate: sessionsReached.length > 0 ? ((sessionsReached.length - sessionsCompleted.length) / sessionsReached.length) * 100 : 0,
                estimatedReadingTime,
                engagementScore: calculateEngagementScore(sessionsReached.length, sessions.length, estimatedReadingTime),
            });
        }

        return {
            paragraphMetrics,
            documentStructure: {
                totalParagraphs: documentStructure.paragraphs.length,
                wordCount: documentStructure.wordCount,
                estimatedReadingTime: documentStructure.estimatedReadingTime,
            }
        };
    },
});

// Helper function to analyze document structure
function analyzeDocumentStructure(content: string) {
    try {
        const parsed = JSON.parse(content);
        const paragraphs: Array<{ type: string; content: string }> = [];
        let wordCount = 0;

        function extractTextFromNode(node: any): void {
            if (node.type === 'paragraph' || node.type === 'heading') {
                let textContent = '';
                if (node.content) {
                    node.content.forEach((child: any) => {
                        if (child.type === 'text') {
                            textContent += child.text || '';
                        }
                    });
                }
                if (textContent.trim()) {
                    paragraphs.push({
                        type: node.type,
                        content: textContent.trim()
                    });
                    wordCount += textContent.split(/\s+/).length;
                }
            } else if (node.content) {
                node.content.forEach(extractTextFromNode);
            }
        }

        if (parsed.content) {
            parsed.content.forEach(extractTextFromNode);
        }

        return {
            paragraphs,
            wordCount,
            estimatedReadingTime: Math.ceil(wordCount / 200), // 200 words per minute
        };
    } catch (error) {
        // Fallback for plain text or malformed JSON
        const text = typeof content === 'string' ? content : '';
        const paragraphs = text.split('\n\n').filter(p => p.trim()).map(p => ({
            type: 'paragraph',
            content: p.trim()
        }));
        const wordCount = text.split(/\s+/).length;

        return {
            paragraphs,
            wordCount,
            estimatedReadingTime: Math.ceil(wordCount / 200),
        };
    }
}

// Helper function to estimate reading time for a paragraph
function estimateReadingTime(text: string): number {
    const words = text.split(/\s+/).length;
    return Math.ceil(words / 200 * 60); // seconds, assuming 200 words per minute
}

// Helper function to calculate engagement score
function calculateEngagementScore(reached: number, total: number, readingTime: number): number {
    const reachRate = total > 0 ? reached / total : 0;
    const timeWeight = Math.min(readingTime / 30, 1); // Normalize to 30 seconds max
    return Math.round((reachRate * 0.7 + timeWeight * 0.3) * 100);
}

// Get reading flow analysis
export const getDocumentReadingFlow = query({
    args: {
        documentId: v.id("documents"),
        timeRange: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const timeRange = args.timeRange || 7;
        const cutoffTime = Date.now() - timeRange * 24 * 60 * 60 * 1000;

        const sessions = await ctx.db
            .query("analyticsSessions")
            .withIndex("by_document_and_time", (q) =>
                q.eq("documentId", args.documentId).gte("startTime", cutoffTime),
            )
            .collect();

        if (sessions.length === 0) {
            return { flowMetrics: {}, readingPatterns: [] };
        }

        // Analyze reading patterns
        const readingPatterns = sessions.map(session => {
            const scrollSpeed = session.maxScrollPercentage / (session.duration || 1);

            let pattern = 'normal';
            if (scrollSpeed > 20) pattern = 'skimming';
            else if (scrollSpeed < 2) pattern = 'careful';
            else if (session.maxScrollPercentage < 25 && session.duration < 10) pattern = 'bounce';

            return {
                sessionId: session.sessionId,
                duration: session.duration,
                scrollDepth: session.maxScrollPercentage,
                scrollSpeed,
                pattern,
                timestamp: session.startTime,
            };
        });

        // Calculate flow metrics
        const flowMetrics = {
            averageScrollSpeed: readingPatterns.reduce((sum, p) => sum + p.scrollSpeed, 0) / readingPatterns.length,
            patternDistribution: {
                normal: readingPatterns.filter(p => p.pattern === 'normal').length,
                skimming: readingPatterns.filter(p => p.pattern === 'skimming').length,
                careful: readingPatterns.filter(p => p.pattern === 'careful').length,
                bounce: readingPatterns.filter(p => p.pattern === 'bounce').length,
            },
            averageDuration: sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length,
            retentionByDepth: calculateRetentionByDepth(sessions),
        };

        return { flowMetrics, readingPatterns };
    },
});

// Helper function to calculate retention by scroll depth
function calculateRetentionByDepth(sessions: any[]) {
    const depths = [25, 50, 75, 90, 100];
    return depths.map(depth => ({
        depth,
        retained: sessions.filter(s => s.maxScrollPercentage >= depth).length,
        percentage: Math.round((sessions.filter(s => s.maxScrollPercentage >= depth).length / sessions.length) * 100),
    }));
}