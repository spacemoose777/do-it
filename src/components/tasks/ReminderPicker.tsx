"use client";

import { useState } from "react";
import { addHours, addDays, setHours, setMinutes, startOfTomorrow } from "date-fns";

interface ReminderPickerProps {
  /** Called with an ISO string when the user picks a reminder time to add */
  onAdd: (isoString: string) => void;
}

export default function ReminderPicker({ onAdd }: ReminderPickerProps) {
  const [customValue, setCustomValue] = useState("");

  const quickOptions = [
    {
      label: "Later today",
      getDate: () => {
        const now = new Date();
        return addHours(setMinutes(now, 0), now.getMinutes() > 30 ? 2 : 1);
      },
    },
    {
      label: "Tomorrow morning",
      getDate: () => setHours(setMinutes(startOfTomorrow(), 0), 9),
    },
    {
      label: "Tomorrow evening",
      getDate: () => setHours(setMinutes(startOfTomorrow(), 0), 18),
    },
    {
      label: "In 3 days",
      getDate: () => setHours(setMinutes(addDays(new Date(), 3), 0), 9),
    },
  ];

  const handleCustomAdd = () => {
    if (customValue) {
      onAdd(new Date(customValue).toISOString());
      setCustomValue("");
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-secondary">Add a reminder</p>

      <div className="flex flex-wrap gap-2">
        {quickOptions.map((opt) => (
          <button
            key={opt.label}
            onClick={() => onAdd(opt.getDate().toISOString())}
            className="px-3 py-1.5 text-sm rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="datetime-local"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          className="input-field text-sm flex-1"
        />
        <button
          onClick={handleCustomAdd}
          disabled={!customValue}
          className="btn-primary text-sm px-4 disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}
