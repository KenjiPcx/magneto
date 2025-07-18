"use client";

import { useEffect, useRef, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Link } from "@tiptap/extension-link";

interface DocumentHeatmapProps {
    documentId: Id<'documents'>;
    timeRange?: number;
}

interface ScrollDepthDataPoint {
    scrollDepth: number;
    sessionsReached: number;
    totalSessions: number;
    reachPercentage: number;
    dropoffFromPrevious: number;
}

interface ViewportEngagement {
    scrollDepth: number;
    sessionsReached: number;
    totalSessions: number;
    reachPercentage: number;
    uniqueVisitors: number;
    engagementScore: number;
}

export function DocumentHeatmap({ documentId, timeRange = 7 }: DocumentHeatmapProps) {
    const [showHeatmap, setShowHeatmap] = useState(true);
    const contentRef = useRef<HTMLDivElement>(null);

    // Fetch document content
    const document = useQuery(api.documents.getDocument, { id: documentId });

    // Fetch heatmap data
    const heatmapData = useQuery(api.analytics.getDocumentHeatmapData, {
        documentId,
        timeRange
    });

    const analytics = useQuery(api.analytics.getDocumentAnalytics, {
        documentId,
        timeRange
    });

    const editor = useEditor({
        extensions: [
            StarterKit,
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            Typography,
            Highlight.configure({ multicolor: true }),
            Image,
            TaskList,
            TaskItem.configure({ nested: true }),
            Link.configure({ openOnClick: false }),
        ],
        content: document?.content || "",
        editable: false,
        immediatelyRender: false,
    });

    useEffect(() => {
        if (editor && document?.content) {
            editor.commands.setContent(document.content);

            // Add paragraph IDs for heatmap analysis
            setTimeout(() => {
                const paragraphs = editor.view.dom.querySelectorAll(
                    "p, h1, h2, h3, h4, h5, h6",
                );
                paragraphs.forEach((p, index) => {
                    const paragraphId = `paragraph-${index}`;
                    p.setAttribute("data-paragraph-id", paragraphId);
                });
            }, 200);
        }
    }, [editor, document?.content]);

        // Apply heatmap overlay based on viewport scroll depth
    useEffect(() => {
        if (!showHeatmap || !heatmapData || !contentRef.current) return;

        const applyHeatmap = () => {
            const content = contentRef.current;
            if (!content) return;

            // Calculate the height of the content
            const contentHeight = content.scrollHeight;
            const paragraphs = content.querySelectorAll('[data-paragraph-id], p, h1, h2, h3, h4, h5, h6');
            
            paragraphs.forEach((paragraph) => {
                const element = paragraph as HTMLElement;
                
                // Calculate what percentage of the viewport this element is at
                const elementTop = element.offsetTop;
                const scrollPercentage = Math.round((elementTop / contentHeight) * 100);
                
                // Find the closest viewport engagement data (rounded to nearest 5%)
                const closestViewportKey = Math.floor(scrollPercentage / 5) * 5;
                const engagement = heatmapData.viewportEngagement?.[`viewport-${closestViewportKey}`];
                
                if (engagement) {
                    const intensity = Math.min(1, engagement.engagementScore / 100);
                    const heatmapColor = getHeatmapColor(intensity);
                    
                    // Apply heatmap styling
                    element.style.position = 'relative';
                    element.style.background = `linear-gradient(90deg, ${heatmapColor} 0%, transparent 100%)`;
                    element.style.borderLeft = `4px solid ${getHeatmapBorderColor(intensity)}`;
                    element.style.paddingLeft = '16px';
                    element.style.marginLeft = '8px';
                    element.style.borderRadius = '4px';
                    
                    // Add scroll reach tooltip
                    element.title = 
                        `Scroll Depth: ${engagement.scrollDepth}% | ` +
                        `Reach: ${engagement.reachPercentage}% of readers | ` +
                        `${engagement.sessionsReached}/${engagement.totalSessions} sessions reached here`;
                }
            });
        };

        applyHeatmap();
    }, [showHeatmap, heatmapData]);

    const getHeatmapColor = (intensity: number): string => {
        if (intensity >= 0.8) return 'rgba(255, 0, 0, 0.1)'; // High reach (80%+ readers) - red
        if (intensity >= 0.6) return 'rgba(255, 165, 0, 0.1)'; // Medium-high reach (60-79%) - orange
        if (intensity >= 0.4) return 'rgba(255, 255, 0, 0.1)'; // Medium reach (40-59%) - yellow
        if (intensity >= 0.2) return 'rgba(173, 216, 230, 0.1)'; // Low reach (20-39%) - light blue
        return 'rgba(240, 240, 240, 0.1)'; // Very low reach (<20%) - light gray
    };

    const getHeatmapBorderColor = (intensity: number): string => {
        if (intensity >= 0.8) return '#ff0000'; // High reach - red
        if (intensity >= 0.6) return '#ffa500'; // Medium-high reach - orange
        if (intensity >= 0.4) return '#ffff00'; // Medium reach - yellow
        if (intensity >= 0.2) return '#add8e6'; // Low reach - light blue
        return '#f0f0f0'; // Very low reach - light gray
    };

    if (!document || !analytics) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Heatmap Controls */}
            <div className="flex items-center justify-between bg-card p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                    <h3 className="font-semibold">Scroll Reach Heatmap</h3>
                    <button
                        onClick={() => setShowHeatmap(!showHeatmap)}
                        className={`px-4 py-2 rounded-md text-sm ${showHeatmap
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-secondary-foreground'
                            }`}
                    >
                        {showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
                    </button>
                </div>

                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div>Total Sessions: {analytics.totalSessions}</div>
                    <div>Unique Visitors: {analytics.uniqueVisitors}</div>
                    <div>Avg. Time: {analytics.averageTimeSpent}s</div>
                    <div>Avg. Scroll Depth: {analytics.averageScrollDepth}%</div>
                </div>
            </div>

            {/* Heatmap Legend */}
            {showHeatmap && (
                <div className="bg-card p-4 rounded-lg border">
                    <h4 className="font-medium mb-3">Scroll Reach Levels</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                        Shows what percentage of readers scrolled to each section
                    </p>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-red-500 opacity-20 border border-red-500 rounded"></div>
                            <span className="text-sm">High Reach (80%+ readers)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-orange-500 opacity-20 border border-orange-500 rounded"></div>
                            <span className="text-sm">Medium-High (60-79%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-yellow-500 opacity-20 border border-yellow-500 rounded"></div>
                            <span className="text-sm">Medium (40-59%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-300 opacity-20 border border-blue-300 rounded"></div>
                            <span className="text-sm">Low (20-39%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gray-300 opacity-20 border border-gray-300 rounded"></div>
                            <span className="text-sm">Very Low (&lt;20%)</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Content with Heatmap */}
            <div className="bg-background border rounded-lg overflow-hidden">
                <div className="border-b bg-muted/50 px-6 py-4">
                    <h2 className="text-xl font-semibold">{document.title}</h2>
                    {document.description && (
                        <p className="text-muted-foreground mt-1">{document.description}</p>
                    )}
                </div>

                <div ref={contentRef} className="prose prose-lg max-w-none p-6">
                    <EditorContent editor={editor} />
                </div>
            </div>
        </div>
    );
} 