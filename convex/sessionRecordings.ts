import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

// Start a new session recording
export const startSessionRecording = mutation({
    args: {
        documentId: v.id("documents"),
        sessionId: v.string(),
        userId: v.optional(v.id("users")),
        userAgent: v.optional(v.string()),
        referrer: v.optional(v.string()),
        viewportWidth: v.optional(v.number()),
        viewportHeight: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();

        // Create analytics session for quick metrics
        const analyticsSessionId = await ctx.db.insert("analyticsSessions", {
            documentId: args.documentId,
            sessionId: args.sessionId,
            userId: args.userId,
            userAgent: args.userAgent,
            referrer: args.referrer,
            startTime: now,
            hasRecording: true,
        });

        return { analyticsSessionId, startTime: now };
    },
});

// Generate upload URL for session recording
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

// Complete session recording after file upload
export const completeSessionRecording = mutation({
    args: {
        sessionId: v.string(),
        recordingFileId: v.id("_storage"),
        duration: v.number(),
        eventCount: v.number(),
        endTime: v.number(),
    },
    handler: async (ctx, args) => {
        // Find the analytics session
        const analyticsSession = await ctx.db
            .query("analyticsSessions")
            .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
            .first();

        if (!analyticsSession) {
            throw new Error("Analytics session not found");
        }

        // Create session recording record
        const sessionRecordingId = await ctx.db.insert("sessionRecordings", {
            documentId: analyticsSession.documentId,
            sessionId: args.sessionId,
            userId: analyticsSession.userId,
            recordingFileId: args.recordingFileId,
            metadata: {
                userAgent: analyticsSession.userAgent,
                referrer: analyticsSession.referrer,
                startTime: analyticsSession.startTime,
                endTime: args.endTime,
                duration: args.duration,
                eventCount: args.eventCount,
            },
            status: "completed",
            createdAt: analyticsSession.startTime,
            updatedAt: Date.now(),
        });

        // Update analytics session
        await ctx.db.patch(analyticsSession._id, {
            endTime: args.endTime,
            totalTimeSpent: args.duration,
            hasRecording: true,
            sessionRecordingId,
        });

        // Schedule processing for heatmap generation
        await ctx.scheduler.runAfter(0, api.sessionRecordings.processRecordingForHeatmap, {
            sessionRecordingId,
        });

        return sessionRecordingId;
    },
});

// Get session recordings for a document
export const getSessionRecordings = query({
    args: {
        documentId: v.id("documents"),
        limit: v.optional(v.number()),
        status: v.optional(v.union(
            v.literal("recording"),
            v.literal("completed"),
            v.literal("processing"),
            v.literal("analyzed"),
            v.literal("failed")
        )),
    },
    handler: async (ctx, args) => {
        let query = ctx.db
            .query("sessionRecordings")
            .withIndex("by_document", (q) => q.eq("documentId", args.documentId));

        if (args.status !== undefined) {
            const status = args.status;
            query = ctx.db
                .query("sessionRecordings")
                .withIndex("by_document_and_status", (q) =>
                    q.eq("documentId", args.documentId).eq("status", status)
                );
        }

        const recordings = await query
            .order("desc")
            .take(args.limit || 50);

        return recordings;
    },
});

// Get recording file URL for playback
export const getRecordingFileUrl = query({
    args: {
        sessionRecordingId: v.id("sessionRecordings"),
    },
    handler: async (ctx, args) => {
        const recording = await ctx.db.get(args.sessionRecordingId);
        if (!recording) {
            throw new Error("Recording not found");
        }

        const fileUrl = await ctx.storage.getUrl(recording.recordingFileId);
        return fileUrl;
    },
});

// Process recording for heatmap generation (action for external processing)
export const processRecordingForHeatmap = action({
    args: {
        sessionRecordingId: v.id("sessionRecordings"),
    },
    handler: async (ctx, args) => {
        // Mark as processing
        await ctx.runMutation(api.sessionRecordings.updateRecordingStatus, {
            sessionRecordingId: args.sessionRecordingId,
            status: "processing",
        });

        try {
            // Get recording data
            const recording = await ctx.runQuery(api.sessionRecordings.getRecording, {
                sessionRecordingId: args.sessionRecordingId,
            });

            if (!recording) {
                throw new Error("Recording not found");
            }

            // Get file URL and download recording data
            const fileUrl = await ctx.runQuery(api.sessionRecordings.getRecordingFileUrl, {
                sessionRecordingId: args.sessionRecordingId,
            });

            if (!fileUrl) {
                throw new Error("Recording file URL not found");
            }

            // Fetch recording data
            const response = await fetch(fileUrl);
            const recordingEvents = await response.json();

            // Process events to extract heatmap data
            const heatmapData = await processRRWebEventsForHeatmap(recordingEvents, recording.documentId);

            // Store processed heatmap data
            await ctx.runMutation(api.sessionRecordings.storeHeatmapData, {
                documentId: recording.documentId,
                sessionRecordingId: args.sessionRecordingId,
                heatmapData,
            });

            // Mark as analyzed
            await ctx.runMutation(api.sessionRecordings.updateRecordingStatus, {
                sessionRecordingId: args.sessionRecordingId,
                status: "analyzed",
            });

        } catch (error) {
            console.error("Failed to process recording:", error);

            // Mark as failed
            await ctx.runMutation(api.sessionRecordings.updateRecordingStatus, {
                sessionRecordingId: args.sessionRecordingId,
                status: "failed",
            });
        }
    },
});

// Helper mutation to update recording status
export const updateRecordingStatus = mutation({
    args: {
        sessionRecordingId: v.id("sessionRecordings"),
        status: v.union(
            v.literal("recording"),
            v.literal("completed"),
            v.literal("processing"),
            v.literal("analyzed"),
            v.literal("failed")
        ),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.sessionRecordingId, {
            status: args.status,
            updatedAt: Date.now(),
        });
    },
});

// Get recording for processing
export const getRecording = query({
    args: {
        sessionRecordingId: v.id("sessionRecordings"),
    },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.sessionRecordingId);
    },
});

// Store processed heatmap data
export const storeHeatmapData = mutation({
    args: {
        documentId: v.id("documents"),
        sessionRecordingId: v.id("sessionRecordings"),
        heatmapData: v.object({
            paragraphEngagement: v.array(
                v.object({
                    paragraphId: v.string(),
                    totalDwellTime: v.number(),
                    viewCount: v.number(),
                    hoverTime: v.number(),
                    clickCount: v.number(),
                    scrollPasses: v.number(),
                })
            ),
            sessionMetrics: v.object({
                totalDuration: v.number(),
                scrollDepth: v.number(),
                clickCount: v.number(),
                idleTime: v.number(),
                activeTime: v.number(),
            }),
        }),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("heatmapData", {
            documentId: args.documentId,
            sessionRecordingId: args.sessionRecordingId,
            paragraphEngagement: args.heatmapData.paragraphEngagement,
            sessionMetrics: args.heatmapData.sessionMetrics,
            processedAt: Date.now(),
        });
    },
});

// Process rrweb events to extract heatmap data
async function processRRWebEventsForHeatmap(events: any[], documentId: string) {
    console.log(`Processing ${events.length} rrweb events for heatmap generation`);

    const paragraphEngagement = new Map<string, {
        totalDwellTime: number;
        viewCount: number;
        hoverTime: number;
        clickCount: number;
        scrollPasses: number;
    }>();

    let totalDuration = 0;
    let maxScrollDepth = 0;
    let totalClicks = 0;
    let totalActiveTime = 0;
    let lastActiveTime = 0;
    let documentHeight = 0;
    let viewportHeight = 0;

    // Track element visibility for dwell time calculation
    const elementVisibility = new Map<string, {
        lastVisible: number;
        totalVisible: number;
    }>();

    // Track hover states
    const hoverStates = new Map<string, number>();

    // Process events chronologically
    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const timestamp = event.timestamp;

        // Update total duration
        totalDuration = Math.max(totalDuration, timestamp);

        switch (event.type) {
            case 0: // DomContentLoaded - Initial DOM snapshot
                if (event.data?.height) {
                    documentHeight = event.data.height;
                }
                if (event.data?.width) {
                    viewportHeight = event.data.height;
                }
                break;

            case 2: // IncrementalSnapshot - DOM mutations, scroll, etc.
                if (event.data?.source === 3) { // Mouse interaction
                    const mouseData = event.data.data;

                    if (mouseData?.type === 2) { // MouseMove
                        lastActiveTime = timestamp;

                        // Check if mouse is over a paragraph element
                        const target = findParagraphTarget(mouseData);
                        if (target) {
                            // Track hover start
                            if (!hoverStates.has(target)) {
                                hoverStates.set(target, timestamp);
                            }
                        } else {
                            // Mouse left paragraph area, calculate hover time
                            hoverStates.forEach((startTime, paragraphId) => {
                                const hoverDuration = timestamp - startTime;
                                if (hoverDuration > 200) { // Only count meaningful hovers
                                    const current = paragraphEngagement.get(paragraphId) || {
                                        totalDwellTime: 0,
                                        viewCount: 0,
                                        hoverTime: 0,
                                        clickCount: 0,
                                        scrollPasses: 0,
                                    };
                                    current.hoverTime += hoverDuration;
                                    paragraphEngagement.set(paragraphId, current);
                                }
                            });
                            hoverStates.clear();
                        }
                    }

                    if (mouseData?.type === 3 || mouseData?.type === 4) { // MouseDown/MouseUp
                        totalClicks++;
                        lastActiveTime = timestamp;

                        const target = findParagraphTarget(mouseData);
                        if (target) {
                            const current = paragraphEngagement.get(target) || {
                                totalDwellTime: 0,
                                viewCount: 0,
                                hoverTime: 0,
                                clickCount: 0,
                                scrollPasses: 0,
                            };
                            current.clickCount++;
                            paragraphEngagement.set(target, current);
                        }
                    }
                }

                if (event.data?.source === 7) { // Scroll
                    const scrollData = event.data.data;
                    lastActiveTime = timestamp;

                    if (scrollData?.y !== undefined && documentHeight > 0) {
                        const scrollPercentage = Math.min(100, (scrollData.y / documentHeight) * 100);
                        maxScrollDepth = Math.max(maxScrollDepth, scrollPercentage);

                        // Estimate which paragraphs are visible based on scroll position
                        updateParagraphVisibility(scrollData.y, timestamp, elementVisibility, paragraphEngagement);
                    }
                }
                break;

            case 3: // FullSnapshot - Complete DOM state
                // Could extract paragraph positions here if needed
                break;

            case 4: // Meta - viewport size changes
                if (event.data?.height) {
                    viewportHeight = event.data.height;
                }
                break;

            case 5: // CustomEvent
                // Could be used for custom tracking events
                break;
        }
    }

    // Calculate final dwell times for any still-visible elements
    const finalTimestamp = events[events.length - 1]?.timestamp || 0;
    elementVisibility.forEach((data, paragraphId) => {
        if (data.lastVisible > 0) {
            const current = paragraphEngagement.get(paragraphId) || {
                totalDwellTime: 0,
                viewCount: 0,
                hoverTime: 0,
                clickCount: 0,
                scrollPasses: 0,
            };
            current.totalDwellTime += finalTimestamp - data.lastVisible;
            paragraphEngagement.set(paragraphId, current);
        }
    });

    // Calculate active time (periods with user interaction)
    totalActiveTime = calculateActiveTime(events);

    console.log(`Processed engagement data for ${paragraphEngagement.size} paragraphs`);

    return {
        paragraphEngagement: Array.from(paragraphEngagement.entries()).map(([paragraphId, data]) => ({
            paragraphId,
            ...data,
        })),
        sessionMetrics: {
            totalDuration,
            scrollDepth: maxScrollDepth,
            clickCount: totalClicks,
            idleTime: totalDuration - totalActiveTime,
            activeTime: totalActiveTime,
        },
    };
}

// Helper function to find paragraph target from mouse event
function findParagraphTarget(mouseData: any): string | null {
    // This would need to match against the DOM structure at the time
    // For now, we'll use a simplified approach based on coordinates
    // In a real implementation, you'd need to track the DOM state and element positions

    if (mouseData?.target && mouseData.target.tagName) {
        const tagName = mouseData.target.tagName.toLowerCase();
        if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
            // Extract paragraph ID from target
            const paragraphId = mouseData.target.attributes?.['data-paragraph-id'];
            return paragraphId || null;
        }
    }

    return null;
}

// Helper function to update paragraph visibility based on scroll
function updateParagraphVisibility(
    scrollY: number,
    timestamp: number,
    elementVisibility: Map<string, { lastVisible: number; totalVisible: number }>,
    paragraphEngagement: Map<string, any>
) {
    // Estimate visible paragraphs based on scroll position
    // This is a simplified calculation - in practice you'd need element positions
    const viewportTop = scrollY;
    const viewportBottom = scrollY + 800; // Approximate viewport height

    // Estimate paragraph positions (this would be more accurate with actual DOM data)
    const estimatedParagraphHeight = 100; // Average paragraph height
    const visibleParagraphStart = Math.floor(viewportTop / estimatedParagraphHeight);
    const visibleParagraphEnd = Math.ceil(viewportBottom / estimatedParagraphHeight);

    // Mark paragraphs as visible
    for (let i = visibleParagraphStart; i <= visibleParagraphEnd; i++) {
        const paragraphId = `paragraph-${i}`;

        const visibility = elementVisibility.get(paragraphId) || {
            lastVisible: 0,
            totalVisible: 0,
        };

        if (visibility.lastVisible === 0) {
            // Paragraph became visible
            visibility.lastVisible = timestamp;

            const current = paragraphEngagement.get(paragraphId) || {
                totalDwellTime: 0,
                viewCount: 0,
                hoverTime: 0,
                clickCount: 0,
                scrollPasses: 0,
            };
            current.viewCount++;
            current.scrollPasses++;
            paragraphEngagement.set(paragraphId, current);
        }

        elementVisibility.set(paragraphId, visibility);
    }

    // Mark paragraphs as no longer visible and calculate dwell time
    elementVisibility.forEach((data, paragraphId) => {
        const paragraphIndex = parseInt(paragraphId.replace('paragraph-', ''));
        if (paragraphIndex < visibleParagraphStart || paragraphIndex > visibleParagraphEnd) {
            if (data.lastVisible > 0) {
                // Paragraph no longer visible, calculate dwell time
                const dwellTime = timestamp - data.lastVisible;
                const current = paragraphEngagement.get(paragraphId) || {
                    totalDwellTime: 0,
                    viewCount: 0,
                    hoverTime: 0,
                    clickCount: 0,
                    scrollPasses: 0,
                };
                current.totalDwellTime += dwellTime;
                paragraphEngagement.set(paragraphId, current);

                data.lastVisible = 0;
                elementVisibility.set(paragraphId, data);
            }
        }
    });
}

// Helper function to calculate active time from events
function calculateActiveTime(events: any[]): number {
    let activeTime = 0;
    let lastActivityTime = 0;
    const inactivityThreshold = 5000; // 5 seconds of inactivity

    for (const event of events) {
        const timestamp = event.timestamp;

        // Check if this is an interactive event
        const isInteractive =
            (event.type === 2 && (
                event.data?.source === 3 || // Mouse
                event.data?.source === 7 || // Scroll
                event.data?.source === 6    // Input
            )) ||
            event.type === 3; // Click

        if (isInteractive) {
            if (lastActivityTime > 0 && timestamp - lastActivityTime < inactivityThreshold) {
                activeTime += timestamp - lastActivityTime;
            }
            lastActivityTime = timestamp;
        }
    }

    return activeTime;
} 