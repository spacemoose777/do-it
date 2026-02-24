"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import VoiceModal from "./VoiceModal";

interface VoiceButtonProps {
  onTaskAdded: (title: string, dueDate?: string, listName?: string) => void;
}

export default function VoiceButton({ onTaskAdded }: VoiceButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={cn(
          "fixed bottom-24 md:bottom-8 right-6 z-30",
          "w-14 h-14 rounded-full bg-accent hover:bg-accent-hover",
          "flex items-center justify-center shadow-lg shadow-accent/20",
          "transition-all duration-200 hover:scale-105 active:scale-95"
        )}
        title="Voice input"
      >
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
      </button>

      {showModal && (
        <VoiceModal
          onClose={() => setShowModal(false)}
          onTaskAdded={onTaskAdded}
        />
      )}
    </>
  );
}
