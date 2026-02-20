"use client";

import { useState, useCallback } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useTaskLists } from "@/hooks/useTaskLists";
import Header from "@/components/layout/Header";
import TaskList from "@/components/tasks/TaskList";
import TaskInput from "@/components/tasks/TaskInput";
import TaskDetail from "@/components/tasks/TaskDetail";
import SortMenu from "@/components/tasks/SortMenu";
import VoiceButton from "@/components/voice/VoiceButton";
import type { Task } from "@/types/task";

export default function ImportantPage() {
  const { tasks, loading, sortBy, setSortBy, createTask, updateTask, toggleComplete, toggleImportant, toggleMyDay, deleteTask } = useTasks({
    important: true,
    includeCompleted: true,
  });
  const { lists, getDefaultList } = useTaskLists();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleAddTask = useCallback(async (title: string, dueDate?: string) => {
    const defaultList = getDefaultList();
    if (!defaultList) return;
    await createTask({
      title,
      list_id: defaultList.id,
      is_important: true,
      due_date: dueDate || null,
    });
  }, [createTask, getDefaultList]);

  const getListName = useCallback((task: Task) => {
    return lists.find((l) => l.id === task.list_id)?.name;
  }, [lists]);

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
        title="Important"
        actions={<SortMenu value={sortBy} onChange={setSortBy} />}
      />

      <div className="space-y-4">
        <TaskInput
          onAdd={handleAddTask}
          placeholder="Add an important task"
        />

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
            showListName={getListName}
            emptyMessage="Tasks you mark as important show up here."
          />
        )}
      </div>

      <VoiceButton onTaskAdded={handleAddTask} />
    </>
  );
}
