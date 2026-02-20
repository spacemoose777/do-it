export type VoiceCommandType = "add_task" | "read_my_day" | "whats_next" | "unknown";

export interface VoiceCommand {
  type: VoiceCommandType;
  rawText: string;
  taskTitle?: string;
  dueDate?: string;
  listName?: string;
}

export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
}
