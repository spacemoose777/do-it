"use client";

import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  className?: string;
}

export default function Checkbox({ checked, onChange, className }: CheckboxProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={cn(
        "flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all duration-200 flex items-center justify-center",
        checked
          ? "bg-accent border-accent"
          : "border-text-secondary/40 hover:border-accent",
        className
      )}
      role="checkbox"
      aria-checked={checked}
    >
      {checked && (
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}
