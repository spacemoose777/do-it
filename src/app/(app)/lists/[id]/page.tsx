"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTasks } from "@/hooks/useTasks";
import { useTaskLists } from "@/hooks/useTaskLists";
import { LIST_COLORS } from "@/lib/constants";
import Header from "@/components/layout/Header";
import TaskList from "@/components/tasks/TaskList";
import TaskInput from "@/components/tasks/TaskInput";
import TaskDetail from "@/components/tasks/TaskDetail";
import SortMenu from "@/components/tasks/SortMenu";
import VoiceButton from "@/components/voice/VoiceButton";
import type { Task } from "@/types/task";

export default function ListPage() {
  const params = useParams();
  const router = useRouter();
  const listId = params.id as string;

  // Handle the "manage" route - show all lists
  if (listId === "manage") {
    return <ListsManagePage />;
  }

  return <SingleListPage listId={listId} />;
}

function SingleListPage({ listId }: { listId: string }) {
  const { tasks, loading, sortBy, setSortBy, createTask, updateTask, toggleComplete, toggleImportant, toggleMyDay, deleteTask } = useTasks({
    listId,
    includeCompleted: true,
  });
  const { lists, deleteList, updateList } = useTaskLists();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const router = useRouter();

  const list = lists.find((l) => l.id === listId);

  const handleAddTask = useCallback(async (title: string, dueDate?: string) => {
    await createTask({ title, list_id: listId, due_date: dueDate || null });
  }, [createTask, listId]);

  const handleDeleteList = useCallback(async () => {
    if (!list || list.is_default) return;
    await deleteList(listId);
    router.push("/my-day");
  }, [deleteList, listId, list, router]);

  const handleRename = useCallback(async () => {
    if (!renameValue.trim()) return;
    await updateList(listId, { name: renameValue.trim() });
    setIsRenaming(false);
  }, [updateList, listId, renameValue]);

  if (!list) {
    return (
      <div className="text-center py-16 text-text-secondary">
        <p>List not found</p>
      </div>
    );
  }

  if (selectedTask) {
    return (
      <div className="fixed inset-0 md:relative md:inset-auto bg-bg-primary z-30">
        <TaskDetail
          task={selectedTask}
          onUpdate={updateTask}
          onToggleComplete={toggleComplete}
          onToggleImportant={toggleImportant}
          onToggleMyDay={toggleMyDay}
          onDelete={(id) => {
            deleteTask(id);
            setSelectedTask(null);
          }}
          onClose={() => setSelectedTask(null)}
        />
      </div>
    );
  }

  return (
    <>
      <Header
        title={list.name}
        actions={
          <div className="flex items-center gap-2">
            <SortMenu value={sortBy} onChange={setSortBy} />
            {!list.is_default && (
              <>
                <button
                  onClick={() => { setRenameValue(list.name); setIsRenaming(true); }}
                  className="btn-ghost text-sm"
                >
                  Rename
                </button>
                <button
                  onClick={handleDeleteList}
                  className="btn-ghost text-danger text-sm"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        }
      />

      {isRenaming && (
        <div className="flex items-center gap-2 mb-4">
          <input
            className="input-field text-sm flex-1"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setIsRenaming(false);
            }}
            autoFocus
          />
          <button onClick={handleRename} className="btn-primary text-sm">Save</button>
          <button onClick={() => setIsRenaming(false)} className="btn-secondary text-sm">Cancel</button>
        </div>
      )}

      <div className="space-y-4">
        <TaskInput onAdd={handleAddTask} placeholder={`Add a task to ${list.name}`} />

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <TaskList
            tasks={tasks}
            onToggleComplete={toggleComplete}
            onToggleImportant={toggleImportant}
            onTaskClick={setSelectedTask}
            onDelete={deleteTask}
            emptyMessage={`No tasks in ${list.name} yet.`}
          />
        )}
      </div>

      <VoiceButton onTaskAdded={handleAddTask} />
    </>
  );
}

function ListsManagePage() {
  const { lists, createList, updateList } = useTaskLists();
  const [showCreate, setShowCreate] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const router = useRouter();

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return;
    await updateList(id, { name: renameValue.trim() });
    setRenamingId(null);
  };

  return (
    <>
      <Header
        title="Lists"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary text-sm"
          >
            New List
          </button>
        }
      />

      <div className="space-y-2">
        {lists.map((list) => (
          <div key={list.id}>
            {renamingId === list.id ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-bg-secondary rounded-xl border border-accent">
                <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: list.color }} />
                <input
                  className="input-field text-sm flex-1 py-1"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(list.id);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  autoFocus
                />
                <button onClick={() => handleRename(list.id)} className="btn-primary text-sm py-1">Save</button>
                <button onClick={() => setRenamingId(null)} className="btn-secondary text-sm py-1">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-3 w-full px-4 py-3 bg-bg-secondary rounded-xl border border-border">
                <button
                  onClick={() => router.push(`/lists/${list.id}`)}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: list.color }} />
                  <span className="text-sm text-text-primary flex-1 text-left truncate">{list.name}</span>
                  {list.is_default && (
                    <span className="text-xs text-text-secondary bg-bg-tertiary px-2 py-0.5 rounded">Default</span>
                  )}
                </button>
                {!list.is_default && (
                  <button
                    onClick={() => { setRenameValue(list.name); setRenamingId(list.id); }}
                    className="p-1.5 text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
                    aria-label="Rename list"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  </button>
                )}
                <svg className="w-4 h-4 text-text-secondary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="mt-4">
          <CreateListInline
            onCreate={async (name, color) => {
              await createList({ name, color });
              setShowCreate(false);
            }}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}
    </>
  );
}

function CreateListInline({
  onCreate,
  onCancel,
}: {
  onCreate: (name: string, color: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");

  return (
    <div className="card p-4 space-y-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="List name"
        className="input-field"
        autoFocus
      />
      <div className="flex gap-2">
        {LIST_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-7 h-7 rounded-full ${color === c ? "ring-2 ring-offset-2 ring-offset-bg-secondary ring-accent" : ""}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="btn-secondary text-sm">Cancel</button>
        <button onClick={() => name.trim() && onCreate(name.trim(), color)} className="btn-primary text-sm">Create</button>
      </div>
    </div>
  );
}
