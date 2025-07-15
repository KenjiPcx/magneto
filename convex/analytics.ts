import { v } from "convex/values";
import { query } from "./_generated/server";

// Get analytics summary for a document (from processed session recordings)
export const getDocumentAnalytics = query({
    args: {
        documentId: v.id("documents"),
        timeRange: v.optional(v.number()), // Days to look back (default 30)
    },
    handler: async (ctx, args) => {
        const timeRange = args.timeRange || 30;
        const cutoffTime = Date.now() - timeRange * 24 * 60 * 60 * 1000;

        // Get all analytics sessions for this document in the time range
        const sessions = await ctx.db
            .query("analyticsSessions")
            .withIndex("by_document_and_time", (q) =>
                q.eq("documentId", args.documentId).gte("startTime", cutoffTime),
            )
            .collect();

        if (sessions.length === 0) {
            return {
                totalSessions: 0,
                totalTimeSpent: 0,
                averageTimeSpent: 0,
                paragraphAnalytics: [],
                scrollDepthDistribution: [],
                recordingSessions: 0,
            };
        }

        // Get processed heatmap data for this document
        const heatmapData = await ctx.db
            .query("heatmapData")
            .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
            .collect();

        // Filter heatmap data by time range
        const recentHeatmapData = heatmapData.filter(
            (data) => data.processedAt >= cutoffTime
        );

        // Aggregate paragraph-level analytics from processed recordings
        const paragraphMap = new Map<string, {
            viewCount: number;
            totalDwellTime: number;
            hoverCount: number;
            totalHoverTime: number;
            clickCount: number;
        }>();

        recentHeatmapData.forEach((data) => {
            data.paragraphEngagement.forEach((engagement) => {
                const current = paragraphMap.get(engagement.paragraphId) || {
                    viewCount: 0,
                    totalDwellTime: 0,
                    hoverCount: 0,
                    totalHoverTime: 0,
                    clickCount: 0,
                };

                current.viewCount += engagement.viewCount;
                current.totalDwellTime += engagement.totalDwellTime;
                current.hoverCount += engagement.hoverTime > 0 ? 1 : 0;
                current.totalHoverTime += engagement.hoverTime;
                current.clickCount += engagement.clickCount;

                paragraphMap.set(engagement.paragraphId, current);
            });
        });

        const paragraphAnalytics = Array.from(paragraphMap.entries()).map(
            ([paragraphId, stats]) => ({
                paragraphId,
                ...stats,
                averageDwellTime: stats.viewCount ? stats.totalDwellTime / stats.viewCount : 0,
                averageHoverTime: stats.hoverCount ? stats.totalHoverTime / stats.hoverCount : 0,
            }),
        );

        // Calculate session metrics
        const totalSessions = sessions.length;
        const recordingSessions = sessions.filter(s => s.hasRecording).length;
        const totalTimeSpent = sessions.reduce(
            (sum, s) => sum + (s.totalTimeSpent || 0),
            0,
        );
        const averageTimeSpent = totalTimeSpent / totalSessions;

        // Calculate scroll depth distribution from session metrics
        const scrollDepths = recentHeatmapData
            .map((data) => data.sessionMetrics.scrollDepth)
            .filter((d): d is number => d !== undefined);

        const scrollDepthDistribution = [
            { range: "0-25%", count: scrollDepths.filter(d => d >= 0 && d < 25).length },
            { range: "25-50%", count: scrollDepths.filter(d => d >= 25 && d < 50).length },
            { range: "50-75%", count: scrollDepths.filter(d => d >= 50 && d < 75).length },
            { range: "75-100%", count: scrollDepths.filter(d => d >= 75).length },
        ];

        return {
            totalSessions,
            totalTimeSpent,
            averageTimeSpent,
            paragraphAnalytics,
            scrollDepthDistribution,
            recordingSessions,
        };
    },
});

// Get detailed paragraph heatmap data from processed recordings
export const getParagraphHeatmap = query({
    args: {
        documentId: v.id("documents"),
        timeRange: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const timeRange = args.timeRange || 30;
        const cutoffTime = Date.now() - timeRange * 24 * 60 * 60 * 1000;

        // Get processed heatmap data for this document
        const heatmapData = await ctx.db
            .query("heatmapData")
            .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
            .collect();

        // Filter by time range
        const recentHeatmapData = heatmapData.filter(
            (data) => data.processedAt >= cutoffTime
        );

        if (recentHeatmapData.length === 0) {
            return [];
        }

        // Aggregate engagement data across all sessions
        const aggregatedData = new Map<string, {
            totalDwellTime: number;
            viewCount: number;
            hoverTime: number;
            clickCount: number;
            sessionCount: number;
        }>();

        recentHeatmapData.forEach((data) => {
            data.paragraphEngagement.forEach((engagement) => {
                const current = aggregatedData.get(engagement.paragraphId) || {
                    totalDwellTime: 0,
                    viewCount: 0,
                    hoverTime: 0,
                    clickCount: 0,
                    sessionCount: 0,
                };

                current.totalDwellTime += engagement.totalDwellTime;
                current.viewCount += engagement.viewCount;
                current.hoverTime += engagement.hoverTime;
                current.clickCount += engagement.clickCount;
                current.sessionCount += 1;

                aggregatedData.set(engagement.paragraphId, current);
            });
        });

        // Calculate heat levels based on total dwell time
        const allDwellTimes = Array.from(aggregatedData.values()).map(
            (data) => data.totalDwellTime,
        );
        const maxDwellTime = Math.max(...allDwellTimes, 1);

        const result = Array.from(aggregatedData.entries()).map(([paragraphId, data]) => {
            const averageDwellTime = data.totalDwellTime / data.sessionCount;
            const percentage = (data.totalDwellTime / maxDwellTime) * 100;

            let heatLevel: "cold" | "warm" | "hot" | "very_hot";
            if (percentage >= 80) heatLevel = "very_hot";
            else if (percentage >= 60) heatLevel = "hot";
            else if (percentage >= 30) heatLevel = "warm";
            else heatLevel = "cold";

            return {
                paragraphId,
                totalDwellTime: data.totalDwellTime,
                viewCount: data.viewCount,
                averageDwellTime,
                heatLevel,
                clickCount: data.clickCount,
                hoverTime: data.hoverTime,
                sessionCount: data.sessionCount,
            };
        });

        return result.sort((a, b) => {
            const aNum = parseInt(a.paragraphId.replace("paragraph-", ""));
            const bNum = parseInt(b.paragraphId.replace("paragraph-", ""));
            return aNum - bNum;
        });
    },
});

// Get session recordings analytics for dashboard
export const getSessionRecordingsAnalytics = query({
    args: {
        documentId: v.id("documents"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const recordings = await ctx.db
            .query("sessionRecordings")
            .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
            .order("desc")
            .take(args.limit || 10);

        const statusCounts = {
            recording: 0,
            completed: 0,
            processing: 0,
            analyzed: 0,
            failed: 0,
        };

        recordings.forEach((recording) => {
            statusCounts[recording.status]++;
        });

        return {
            recordings: recordings.map((recording) => ({
                _id: recording._id,
                sessionId: recording.sessionId,
                status: recording.status,
                duration: recording.metadata.duration,
                eventCount: recording.metadata.eventCount,
                createdAt: recording.createdAt,
                updatedAt: recording.updatedAt,
            })),
            statusCounts,
            totalRecordings: recordings.length,
        };
    },
}); 