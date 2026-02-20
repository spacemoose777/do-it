"use client";

import { useState } from "react";
import { format, addDays, startOfTomorrow, nextMonday } from "date-fns";

interface DatePickerProps {
  value: string | null;
  onChange: (date: string | null) => void;
  label?: string;
}

const quickOptions = [
  { label: "Today", getDate: () => new Date() },
  { label: "Tomorrow", getDate: () => startOfTomorrow() },
  { label: "Next week", getDate: () => nextMonday(new Date()) },
];

export default function DatePicker({ value, onChange, label }: DatePickerProps) {
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-2">{label}</label>
      )}
      <div className="flex flex-wrap gap-2 mb-2">
        {quickOptions.map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => {
              onChange(format(opt.getDate(), "yyyy-MM-dd"));
              setShowCustom(false);
            }}
            className="px-3 py-1.5 text-sm rounded-lg bg-bg-tertiary hover:bg-border text-text-primary transition-colors"
          >
            {opt.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className="px-3 py-1.5 text-sm rounded-lg bg-bg-tertiary hover:bg-border text-text-primary transition-colors"
        >
          Pick a date
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="px-3 py-1.5 text-sm rounded-lg text-danger hover:bg-danger/10 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
      {showCustom && (
        <input
          type="date"
          value={value || ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="input-field"
        />
      )}
    </div>
  );
}
