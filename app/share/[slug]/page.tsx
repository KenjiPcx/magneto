"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Link } from "@tiptap/extension-link";
import { useParams } from "next/navigation";
import { useSessionRecording } from "@/hooks/useSessionRecording";
import { useConvexAuth } from "convex/react";
import { HeatmapVisualization } from "@/components/HeatmapVisualization";
import { SessionRecordingDebugPanel } from "@/components/SessionRecordingDebugPanel";

export default function ShareDocumentPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { isAuthenticated } = useConvexAuth();

  const document = useQuery(api.documents.getDocumentBySlug, { slug });

  // Initialize session recording (replaces old custom tracking)
  const recordingState = useSessionRecording({
    document,
    userId: isAuthenticated ? undefined : undefined, // We can add user ID later if needed
    enabled: true, // Enable recording for all visitors
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
      Link.configure({ openOnClick: true }),
    ],
    content: document?.content || "",
    editable: false,
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && document?.content) {
      editor.commands.setContent(document.content);

      // Add paragraph IDs for heatmap processing (used when analyzing recordings)
      setTimeout(() => {
        const paragraphs = editor.view.dom.querySelectorAll(
          "p, h1, h2, h3, h4, h5, h6",
        );
        console.log("🏷️ Adding paragraph IDs for heatmap analysis:", paragraphs.length);
        paragraphs.forEach((p, index) => {
          const paragraphId = `paragraph-${index}`;
          p.setAttribute("data-paragraph-id", paragraphId);
          console.log(`✅ Added ID: ${paragraphId} to:`, p.textContent?.substring(0, 50));
        });

        console.log("📊 Session recording will capture interactions with these paragraphs");
      }, 200);
    }
  }, [editor, document?.content]);

  if (document === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (document === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Document not found</h1>
          <p className="text-muted-foreground">
            The document you&apos;re looking for doesn&apos;t exist or has been
            unpublished.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background sticky top-0 z-50 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">{document.title}</h1>
              {document.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {document.description}
                </p>
              )}
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-4">
              <div>by {document.creator?.name || document.creator?.email}</div>
              {recordingState.isRecording && (
                <div className="flex items-center gap-1 text-red-600">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs">Recording</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="prose prose-lg max-w-none">
          <EditorContent editor={editor} />
        </div>
      </main>

      <footer className="border-t border-border bg-background/50 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              <p>Created with CreatorHeat</p>
            </div>
            <div>
              <p>© {new Date().getFullYear()} - All rights reserved</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Heatmap visualization - only show for document creator */}
      {document && (
        <HeatmapVisualization
          documentId={document._id}
          timeRange={30}
          showMetrics={true}
        />
      )}

      {/* Session recording debug panel */}
      <SessionRecordingDebugPanel
        isRecording={recordingState.isRecording}
        sessionId={recordingState.sessionId}
        error={recordingState.error}
        eventCount={recordingState.eventCount}
        duration={recordingState.duration}
        stopRecording={recordingState.stopRecording}
      />
    </div>
  );
}
