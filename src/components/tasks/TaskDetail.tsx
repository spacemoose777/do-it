"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { formatFullDate, formatTime, getRecurrenceLabel, formatReminderDate } from "@/lib/date-utils";
import Checkbox from "@/components/ui/Checkbox";
import DatePicker from "@/components/ui/DatePicker";
import TimePicker from "@/components/ui/TimePicker";
import RecurrencePicker from "./RecurrencePicker";
import ReminderPicker from "./ReminderPicker";
import SubtaskList from "./SubtaskList";
import AttachmentSection from "./AttachmentSection";
import type { Task, TaskUpdateInput } from "@/types/task";

interface TaskDetailProps {
  task: Task;
  onUpdate: (id: string, updates: TaskUpdateInput) => void;
  onToggleComplete: (id: string) => void;
  onToggleImportant: (id: string) => void;
  onToggleMyDay: (id: string) => void;
  onToggleInProgress: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const PRIORITY_OPTIONS = [
  { value: 1, label: "P1", description: "Urgent", activeClass: "bg-danger text-white border-danger" },
  { value: 2, label: "P2", description: "High", activeClass: "bg-warning text-white border-warning" },
  { value: 3, label: "P3", description: "Medium", activeClass: "bg-accent text-white border-accent" },
  { value: 4, label: "P4", description: "Low", activeClass: "bg-bg-tertiary text-text-primary border-border" },
];

export default function TaskDetail({
  task,
  onUpdate,
  onToggleComplete,
  onToggleImportant,
  onToggleMyDay,
  onToggleInProgress,
  onDelete,
  onClose,
}: TaskDetailProps) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showRecurrence, setShowRecurrence] = useState(false);
  const [showReminder, setShowReminder] = useState(false);

  const reminders = task.reminders ?? (task.reminder_at ? [task.reminder_at] : []);

  useEffect(() => {
    setTitle(task.title);
    setNotes(task.notes);
  }, [task]);

  const handleTitleBlur = () => {
    if (title.trim() && title !== task.title) {
      onUpdate(task.id, { title: title.trim() });
    }
  };

  const handleNotesBlur = () => {
    if (notes !== task.notes) {
      onUpdate(task.id, { notes });
    }
  };

  const handleAddReminder = (isoString: string) => {
    const updated = [...reminders, isoString];
    onUpdate(task.id, { reminders: updated, reminder_at: updated[0] || null });
  };

  const handleRemoveReminder = (index: number) => {
    const updated = reminders.filter((_, i) => i !== index);
    onUpdate(task.id, { reminders: updated, reminder_at: updated[0] || null });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <button onClick={onClose} className="p-1 hover:bg-bg-tertiary rounded-lg transition-colors">
          <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="p-1 hover:bg-danger/10 rounded-lg transition-colors text-text-secondary hover:text-danger"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Title + Checkbox */}
        <div className="flex items-start gap-3">
          <Checkbox
            checked={task.is_completed}
            onChange={() => onToggleComplete(task.id)}
            className="mt-1"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className={cn(
              "flex-1 text-lg font-medium bg-transparent focus:outline-none text-text-primary",
              task.is_completed && "line-through text-text-secondary"
            )}
          />
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onToggleMyDay(task.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
              task.is_my_day
                ? "bg-warning/10 text-warning"
                : "bg-bg-tertiary text-text-secondary hover:text-text-primary"
            )}
          >
            <svg className="w-4 h-4" fill={task.is_my_day ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
            {task.is_my_day ? "Added to My Day" : "Add to My Day"}
          </button>

          <button
            onClick={() => onToggleImportant(task.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
              task.is_important
                ? "bg-warning/10 text-warning"
                : "bg-bg-tertiary text-text-secondary hover:text-text-primary"
            )}
          >
            <svg className="w-4 h-4" fill={task.is_important ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
            {task.is_important ? "Important" : "Mark important"}
          </button>

          <button
            onClick={() => onToggleInProgress(task.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
              task.is_in_progress
                ? "bg-accent/10 text-accent"
                : "bg-bg-tertiary text-text-secondary hover:text-text-primary"
            )}
          >
            <svg className="w-4 h-4" fill={task.is_in_progress ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            {task.is_in_progress ? "In progress" : "Mark in progress"}
          </button>
        </div>

        {/* Priority */}
        <div>
          <p className="text-xs text-text-secondary mb-2">Priority</p>
          <div className="flex gap-2 flex-wrap">
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onUpdate(task.id, { priority: task.priority === opt.value ? null : opt.value })}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors",
                  task.priority === opt.value
                    ? opt.activeClass
                    : "bg-bg-tertiary text-text-secondary border-border hover:text-text-primary"
                )}
                title={opt.description}
              >
                <span className="font-semibold">{opt.label}</span>
                <span className="text-xs opacity-80">{opt.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Subtasks */}
        <SubtaskList taskId={task.id} />

        {/* Due date */}
        <div>
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg bg-bg-tertiary text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            {task.due_date ? formatFullDate(task.due_date) : "Add due date"}
          </button>
          {showDatePicker && (
            <div className="mt-2">
              <DatePicker
                value={task.due_date}
                onChange={(date) => onUpdate(task.id, { due_date: date })}
              />
            </div>
          )}
        </div>

        {/* Due time */}
        {task.due_date && (
          <div>
            <button
              onClick={() => setShowTimePicker(!showTimePicker)}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg bg-bg-tertiary text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {task.due_time ? formatTime(task.due_time) : "Add time"}
            </button>
            {showTimePicker && (
              <div className="mt-2">
                <TimePicker
                  value={task.due_time}
                  onChange={(time) => onUpdate(task.id, { due_time: time })}
                />
              </div>
            )}
          </div>
        )}

        {/* Reminders (multiple) */}
        <div>
          <button
            onClick={() => setShowReminder(!showReminder)}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg bg-bg-tertiary text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {reminders.length > 0
              ? `${reminders.length} reminder${reminders.length > 1 ? "s" : ""} set`
              : "Add reminder"}
          </button>

          {/* Existing reminders */}
          {reminders.length > 0 && (
            <div className="mt-2 space-y-1">
              {reminders.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-accent/10 rounded-lg">
                  <span className="text-sm text-accent">{formatReminderDate(r)}</span>
                  <button
                    onClick={() => handleRemoveReminder(i)}
                    className="text-xs text-danger hover:text-danger/80 ml-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {showReminder && (
            <div className="mt-2">
              <ReminderPicker onAdd={handleAddReminder} />
            </div>
          )}
        </div>

        {/* Recurrence */}
        <div>
          <button
            onClick={() => setShowRecurrence(!showRecurrence)}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg bg-bg-tertiary text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.183" />
            </svg>
            {task.recurrence_rule ? getRecurrenceLabel(task.recurrence_rule) : "Add recurrence"}
          </button>
          {showRecurrence && (
            <div className="mt-2">
              <RecurrencePicker
                value={task.recurrence_rule}
                onChange={(rule) => onUpdate(task.id, { recurrence_rule: rule })}
              />
            </div>
          )}
        </div>

        {/* Attachments */}
        <div>
          <p className="text-xs text-text-secondary mb-2">Attachments</p>
          <AttachmentSection task={task} onUpdate={onUpdate} />
        </div>

        {/* Notes */}
        <div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Add notes..."
            rows={4}
            className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-accent resize-none"
          />
        </div>

        {/* Metadata */}
        <div className="text-xs text-text-secondary/50 pt-2">
          Created {new Date(task.created_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
