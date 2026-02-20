"use client";

import { format, addHours, addDays, setHours, setMinutes, startOfTomorrow } from "date-fns";
import { formatReminderDate } from "@/lib/date-utils";

interface ReminderPickerProps {
  value: string | null;
  onChange: (reminder: string | null) => void;
}

export default function ReminderPicker({ value, onChange }: ReminderPickerProps) {
  const quickOptions = [
    {
      label: "Later today",
      getDate: () => {
        const now = new Date();
        const rounded = addHours(setMinutes(now, 0), now.getMinutes() > 30 ? 2 : 1);
        return rounded;
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

  return (
    <div className="space-y-3">
      {value && (
        <div className="flex items-center justify-between px-3 py-2 bg-accent/10 rounded-lg">
          <span className="text-sm text-accent">{formatReminderDate(value)}</span>
          <button
            onClick={() => onChange(null)}
            className="text-xs text-danger hover:text-danger/80"
          >
            Remove
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {quickOptions.map((opt) => (
          <button
            key={opt.label}
            onClick={() => onChange(opt.getDate().toISOString())}
            className="px-3 py-1.5 text-sm rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-xs text-text-secondary mb-1">Custom date & time</label>
        <input
          type="datetime-local"
          value={value ? format(new Date(value), "yyyy-MM-dd'T'HH:mm") : ""}
          onChange={(e) => {
            if (e.target.value) {
              onChange(new Date(e.target.value).toISOString());
            }
          }}
          className="input-field text-sm"
        />
      </div>
    </div>
  );
}
