"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { UserJourneyList } from "@/components/UserJourneyList";
import { JourneyAnalytics } from "@/components/JourneyAnalytics";
import { PopularPages } from "@/components/PopularPages";

export default function UserJourneysPage() {
    const { isAuthenticated } = useConvexAuth();
    const router = useRouter();
    const [timeRange, setTimeRange] = useState(7);
    const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'pages'>('analytics');

    if (!isAuthenticated) {
        router.push("/signin");
        return null;
    }

    const journeyAnalytics = useQuery(api.userJourneys.getJourneyAnalytics, {
        timeRange
    });

    const userJourneyList = useQuery(api.userJourneys.getUserJourneyList, {
        timeRange,
        limit: 100
    });

    const popularPages = useQuery(api.userJourneys.getPopularPages, {
        timeRange,
        limit: 20
    });

    const isLoading = !journeyAnalytics || !userJourneyList || !popularPages;

    const TabButton = ({ tab, label }: { tab: typeof activeTab; label: string }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium text-sm rounded-md transition-colors ${activeTab === tab
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
        >
            {label}
        </button>
    );

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <header className="border-b border-border bg-background sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold">User Journeys</h1>
                                <p className="text-muted-foreground">
                                    Track how users navigate through your content
                                </p>
                            </div>
                        </div>
                    </div>
                </header>
                <main className="max-w-7xl mx-auto px-4 py-8">
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Loading user journey data...</p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border bg-background sticky top-0 z-50">
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
                            <div>
                                <h1 className="text-2xl font-bold">User Journeys</h1>
                                <p className="text-muted-foreground">
                                    Track how users navigate through your content
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <select
                                value={timeRange}
                                onChange={(e) => setTimeRange(Number(e.target.value))}
                                className="px-3 py-2 border border-border rounded-md bg-background"
                            >
                                <option value={1}>Last 24 hours</option>
                                <option value={7}>Last 7 days</option>
                                <option value={30}>Last 30 days</option>
                                <option value={90}>Last 90 days</option>
                            </select>

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
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="space-y-6">
                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-2 border-b border-border">
                        <TabButton tab="analytics" label="Journey Analytics" />
                        <TabButton tab="users" label="Individual Users" />
                        <TabButton tab="pages" label="Popular Pages" />
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'analytics' && (
                        <JourneyAnalytics data={journeyAnalytics} timeRange={timeRange} />
                    )}

                    {activeTab === 'users' && (
                        <UserJourneyList data={userJourneyList} timeRange={timeRange} />
                    )}

                    {activeTab === 'pages' && (
                        <PopularPages data={popularPages} timeRange={timeRange} />
                    )}
                </div>
            </main>
        </div>
    );
} 