"use client";

import { useState } from "react";

interface SessionRecordingDebugPanelProps {
    isRecording: boolean;
    sessionId: string | null;
    error: string | null;
    eventCount: number;
    duration: number;
    stopRecording: () => void;
}

export function SessionRecordingDebugPanel({
    isRecording,
    sessionId,
    error,
    eventCount,
    duration,
    stopRecording,
}: SessionRecordingDebugPanelProps) {
    const [isVisible, setIsVisible] = useState(false);

    if (!isVisible) {
        return (
            <button
                onClick={() => setIsVisible(true)}
                className="fixed bottom-4 left-4 z-50 bg-purple-500 text-white px-3 py-2 rounded-md text-sm flex items-center gap-2"
            >
                {isRecording && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                🎬 Recording Debug
            </button>
        );
    }

    const formatDuration = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    };

    return (
        <div className="fixed bottom-4 left-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-80">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    🎬 Session Recording
                    {isRecording && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                </h3>
                <button
                    onClick={() => setIsVisible(false)}
                    className="text-gray-500 hover:text-gray-700"
                >
                    ✕
                </button>
            </div>

            <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={isRecording ? "text-red-600 font-medium" : "text-green-600"}>
                        {isRecording ? "🔴 Recording" : "⏹️ Stopped"}
                    </span>
                </div>

                <div className="flex justify-between">
                    <span>Session ID:</span>
                    <span className={sessionId ? "text-green-600" : "text-gray-500"}>
                        {sessionId ? "✓ Active" : "None"}
                    </span>
                </div>

                {isRecording && (
                    <>
                        <div className="flex justify-between">
                            <span>Duration:</span>
                            <span className="font-mono text-blue-600">
                                {formatDuration(duration)}
                            </span>
                        </div>

                        <div className="flex justify-between">
                            <span>Events:</span>
                            <span className="font-mono text-blue-600">
                                {eventCount.toLocaleString()}
                            </span>
                        </div>
                    </>
                )}

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
                        <div className="text-red-600 dark:text-red-400 text-xs">
                            ⚠️ {error}
                        </div>
                    </div>
                )}

                <div className="border-t pt-2 space-y-1">
                    {isRecording && (
                        <button
                            onClick={stopRecording}
                            className="w-full bg-red-500 text-white px-2 py-1 rounded text-xs mb-1"
                        >
                            🛑 Stop Recording
                        </button>
                    )}

                    <button
                        onClick={() => {
                            console.log("🎬 Session Recording Debug Info:");
                            console.log("- Recording:", isRecording);
                            console.log("- Session ID:", sessionId);
                            console.log("- Event Count:", eventCount);
                            console.log("- Duration:", formatDuration(duration));
                            console.log("- Error:", error);

                            // Test rrweb loading
                            import('rrweb').then((rrweb) => {
                                console.log("- rrweb loaded:", !!rrweb);
                            }).catch((err) => {
                                console.error("- rrweb load error:", err);
                            });
                        }}
                        className="w-full bg-blue-500 text-white px-2 py-1 rounded text-xs"
                    >
                        Log Debug Info
                    </button>
                </div>

                <div className="border-t pt-2">
                    <div className="text-xs text-gray-500">
                        <div>💡 Recording captures all user interactions</div>
                        <div>📊 Events are processed for heatmaps after upload</div>
                        <div>⏰ Auto-stops after 10 minutes</div>
                    </div>
                </div>
            </div>
        </div>
    );
} 