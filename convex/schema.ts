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

  analyticsSessions: defineTable({
    documentId: v.id("documents"),
    sessionId: v.string(),
    browserId: v.string(), // Persistent browser identifier
    userId: v.optional(v.string()), // Optional user identifier from URL params
    userAgent: v.string(),
    referrer: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    duration: v.number(), // Session duration in seconds
    maxScrollPercentage: v.number(), // Furthest scroll reached (0-100)
    scrollEventCount: v.optional(v.number()), // Number of scroll events in this session
    scrollEventsFileId: v.optional(v.id("_storage")), // Reference to detailed scroll events JSON file
    viewport: v.object({
      width: v.number(),
      height: v.number(),
    }),
    processed: v.optional(v.boolean()), // Whether this session has been processed into aggregated data
    createdAt: v.number(),
  })
    .index("by_document", ["documentId"])
    .index("by_browser", ["browserId"])
    .index("by_document_and_browser", ["documentId", "browserId"])
    .index("by_document_and_time", ["documentId", "startTime"])
    .index("by_document_and_processed", ["documentId", "processed"])
    .index("by_created_at", ["createdAt"]),

  // Aggregated analytics data for efficient querying
  documentAnalytics: defineTable({
    documentId: v.id("documents"),
    timeRange: v.number(), // Days (1, 7, 30, 90)
    totalSessions: v.number(),
    uniqueVisitors: v.number(),
    totalTimeSpent: v.number(),
    totalScrollEvents: v.number(),
    completedSessions: v.number(), // Sessions that reached 90%+ scroll
    bouncedSessions: v.number(), // Sessions under 10 seconds
    scrollDepthBuckets: v.object({
      depth_0_25: v.number(),
      depth_25_50: v.number(),
      depth_50_75: v.number(),
      depth_75_100: v.number(),
    }),
    deviceBreakdown: v.object({
      mobile: v.number(),
      tablet: v.number(),
      desktop: v.number(),
    }),
    referrerDomains: v.array(v.object({
      domain: v.string(),
      count: v.number(),
    })),
    dailyStats: v.array(v.object({
      date: v.string(),
      sessions: v.number(),
      uniqueVisitors: v.number(),
      averageTimeSpent: v.number(),
      averageScrollDepth: v.number(),
    })),
    lastProcessedSession: v.optional(v.string()), // Last session ID that was processed
    lastUpdated: v.number(),
  })
    .index("by_document_and_timerange", ["documentId", "timeRange"])
    .index("by_document", ["documentId"]),
});
