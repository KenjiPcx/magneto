import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  numbers: defineTable({
    value: v.number(),
  }),

  // Documents table for storing lead magnet content
  documents: defineTable({
    title: v.string(),
    content: v.string(), // JSON string of TipTap content
    slug: v.string(), // URL-friendly identifier for sharing
    creatorId: v.id("users"), // Reference to the creator
    isPublished: v.boolean(),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    settings: v.optional(
      v.object({
        allowGuests: v.boolean(),
        trackingEnabled: v.boolean(),
        requireEmail: v.optional(v.boolean()),
      }),
    ),
  })
    .index("by_creator", ["creatorId"])
    .index("by_slug", ["slug"])
    .index("by_published", ["isPublished"]),

  // Session recordings using rrweb - stored as files in Convex
  sessionRecordings: defineTable({
    documentId: v.id("documents"),
    sessionId: v.string(), // Client-generated unique session ID
    userId: v.optional(v.id("users")), // Optional if user is logged in
    recordingFileId: v.id("_storage"), // Reference to the rrweb recording file
    metadata: v.object({
      userAgent: v.optional(v.string()),
      referrer: v.optional(v.string()),
      viewportWidth: v.optional(v.number()),
      viewportHeight: v.optional(v.number()),
      startTime: v.number(), // Timestamp when recording started
      endTime: v.optional(v.number()), // Timestamp when recording ended
      duration: v.optional(v.number()), // Duration in milliseconds
      eventCount: v.optional(v.number()), // Number of events in recording
    }),
    status: v.union(
      v.literal("recording"), // Currently recording
      v.literal("completed"), // Recording finished and uploaded
      v.literal("processing"), // Processing for heatmap generation
      v.literal("analyzed"), // Heatmap data extracted
      v.literal("failed"), // Recording or processing failed
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_document", ["documentId"])
    .index("by_session", ["sessionId"])
    .index("by_document_and_status", ["documentId", "status"])
    .index("by_created_at", ["createdAt"]),

  // Processed heatmap data extracted from rrweb recordings
  heatmapData: defineTable({
    documentId: v.id("documents"),
    sessionRecordingId: v.id("sessionRecordings"),
    // Paragraph-level engagement data
    paragraphEngagement: v.array(
      v.object({
        paragraphId: v.string(), // paragraph-0, paragraph-1, etc.
        totalDwellTime: v.number(), // Total time spent viewing this paragraph
        viewCount: v.number(), // Number of times paragraph came into view
        hoverTime: v.number(), // Time spent hovering over paragraph
        clickCount: v.number(), // Number of clicks on paragraph
        scrollPasses: v.number(), // How many times user scrolled past this paragraph
      })
    ),
    // Overall session metrics
    sessionMetrics: v.object({
      totalDuration: v.number(),
      scrollDepth: v.number(), // Maximum scroll percentage reached
      clickCount: v.number(),
      idleTime: v.number(), // Time with no user interaction
      activeTime: v.number(), // Time with active interaction
    }),
    // Processed at timestamp
    processedAt: v.number(),
  })
    .index("by_document", ["documentId"])
    .index("by_session_recording", ["sessionRecordingId"])
    .index("by_processed_at", ["processedAt"]),

  // Keep simplified analytics sessions for quick dashboard metrics
  analyticsSessions: defineTable({
    documentId: v.id("documents"),
    sessionId: v.string(),
    userId: v.optional(v.id("users")),
    userAgent: v.optional(v.string()),
    referrer: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    totalTimeSpent: v.optional(v.number()),
    scrollDepth: v.optional(v.number()),
    hasRecording: v.optional(v.boolean()), // Whether this session has an rrweb recording
    sessionRecordingId: v.optional(v.id("sessionRecordings")),
  })
    .index("by_document", ["documentId"])
    .index("by_session", ["sessionId"])
    .index("by_document_and_time", ["documentId", "startTime"]),
});
