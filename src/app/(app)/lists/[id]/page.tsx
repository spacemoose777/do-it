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
  const { lists, deleteList } = useTaskLists();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
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
              <button
                onClick={handleDeleteList}
                className="btn-ghost text-danger text-sm"
              >
                Delete list
              </button>
            )}
          </div>
        }
      />

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
  const { lists, createList } = useTaskLists();
  const [showCreate, setShowCreate] = useState(false);
  const router = useRouter();

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
          <button
            key={list.id}
            onClick={() => router.push(`/lists/${list.id}`)}
            className="flex items-center gap-3 w-full px-4 py-3 bg-bg-secondary rounded-xl border border-border hover:bg-bg-tertiary transition-colors"
          >
            <span
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: list.color }}
            />
            <span className="text-sm text-text-primary flex-1 text-left">{list.name}</span>
            {list.is_default && (
              <span className="text-xs text-text-secondary bg-bg-tertiary px-2 py-0.5 rounded">Default</span>
            )}
            <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
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
