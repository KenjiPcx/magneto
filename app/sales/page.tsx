"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UserDetailModalProps {
    browserId: string;
    isOpen: boolean;
    onClose: () => void;
}

function UserDetailModal({ browserId, isOpen, onClose }: UserDetailModalProps) {
    const userHistory = useQuery(
        api.salesIntelligence.getUserDocumentHistory,
        isOpen ? { browserId, timeRange: 30 } : "skip"
    );

    if (!isOpen) return null;

    const formatDuration = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getInterestColor = (level: string) => {
        if (level === 'High') return 'bg-green-100 text-green-800';
        if (level === 'Medium') return 'bg-yellow-100 text-yellow-800';
        return 'bg-gray-100 text-gray-800';
    };

    const getTrendIcon = (trend: string) => {
        if (trend === 'Improving') return '📈';
        if (trend === 'Declining') return '📉';
        return '➡️';
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold">
                            Sales Profile: {userHistory?.user.userId || `Browser ${browserId.slice(-8)}`}
                        </h2>
                        <p className="text-muted-foreground text-sm">
                            Document engagement history and sales insights
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground p-2"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    {!userHistory ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Sales Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold">{userHistory.user.totalDocuments}</div>
                                    <div className="text-sm text-muted-foreground">Documents Read</div>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold">{userHistory.user.topInterest}</div>
                                    <div className="text-sm text-muted-foreground">High Interest</div>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold">{userHistory.user.returningReader}</div>
                                    <div className="text-sm text-muted-foreground">Returning Reader</div>
                                </div>
                                <div className="bg-orange-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold">{formatDuration(userHistory.user.totalTimeSpent)}</div>
                                    <div className="text-sm text-muted-foreground">Total Time</div>
                                </div>
                            </div>

                            {/* Sales Insights */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>🎯 Sales Insights & Talking Points</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {userHistory.salesInsights.map((insight, index) => (
                                            <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                                                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                                                <div>
                                                    <div className="font-medium text-sm">{insight.type}</div>
                                                    <div className="text-sm text-muted-foreground">{insight.message}</div>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Additional context */}
                                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                            <div className="font-medium text-sm text-blue-800 mb-2">📱 Communication Context</div>
                                            <div className="text-sm text-blue-700 space-y-1">
                                                <div>Preferred Device: {userHistory.user.preferredDevice}</div>
                                                <div>Active Time: {userHistory.user.timeZoneActivity}</div>
                                                <div>Days Since Last Visit: {Math.ceil((Date.now() - userHistory.user.lastVisit) / (24 * 60 * 60 * 1000))}</div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Document Engagement History */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>📄 Document Engagement History</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Detailed reading behavior per document - perfect for conversation starters
                                    </p>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {userHistory.documentHistory.map((doc, index) => (
                                            <div key={index} className="border border-border rounded-lg p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <h4 className="font-medium">{doc.document.title}</h4>
                                                        <p className="text-sm text-muted-foreground">{doc.document.description}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-1 rounded-full text-xs ${getInterestColor(doc.interestLevel)}`}>
                                                            {doc.interestLevel} Interest
                                                        </span>
                                                        <span className="text-lg" title={`Engagement ${doc.engagementTrend}`}>
                                                            {getTrendIcon(doc.engagementTrend)}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                                    <div>
                                                        <div className="text-sm font-medium">{doc.totalSessions}</div>
                                                        <div className="text-xs text-muted-foreground">Sessions</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium">{formatDuration(doc.avgDuration)}</div>
                                                        <div className="text-xs text-muted-foreground">Avg Time</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium">{doc.avgScrollDepth}%</div>
                                                        <div className="text-xs text-muted-foreground">Avg Scroll</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium">{doc.daysSinceLastVisit}d ago</div>
                                                        <div className="text-xs text-muted-foreground">Last Visit</div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                    {doc.isReturningReader && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">🔄 Returning Reader</span>}
                                                    {doc.thoroughReads > 0 && <span className="bg-green-100 text-green-800 px-2 py-1 rounded">📖 {doc.thoroughReads} Deep Read(s)</span>}
                                                    {doc.quickScans > 0 && <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">⚡ {doc.quickScans} Quick Scan(s)</span>}
                                                </div>

                                                {/* Session Timeline */}
                                                <details className="mt-3">
                                                    <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                                                        View Session Timeline ({doc.sessions.length} sessions)
                                                    </summary>
                                                    <div className="mt-2 space-y-2">
                                                        {doc.sessions.map((session, sessionIndex) => (
                                                            <div key={sessionIndex} className="flex items-center gap-4 text-sm p-2 bg-muted/20 rounded">
                                                                <div className="w-20 text-xs text-muted-foreground">
                                                                    {formatTime(session.startTime)}
                                                                </div>
                                                                <div className="flex-1">
                                                                    {formatDuration(session.duration)} • {session.scrollDepth}% scroll
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {session.referrer?.includes('google') ? '🔍 Google' :
                                                                        session.referrer?.includes('twitter') ? '🐦 Twitter' :
                                                                            session.referrer ? '🔗 Referral' : '📱 Direct'}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </details>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function SalesIntelligencePage() {
    const { isAuthenticated } = useConvexAuth();
    const router = useRouter();
    const [timeRange, setTimeRange] = useState(7);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);

    if (!isAuthenticated) {
        router.push("/signin");
        return null;
    }

    const userProfiles = useQuery(api.salesIntelligence.getUserProfiles, {
        timeRange,
        minSessions: 1
    });

    const formatDuration = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        return `${minutes}m`;
    };

    const getEngagementColor = (level: string) => {
        if (level === 'High') return 'text-green-600 bg-green-100';
        if (level === 'Medium') return 'text-yellow-600 bg-yellow-100';
        return 'text-gray-600 bg-gray-100';
    };

    const isLoading = !userProfiles;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <header className="border-b border-border bg-background sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold">Sales Intelligence</h1>
                                <p className="text-muted-foreground">
                                    User engagement data for sales outreach
                                </p>
                            </div>
                        </div>
                    </div>
                </header>
                <main className="max-w-7xl mx-auto px-4 py-8">
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Loading sales intelligence data...</p>
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
                                <h1 className="text-2xl font-bold">Sales Intelligence</h1>
                                <p className="text-muted-foreground">
                                    User engagement data for sales outreach
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <select
                                value={timeRange}
                                onChange={(e) => setTimeRange(Number(e.target.value))}
                                className="px-3 py-2 border border-border rounded-md bg-background"
                            >
                                <option value={3}>Last 3 days</option>
                                <option value={7}>Last 7 days</option>
                                <option value={14}>Last 14 days</option>
                                <option value={30}>Last 30 days</option>
                            </select>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="space-y-6">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Total Users
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{userProfiles.totalUsers}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Document readers
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    High Engagement
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{userProfiles.summary.highEngagementUsers}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Hot prospects
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Recent Activity
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{userProfiles.summary.recentUsers}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Active today
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Identified Users
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{userProfiles.summary.identifiedUsers}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Known contacts
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* User List */}
                    <Card>
                        <CardHeader>
                            <CardTitle>🎯 Sales Prospects</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Users who have engaged with your documents - click for detailed sales profile
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {/* Header */}
                                <div className="grid grid-cols-7 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                                    <div>User</div>
                                    <div>Documents</div>
                                    <div>Sessions</div>
                                    <div>Total Time</div>
                                    <div>Engagement</div>
                                    <div>Top Interest</div>
                                    <div>Last Seen</div>
                                </div>

                                {/* User List */}
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {userProfiles.users.map((user, index) => (
                                        <div
                                            key={index}
                                            onClick={() => setSelectedUser(user.browserId)}
                                            className="grid grid-cols-7 gap-4 text-sm py-3 hover:bg-muted/50 rounded-md px-2 cursor-pointer transition-colors"
                                        >
                                            {/* User Info */}
                                            <div>
                                                <div className="font-medium flex items-center gap-2">
                                                    {user.isIdentified && <span className="text-green-600">👤</span>}
                                                    {user.displayName}
                                                </div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                    {user.device}
                                                    {user.daysSinceLastVisit <= 1 && (
                                                        <span className="bg-green-100 text-green-800 px-1 rounded text-xs">🔥 Hot</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Documents */}
                                            <div className="font-medium">{user.uniqueDocuments}</div>

                                            {/* Sessions */}
                                            <div>{user.totalSessions}</div>

                                            {/* Total Time */}
                                            <div>{formatDuration(user.totalDuration)}</div>

                                            {/* Engagement Level */}
                                            <div>
                                                <span className={`px-2 py-1 rounded-full text-xs ${getEngagementColor(user.engagementLevel)}`}>
                                                    {user.engagementLevel}
                                                </span>
                                            </div>

                                            {/* Top Interest */}
                                            <div className="truncate" title={user.topDocuments[0]?.documentTitle}>
                                                {user.topDocuments[0]?.documentTitle || 'None'}
                                            </div>

                                            {/* Last Seen */}
                                            <div>
                                                <div className="text-xs">
                                                    {user.daysSinceLastVisit === 0
                                                        ? 'Today'
                                                        : `${user.daysSinceLastVisit}d ago`}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {userProfiles.users.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <p>No user engagement data available</p>
                                        <p className="text-xs mt-1">Users need to read documents to show up here</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* User Detail Modal */}
                {selectedUser && (
                    <UserDetailModal
                        browserId={selectedUser}
                        isOpen={!!selectedUser}
                        onClose={() => setSelectedUser(null)}
                    />
                )}
            </main>
        </div>
    );
} 