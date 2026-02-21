"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { LIST_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, color: string) => void;
}

export default function CreateListModal({ isOpen, onClose, onCreate }: CreateListModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(LIST_COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, color);
    setName("");
    setColor(LIST_COLORS[0]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New List">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="List name"
          className="input-field"
          autoFocus
          required
        />

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Color
          </label>
          <div className="flex gap-2">
            {LIST_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  "w-8 h-8 rounded-full transition-transform",
                  color === c && "ring-2 ring-offset-2 ring-offset-bg-secondary ring-accent scale-110"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={!name.trim()}>
            Create List
          </button>
        </div>
      </form>
    </Modal>
  );
}
