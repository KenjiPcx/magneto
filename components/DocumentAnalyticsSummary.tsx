"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface DocumentAnalyticsSummaryProps {
    documentId: Id<"documents">;
    timeRange?: number;
}

export function DocumentAnalyticsSummary({ documentId, timeRange = 7 }: DocumentAnalyticsSummaryProps) {
    const analytics = useQuery(api.analytics.getDocumentAnalytics, {
        documentId,
        timeRange,
    });

    if (!analytics) {
        return (
            <div className="text-xs text-muted-foreground">
                Loading analytics...
            </div>
        );
    }

    if (analytics.totalSessions === 0) {
        return (
            <div className="text-xs text-muted-foreground">
                No visits in the last {timeRange} days
            </div>
        );
    }

    const formatTime = (ms: number) => {
        const seconds = Math.round(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.round(seconds / 60);
        return `${minutes}m`;
    };

    const getMostEngagingParagraph = () => {
        if (analytics.paragraphAnalytics.length === 0) return null;

        const mostEngaging = analytics.paragraphAnalytics.reduce((max, curr) =>
            curr.totalDwellTime > max.totalDwellTime ? curr : max
        );

        return mostEngaging;
    };

    const mostEngaging = getMostEngagingParagraph();

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span className="text-muted-foreground">
                        {analytics.totalSessions} visits
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-muted-foreground">
                        {formatTime(analytics.averageTimeSpent)} avg. time
                    </span>
                </div>

                {mostEngaging && (
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                        <span className="text-muted-foreground">
                            P{mostEngaging.paragraphId.replace("paragraph-", "")} most engaging
                        </span>
                    </div>
                )}
            </div>

            {/* Scroll depth distribution mini chart */}
            <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Scroll depth:</div>
                <div className="flex items-center gap-1 h-2">
                    {analytics.scrollDepthDistribution.map((range, index) => {
                        const total = analytics.scrollDepthDistribution.reduce((sum, r) => sum + r.count, 0);
                        const percentage = total > 0 ? (range.count / total) * 100 : 0;
                        const colors = ["bg-red-200", "bg-yellow-200", "bg-green-200", "bg-blue-200"];

                        return (
                            <div
                                key={range.range}
                                className={`h-full ${colors[index]}`}
                                style={{ width: `${Math.max(percentage, 2)}%` }}
                                title={`${range.range}: ${range.count} visitors`}
                            />
                        );
                    })}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>100%</span>
                </div>
            </div>
        </div>
    );
} 