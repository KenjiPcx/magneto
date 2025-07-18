import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface UserJourneyData {
    users: Array<{
        browserId: string;
        userId?: string;
        displayName: string;
        stats: {
            totalPageViews: number;
            sessions: number;
            documentsViewed: number;
            totalDuration: number;
            averageSessionDuration: number;
            topPage: string;
            topPageVisits: number;
        };
        metadata: {
            firstVisit: number;
            lastVisit: number;
            daysSinceFirstVisit: number;
            isMobile: boolean;
            device: string;
        };
    }>;
    totalUsers: number;
    timeRange: number;
}

interface UserJourneyListProps {
    data: UserJourneyData;
    timeRange: number;
}

interface UserDetailModalProps {
    browserId: string;
    userId?: string;
    isOpen: boolean;
    onClose: () => void;
    timeRange: number;
}

function UserDetailModal({ browserId, userId, isOpen, onClose, timeRange }: UserDetailModalProps) {
    const userJourney = useQuery(
        api.userJourneys.getUserJourney,
        isOpen ? { browserId, userId, timeRange } : "skip"
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

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold">
                            User Journey: {userId || `Browser ${browserId.slice(-8)}`}
                        </h2>
                        <p className="text-muted-foreground text-sm">
                            Detailed navigation history and behavior patterns
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
                    {!userJourney ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-muted/30 p-4 rounded-lg">
                                    <div className="text-2xl font-bold">{userJourney.summary.totalPageViews}</div>
                                    <div className="text-sm text-muted-foreground">Page Views</div>
                                </div>
                                <div className="bg-muted/30 p-4 rounded-lg">
                                    <div className="text-2xl font-bold">{userJourney.summary.totalSessions}</div>
                                    <div className="text-sm text-muted-foreground">Sessions</div>
                                </div>
                                <div className="bg-muted/30 p-4 rounded-lg">
                                    <div className="text-2xl font-bold">{formatDuration(userJourney.summary.averageSessionDuration)}</div>
                                    <div className="text-sm text-muted-foreground">Avg Session</div>
                                </div>
                                <div className="bg-muted/30 p-4 rounded-lg">
                                    <div className="text-2xl font-bold">{userJourney.summary.averagePagesPerSession}</div>
                                    <div className="text-sm text-muted-foreground">Pages/Session</div>
                                </div>
                            </div>

                            {/* Quick Insights */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <h4 className="font-medium mb-3">Top Pages</h4>
                                    <div className="space-y-2">
                                        {userJourney.insights.topPages.slice(0, 5).map((page, index) => (
                                            <div key={index} className="flex items-center justify-between text-sm">
                                                <span className="font-medium">{page.pageName}</span>
                                                <span className="text-muted-foreground">{page.visits} visits</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-medium mb-3">Entry Pages</h4>
                                    <div className="space-y-2">
                                        {userJourney.insights.topEntryPages.slice(0, 5).map((page, index) => (
                                            <div key={index} className="flex items-center justify-between text-sm">
                                                <span className="font-medium">{page.pageName}</span>
                                                <span className="text-muted-foreground">{page.sessions} sessions</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-medium mb-3">Exit Pages</h4>
                                    <div className="space-y-2">
                                        {userJourney.insights.topExitPages.slice(0, 5).map((page, index) => (
                                            <div key={index} className="flex items-center justify-between text-sm">
                                                <span className="font-medium">{page.pageName}</span>
                                                <span className="text-muted-foreground">{page.sessions} sessions</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Session Timeline */}
                            <div>
                                <h4 className="font-medium mb-4">Session History</h4>
                                <div className="space-y-4">
                                    {userJourney.sessions.map((session, sessionIndex) => (
                                        <Card key={sessionIndex}>
                                            <CardHeader className="pb-3">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-base">
                                                        Session {sessionIndex + 1}
                                                    </CardTitle>
                                                    <div className="text-sm text-muted-foreground">
                                                        {formatTime(session.startTime)} • {formatDuration(session.totalDuration)}
                                                    </div>
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {session.pageCount} pages • Entry: {session.entryPage} • Exit: {session.exitPage}
                                                    {session.documentsViewed.length > 0 && (
                                                        <span> • Documents: {session.documentsViewed.join(', ')}</span>
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-3">
                                                    {session.visits.map((visit, visitIndex) => (
                                                        <div key={visitIndex} className="flex items-center gap-4">
                                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                                                {visit.visitOrder}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-medium text-sm">{visit.pageName}</div>
                                                                <div className="text-xs text-muted-foreground truncate">
                                                                    {visit.pathname}
                                                                    {visit.duration && (
                                                                        <span> • {formatDuration(visit.duration)}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {formatTime(visit.timestamp)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function UserJourneyList({ data, timeRange }: UserJourneyListProps) {
    const [selectedUser, setSelectedUser] = useState<{ browserId: string; userId?: string } | null>(null);

    const formatDuration = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const getEngagementLevel = (user: typeof data.users[0]) => {
        const { totalPageViews, sessions, averageSessionDuration } = user.stats;

        // Calculate engagement score
        let score = 0;
        if (totalPageViews >= 10) score += 2;
        else if (totalPageViews >= 5) score += 1;

        if (sessions >= 3) score += 2;
        else if (sessions >= 2) score += 1;

        if (averageSessionDuration >= 180) score += 2; // 3+ minutes
        else if (averageSessionDuration >= 60) score += 1; // 1+ minute

        if (score >= 5) return { level: 'High', color: 'text-green-600 bg-green-100' };
        if (score >= 3) return { level: 'Medium', color: 'text-yellow-600 bg-yellow-100' };
        return { level: 'Low', color: 'text-gray-600 bg-gray-100' };
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Individual User Journeys</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Showing {data.users.length} of {data.totalUsers} users from the last {timeRange} days
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Header */}
                        <div className="grid grid-cols-7 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                            <div>User</div>
                            <div>Page Views</div>
                            <div>Sessions</div>
                            <div>Documents</div>
                            <div>Total Time</div>
                            <div>Engagement</div>
                            <div>Last Seen</div>
                        </div>

                        {/* User List */}
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {data.users.map((user, index) => {
                                const engagement = getEngagementLevel(user);
                                return (
                                    <div
                                        key={index}
                                        onClick={() => setSelectedUser({ browserId: user.browserId, userId: user.userId })}
                                        className="grid grid-cols-7 gap-4 text-sm py-3 hover:bg-muted/50 rounded-md px-2 cursor-pointer transition-colors"
                                    >
                                        <div>
                                            <div className="font-medium">{user.displayName}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                {user.metadata.device}
                                                {user.metadata.daysSinceFirstVisit === 0 && (
                                                    <span className="bg-blue-100 text-blue-800 px-1 rounded text-xs">New</span>
                                                )}
                                            </div>
                                        </div>
                                        <div>{user.stats.totalPageViews}</div>
                                        <div>{user.stats.sessions}</div>
                                        <div>{user.stats.documentsViewed}</div>
                                        <div>{formatDuration(user.stats.totalDuration)}</div>
                                        <div>
                                            <span className={`px-2 py-1 rounded-full text-xs ${engagement.color}`}>
                                                {engagement.level}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="text-xs">{formatDate(user.metadata.lastVisit)}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {user.metadata.daysSinceFirstVisit === 0
                                                    ? 'Today'
                                                    : `${user.metadata.daysSinceFirstVisit}d ago`}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {data.users.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>No user journey data available</p>
                                <p className="text-xs mt-1">Users need to visit multiple pages to show up here</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* User Detail Modal */}
            {selectedUser && (
                <UserDetailModal
                    browserId={selectedUser.browserId}
                    userId={selectedUser.userId}
                    isOpen={!!selectedUser}
                    onClose={() => setSelectedUser(null)}
                    timeRange={timeRange}
                />
            )}
        </div>
    );
} 