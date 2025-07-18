"use client";

import { useEffect, useRef, useCallback, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface JourneyTrackingProps {
    enabled?: boolean;
    userId?: string;
    documentId?: Id<"documents">;
    documentTitle?: string;
    pageName?: string; // Custom page name, falls back to pathname-based name
}

interface JourneyState {
    browserId: string;
    sessionId: string;
    currentJourneyId: string;
    isTracking: boolean;
    visitOrder: number;
    sessionStartTime: number;
    pageStartTime: number;
}

export function useJourneyTracking({
    enabled = true,
    userId,
    documentId,
    documentTitle,
    pageName,
}: JourneyTrackingProps = {}) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [journeyState, setJourneyState] = useState<JourneyState>({
        browserId: '',
        sessionId: '',
        currentJourneyId: '',
        isTracking: false,
        visitOrder: 0,
        sessionStartTime: 0,
        pageStartTime: 0,
    });

    // Refs to avoid dependency issues
    const isInitialized = useRef(false);
    const lastPathname = useRef('');
    const pageStartTime = useRef(0);
    const sessionData = useRef<{
        browserId: string;
        sessionId: string;
        sessionStartTime: number;
    }>({
        browserId: '',
        sessionId: '',
        sessionStartTime: 0,
    });

    // Convex mutations
    const recordPageVisit = useMutation(api.userJourneys.recordPageVisit);
    const updatePageDuration = useMutation(api.userJourneys.updatePageVisitDuration);

    // Generate or retrieve browser ID
    const initializeBrowserId = useCallback(() => {
        const stored = localStorage.getItem('creatorheat_browser_id');
        if (stored) return stored;

        const newBrowserId = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('creatorheat_browser_id', newBrowserId);
        return newBrowserId;
    }, []);

    // Generate session ID (or get existing for current tab session)
    const initializeSessionId = useCallback(() => {
        const sessionKey = 'creatorheat_session_id';
        const sessionTimeoutKey = 'creatorheat_session_timeout';

        const stored = sessionStorage.getItem(sessionKey);
        const timeout = sessionStorage.getItem(sessionTimeoutKey);

        // Session expires after 30 minutes of inactivity
        const now = Date.now();
        const sessionTimeout = 30 * 60 * 1000; // 30 minutes

        if (stored && timeout && (now - parseInt(timeout)) < sessionTimeout) {
            // Update session timeout
            sessionStorage.setItem(sessionTimeoutKey, now.toString());
            return stored;
        }

        // Create new session
        const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem(sessionKey, newSessionId);
        sessionStorage.setItem(sessionTimeoutKey, now.toString());
        return newSessionId;
    }, []);

    // Extract UTM parameters from URL
    const getUtmParams = useCallback(() => {
        const utmSource = searchParams.get('utm_source') || undefined;
        const utmMedium = searchParams.get('utm_medium') || undefined;
        const utmCampaign = searchParams.get('utm_campaign') || undefined;

        return { utmSource, utmMedium, utmCampaign };
    }, [searchParams]);

    // Generate human-readable page name from pathname
    const generatePageName = useCallback((path: string): string => {
        if (pageName) return pageName;

        // Custom page name mappings
        const pageNameMap: Record<string, string> = {
            '/': 'Landing Page',
            '/signin': 'Sign In',
            '/dashboard': 'Dashboard',
            '/create': 'Create Document',
            '/analytics': 'Analytics Overview',
        };

        // Check exact matches first
        if (pageNameMap[path]) return pageNameMap[path];

        // Handle dynamic routes
        if (path.startsWith('/share/')) return 'Document View';
        if (path.startsWith('/edit/')) return 'Edit Document';
        if (path.startsWith('/analytics/')) return 'Document Analytics';

        // Fallback: clean up pathname
        return path
            .split('/')
            .filter(segment => segment)
            .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
            .join(' ') || 'Unknown Page';
    }, [pageName]);

    // Record a page visit
    const trackPageVisit = useCallback(async (currentPath: string) => {
        if (!enabled || !sessionData.current.browserId || !sessionData.current.sessionId) {
            return;
        }

        const now = Date.now();
        const utmParams = getUtmParams();
        const generatedPageName = generatePageName(currentPath);

        try {
            await recordPageVisit({
                browserId: sessionData.current.browserId,
                userId,
                sessionId: sessionData.current.sessionId,
                pathname: currentPath,
                pageName: generatedPageName,
                documentId,
                documentTitle,
                referrer: document.referrer || undefined,
                previousPage: lastPathname.current || undefined,
                userAgent: navigator.userAgent,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight,
                },
                ...utmParams,
            });

            // Update state
            setJourneyState(prev => ({
                ...prev,
                isTracking: true,
                visitOrder: prev.visitOrder + 1,
                pageStartTime: now,
                currentJourneyId: `journey_${sessionData.current.sessionId}_${prev.visitOrder + 1}`,
            }));

            pageStartTime.current = now;
            lastPathname.current = currentPath;

            console.log(`🛤️ Journey: ${generatedPageName} (${currentPath})`);
        } catch (error) {
            console.error('Failed to track page visit:', error);
        }
    }, [enabled, userId, documentId, documentTitle, getUtmParams, generatePageName, recordPageVisit]);

    // Update duration when leaving page
    const updateCurrentPageDuration = useCallback(async () => {
        if (!sessionData.current.sessionId || !pageStartTime.current) return;

        try {
            await updatePageDuration({
                sessionId: sessionData.current.sessionId,
                endTime: Date.now(),
            });
        } catch (error) {
            console.error('Failed to update page duration:', error);
        }
    }, [updatePageDuration]);

    // Initialize tracking
    const initializeTracking = useCallback(() => {
        if (isInitialized.current || !enabled) return;

        const browserId = initializeBrowserId();
        const sessionId = initializeSessionId();
        const now = Date.now();

        sessionData.current = {
            browserId,
            sessionId,
            sessionStartTime: now,
        };

        setJourneyState(prev => ({
            ...prev,
            browserId,
            sessionId,
            sessionStartTime: now,
            isTracking: false,
            visitOrder: 0,
        }));

        isInitialized.current = true;
        console.log(`🚀 Journey tracking initialized - Browser: ${browserId}, Session: ${sessionId}`);
    }, [enabled, initializeBrowserId, initializeSessionId]);

    // Track pathname changes
    useEffect(() => {
        if (!enabled) return;

        initializeTracking();

        // Only track if pathname actually changed
        if (pathname !== lastPathname.current) {
            trackPageVisit(pathname);
        }
    }, [pathname, enabled, initializeTracking, trackPageVisit]);

    // Update duration when page parameters change (but not pathname)
    useEffect(() => {
        if (!enabled || !isInitialized.current) return;

        // Update session timeout on any activity
        const sessionTimeoutKey = 'creatorheat_session_timeout';
        sessionStorage.setItem(sessionTimeoutKey, Date.now().toString());
    }, [searchParams, enabled]);

    // Handle page unload/navigation
    useEffect(() => {
        if (!enabled) return;

        const handleBeforeUnload = () => {
            updateCurrentPageDuration();
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                updateCurrentPageDuration();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);

            // Final duration update on component unmount
            updateCurrentPageDuration();
        };
    }, [enabled, updateCurrentPageDuration]);

    // Cleanup on disabled
    useEffect(() => {
        if (!enabled && isInitialized.current) {
            updateCurrentPageDuration();
            isInitialized.current = false;
            setJourneyState({
                browserId: '',
                sessionId: '',
                currentJourneyId: '',
                isTracking: false,
                visitOrder: 0,
                sessionStartTime: 0,
                pageStartTime: 0,
            });
        }
    }, [enabled, updateCurrentPageDuration]);

    return {
        journeyState,
        isTracking: journeyState.isTracking,
        currentPage: generatePageName(pathname),
        sessionId: journeyState.sessionId,
        browserId: journeyState.browserId,
        visitOrder: journeyState.visitOrder,
    };
} 