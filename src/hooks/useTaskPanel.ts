"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Task } from "@/types/task";

/**
 * Manages the inline task-detail panel for list pages.
 * - Saves scroll position when a task is opened and restores it on close.
 * - Pushes a history entry when the panel opens so the device back button
 *   closes the panel instead of navigating to the previous page.
 */
export function useTaskPanel() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const scrollRef = useRef(0);

  useEffect(() => {
    if (!selectedTask) return;
    // Push a dummy history entry so swipe-back / hardware back closes the panel
    window.history.pushState({ panelOpen: true }, "");
    const handlePop = () => setSelectedTask(null);
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [selectedTask !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const openTask = useCallback((task: Task) => {
    scrollRef.current = window.scrollY;
    setSelectedTask(task);
  }, []);

  const closeTask = useCallback(() => {
    setSelectedTask(null);
    // Restore scroll position on next paint
    requestAnimationFrame(() => window.scrollTo(0, scrollRef.current));
  }, []);

  return { selectedTask, setSelectedTask, openTask, closeTask };
}
