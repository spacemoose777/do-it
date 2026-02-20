"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { useTasks } from "@/hooks/useTasks";
import { useTaskLists } from "@/hooks/useTaskLists";
import Header from "@/components/layout/Header";
import TaskList from "@/components/tasks/TaskList";
import TaskInput from "@/components/tasks/TaskInput";
import TaskDetail from "@/components/tasks/TaskDetail";
import SortMenu from "@/components/tasks/SortMenu";
import VoiceButton from "@/components/voice/VoiceButton";
import type { Task } from "@/types/task";

export default function MyDayPage() {
  const { tasks, loading, sortBy, setSortBy, createTask, updateTask, toggleComplete, toggleImportant, toggleMyDay, deleteTask } = useTasks({
    myDay: true,
    includeCompleted: true,
  });
  const { getDefaultList } = useTaskLists();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const today = format(new Date(), "EEEE, MMMM d");

  const handleAddTask = useCallback(async (title: string, dueDate?: string) => {
    const defaultList = getDefaultList();
    if (!defaultList) return;
    await createTask({
      title,
      list_id: defaultList.id,
      is_my_day: true,
      due_date: dueDate || null,
    });
  }, [createTask, getDefaultList]);

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

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
        title="My Day"
        subtitle={today}
        actions={<SortMenu value={sortBy} onChange={setSortBy} />}
      />

      <div className="space-y-4">
        <TaskInput
          onAdd={handleAddTask}
          placeholder="Add a task to My Day"
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
            onTaskClick={handleTaskClick}
            onDelete={deleteTask}
            emptyMessage="Focus on what matters today. Add tasks to get started."
          />
        )}
      </div>

      <VoiceButton onTaskAdded={handleAddTask} />
    </>
  );
}
