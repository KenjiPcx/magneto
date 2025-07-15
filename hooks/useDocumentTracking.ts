import { useSessionRecording } from "./useSessionRecording";
import { Id } from "@/convex/_generated/dataModel";

interface UseDocumentTrackingProps {
    document: {
        _id: Id<"documents">;
        slug: string;
        title: string;
        creatorId: Id<"users">;
        [key: string]: any; // Allow additional properties
    } | null | undefined;
    userId?: Id<"users">;
}

export function useDocumentTracking({ document, userId }: UseDocumentTrackingProps) {
    // Use the new rrweb-based session recording instead of custom tracking
    const { sessionId, isRecording, error } = useSessionRecording({
        document,
        userId,
        enabled: true
    });

    return {
        sessionId,
        isTracking: isRecording,
        error,
    };
} 