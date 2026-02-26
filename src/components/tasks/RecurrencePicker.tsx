"use client";

import { useState } from "react";
import { RECURRENCE_PRESETS } from "@/lib/constants";
import type { RecurrenceRule } from "@/types/task";

interface RecurrencePickerProps {
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
type CustomUnit = "days" | "weeks" | "months" | "years";

function unitFromRule(rule: RecurrenceRule | null): CustomUnit {
  if (!rule) return "days";
  if (rule.type === "weekly") return "weeks";
  if (rule.type === "monthly") return "months";
  if (rule.type === "yearly") return "years";
  return "days";
}

export default function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const isCustom = !!value && (value.type === "custom" || (value.interval ?? 1) > 1);
  const [showCustom, setShowCustom] = useState(isCustom);
  const [customInterval, setCustomInterval] = useState(String(value?.interval || 1));
  const [customUnit, setCustomUnit] = useState<CustomUnit>(unitFromRule(value));
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
    const interval = Math.max(1, parseInt(customInterval) || 1);
    let type: RecurrenceRule["type"];
    switch (customUnit) {
      case "weeks":  type = "weekly";  break;
      case "months": type = "monthly"; break;
      case "years":  type = "yearly";  break;
      default:       type = "custom";  break;
    }
    onChange({
      type,
      interval,
      ...(customUnit === "weeks" && customDays.length > 0 ? { daysOfWeek: customDays } : {}),
    });
    setShowCustom(false);
  };

  const toggleDay = (day: number) => {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  // A preset is "active" only when it matches the type AND interval is 1 (preset default)
  const isPresetActive = (presetValue: string) =>
    value?.type === presetValue && (value?.interval ?? 1) === 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {RECURRENCE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => handlePreset(preset.value)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              preset.value !== "custom" && isPresetActive(preset.value)
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
              max={999}
              value={customInterval}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "" || /^\d+$/.test(raw)) setCustomInterval(raw);
              }}
              className="w-16 input-field text-center text-sm"
            />
            <select
              value={customUnit}
              onChange={(e) => {
                setCustomUnit(e.target.value as CustomUnit);
                setCustomDays([]);
              }}
              className="input-field text-sm"
            >
              <option value="days">days</option>
              <option value="weeks">weeks</option>
              <option value="months">months</option>
              <option value="years">years</option>
            </select>
          </div>

          {customUnit === "weeks" && (
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
          )}

          <button onClick={handleCustomSave} className="btn-primary text-sm w-full">
            Save Custom Recurrence
          </button>
        </div>
      )}
    </div>
  );
}
