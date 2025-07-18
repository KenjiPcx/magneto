import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PopularPagesData {
    pages: Array<{
        pageName: string;
        pathname: string;
        visits: number;
        uniqueVisitors: number;
        averageDuration: number;
        totalDuration: number;
        visitShare: number;
    }>;
    summary: {
        totalVisits: number;
        totalPages: number;
        timeRange: number;
    };
}

interface PopularPagesProps {
    data: PopularPagesData;
    timeRange: number;
}

export function PopularPages({ data, timeRange }: PopularPagesProps) {
    const { pages, summary } = data;

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

    const getPageTypeIcon = (pageName: string) => {
        if (pageName === 'Landing Page') return '🏠';
        if (pageName === 'Dashboard') return '📊';
        if (pageName === 'Document View') return '📄';
        if (pageName === 'Document Analytics') return '📈';
        if (pageName === 'Create Document') return '✏️';
        if (pageName === 'Edit Document') return '✏️';
        if (pageName === 'Sign In') return '🔑';
        return '📝';
    };

    const getEngagementScore = (page: typeof pages[0]) => {
        // Calculate engagement based on time spent and visit share
        const timeScore = Math.min(page.averageDuration / 60, 5); // Max 5 points for time (5 minutes)
        const popularityScore = Math.min(page.visitShare / 10, 5); // Max 5 points for popularity (10%)
        const loyaltyScore = Math.min(page.visits / page.uniqueVisitors, 3); // Max 3 points for return visits

        const totalScore = timeScore + popularityScore + loyaltyScore;

        if (totalScore >= 10) return { level: 'Excellent', color: 'bg-green-500', score: totalScore };
        if (totalScore >= 7) return { level: 'Good', color: 'bg-blue-500', score: totalScore };
        if (totalScore >= 4) return { level: 'Average', color: 'bg-yellow-500', score: totalScore };
        return { level: 'Poor', color: 'bg-gray-400', score: totalScore };
    };

    const maxVisits = Math.max(...pages.map(p => p.visits));

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Page Views
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.totalVisits.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            In {getTimeRangeLabel(timeRange)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Unique Pages
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.totalPages}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Different pages visited
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Top Page Share
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pages[0]?.visitShare || 0}%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {pages[0]?.pageName || 'No data'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Popular Pages Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Page Performance Ranking</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Ranked by visits with engagement metrics
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Header */}
                        <div className="grid grid-cols-8 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                            <div>Rank</div>
                            <div className="col-span-2">Page</div>
                            <div>Visits</div>
                            <div>Unique</div>
                            <div>Avg Time</div>
                            <div>Share</div>
                            <div>Score</div>
                        </div>

                        {/* Page List */}
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {pages.map((page, index) => {
                                const engagement = getEngagementScore(page);
                                const visitPercent = (page.visits / maxVisits) * 100;

                                return (
                                    <div
                                        key={index}
                                        className="grid grid-cols-8 gap-4 text-sm py-3 hover:bg-muted/50 rounded-md px-2 transition-colors"
                                    >
                                        {/* Rank */}
                                        <div className="flex items-center">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${index === 0 ? 'bg-yellow-500' :
                                                    index === 1 ? 'bg-gray-400' :
                                                        index === 2 ? 'bg-orange-400' :
                                                            'bg-muted-foreground'
                                                }`}>
                                                {index + 1}
                                            </div>
                                        </div>

                                        {/* Page Name */}
                                        <div className="col-span-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{getPageTypeIcon(page.pageName)}</span>
                                                <div>
                                                    <div className="font-medium">{page.pageName}</div>
                                                    <div className="text-xs text-muted-foreground truncate">
                                                        {page.pathname}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Visits with visual bar */}
                                        <div>
                                            <div className="font-medium">{page.visits.toLocaleString()}</div>
                                            <div className="w-full bg-muted rounded-full h-1 mt-1">
                                                <div
                                                    className="bg-primary h-1 rounded-full transition-all"
                                                    style={{ width: `${visitPercent}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Unique Visitors */}
                                        <div>
                                            <div>{page.uniqueVisitors.toLocaleString()}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {page.uniqueVisitors > 0
                                                    ? `${(page.visits / page.uniqueVisitors).toFixed(1)}x`
                                                    : '0x'
                                                }
                                            </div>
                                        </div>

                                        {/* Average Duration */}
                                        <div>
                                            <div className="font-medium">{formatDuration(page.averageDuration)}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {formatDuration(page.totalDuration)} total
                                            </div>
                                        </div>

                                        {/* Visit Share */}
                                        <div>
                                            <div className="font-medium">{page.visitShare}%</div>
                                            <div className="w-8 h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full transition-all"
                                                    style={{ width: `${Math.min(page.visitShare * 2, 100)}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Engagement Score */}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${engagement.color}`}></div>
                                                <span className="text-xs font-medium">{engagement.level}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {engagement.score.toFixed(1)}/13
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {pages.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>No page data available</p>
                                <p className="text-xs mt-1">Start getting visitors to see page popularity</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Insights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Top Performers */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Top Performers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {pages
                                .slice(0, 5)
                                .map((page, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm">{getPageTypeIcon(page.pageName)}</span>
                                            <span className="text-sm font-medium truncate">{page.pageName}</span>
                                        </div>
                                        <span className="text-sm text-muted-foreground">{page.visits}</span>
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Engagement Leaders */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Engagement Leaders</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {pages
                                .sort((a, b) => b.averageDuration - a.averageDuration)
                                .slice(0, 5)
                                .map((page, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm">{getPageTypeIcon(page.pageName)}</span>
                                            <span className="text-sm font-medium truncate">{page.pageName}</span>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            {formatDuration(page.averageDuration)}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Return Visitors */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Return Favorites</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {pages
                                .filter(page => page.uniqueVisitors > 0)
                                .sort((a, b) => (b.visits / b.uniqueVisitors) - (a.visits / a.uniqueVisitors))
                                .slice(0, 5)
                                .map((page, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm">{getPageTypeIcon(page.pageName)}</span>
                                            <span className="text-sm font-medium truncate">{page.pageName}</span>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            {(page.visits / page.uniqueVisitors).toFixed(1)}x
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Page Performance Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle>Page Performance Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Visit Distribution */}
                        <div>
                            <h4 className="font-medium mb-4">Visit Distribution</h4>
                            <div className="space-y-3">
                                {pages.slice(0, 8).map((page, index) => (
                                    <div key={index} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">{page.pageName}</span>
                                            <span className="text-muted-foreground">{page.visitShare}%</span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                                                style={{ width: `${page.visitShare}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Engagement vs Popularity */}
                        <div>
                            <h4 className="font-medium mb-4">Engagement vs Popularity</h4>
                            <div className="space-y-3">
                                {pages.slice(0, 8).map((page, index) => {
                                    const engagement = getEngagementScore(page);
                                    return (
                                        <div key={index} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${engagement.color}`}></div>
                                                <span className="text-sm font-medium">{page.pageName}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm">{page.visits} visits</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {formatDuration(page.averageDuration)} avg
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 