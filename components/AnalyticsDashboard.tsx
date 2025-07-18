"use client";

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { DocumentHeatmap } from './DocumentHeatmap';

interface AnalyticsDashboardProps {
    documentId: Id<'documents'>;
}

export function AnalyticsDashboard({ documentId }: AnalyticsDashboardProps) {
    const [timeRange, setTimeRange] = useState(7);
    const [activeTab, setActiveTab] = useState<'overview' | 'heatmap' | 'sessions'>('overview');
    const [isProcessing, setIsProcessing] = useState(false);

    // Mutation to process unprocessed sessions
    const processAnalytics = useMutation(api.analytics.processAndGetDocumentAnalytics);

    // Fetch analytics data
    const analytics = useQuery(api.analytics.getDocumentAnalytics, {
        documentId,
        timeRange
    });

    const scrollAnalytics = useQuery(api.analytics.getScrollAnalytics, {
        documentId,
        timeRange
    });

    const document = useQuery(api.documents.getDocument, { id: documentId });

    // Process unprocessed sessions when component mounts or timeRange changes
    useEffect(() => {
        const processUnprocessedSessions = async () => {
            if (!documentId) return;

            setIsProcessing(true);
            try {
                await processAnalytics({ documentId, timeRange });
            } catch (error) {
                console.error('Error processing analytics:', error);
            } finally {
                setIsProcessing(false);
            }
        };

        processUnprocessedSessions();
    }, [documentId, timeRange, processAnalytics]);

    if (!analytics || !scrollAnalytics || !document || isProcessing) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">
                        {isProcessing ? 'Processing latest analytics data...' : 'Loading analytics dashboard...'}
                    </p>
                </div>
            </div>
        );
    }

    const MetricCard = ({ title, value, subtitle, trend }: {
        title: string;
        value: string | number;
        subtitle?: string;
        trend?: 'up' | 'down' | 'neutral';
    }) => (
        <div className="bg-card p-6 rounded-lg border">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <p className="text-3xl font-bold">{value}</p>
                    {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
                </div>
                {trend && (
                    <div className={`text-sm ${trend === 'up' ? 'text-green-600' :
                        trend === 'down' ? 'text-red-600' :
                            'text-gray-600'
                        }`}>
                        {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
                    </div>
                )}
            </div>
        </div>
    );

    const TabButton = ({ tab, label }: { tab: typeof activeTab; label: string }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === tab
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
                    <p className="text-muted-foreground">{document.title}</p>
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
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-border">
                <TabButton tab="overview" label="Overview" />
                <TabButton tab="heatmap" label="Heatmap" />
                <TabButton tab="sessions" label="Sessions" />
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <MetricCard
                            title="Total Sessions"
                            value={analytics.totalSessions}
                            subtitle="Unique page views"
                        />
                        <MetricCard
                            title="Unique Visitors"
                            value={analytics.uniqueVisitors}
                            subtitle="Individual readers"
                        />
                        <MetricCard
                            title="Avg. Time on Page"
                            value={`${analytics.averageTimeSpent}s`}
                            subtitle="Reading engagement"
                        />
                        <MetricCard
                            title="Completion Rate"
                            value={`${analytics.completionRate}%`}
                            subtitle="Readers who reached end"
                        />
                    </div>

                    {/* Secondary Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <MetricCard
                            title="Avg. Scroll Depth"
                            value={`${analytics.averageScrollDepth}%`}
                            subtitle="How far readers scroll"
                        />
                        <MetricCard
                            title="Bounce Rate"
                            value={`${analytics.bounceRate}%`}
                            subtitle="Quick exits (<10s)"
                        />
                        <MetricCard
                            title="Total Time Spent"
                            value={`${Math.round(analytics.totalTimeSpent / 60)}m`}
                            subtitle="Cumulative reading time"
                        />
                    </div>

                    {/* Daily Stats Chart */}
                    <div className="bg-card p-6 rounded-lg border">
                        <h3 className="text-lg font-semibold mb-4">Daily Activity</h3>
                        <div className="grid grid-cols-7 gap-2">
                            {analytics.dailyStats.map((day, index) => (
                                <div key={index} className="text-center">
                                    <div className="text-xs text-muted-foreground mb-2">
                                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                    </div>
                                    <div className="bg-primary/10 rounded-lg p-3">
                                        <div className="text-lg font-bold">{day.sessions}</div>
                                        <div className="text-xs text-muted-foreground">sessions</div>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {day.uniqueVisitors} visitors
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Scroll Depth Distribution */}
                    <div className="bg-card p-6 rounded-lg border">
                        <h3 className="text-lg font-semibold mb-4">Scroll Depth Distribution</h3>
                        <div className="space-y-3">
                            {scrollAnalytics.scrollDepthDistribution.map((bucket, index) => (
                                <div key={index} className="flex items-center gap-4">
                                    <div className="w-20 text-sm font-medium">{bucket.range}</div>
                                    <div className="flex-1 bg-muted rounded-full h-6 relative">
                                        <div
                                            className="bg-primary h-6 rounded-full transition-all duration-300"
                                            style={{
                                                width: `${analytics.totalSessions > 0 ? (bucket.count / analytics.totalSessions) * 100 : 0}%`
                                            }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                                            {bucket.count} sessions
                                        </div>
                                    </div>
                                    <div className="w-16 text-sm text-muted-foreground">
                                        {analytics.totalSessions > 0 ? Math.round((bucket.count / analytics.totalSessions) * 100) : 0}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Scroll Depth Analysis */}
                    <div className="bg-card p-6 rounded-lg border">
                        <h3 className="text-lg font-semibold mb-4">Reader Drop-off Analysis</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Percentage of readers who reached each scroll depth
                        </p>
                        <div className="space-y-2">
                            {[100, 90, 80, 70, 60, 50, 40, 30, 20, 10].map((depth) => {
                                const sessionsReached = analytics.totalSessions > 0
                                    ? Math.round((analytics.totalSessions * (100 - depth) / 100))
                                    : 0;
                                const percentage = analytics.totalSessions > 0
                                    ? Math.max(0, 100 - depth)
                                    : 0;

                                return (
                                    <div key={depth} className="flex items-center gap-4">
                                        <div className="w-12 text-sm font-medium">{depth}%</div>
                                        <div className="flex-1 bg-muted rounded-full h-4 relative">
                                            <div
                                                className="bg-gradient-to-r from-green-500 to-red-500 h-4 rounded-full transition-all duration-300"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <div className="w-20 text-sm text-muted-foreground">
                                            {percentage}% reach
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                            * Estimated based on average scroll patterns. Use heatmap view for precise data.
                        </p>
                    </div>

                    {/* Top Referrers & Device Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-card p-6 rounded-lg border">
                            <h3 className="text-lg font-semibold mb-4">Top Referrers</h3>
                            <div className="space-y-3">
                                {analytics.topReferrers.map((referrer, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <span className="text-sm font-medium">{referrer.domain}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground">{referrer.count}</span>
                                            <span className="text-xs bg-muted px-2 py-1 rounded">
                                                {referrer.percentage}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-card p-6 rounded-lg border">
                            <h3 className="text-lg font-semibold mb-4">Device Breakdown</h3>
                            <div className="space-y-3">
                                {analytics.deviceBreakdown.map((device, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <span className="text-sm font-medium">{device.device}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground">{device.count}</span>
                                            <span className="text-xs bg-muted px-2 py-1 rounded">
                                                {device.percentage}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'heatmap' && (
                <DocumentHeatmap documentId={documentId} timeRange={timeRange} />
            )}

            {activeTab === 'sessions' && (
                <div className="bg-card p-6 rounded-lg border">
                    <h3 className="text-lg font-semibold mb-4">Recent Sessions</h3>
                    <div className="space-y-3">
                        {scrollAnalytics.recentSessions.map((session, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div className="flex items-center gap-4">
                                    <div className="text-sm font-mono">{session.browserId}</div>
                                    <div className="text-sm text-muted-foreground">{session.userAgent}</div>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                    <span>{session.duration}s</span>
                                    <span>{session.maxScrollPercentage}% scroll</span>
                                    <span className="text-muted-foreground">
                                        {new Date(session.startTime).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
} 