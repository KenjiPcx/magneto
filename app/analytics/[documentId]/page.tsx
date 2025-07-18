"use client";

import { useConvexAuth } from "convex/react";
import { useRouter, useParams } from "next/navigation";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

export default function AnalyticsPage() {
    const { isAuthenticated } = useConvexAuth();
    const router = useRouter();
    const params = useParams();

    const documentId = params.documentId as Id<'documents'>;

    if (!isAuthenticated) {
        router.push("/signin");
        return null;
    }

    if (!documentId) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Invalid Document</h1>
                    <p className="text-muted-foreground mb-6">
                        The document ID is invalid or missing.
                    </p>
                    <Link
                        href="/dashboard"
                        className="inline-flex px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/dashboard"
                                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
                            >
                                ← Back to Dashboard
                            </Link>
                            <div className="h-4 w-px bg-border"></div>
                            <h1 className="text-lg font-semibold">Analytics</h1>
                        </div>

                        <nav className="flex items-center gap-4">
                            <Link
                                href="/dashboard"
                                className="text-sm text-muted-foreground hover:text-foreground"
                            >
                                Documents
                            </Link>
                            <Link
                                href="/create"
                                className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                            >
                                Create New
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <AnalyticsDashboard documentId={documentId} />
            </main>
        </div>
    );
} 