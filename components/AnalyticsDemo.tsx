"use client";

import { useEffect, useState } from 'react';

interface AnalyticsDemoProps {
    browserId: string;
    sessionId: string;
    timeOnPage: number;
    maxScrollPercentage: number;
    currentScrollPercentage: number;
    scrollEventsCount: number;
    isTracking: boolean;
}

export function AnalyticsDemo({
  browserId,
  sessionId,
  timeOnPage,
  maxScrollPercentage,
  currentScrollPercentage,
  scrollEventsCount,
  isTracking
}: AnalyticsDemoProps) {
    const [isVisible, setIsVisible] = useState(false);

    // Auto-show demo after 3 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    if (!isTracking || !isVisible) return null;

    return (
        <div className="fixed bottom-4 left-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-lg shadow-lg max-w-sm animate-in slide-in-from-bottom-2 fade-in-0 duration-500">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">🚀 Analytics in Action</h3>
                <button
                    onClick={() => setIsVisible(false)}
                    className="text-white/70 hover:text-white text-lg leading-none"
                >
                    ×
                </button>
            </div>

            <div className="space-y-2 text-xs">
                <div className="bg-white/10 rounded p-2">
                    <div className="font-medium text-yellow-200">Your Browser ID</div>
                    <div className="font-mono">...{browserId.slice(-8)}</div>
                    <div className="text-white/70 text-[10px] mt-1">
                        Unique to your browser, tracks repeat visits
                    </div>
                </div>

                        <div className="bg-white/10 rounded p-2">
          <div className="font-medium text-green-200">Reading Progress</div>
          <div>Time reading: {timeOnPage}s</div>
          <div>Document read: {maxScrollPercentage}%</div>
          <div>Current position: {currentScrollPercentage}%</div>
          <div>Scroll events: {scrollEventsCount}</div>
        </div>

                <div className="text-white/70 text-[10px] text-center mt-3">
                    Your reading behavior helps creators understand<br />
                    which content resonates most with readers 📊
                </div>
            </div>
        </div>
    );
} 