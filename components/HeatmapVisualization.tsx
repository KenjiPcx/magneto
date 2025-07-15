"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useState } from "react";

interface HeatmapVisualizationProps {
    documentId: Id<"documents">;
    timeRange?: number; // Days to look back
    showMetrics?: boolean;
}

// interface HeatmapData {
//   paragraphId: string;
//   totalDwellTime: number;
//   viewCount: number;
//   averageDwellTime: number;
//   heatLevel: "cold" | "warm" | "hot" | "very_hot";
// }

export function HeatmapVisualization({
    documentId,
    timeRange = 30,
    showMetrics = false
}: HeatmapVisualizationProps) {
    const [isEnabled, setIsEnabled] = useState(false);

    const heatmapData = useQuery(
        api.analytics.getParagraphHeatmap,
        isEnabled ? { documentId, timeRange } : "skip"
    );

    useEffect(() => {
        if (!isEnabled || !heatmapData) return;

        // Apply heatmap styling to paragraphs
        heatmapData.forEach((data) => {
            const element = document.querySelector(`[data-paragraph-id="${data.paragraphId}"]`);
            if (element) {
                // Remove any existing heat classes
                element.classList.remove("heat-cold", "heat-warm", "heat-hot", "heat-very-hot");

                // Add the appropriate heat class
                element.classList.add(`heat-${data.heatLevel}`);

                // Add tooltip with metrics if enabled
                if (showMetrics) {
                    element.setAttribute("title",
                        `Views: ${data.viewCount} | Avg. dwell: ${Math.round(data.averageDwellTime / 1000)}s`
                    );
                }
            }
        });

        return () => {
            // Clean up on unmount
            if (heatmapData) {
                heatmapData.forEach((data) => {
                    const element = document.querySelector(`[data-paragraph-id="${data.paragraphId}"]`);
                    if (element) {
                        element.classList.remove("heat-cold", "heat-warm", "heat-hot", "heat-very-hot");
                        element.removeAttribute("title");
                    }
                });
            }
        };
    }, [isEnabled, heatmapData, showMetrics]);

    const toggleHeatmap = () => {
        setIsEnabled(!isEnabled);
    };

    return (
        <>
            {/* Heatmap styles */}
            {isEnabled && (
                <style jsx global>{`
          .heat-cold {
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 197, 253, 0.1) 100%);
            border-left: 3px solid rgba(59, 130, 246, 0.3);
            padding-left: 8px;
            margin-left: -11px;
            transition: all 0.3s ease;
          }
          
          .heat-warm {
            background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(134, 239, 172, 0.15) 100%);
            border-left: 3px solid rgba(34, 197, 94, 0.4);
            padding-left: 8px;
            margin-left: -11px;
            transition: all 0.3s ease;
          }
          
          .heat-hot {
            background: linear-gradient(135deg, rgba(251, 146, 60, 0.2) 0%, rgba(253, 186, 116, 0.2) 100%);
            border-left: 3px solid rgba(251, 146, 60, 0.5);
            padding-left: 8px;
            margin-left: -11px;
            transition: all 0.3s ease;
            box-shadow: 0 0 10px rgba(251, 146, 60, 0.1);
          }
          
          .heat-very-hot {
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(252, 165, 165, 0.25) 100%);
            border-left: 3px solid rgba(239, 68, 68, 0.6);
            padding-left: 8px;
            margin-left: -11px;
            transition: all 0.3s ease;
            box-shadow: 0 0 15px rgba(239, 68, 68, 0.2);
            animation: pulse-heat 2s infinite;
          }
          
          @keyframes pulse-heat {
            0%, 100% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.2); }
            50% { box-shadow: 0 0 25px rgba(239, 68, 68, 0.3); }
          }
          
          /* Hover effects for heat elements */
          .heat-cold:hover, .heat-warm:hover, .heat-hot:hover, .heat-very-hot:hover {
            transform: translateX(4px);
            transition: all 0.2s ease;
          }
        `}</style>
            )}

            {/* Control Panel */}
            <div className="fixed bottom-4 right-4 z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <button
                            onClick={toggleHeatmap}
                            className={`px-4 py-2 rounded-md font-medium transition-colors ${isEnabled
                                    ? "bg-red-500 text-white hover:bg-red-600"
                                    : "bg-blue-500 text-white hover:bg-blue-600"
                                }`}
                        >
                            {isEnabled ? "Hide Heatmap" : "Show Heatmap"}
                        </button>
                    </div>

                    {isEnabled && (
                        <>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                Attention Heatmap ({timeRange} days)
                            </div>

                            {/* Legend */}
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-3 bg-gradient-to-r from-blue-400 to-blue-300 rounded"></div>
                                    <span>Low attention</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-3 bg-gradient-to-r from-green-400 to-green-300 rounded"></div>
                                    <span>Medium attention</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-3 bg-gradient-to-r from-orange-400 to-orange-300 rounded"></div>
                                    <span>High attention</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-3 bg-gradient-to-r from-red-400 to-red-300 rounded"></div>
                                    <span>Very high attention</span>
                                </div>
                            </div>

                            {/* Metrics Summary */}
                            {heatmapData && heatmapData.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                        <div>Tracked paragraphs: {heatmapData.length}</div>
                                        <div>
                                            Most engaging: {
                                                heatmapData.reduce((max, curr) =>
                                                    curr.totalDwellTime > max.totalDwellTime ? curr : max
                                                ).paragraphId.replace("paragraph-", "P")
                                            }
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
} 