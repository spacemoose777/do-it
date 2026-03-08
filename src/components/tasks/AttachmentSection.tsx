"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { uploadAttachment, deleteAttachment } from "@/lib/storage/attachments";
import type { Attachment, Task, TaskUpdateInput } from "@/types/task";

interface AttachmentSectionProps {
  task: Task;
  onUpdate: (id: string, updates: TaskUpdateInput) => void;
}

type Uploading = {
  id: string;
  name: string;
  progress: number;
  error?: string;
  cancel: () => void;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentIcon({ type, url, name }: { type: string; url: string; name: string }) {
  if (type.startsWith("image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={name} className="w-10 h-10 object-cover rounded-md flex-shrink-0" />
    );
  }

  const label =
    type === "application/pdf" ? "PDF"
    : type.includes("word") || type.includes("document") ? "DOC"
    : type.includes("sheet") || type.includes("excel") ? "XLS"
    : type.includes("presentation") || type.includes("powerpoint") ? "PPT"
    : type.includes("zip") || type.includes("compressed") ? "ZIP"
    : "FILE";

  const color =
    label === "PDF" ? "bg-danger/15 text-danger"
    : label === "DOC" ? "bg-accent/15 text-accent"
    : label === "XLS" ? "bg-success/15 text-success"
    : "bg-bg-tertiary text-text-secondary";

  return (
    <div className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${color}`}>
      <span className="text-xs font-bold">{label}</span>
    </div>
  );
}

export default function AttachmentSection({ task, onUpdate }: AttachmentSectionProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<Uploading[]>([]);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  const attachments = task.attachments ?? [];

  const handleFiles = (files: FileList | null) => {
    if (!files || !user) return;

    Array.from(files).forEach((file) => {
      const uploadId = Math.random().toString(36).slice(2);
      const { promise, cancel } = uploadAttachment(
        user.uid,
        task.id,
        file,
        (progress) => {
          setUploading((prev) =>
            prev.map((u) => (u.id === uploadId ? { ...u, progress } : u))
          );
        }
      );

      setUploading((prev) => [...prev, { id: uploadId, name: file.name, progress: 0, cancel }]);

      promise
        .then((attachment) => {
          const updated = [...attachments, attachment];
          onUpdate(task.id, { attachments: updated });
          setUploading((prev) => prev.filter((u) => u.id !== uploadId));
        })
        .catch((err: Error) => {
          setUploading((prev) =>
            prev.map((u) =>
              u.id === uploadId ? { ...u, error: err.message || "Upload failed" } : u
            )
          );
        });
    });

    // Reset so the same file can be re-selected after an error
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (attachment: Attachment) => {
    setDeleting((prev) => new Set([...prev, attachment.id]));
    try {
      await deleteAttachment(attachment.path);
      onUpdate(task.id, { attachments: attachments.filter((a) => a.id !== attachment.id) });
    } catch {
      // File may already be gone from Storage — still remove from task
      onUpdate(task.id, { attachments: attachments.filter((a) => a.id !== attachment.id) });
    } finally {
      setDeleting((prev) => { const n = new Set(prev); n.delete(attachment.id); return n; });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div>
      {/* Existing attachments */}
      {attachments.length > 0 && (
        <div className="mb-3 space-y-2">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center gap-3 p-2 bg-bg-tertiary rounded-lg">
              <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 flex-1 min-w-0">
                <AttachmentIcon type={att.type} url={att.url} name={att.name} />
                <div className="min-w-0">
                  <p className="text-sm text-text-primary truncate">{att.name}</p>
                  <p className="text-xs text-text-secondary">{formatBytes(att.size)}</p>
                </div>
              </a>
              <button
                onClick={() => handleDelete(att)}
                disabled={deleting.has(att.id)}
                className="p-1.5 rounded-md text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors flex-shrink-0 disabled:opacity-40"
                aria-label="Remove attachment"
              >
                {deleting.has(att.id) ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* In-progress uploads */}
      {uploading.length > 0 && (
        <div className="mb-3 space-y-2">
          {uploading.map((u) => (
            <div key={u.id} className="p-2 bg-bg-tertiary rounded-lg">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-text-secondary truncate flex-1 mr-2">{u.name}</span>
                {u.error ? (
                  <span className="text-xs text-danger">{u.error}</span>
                ) : (
                  <button
                    onClick={() => { u.cancel(); setUploading((prev) => prev.filter((x) => x.id !== u.id)); }}
                    className="text-xs text-text-secondary hover:text-danger"
                  >
                    Cancel
                  </button>
                )}
              </div>
              {!u.error && (
                <div className="h-1 bg-bg-primary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-200"
                    style={{ width: `${u.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drop zone / Add button */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border border-dashed border-border rounded-lg"
      >
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
          </svg>
          Add attachment
          <span className="ml-auto text-xs opacity-50">or drop files here</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
