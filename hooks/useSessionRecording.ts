import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// Import rrweb dynamically to avoid SSR issues
let rrweb: any = null;

interface UseSessionRecordingProps {
    document: {
        _id: Id<"documents">;
        slug: string;
        title: string;
        creatorId: Id<"users">;
        [key: string]: any;
    } | null | undefined;
    userId?: Id<"users">;
    enabled?: boolean;
}

export function useSessionRecording({ document, userId, enabled = true }: UseSessionRecordingProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const stopRecordingRef = useRef<(() => void) | null>(null);
    const eventsRef = useRef<any[]>([]);
    const startTimeRef = useRef<number>(0);

    // Convex mutations
    const startSessionRecording = useMutation(api.sessionRecordings.startSessionRecording);
    const generateUploadUrl = useMutation(api.sessionRecordings.generateUploadUrl);
    const completeSessionRecording = useMutation(api.sessionRecordings.completeSessionRecording);

    // Load rrweb dynamically
    useEffect(() => {
        const loadRRWeb = async () => {
            try {
                const rrwebModule = await import('rrweb');
                rrweb = rrwebModule.default || rrwebModule;
                console.log("✅ rrweb loaded successfully");
            } catch (err) {
                console.error("❌ Failed to load rrweb:", err);
                setError("Failed to load recording library");
            }
        };

        if (enabled && !rrweb) {
            loadRRWeb();
        }
    }, [enabled]);

    // Start recording when document loads
    useEffect(() => {
        if (!document || !enabled || !rrweb || isRecording) return;

        const startRecording = async () => {
            try {
                const sid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                setSessionId(sid);

                console.log("🎬 Starting session recording for:", document.title);

                // Initialize session in database
                await startSessionRecording({
                    documentId: document._id,
                    sessionId: sid,
                    userId,
                    userAgent: navigator.userAgent,
                    referrer: document.referrer,
                    viewportWidth: window.innerWidth,
                    viewportHeight: window.innerHeight,
                });

                // Clear previous events
                eventsRef.current = [];
                startTimeRef.current = Date.now();

                // Start rrweb recording
                const stopFn = rrweb.record({
                    emit(event: any) {
                        eventsRef.current.push(event);

                        // Log events for debugging
                        if (event.type === 3) { // Mouse interaction
                            console.log("🖱️ Mouse event recorded:", event.data?.source);
                        }
                        if (event.type === 7) { // Scroll
                            console.log("📜 Scroll event recorded");
                        }
                    },
                    checkoutEveryNms: 30 * 1000, // Checkpoint every 30 seconds
                    packFn: (pack) => {
                        // Pack events for efficient storage
                        return pack;
                    },
                });

                stopRecordingRef.current = stopFn;
                setIsRecording(true);
                setError(null);

                console.log("✅ Recording started successfully");

            } catch (err) {
                console.error("❌ Failed to start recording:", err);
                setError("Failed to start recording");
            }
        };

        startRecording();

        // Auto-stop recording after 10 minutes to prevent huge files
        const maxRecordingTime = 10 * 60 * 1000; // 10 minutes
        const timeoutId = setTimeout(() => {
            if (isRecording) {
                console.log("⏰ Auto-stopping recording after 10 minutes");
                stopRecording();
            }
        }, maxRecordingTime);

        return () => {
            clearTimeout(timeoutId);
            if (isRecording) {
                stopRecording();
            }
        };
    }, [document, enabled, rrweb, isRecording, userId, startSessionRecording]);

    // Stop recording function
    const stopRecording = async () => {
        if (!isRecording || !stopRecordingRef.current || !sessionId) return;

        try {
            console.log("🛑 Stopping session recording...");

            // Stop rrweb recording
            stopRecordingRef.current();
            stopRecordingRef.current = null;
            setIsRecording(false);

            const endTime = Date.now();
            const duration = endTime - startTimeRef.current;
            const eventCount = eventsRef.current.length;

            console.log(`📊 Recording stats: ${duration}ms, ${eventCount} events`);

            if (eventCount === 0) {
                console.log("⚠️ No events recorded, skipping upload");
                return;
            }

            // Generate upload URL
            const uploadUrl = await generateUploadUrl();

            // Upload recording data
            const recordingBlob = new Blob([JSON.stringify(eventsRef.current)], {
                type: 'application/json',
            });

            const uploadResponse = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: recordingBlob,
            });

            if (!uploadResponse.ok) {
                throw new Error(`Upload failed: ${uploadResponse.statusText}`);
            }

            const { storageId } = await uploadResponse.json();

            // Complete the recording in database
            await completeSessionRecording({
                sessionId,
                recordingFileId: storageId,
                duration,
                eventCount,
                endTime,
            });

            console.log("✅ Recording uploaded and completed successfully");

            // Clear local data
            eventsRef.current = [];
            setSessionId(null);

        } catch (err) {
            console.error("❌ Failed to stop recording:", err);
            setError("Failed to save recording");
        }
    };

    // Handle page unload
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (isRecording) {
                stopRecording();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isRecording]);

    // Manual stop function for testing
    const manualStop = () => {
        if (isRecording) {
            stopRecording();
        }
    };

    return {
        isRecording,
        sessionId,
        error,
        eventCount: eventsRef.current.length,
        duration: isRecording ? Date.now() - startTimeRef.current : 0,
        stopRecording: manualStop,
    };
} 