"use client";

import { useCallback } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useTaskLists } from "@/hooks/useTaskLists";
import { useVoice } from "@/hooks/useVoice";
import { useToast } from "@/contexts/ToastContext";
import { speakTaskList } from "@/lib/voice/speech-synthesis";
import VoiceWaveform from "@/components/voice/VoiceWaveform";
import VoiceTranscript from "@/components/voice/VoiceTranscript";
import { cn } from "@/lib/utils";
import type { VoiceCommand } from "@/types/voice";

export default function VoicePage() {
  const { tasks: myDayTasks, createTask } = useTasks({ myDay: true });
  const { getDefaultList } = useTaskLists();
  const { showToast } = useToast();

  const handleCommand = useCallback(async (command: VoiceCommand) => {
    switch (command.type) {
      case "add_task":
        if (command.taskTitle) {
          const defaultList = getDefaultList();
          if (defaultList) {
            await createTask({
              title: command.taskTitle,
              list_id: defaultList.id,
              is_my_day: true,
              due_date: command.dueDate || null,
            });
            showToast(`Added: ${command.taskTitle}`, "success");
          }
        }
        break;
      case "read_my_day":
        speakTaskList(myDayTasks);
        break;
      case "whats_next":
        if (myDayTasks.length > 0) {
          speakTaskList([myDayTasks[0]]);
        } else {
          speakTaskList([]);
        }
        break;
    }
  }, [myDayTasks, createTask, getDefaultList, showToast]);

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

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-xl font-bold text-text-primary mb-8">Voice Input</h1>

      {!isSupported ? (
        <p className="text-text-secondary">
          Speech recognition is not supported. Please use Chrome.
        </p>
      ) : (
        <div className="space-y-8 w-full max-w-md">
          {/* Large mic button */}
          <div className="relative inline-flex items-center justify-center mx-auto">
            {isListening && (
              <div className="absolute w-40 h-40 rounded-full bg-accent/20 animate-pulse-ring" />
            )}
            <button
              onClick={isListening ? stopListening : startListening}
              className={cn(
                "relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-200",
                isListening
                  ? "bg-danger hover:bg-danger/80 scale-110"
                  : "bg-accent hover:bg-accent-hover"
              )}
            >
              {isListening ? (
                <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
                </svg>
              ) : (
                <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
          </div>

          {isListening && <VoiceWaveform />}

          <p className="text-sm text-text-secondary">
            {isListening
              ? "Listening..."
              : isSpeaking
                ? "Speaking..."
                : "Tap to speak"}
          </p>

          <VoiceTranscript
            transcript={transcript}
            interimTranscript={interimTranscript}
          />

          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3">
              {error}
              <button onClick={clearError} className="ml-2 underline">Dismiss</button>
            </div>
          )}

          <div className="text-xs text-text-secondary/60 space-y-1 mt-8">
            <p className="font-medium text-text-secondary mb-2">Voice commands:</p>
            <p>&ldquo;Buy groceries tomorrow&rdquo; — adds task with due date</p>
            <p>&ldquo;Read my day&rdquo; — reads your tasks aloud</p>
            <p>&ldquo;What&apos;s next&rdquo; — reads the next task</p>
          </div>
        </div>
      )}
    </div>
  );
}
