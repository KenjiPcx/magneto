import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface JourneyAnalyticsData {
    summary: {
        totalPageViews: number;
        totalSessions: number;
        uniqueBrowsers: number;
        uniqueUsers: number;
        averagePagesPerSession: number;
        timeRange: number;
    };
    pageAnalytics: Array<{
        pageName: string;
        visits: number;
        uniqueVisitors: number;
        averageDuration: number;
        visitPercentage: number;
    }>;
    userFlow: {
        topTransitions: Array<{
            transition: string;
            count: number;
            percentage: number;
        }>;
    };
    trends: {
        dailyStats: Array<{
            date: string;
            pageViews: number;
            sessions: number;
            uniqueUsers: number;
            avgPagesPerSession: number;
        }>;
    };
}

interface JourneyAnalyticsProps {
    data: JourneyAnalyticsData;
    timeRange: number;
}

export function JourneyAnalytics({ data, timeRange }: JourneyAnalyticsProps) {
    const { summary, pageAnalytics, userFlow, trends } = data;

    const formatDuration = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    const getTimeRangeLabel = (days: number) => {
        switch (days) {
            case 1: return 'last 24 hours';
            case 7: return 'last 7 days';
            case 30: return 'last 30 days';
            case 90: return 'last 90 days';
            default: return `last ${days} days`;
        }
    };

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Page Views
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.totalPageViews.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Across {summary.totalSessions} sessions
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Unique Visitors
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.uniqueBrowsers.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {summary.uniqueUsers > 0 && `${summary.uniqueUsers} identified users`}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Avg Pages/Session
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.averagePagesPerSession}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            In {getTimeRangeLabel(timeRange)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Sessions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.totalSessions.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            User browsing sessions
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Daily Trends */}
            <Card>
                <CardHeader>
                    <CardTitle>Daily Journey Trends</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-5 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                            <div>Date</div>
                            <div>Page Views</div>
                            <div>Sessions</div>
                            <div>Unique Users</div>
                            <div>Avg Pages/Session</div>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {trends.dailyStats.map((day, index) => (
                                <div key={index} className="grid grid-cols-5 gap-4 text-sm py-2 hover:bg-muted/50 rounded-md px-2">
                                    <div className="font-medium">
                                        {new Date(day.date).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </div>
                                    <div>{day.pageViews.toLocaleString()}</div>
                                    <div>{day.sessions.toLocaleString()}</div>
                                    <div>{day.uniqueUsers.toLocaleString()}</div>
                                    <div>{day.avgPagesPerSession}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Page Performance */}
                <Card>
                    <CardHeader>
                        <CardTitle>Page Performance</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Most visited pages and engagement metrics
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                                <div>Page</div>
                                <div>Visits</div>
                                <div>Unique</div>
                                <div>Avg Time</div>
                            </div>
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                                {pageAnalytics.slice(0, 15).map((page, index) => (
                                    <div key={index} className="grid grid-cols-4 gap-4 text-sm py-2 hover:bg-muted/50 rounded-md px-2">
                                        <div className="font-medium truncate" title={page.pageName}>
                                            {page.pageName}
                                        </div>
                                        <div>
                                            {page.visits}
                                            <span className="text-muted-foreground ml-1">
                                                ({page.visitPercentage}%)
                                            </span>
                                        </div>
                                        <div>{page.uniqueVisitors}</div>
                                        <div>{formatDuration(page.averageDuration)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* User Flow */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top User Flows</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Most common page transitions
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {userFlow.topTransitions.length > 0 ? (
                                <div className="space-y-3">
                                    {userFlow.topTransitions.map((transition, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                            <div className="flex-1">
                                                <div className="font-medium text-sm mb-1">
                                                    {transition.transition}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {transition.count} transitions ({transition.percentage}% of sessions)
                                                </div>
                                            </div>
                                            <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary rounded-full transition-all"
                                                    style={{ width: `${Math.min(transition.percentage, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>No user flow data available</p>
                                    <p className="text-xs mt-1">Need multiple page visits to show transitions</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Journey Insights */}
            <Card>
                <CardHeader>
                    <CardTitle>Journey Insights</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm text-muted-foreground">Most Engaging Pages</h4>
                            <div className="space-y-1">
                                {pageAnalytics
                                    .sort((a, b) => b.averageDuration - a.averageDuration)
                                    .slice(0, 3)
                                    .map((page, index) => (
                                        <div key={index} className="text-sm">
                                            <span className="font-medium">{page.pageName}</span>
                                            <span className="text-muted-foreground ml-2">
                                                {formatDuration(page.averageDuration)}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-medium text-sm text-muted-foreground">Popular Entry Points</h4>
                            <div className="space-y-1">
                                {pageAnalytics
                                    .filter(page => ['Landing Page', 'Document View', 'Sign In'].includes(page.pageName))
                                    .slice(0, 3)
                                    .map((page, index) => (
                                        <div key={index} className="text-sm">
                                            <span className="font-medium">{page.pageName}</span>
                                            <span className="text-muted-foreground ml-2">
                                                {page.visitPercentage}% of visits
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-medium text-sm text-muted-foreground">Conversion Funnel</h4>
                            <div className="space-y-1">
                                {[
                                    { name: 'Landing Page', count: pageAnalytics.find(p => p.pageName === 'Landing Page')?.visits || 0 },
                                    { name: 'Sign In', count: pageAnalytics.find(p => p.pageName === 'Sign In')?.visits || 0 },
                                    { name: 'Dashboard', count: pageAnalytics.find(p => p.pageName === 'Dashboard')?.visits || 0 },
                                ].map((step, index) => (
                                    <div key={index} className="text-sm">
                                        <span className="font-medium">{step.name}</span>
                                        <span className="text-muted-foreground ml-2">
                                            {step.count} visits
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 