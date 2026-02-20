"use client";

import { useState, useRef, type KeyboardEvent } from "react";

interface TaskInputProps {
  onAdd: (title: string) => void;
  onMicClick?: () => void;
  placeholder?: string;
}

export default function TaskInput({ onAdd, onMicClick, placeholder = "Add a task" }: TaskInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-bg-secondary rounded-xl border border-border">
      <svg className="w-5 h-5 text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none"
      />
      {onMicClick && (
        <button
          onClick={onMicClick}
          className="flex-shrink-0 p-1.5 hover:bg-bg-tertiary rounded-lg transition-colors"
          title="Voice input"
        >
          <svg className="w-5 h-5 text-text-secondary hover:text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
        </button>
      )}
    </div>
  );
}
