"use client";

import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
// import { DocumentAnalyticsSummary } from "@/components/DocumentAnalyticsSummary";

export default function DashboardPage() {
    const { isAuthenticated } = useConvexAuth();
    const router = useRouter();
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const documents = useQuery(api.documents.getUserDocuments);
    const togglePublish = useMutation(api.documents.togglePublish);
    const deleteDocument = useMutation(api.documents.deleteDocument);

    if (!isAuthenticated) {
        router.push("/signin");
        return null;
    }

    const handleTogglePublish = async (docId: string) => {
        try {
            await togglePublish({ id: docId as Id<"documents"> });
        } catch (error) {
            console.error("Error toggling publish:", error);
            alert("Error updating document. Please try again.");
        }
    };

    const handleDelete = async (docId: string) => {
        try {
            await deleteDocument({ id: docId as Id<"documents"> });
            setDeleteConfirm(null);
        } catch (error) {
            console.error("Error deleting document:", error);
            alert("Error deleting document. Please try again.");
        }
    };

    const copyShareLink = (slug: string) => {
        const shareUrl = `${window.location.origin}/share/${slug}`;
        navigator.clipboard.writeText(shareUrl);
        alert("Share link copied to clipboard!");
    };

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border bg-background sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">CreatorHeat Dashboard</h1>
                            <p className="text-muted-foreground">
                                Manage your lead magnets and analytics
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link
                                href="/create"
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                            >
                                Create Document
                            </Link>
                            <button
                                onClick={() => router.push("/")}
                                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                            >
                                Home
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 py-8">
                {documents === undefined ? (
                    <div className="text-center py-8">
                        <p>Loading your documents...</p>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="text-center py-12">
                        <h2 className="text-xl font-semibold mb-4">No documents yet</h2>
                        <p className="text-muted-foreground mb-6">
                            Create your first lead magnet to get started with CreatorHeat
                        </p>
                        <Link
                            href="/create"
                            className="inline-flex px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                        >
                            Create Your First Document
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Your Documents</h2>
                            <p className="text-muted-foreground">
                                {documents.length} documents
                            </p>
                        </div>

                        <div className="grid gap-6">
                            {documents.map((doc) => (
                                <div
                                    key={doc._id}
                                    className="border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-semibold truncate">
                                                    {doc.title}
                                                </h3>
                                                <span
                                                    className={`px-2 py-1 text-xs rounded-full ${doc.isPublished
                                                        ? "bg-green-100 text-green-800"
                                                        : "bg-yellow-100 text-yellow-800"
                                                        }`}
                                                >
                                                    {doc.isPublished ? "Published" : "Draft"}
                                                </span>
                                            </div>

                                            {doc.description && (
                                                <p className="text-muted-foreground mb-3 line-clamp-2">
                                                    {doc.description}
                                                </p>
                                            )}

                                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                                                <span>
                                                    Created:{" "}
                                                    {new Date(doc._creationTime).toLocaleDateString()}
                                                </span>
                                                <span>•</span>
                                                <span>Slug: {doc.slug}</span>
                                            </div>

                                            {/* Analytics summary for published documents */}
                                            {doc.isPublished && (
                                                <div className="border-t border-border pt-3 mt-3">
                                                    {/* <DocumentAnalyticsSummary documentId={doc._id} timeRange={7} /> */}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 ml-4">
                                            <Link
                                                href={`/edit/${doc._id}`}
                                                className="px-3 py-1 text-sm border border-border rounded hover:bg-accent"
                                            >
                                                Edit
                                            </Link>

                                            {doc.isPublished && (
                                                <Link
                                                    href={`/analytics/${doc._id}`}
                                                    className="px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded hover:bg-purple-200"
                                                >
                                                    Analytics
                                                </Link>
                                            )}

                                            <button
                                                onClick={() => handleTogglePublish(doc._id)}
                                                className={`px-3 py-1 text-sm rounded ${doc.isPublished
                                                    ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                                    : "bg-green-100 text-green-800 hover:bg-green-200"
                                                    }`}
                                            >
                                                {doc.isPublished ? "Unpublish" : "Publish"}
                                            </button>

                                            {doc.isPublished && (
                                                <button
                                                    onClick={() => copyShareLink(doc.slug)}
                                                    className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                                                >
                                                    Copy Link
                                                </button>
                                            )}

                                            <button
                                                onClick={() => setDeleteConfirm(doc._id)}
                                                className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">Delete Document</h3>
                        <p className="text-muted-foreground mb-6">
                            Are you sure you want to delete this document? This action cannot
                            be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 border border-border rounded hover:bg-accent"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
