"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAction, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface AnalyticsTrackingProps {
    documentId: Id<'documents'>;
    userId?: string;
    enabled?: boolean;
}

interface ScrollEvent {
    timestamp: number;
    scrollY: number;
    scrollPercentage: number;
    viewportHeight: number;
    documentHeight: number;
}

interface ScrollMetrics {
    maxScrollPercentage: number;
    currentScrollPercentage: number;
    documentHeight: number;
    viewportHeight: number;
}

export function useAnalyticsTracking({
    documentId,
    userId,
    enabled = true
}: AnalyticsTrackingProps) {
    const [browserId, setBrowserId] = useState<string>('');
    const [sessionId, setSessionId] = useState<string>('');
    const [isTracking, setIsTracking] = useState(false);
    const [isTabVisible, setIsTabVisible] = useState(!document.hidden);
    const [timeOnPage, setTimeOnPage] = useState(0);
    const [shouldStop, setShouldStop] = useState(false);

    // Refs for tracking
    const sessionStartTime = useRef<number>(0);
    const pausedTime = useRef<number>(0); // Track total time when tab was hidden
    const lastPauseStart = useRef<number>(0); // When current pause started
    const isTabVisibleRef = useRef(!document.hidden); // Ref to avoid dependency issues
    const scrollEvents = useRef<ScrollEvent[]>([]);
    const scrollMetrics = useRef<ScrollMetrics>({
        maxScrollPercentage: 0,
        currentScrollPercentage: 0,
        documentHeight: 0,
        viewportHeight: 0
    });
    const lastScrollTime = useRef<number>(0);

    // Convex action for sending complete session data
    const saveSessionAnalytics = useAction(api.analytics.saveCompleteSession);

    // Generate or retrieve browser ID
    const initializeBrowserId = useCallback(() => {
        const stored = localStorage.getItem('creatorheat_browser_id');
        if (stored) {
            setBrowserId(stored);
            return stored;
        }

        // Generate new browser ID: timestamp + random
        const newBrowserId = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('creatorheat_browser_id', newBrowserId);
        setBrowserId(newBrowserId);
        return newBrowserId;
    }, []);

    // Generate session ID
    const generateSessionId = useCallback(() => {
        const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setSessionId(newSessionId);
        return newSessionId;
    }, []);

    // Handle tab visibility changes
    const handleVisibilityChange = useCallback(() => {
        const isVisible = !document.hidden;
        setIsTabVisible(isVisible);
        isTabVisibleRef.current = isVisible; // Update ref too

        if (!isTracking) return;

        const now = Date.now();

        if (isVisible) {
            // Tab became visible - resume tracking
            if (lastPauseStart.current > 0) {
                const pauseDuration = now - lastPauseStart.current;
                pausedTime.current += pauseDuration;
                console.log(`📱 Tab visible - resuming analytics tracking (paused for ${Math.round(pauseDuration / 1000)}s)`);
                lastPauseStart.current = 0;
            } else {
                console.log('📱 Tab visible - analytics tracking already active');
            }
        } else {
            // Tab became hidden - pause tracking
            lastPauseStart.current = now;
            console.log('📱 Tab hidden - pausing analytics tracking and timer');
        }
    }, [isTracking]);

    // Track detailed scroll events AND max scroll depth (only when tab is visible)
    const handleScroll = useCallback(() => {
        if (!isTracking || !isTabVisibleRef.current) return;

        const now = Date.now();

        // Throttle scroll events (max once per 100ms)
        if (now - lastScrollTime.current < 100) return;
        lastScrollTime.current = now;

        const scrollY = window.scrollY;
        const viewportHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollPercentage = Math.round((scrollY / (documentHeight - viewportHeight)) * 100);
        const clampedScrollPercentage = Math.min(100, Math.max(0, scrollPercentage));

        // Store detailed scroll event for pattern analysis
        const scrollEvent: ScrollEvent = {
            timestamp: now,
            scrollY,
            scrollPercentage: clampedScrollPercentage,
            viewportHeight,
            documentHeight
        };
        scrollEvents.current.push(scrollEvent);

        // Update scroll metrics for quick access
        scrollMetrics.current = {
            currentScrollPercentage: clampedScrollPercentage,
            maxScrollPercentage: Math.max(scrollMetrics.current.maxScrollPercentage, clampedScrollPercentage),
            documentHeight,
            viewportHeight
        };
    }, [isTracking]);

    // Update time on page (only when tab is visible, cap at 90s)
    const updateTimeTracking = useCallback(() => {
        if (!isTracking || !sessionStartTime.current) return;

        // Don't update timer when tab is hidden - freeze the display
        if (!isTabVisibleRef.current) return;

        const currentTime = Date.now();
        const totalElapsed = currentTime - sessionStartTime.current;

        // Active time = total time - paused time (no current pause since tab is visible)
        const activeTime = Math.max(0, totalElapsed - pausedTime.current);
        const newTimeOnPage = Math.round(activeTime / 1000);

        // Cap at 90 seconds - stop tracking once we hit the limit
        if (newTimeOnPage >= 90) {
            setTimeOnPage(90);
            if (isTracking) {
                console.log('⏱️ Reached 90s tracking limit - stopping analytics');
                setShouldStop(true);
            }
            return;
        }

        setTimeOnPage(newTimeOnPage);
    }, [isTracking]);

    // Start tracking session
    const startTracking = useCallback(() => {
        if (!enabled || isTracking) return;

        const browserIdValue = initializeBrowserId();
        const sessionIdValue = generateSessionId();
        const now = Date.now();

        sessionStartTime.current = now;
        pausedTime.current = 0;
        lastPauseStart.current = 0;
        setShouldStop(false);
        setIsTracking(true);

        // If tab is hidden when tracking starts, begin pause immediately
        if (!isTabVisibleRef.current) {
            lastPauseStart.current = now;
        }

        console.log(`🚀 Analytics tracking started - Browser: ${browserIdValue}, Session: ${sessionIdValue}`);
    }, [enabled, isTracking, initializeBrowserId, generateSessionId]);

    // Send all analytics data to backend
    const sendAnalyticsData = useCallback(async () => {
        if (!sessionId || !browserId) return;

        // Calculate final active time on page
        const currentTime = Date.now();
        const totalElapsed = sessionStartTime.current
            ? currentTime - sessionStartTime.current
            : 0;

        // Add any current pause time
        const currentPauseTime = !isTabVisibleRef.current && lastPauseStart.current > 0
            ? currentTime - lastPauseStart.current
            : 0;

        const activeTime = Math.max(0, totalElapsed - pausedTime.current - currentPauseTime);
        const finalTimeOnPage = Math.round(activeTime / 1000);

        // Get final scroll data
        const finalScrollMetrics = scrollMetrics.current;
        const finalScrollEvents = scrollEvents.current;

        try {
            // Send complete analytics session to Convex
            const result = await saveSessionAnalytics({
                sessionId,
                documentId,
                browserId,
                userId,
                startTime: sessionStartTime.current,
                endTime: Date.now(),
                duration: finalTimeOnPage, // Only active time, not total elapsed time
                maxScrollPercentage: finalScrollMetrics.maxScrollPercentage,
                scrollEvents: finalScrollEvents,
                userAgent: navigator.userAgent,
                referrer: document.referrer || '',
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            });

            console.log(`✅ Analytics saved to Convex - Session: ${result.sessionId}, Active time: ${finalTimeOnPage}s, Events: ${result.eventsStored}, Max scroll: ${finalScrollMetrics.maxScrollPercentage}%`);

        } catch (error) {
            console.error('Failed to save analytics data:', error);
        }
    }, [sessionId, browserId, documentId, userId, saveSessionAnalytics]);

    // Stop tracking and send all data
    const stopTracking = useCallback(async () => {
        if (!isTracking) return;

        setIsTracking(false);

        // Send all analytics data
        await sendAnalyticsData();
    }, [isTracking, sendAnalyticsData]);

    // Initialize tracking
    useEffect(() => {
        if (enabled && documentId) {
            startTracking();
        }

        return () => {
            stopTracking();
        };
    }, [documentId, enabled, startTracking, stopTracking]);

    // Setup visibility change listener
    useEffect(() => {
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [handleVisibilityChange]);

    // Setup scroll listener
    useEffect(() => {
        if (!isTracking) return;

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isTracking, handleScroll]);

    // Periodic time updates (no data flushing - only on unload)
    useEffect(() => {
        if (!isTracking) return;

        const interval = setInterval(() => {
            updateTimeTracking();
        }, 1000); // Update time every second

        return () => clearInterval(interval);
    }, [isTracking, updateTimeTracking]);

    // Handle 90s limit reached
    useEffect(() => {
        if (shouldStop && isTracking) {
            stopTracking();
            setShouldStop(false);
        }
    }, [shouldStop, isTracking, stopTracking]);

    // Cleanup on page unload
    useEffect(() => {
        const handleBeforeUnload = () => {
            stopTracking();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [stopTracking]);

    return {
        browserId,
        sessionId,
        isTracking,
        isTabVisible,
        timeOnPage,
        maxScrollPercentage: scrollMetrics.current.maxScrollPercentage,
        currentScrollPercentage: scrollMetrics.current.currentScrollPercentage,
        scrollEventsCount: scrollEvents.current.length,
        startTracking,
        stopTracking
    };
} 