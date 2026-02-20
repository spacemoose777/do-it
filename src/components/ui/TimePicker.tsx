"use client";

interface TimePickerProps {
  value: string | null;
  onChange: (time: string | null) => void;
  label?: string;
}

export default function TimePicker({ value, onChange, label }: TimePickerProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-2">{label}</label>
      )}
      <div className="flex gap-2">
        <input
          type="time"
          value={value || ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="input-field flex-1"
        />
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
    </div>
  );
}
