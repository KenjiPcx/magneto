"use client";

import { useEffect, useState } from "react";

interface DebugInfo {
    sessionId: string | null;
    isTracking: boolean;
    paragraphCount: number;
    recentEvents: Array<{
        type: string;
        paragraphId?: string;
        timestamp: number;
        data?: any;
    }>;
}

export function TrackingDebugPanel() {
    const [debugInfo, setDebugInfo] = useState<DebugInfo>({
        sessionId: null,
        isTracking: false,
        paragraphCount: 0,
        recentEvents: [],
    });

    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check for paragraphs with data-paragraph-id
        const updateParagraphCount = () => {
            const paragraphs = document.querySelectorAll("[data-paragraph-id]");
            setDebugInfo(prev => ({
                ...prev,
                paragraphCount: paragraphs.length,
            }));
        };

        // Initial count
        updateParagraphCount();

        // Monitor for changes
        const observer = new MutationObserver(updateParagraphCount);
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["data-paragraph-id"],
        });

        // Listen for tracking status updates
        const handleTrackingStatus = (event: CustomEvent) => {
            setDebugInfo(prev => ({
                ...prev,
                sessionId: event.detail.sessionId,
                isTracking: event.detail.isTracking,
            }));
        };

        // Listen for tracking events
        const handleTrackingEvent = (event: CustomEvent) => {
            setDebugInfo(prev => ({
                ...prev,
                recentEvents: [
                    {
                        type: event.detail.type,
                        paragraphId: event.detail.paragraphId,
                        timestamp: Date.now(),
                        data: event.detail.data,
                    },
                    ...prev.recentEvents.slice(0, 9), // Keep last 10 events
                ],
            }));
        };

        window.addEventListener("tracking-status", handleTrackingStatus as EventListener);
        window.addEventListener("tracking-event", handleTrackingEvent as EventListener);

        return () => {
            observer.disconnect();
            window.removeEventListener("tracking-status", handleTrackingStatus as EventListener);
            window.removeEventListener("tracking-event", handleTrackingEvent as EventListener);
        };
    }, []);

    // Simple console logging for now
    useEffect(() => {
        console.log("🔍 Tracking Debug Info:", debugInfo);
    }, [debugInfo]);

    if (!isVisible) {
        return (
            <button
                onClick={() => setIsVisible(true)}
                className="fixed bottom-4 left-4 z-50 bg-blue-500 text-white px-3 py-2 rounded-md text-sm"
            >
                🐛 Debug
            </button>
        );
    }

    const formatEventType = (type: string) => {
        return type
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className="fixed bottom-4 left-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-80 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Tracking Debug</h3>
                <button
                    onClick={() => setIsVisible(false)}
                    className="text-gray-500 hover:text-gray-700"
                >
                    ✕
                </button>
            </div>

            <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                    <span>Session ID:</span>
                    <span className={debugInfo.sessionId ? "text-green-600" : "text-red-600"}>
                        {debugInfo.sessionId ? "✓ Active" : "✗ None"}
                    </span>
                </div>

                <div className="flex justify-between">
                    <span>Tracking:</span>
                    <span className={debugInfo.isTracking ? "text-green-600" : "text-orange-600"}>
                        {debugInfo.isTracking ? "✓ Enabled" : "⏳ Starting..."}
                    </span>
                </div>

                <div className="flex justify-between">
                    <span>Paragraphs:</span>
                    <span className={debugInfo.paragraphCount > 0 ? "text-green-600" : "text-red-600"}>
                        {debugInfo.paragraphCount} found
                    </span>
                </div>

                <div className="border-t pt-2">
                    <div className="font-medium mb-1">Recent Events:</div>
                    {debugInfo.recentEvents.length === 0 ? (
                        <div className="text-gray-500 text-xs">No events yet</div>
                    ) : (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                            {debugInfo.recentEvents.map((event, index) => (
                                <div key={index} className="text-xs">
                                    <div className="font-medium text-blue-600">
                                        {formatEventType(event.type)}
                                    </div>
                                    {event.paragraphId && (
                                        <div className="text-gray-600 ml-2">
                                            {event.paragraphId}
                                        </div>
                                    )}
                                    {event.data && (
                                        <div className="text-gray-500 ml-2">
                                            {JSON.stringify(event.data)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="border-t pt-2">
                    <button
                        onClick={() => {
                            const paragraphs = document.querySelectorAll("[data-paragraph-id]");
                            console.log("📝 Paragraphs with IDs:", paragraphs);
                            if (paragraphs.length > 0) {
                                console.log("🖱️ Try hovering over a paragraph for 1+ second to see tracking");
                                console.log("📊 Or scroll slowly to trigger dwell time tracking");

                                // Test if event listeners are working
                                const firstParagraph = paragraphs[0] as HTMLElement;
                                if (firstParagraph) {
                                    console.log("🧪 Testing first paragraph:", firstParagraph);
                                    firstParagraph.style.backgroundColor = "yellow";
                                    setTimeout(() => {
                                        firstParagraph.style.backgroundColor = "";
                                    }, 2000);
                                }
                            } else {
                                console.log("❌ No paragraphs found with data-paragraph-id attributes");
                            }
                        }}
                        className="w-full bg-blue-500 text-white px-2 py-1 rounded text-xs mb-1"
                    >
                        Log Paragraphs to Console
                    </button>

                    <button
                        onClick={() => {
                            // Manually trigger a hover event for testing
                            const paragraphs = document.querySelectorAll("[data-paragraph-id]");
                            if (paragraphs.length > 0) {
                                const firstP = paragraphs[0] as HTMLElement;
                                console.log("🧪 Manually triggering hover events on:", firstP.getAttribute("data-paragraph-id"));

                                // Simulate mouse events
                                firstP.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
                                setTimeout(() => {
                                    firstP.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
                                }, 1000); // 1 second hover
                            }
                        }}
                        className="w-full bg-green-500 text-white px-2 py-1 rounded text-xs mb-1"
                    >
                        Test Manual Hover
                    </button>

                    <button
                        onClick={() => {
                            setDebugInfo(prev => ({ ...prev, recentEvents: [] }));
                        }}
                        className="w-full bg-gray-500 text-white px-2 py-1 rounded text-xs"
                    >
                        Clear Events
                    </button>
                </div>
            </div>
        </div>
    );
} 