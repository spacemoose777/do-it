"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import { useTasks } from "@/hooks/useTasks";
import { useTaskLists } from "@/hooks/useTaskLists";
import { useTaskPanel } from "@/hooks/useTaskPanel";
import Header from "@/components/layout/Header";
import TaskInput from "@/components/tasks/TaskInput";
import TaskDetail from "@/components/tasks/TaskDetail";
import SortMenu from "@/components/tasks/SortMenu";
import DraggableTaskList from "@/components/tasks/DraggableTaskList";
import VoiceButton from "@/components/voice/VoiceButton";
import type { Task } from "@/types/task";

export default function MyDayPage() {
  const {
    tasks, loading, sortBy, setSortBy,
    createTask, updateTask, toggleComplete, toggleImportant,
    toggleMyDay, toggleInProgress, deleteTask,
  } = useTasks({ myDay: true });
  const { lists, getDefaultList } = useTaskLists();
  const { selectedTask, setSelectedTask, openTask, closeTask } = useTaskPanel();

  const today = format(new Date(), "EEEE, MMMM d");

  const handleAddTask = useCallback(async (title: string, dueDate?: string, listName?: string) => {
    let targetListId = getDefaultList()?.id;
    let isMyDay = true;

    if (listName) {
      const found = lists.find((l) => l.name.toLowerCase() === listName.toLowerCase());
      if (found) {
        targetListId = found.id;
        isMyDay = false;
      }
    }

    if (!targetListId) return;
    await createTask({ title, list_id: targetListId, is_my_day: isMyDay, due_date: dueDate || null });
  }, [createTask, getDefaultList, lists]);

  const handleUpdate = useCallback(async (id: string, updates: any) => {
    const updated = await updateTask(id, updates);
    if (updated && selectedTask?.id === id) setSelectedTask(updated);
  }, [updateTask, selectedTask, setSelectedTask]);

  const handleToggleComplete = useCallback(async (id: string) => {
    const updated = await toggleComplete(id);
    if (updated && selectedTask?.id === id) setSelectedTask(updated);
  }, [toggleComplete, selectedTask, setSelectedTask]);

  const handleToggleImportant = useCallback(async (id: string) => {
    const updated = await toggleImportant(id);
    if (updated && selectedTask?.id === id) setSelectedTask(updated);
  }, [toggleImportant, selectedTask, setSelectedTask]);

  const handleToggleMyDay = useCallback(async (id: string) => {
    const updated = await toggleMyDay(id);
    if (updated && selectedTask?.id === id) setSelectedTask(updated);
  }, [toggleMyDay, selectedTask, setSelectedTask]);

  const handleToggleInProgress = useCallback(async (id: string) => {
    const updated = await toggleInProgress(id);
    if (updated && selectedTask?.id === id) setSelectedTask(updated);
  }, [toggleInProgress, selectedTask, setSelectedTask]);

  if (selectedTask) {
    return (
      <div className="fixed inset-0 md:relative md:inset-auto bg-bg-primary z-30">
        <TaskDetail
          task={selectedTask}
          onUpdate={handleUpdate}
          onToggleComplete={handleToggleComplete}
          onToggleImportant={handleToggleImportant}
          onToggleMyDay={handleToggleMyDay}
          onToggleInProgress={handleToggleInProgress}
          onDelete={(id) => { deleteTask(id); closeTask(); }}
          onClose={closeTask}
        />
      </div>
    );
  }

  return (
    <>
      <Header
        title="My Day"
        subtitle={today}
        actions={<SortMenu value={sortBy} onChange={setSortBy} />}
      />

      <div className="space-y-4">
        <TaskInput onAdd={handleAddTask} placeholder="Add a task to My Day" />

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <DraggableTaskList
            tasks={tasks}
            onToggleComplete={handleToggleComplete}
            onToggleImportant={handleToggleImportant}
            onToggleInProgress={handleToggleInProgress}
            onTaskClick={openTask}
            onDelete={deleteTask}
            onReorder={updateTask}
            emptyMessage="Focus on what matters today. Add tasks to get started."
          />
        )}
      </div>

      <VoiceButton onTaskAdded={handleAddTask} />
    </>
  );
}
