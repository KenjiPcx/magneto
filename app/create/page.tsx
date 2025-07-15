"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";

export default function CreateDocumentPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const createDocument = useMutation(api.documents.createDocument);

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Please enter a title for your document");
      return;
    }

    setSaving(true);
    try {
      await createDocument({
        title: title.trim(),
        content,
        description: description.trim() || undefined,
      });

      router.push(`/dashboard`);
    } catch (error) {
      console.error("Error saving document:", error);
      alert("Error saving document. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Create New Document</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Document"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Document metadata */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter document title..."
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter a brief description..."
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>

          {/* Content editor */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Content</label>
            <div className="border border-border rounded-md overflow-hidden h-[70vh]">
              <SimpleEditor initialContent={content} onChange={setContent} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
