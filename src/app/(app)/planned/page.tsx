"use client";

import { useMemo, useCallback } from "react";
import { format, parseISO, isToday, isTomorrow, isThisWeek, isPast, startOfDay } from "date-fns";
import { useTasks } from "@/hooks/useTasks";
import { useTaskLists } from "@/hooks/useTaskLists";
import { useTaskPanel } from "@/hooks/useTaskPanel";
import Header from "@/components/layout/Header";
import TaskItem from "@/components/tasks/TaskItem";
import TaskInput from "@/components/tasks/TaskInput";
import TaskDetail from "@/components/tasks/TaskDetail";
import VoiceButton from "@/components/voice/VoiceButton";
import type { Task } from "@/types/task";

type DateGroup = {
  label: string;
  tasks: Task[];
};

export default function PlannedPage() {
  const {
    tasks, loading,
    createTask, updateTask, toggleComplete, toggleImportant,
    toggleMyDay, toggleInProgress, deleteTask,
  } = useTasks({ planned: true, includeCompleted: false });
  const { lists, getDefaultList } = useTaskLists();
  const { selectedTask, setSelectedTask, openTask, closeTask } = useTaskPanel();

  const groups = useMemo((): DateGroup[] => {
    const overdue: Task[] = [];
    const today: Task[] = [];
    const tomorrow: Task[] = [];
    const thisWeek: Task[] = [];
    const later: Task[] = [];

    for (const task of tasks) {
      if (!task.due_date) continue;
      const date = parseISO(task.due_date);
      const dayStart = startOfDay(date);

      if (isPast(dayStart) && !isToday(date)) {
        overdue.push(task);
      } else if (isToday(date)) {
        today.push(task);
      } else if (isTomorrow(date)) {
        tomorrow.push(task);
      } else if (isThisWeek(date)) {
        thisWeek.push(task);
      } else {
        later.push(task);
      }
    }

    const result: DateGroup[] = [];
    if (overdue.length) result.push({ label: "Overdue", tasks: overdue });
    if (today.length) result.push({ label: "Today", tasks: today });
    if (tomorrow.length) result.push({ label: "Tomorrow", tasks: tomorrow });
    if (thisWeek.length) result.push({ label: "This week", tasks: thisWeek });
    if (later.length) result.push({ label: "Later", tasks: later });
    return result;
  }, [tasks]);

  const handleAddTask = useCallback(async (title: string, dueDate?: string) => {
    const defaultList = getDefaultList();
    if (!defaultList) return;
    await createTask({ title, list_id: defaultList.id, due_date: dueDate || format(new Date(), "yyyy-MM-dd") });
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
      <Header title="Planned" />

      <div className="space-y-4">
        <TaskInput onAdd={handleAddTask} placeholder="Add a task with a due date" />

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
            <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <p className="text-sm">Tasks with due dates will appear here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.label}>
                <h2 className={`text-sm font-semibold mb-2 px-1 ${group.label === "Overdue" ? "text-danger" : "text-text-secondary"}`}>
                  {group.label}
                </h2>
                <div className="space-y-1">
                  {group.tasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggleComplete={handleToggleComplete}
                      onToggleImportant={handleToggleImportant}
                      onToggleInProgress={handleToggleInProgress}
                      onClick={openTask}
                      onDelete={deleteTask}
                      showListName={getListName(task)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <VoiceButton onTaskAdded={handleAddTask} />
    </>
  );
}
