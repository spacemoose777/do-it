"use client";

import { useState } from "react";
import { RECURRENCE_PRESETS } from "@/lib/constants";
import type { RecurrenceRule } from "@/types/task";

interface RecurrencePickerProps {
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customInterval, setCustomInterval] = useState(value?.interval || 1);
  const [customDays, setCustomDays] = useState<number[]>(value?.daysOfWeek || []);

  const handlePreset = (type: string) => {
    if (type === "custom") {
      setShowCustom(true);
      return;
    }
    onChange({
      type: type as RecurrenceRule["type"],
      interval: 1,
    });
    setShowCustom(false);
  };

  const handleCustomSave = () => {
    onChange({
      type: "custom",
      interval: customInterval,
      daysOfWeek: customDays.length > 0 ? customDays : undefined,
    });
    setShowCustom(false);
  };

  const toggleDay = (day: number) => {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {RECURRENCE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => handlePreset(preset.value)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              value?.type === preset.value
                ? "bg-accent text-white"
                : "bg-bg-tertiary text-text-secondary hover:text-text-primary"
            }`}
          >
            {preset.label}
          </button>
        ))}
        {value && (
          <button
            onClick={() => onChange(null)}
            className="px-3 py-1.5 text-sm rounded-lg text-danger hover:bg-danger/10 transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      {showCustom && (
        <div className="space-y-3 p-3 bg-bg-tertiary rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">Every</span>
            <input
              type="number"
              min={1}
              max={365}
              value={customInterval}
              onChange={(e) => setCustomInterval(parseInt(e.target.value) || 1)}
              className="w-16 input-field text-center text-sm"
            />
            <span className="text-sm text-text-secondary">days</span>
          </div>

          <div>
            <p className="text-xs text-text-secondary mb-2">On specific days (optional):</p>
            <div className="flex gap-1">
              {DAY_NAMES.map((name, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={`w-9 h-9 rounded-full text-xs font-medium transition-colors ${
                    customDays.includes(i)
                      ? "bg-accent text-white"
                      : "bg-bg-secondary text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleCustomSave} className="btn-primary text-sm w-full">
            Save Custom Recurrence
          </button>
        </div>
      )}
    </div>
  );
}
