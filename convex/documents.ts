import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Generate a unique slug for documents
function generateSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // Add timestamp to ensure uniqueness
  const timestamp = Date.now().toString(36);
  return `${slug}-${timestamp}`;
}

// Create a new document
export const createDocument = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const slug = generateSlug(args.title);

    const documentId = await ctx.db.insert("documents", {
      title: args.title,
      content: args.content,
      slug,
      creatorId: userId,
      isPublished: false,
      description: args.description,
      tags: args.tags,
      settings: {
        allowGuests: true,
        trackingEnabled: true,
        requireEmail: false,
      },
    });

    return documentId;
  },
});

// Get all documents for a user
export const getUserDocuments = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_creator", (q) => q.eq("creatorId", userId))
      .order("desc")
      .collect();

    return documents;
  },
});

// Get a specific document by ID (for editing)
export const getDocument = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new Error("Document not found");
    }

    // Check if user owns this document
    if (document.creatorId !== userId) {
      throw new Error("Access denied");
    }

    return document;
  },
});

// Get a document by slug (for public sharing)
export const getDocumentBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const document = await ctx.db
      .query("documents")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!document) {
      throw new Error("Document not found");
    }

    // Only return published documents for public access
    if (!document.isPublished) {
      throw new Error("Document not published");
    }

    // Get creator information (without sensitive data)
    const creator = await ctx.db.get(document.creatorId);

    return {
      ...document,
      creator: creator
        ? {
            name: creator.name,
            email: creator.email,
          }
        : null,
    };
  },
});

// Update a document
export const updateDocument = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isPublished: v.optional(v.boolean()),
    settings: v.optional(
      v.object({
        allowGuests: v.boolean(),
        trackingEnabled: v.boolean(),
        requireEmail: v.optional(v.boolean()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new Error("Document not found");
    }

    // Check if user owns this document
    if (document.creatorId !== userId) {
      throw new Error("Access denied");
    }

    // Prepare update data
    const updateData: any = {};
    if (args.title !== undefined) updateData.title = args.title;
    if (args.content !== undefined) updateData.content = args.content;
    if (args.description !== undefined)
      updateData.description = args.description;
    if (args.tags !== undefined) updateData.tags = args.tags;
    if (args.isPublished !== undefined)
      updateData.isPublished = args.isPublished;
    if (args.settings !== undefined) updateData.settings = args.settings;

    // If title is being updated, generate a new slug
    if (args.title !== undefined) {
      updateData.slug = generateSlug(args.title);
    }

    await ctx.db.patch(args.id, updateData);

    return { success: true };
  },
});

// Delete a document
export const deleteDocument = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new Error("Document not found");
    }

    // Check if user owns this document
    if (document.creatorId !== userId) {
      throw new Error("Access denied");
    }

    await ctx.db.delete(args.id);

    return { success: true };
  },
});

// Publish/unpublish a document
export const togglePublish = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new Error("Document not found");
    }

    // Check if user owns this document
    if (document.creatorId !== userId) {
      throw new Error("Access denied");
    }

    await ctx.db.patch(args.id, {
      isPublished: !document.isPublished,
    });

    return { success: true, isPublished: !document.isPublished };
  },
});
