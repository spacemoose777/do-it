"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTasks } from "@/hooks/useTasks";
import { useTaskLists } from "@/hooks/useTaskLists";
import { useToast } from "@/contexts/ToastContext";
import Header from "@/components/layout/Header";

function SharePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { createTask } = useTasks({});
  const { lists, getDefaultList } = useTaskLists();
  const { showToast } = useToast();

  const sharedTitle = searchParams.get("title") || "";
  const sharedText = searchParams.get("text") || "";
  const sharedUrl = searchParams.get("url") || "";

  // Build a sensible default title and notes
  const defaultTitle = sharedTitle || sharedUrl || sharedText.split("\n")[0] || "";
  const defaultNotes = [
    sharedUrl ? sharedUrl : "",
    sharedText && sharedText !== defaultTitle ? sharedText : "",
  ]
    .filter(Boolean)
    .join("\n")
    .trim();

  const [title, setTitle] = useState(defaultTitle);
  const [notes, setNotes] = useState(defaultNotes);
  const [listId, setListId] = useState("");
  const [isMyDay, setIsMyDay] = useState(true);
  const [saving, setSaving] = useState(false);

  // Set default list once lists load
  useEffect(() => {
    const def = getDefaultList();
    if (def && !listId) {
      setListId(def.id);
    }
  }, [lists, getDefaultList, listId]);

  const handleSave = useCallback(async () => {
    if (!title.trim() || !listId) return;
    setSaving(true);
    await createTask({
      title: title.trim(),
      notes,
      list_id: listId,
      is_my_day: isMyDay,
      due_date: null,
    });
    showToast("Task added!", "success");
    router.push("/my-day");
  }, [title, notes, listId, isMyDay, createTask, showToast, router]);

  return (
    <>
      <Header title="Add Shared Item" />

      <div className="space-y-4 mt-2">
        {/* Shared content preview */}
        {(sharedUrl || sharedText) && (
          <div className="bg-bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-text-secondary break-all">
            {sharedUrl && <p className="text-accent truncate">{sharedUrl}</p>}
            {sharedText && !sharedUrl && (
              <p className="line-clamp-3">{sharedText}</p>
            )}
          </div>
        )}

        {/* Task title */}
        <div>
          <label className="block text-xs text-text-secondary mb-1.5">Task title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field"
            placeholder="Task title"
            autoFocus
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs text-text-secondary mb-1.5">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="input-field resize-none"
            placeholder="Notes (optional)"
          />
        </div>

        {/* List selector */}
        <div>
          <label className="block text-xs text-text-secondary mb-1.5">Add to list</label>
          <select
            value={listId}
            onChange={(e) => setListId(e.target.value)}
            className="input-field"
          >
            {lists.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        {/* My Day toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isMyDay}
            onChange={(e) => setIsMyDay(e.target.checked)}
            className="w-4 h-4 accent-accent"
          />
          <span className="text-sm text-text-primary">Add to My Day</span>
        </label>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => router.back()}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="btn-primary flex-1"
          >
            {saving ? "Saving..." : "Add Task"}
          </button>
        </div>
      </div>
    </>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SharePageInner />
    </Suspense>
  );
}
