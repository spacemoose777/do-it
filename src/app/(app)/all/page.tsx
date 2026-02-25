"use client";

import { useCallback } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useTaskLists } from "@/hooks/useTaskLists";
import { useTaskPanel } from "@/hooks/useTaskPanel";
import Header from "@/components/layout/Header";
import TaskList from "@/components/tasks/TaskList";
import TaskInput from "@/components/tasks/TaskInput";
import TaskDetail from "@/components/tasks/TaskDetail";
import SortMenu from "@/components/tasks/SortMenu";
import VoiceButton from "@/components/voice/VoiceButton";
import type { Task } from "@/types/task";

export default function AllTasksPage() {
  const {
    tasks, loading, sortBy, setSortBy,
    createTask, updateTask, toggleComplete, toggleImportant,
    toggleMyDay, toggleInProgress, deleteTask,
  } = useTasks({ includeCompleted: true });
  const { lists, getDefaultList } = useTaskLists();
  const { selectedTask, setSelectedTask, openTask, closeTask } = useTaskPanel();

  const handleAddTask = useCallback(async (title: string, dueDate?: string) => {
    const defaultList = getDefaultList();
    if (!defaultList) return;
    await createTask({ title, list_id: defaultList.id, due_date: dueDate || null });
  }, [createTask, getDefaultList]);

  const getListName = useCallback((task: Task) => {
    return lists.find((l) => l.id === task.list_id)?.name;
  }, [lists]);

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
        title="All Tasks"
        actions={<SortMenu value={sortBy} onChange={setSortBy} />}
      />

      <div className="space-y-4">
        <TaskInput onAdd={handleAddTask} />

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <TaskList
            tasks={tasks}
            onToggleComplete={handleToggleComplete}
            onToggleImportant={handleToggleImportant}
            onToggleInProgress={handleToggleInProgress}
            onTaskClick={openTask}
            onDelete={deleteTask}
            showListName={getListName}
            emptyMessage="No tasks yet. Add one above to get started."
          />
        )}
      </div>

      <VoiceButton onTaskAdded={handleAddTask} />
    </>
  );
}
