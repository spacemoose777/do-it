"use client";

import { useState, useRef, useEffect } from "react";
import { SORT_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { SortField } from "@/hooks/useTasks";

interface SortMenuProps {
  value: SortField;
  onChange: (value: SortField) => void;
}

export default function SortMenu({ value, onChange }: SortMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-ghost flex items-center gap-1.5 text-sm"
        title="Sort tasks"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
        </svg>
        Sort
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-bg-secondary border border-border rounded-xl shadow-lg py-1 min-w-[180px] z-20 animate-fade-in">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value as SortField);
                setIsOpen(false);
              }}
              className={cn(
                "w-full text-left px-4 py-2.5 text-sm transition-colors",
                value === opt.value
                  ? "text-accent bg-accent/5"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
