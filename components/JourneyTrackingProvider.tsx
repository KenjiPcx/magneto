"use client";

import { useEffect } from "react";
import { useJourneyTracking } from "@/hooks/use-journey-tracking";
import { usePathname, useSearchParams } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface JourneyTrackingProviderProps {
    children: React.ReactNode;
}

export function JourneyTrackingProvider({ children }: JourneyTrackingProviderProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { isAuthenticated } = useConvexAuth();

    // Extract document information for document pages
    const getDocumentInfo = () => {
        // For share pages
        if (pathname.startsWith('/share/')) {
            const slug = pathname.split('/share/')[1];
            return { slug, isShare: true };
        }

        // For analytics pages
        if (pathname.startsWith('/analytics/')) {
            const documentId = pathname.split('/analytics/')[1];
            return { documentId, isAnalytics: true };
        }

        // For edit pages
        if (pathname.startsWith('/edit/')) {
            const documentId = pathname.split('/edit/')[1];
            return { documentId, isEdit: true };
        }

        return null;
    };

    const documentInfo = getDocumentInfo();
    const document = useQuery(
        api.documents.getDocumentBySlug,
        documentInfo?.slug ? { slug: documentInfo.slug } : "skip"
    );

    // Get userId from URL params (for tracking conversions)
    const userId = searchParams.get('userId') || undefined;

    // Generate custom page names based on context
    const getCustomPageName = () => {
        if (documentInfo?.isShare && document) {
            return `Document View: ${document.title}`;
        }
        if (documentInfo?.isAnalytics) {
            return "Document Analytics";
        }
        if (documentInfo?.isEdit) {
            return "Edit Document";
        }
        return undefined; // Let the hook determine the page name
    };

    // Initialize journey tracking
    const journeyTracking = useJourneyTracking({
        enabled: true, // Always track, regardless of auth status
        userId,
        documentId: document?._id || (documentInfo?.documentId as any),
        documentTitle: document?.title,
        pageName: getCustomPageName(),
    });

    // Debug log in development
    useEffect(() => {
        if (process.env.NODE_ENV === 'development' && journeyTracking.isTracking) {
            console.log(`🛤️ Journey Tracking: ${journeyTracking.currentPage} (Session: ${journeyTracking.sessionId.slice(-8)})`);
        }
    }, [journeyTracking.isTracking, journeyTracking.currentPage, journeyTracking.sessionId]);

    return (
        <>
            {children}

            {/* Development debug panel */}
            {process.env.NODE_ENV === 'development' && journeyTracking.isTracking && (
                <div className="fixed bottom-4 left-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono max-w-xs z-50">
                    <div className="text-blue-400 font-semibold mb-2">🛤️ Journey Tracking</div>
                    <div>Page: {journeyTracking.currentPage}</div>
                    <div>Visit: #{journeyTracking.visitOrder}</div>
                    <div>Session: {journeyTracking.sessionId.slice(-8)}</div>
                    <div>Browser: {journeyTracking.browserId.slice(-8)}</div>
                    {userId && <div>User ID: {userId}</div>}
                    {document && <div>Document: {document.title}</div>}
                </div>
            )}
        </>
    );
} 