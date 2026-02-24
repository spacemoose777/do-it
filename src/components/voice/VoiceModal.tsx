"use client";

import { useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useVoice } from "@/hooks/useVoice";
import { useTasks } from "@/hooks/useTasks";
import { speakTaskList } from "@/lib/voice/speech-synthesis";
import VoiceTranscript from "./VoiceTranscript";
import VoiceWaveform from "./VoiceWaveform";
import type { VoiceCommand } from "@/types/voice";

interface VoiceModalProps {
  onClose: () => void;
  onTaskAdded: (title: string, dueDate?: string, listName?: string) => void;
}

export default function VoiceModal({ onClose, onTaskAdded }: VoiceModalProps) {
  const { tasks: myDayTasks } = useTasks({ myDay: true });

  const handleCommand = useCallback((command: VoiceCommand) => {
    switch (command.type) {
      case "add_task":
        if (command.taskTitle) {
          onTaskAdded(command.taskTitle, command.dueDate, command.listName);
        }
        break;
      case "read_my_day":
        speakTaskList(myDayTasks);
        break;
      case "whats_next":
        if (myDayTasks.length > 0) {
          const next = myDayTasks[0];
          speakTaskList([next]);
        } else {
          speakTaskList([]);
        }
        break;
    }
  }, [myDayTasks, onTaskAdded]);

  const {
    isListening,
    isSpeaking,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    clearError,
  } = useVoice({ onCommand: handleCommand });

  // Auto-start listening when modal opens
  useEffect(() => {
    if (isSupported) {
      const timer = setTimeout(startListening, 300);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/95 animate-fade-in">
      <div className="w-full max-w-md px-6 text-center">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-bg-tertiary rounded-xl transition-colors"
        >
          <svg className="w-6 h-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {!isSupported ? (
          <div className="space-y-4">
            <svg className="w-16 h-16 text-text-secondary mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            <p className="text-text-secondary">
              Speech recognition is not supported in this browser. Please use Chrome on Android or Desktop.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Mic button */}
            <div className="relative inline-flex items-center justify-center">
              {isListening && (
                <div className="absolute inset-0 w-32 h-32 rounded-full bg-accent/20 animate-pulse-ring" />
              )}
              <button
                onClick={isListening ? stopListening : startListening}
                className={cn(
                  "relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200",
                  isListening
                    ? "bg-danger hover:bg-danger/80 scale-110"
                    : "bg-accent hover:bg-accent-hover"
                )}
              >
                {isListening ? (
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
                  </svg>
                ) : (
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Waveform */}
            {isListening && <VoiceWaveform />}

            {/* Status text */}
            <p className="text-sm text-text-secondary">
              {isListening
                ? "Listening... Speak now"
                : isSpeaking
                  ? "Speaking..."
                  : "Tap the mic to start"}
            </p>

            {/* Transcript */}
            <VoiceTranscript
              transcript={transcript}
              interimTranscript={interimTranscript}
            />

            {/* Error */}
            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3">
                {error}
                <button onClick={clearError} className="ml-2 underline">
                  Dismiss
                </button>
              </div>
            )}

            {/* Hints */}
            <div className="text-xs text-text-secondary/60 space-y-1">
              <p>Try saying:</p>
              <p>&ldquo;Buy apples, list: Shopping&rdquo;</p>
              <p>&ldquo;Buy groceries tomorrow&rdquo;</p>
              <p>&ldquo;Read my day&rdquo;</p>
              <p>&ldquo;What&apos;s next&rdquo;</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
