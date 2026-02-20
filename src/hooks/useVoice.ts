"use client";

import { useState, useCallback, useRef } from "react";
import {
  startRecognition,
  stopRecognition,
  isRecognitionSupported,
} from "@/lib/voice/speech-recognition";
import { speak, stopSpeaking, isSynthesisSupported } from "@/lib/voice/speech-synthesis";
import { parseVoiceInput } from "@/lib/voice/voice-parser";
import type { VoiceState, VoiceCommand } from "@/types/voice";

interface UseVoiceOptions {
  onCommand: (command: VoiceCommand) => void;
}

export function useVoice({ onCommand }: UseVoiceOptions) {
  const [state, setState] = useState<VoiceState>({
    isListening: false,
    isSpeaking: false,
    transcript: "",
    interimTranscript: "",
    error: null,
    isSupported: typeof window !== "undefined" && isRecognitionSupported(),
  });

  const commandRef = useRef(onCommand);
  commandRef.current = onCommand;

  const startListening = useCallback(() => {
    // Stop any current speech
    stopSpeaking();

    setState((prev) => ({
      ...prev,
      isListening: true,
      transcript: "",
      interimTranscript: "",
      error: null,
    }));

    startRecognition({
      onResult: (transcript, isFinal) => {
        if (isFinal) {
          setState((prev) => ({
            ...prev,
            transcript,
            interimTranscript: "",
          }));
          // Parse and execute the command
          const command = parseVoiceInput(transcript);
          commandRef.current(command);
        } else {
          setState((prev) => ({
            ...prev,
            interimTranscript: transcript,
          }));
        }
      },
      onEnd: () => {
        setState((prev) => ({
          ...prev,
          isListening: false,
        }));
      },
      onError: (error) => {
        setState((prev) => ({
          ...prev,
          isListening: false,
          error,
        }));
      },
    });
  }, []);

  const stopListening = useCallback(() => {
    stopRecognition();
    setState((prev) => ({
      ...prev,
      isListening: false,
    }));
  }, []);

  const speakText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, isSpeaking: true }));
    speak(text, {
      onEnd: () => {
        setState((prev) => ({ ...prev, isSpeaking: false }));
      },
    });
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    speakText,
    clearError,
  };
}
