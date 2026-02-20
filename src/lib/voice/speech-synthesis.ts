// Web Speech API wrapper for text-to-speech

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function isSynthesisSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window;
}

export function speak(
  text: string,
  options?: {
    rate?: number;
    pitch?: number;
    onEnd?: () => void;
  }
): void {
  if (!isSynthesisSupported()) return;

  // Cancel any ongoing speech
  stopSpeaking();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options?.rate ?? 1;
  utterance.pitch = options?.pitch ?? 1;
  utterance.lang = "en-US";

  // Try to use a natural-sounding voice
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(
    (v) => v.lang.startsWith("en") && v.name.includes("Google")
  ) || voices.find(
    (v) => v.lang.startsWith("en") && v.localService
  );

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onend = () => {
    currentUtterance = null;
    options?.onEnd?.();
  };

  utterance.onerror = () => {
    currentUtterance = null;
    options?.onEnd?.();
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}

export function isSpeaking(): boolean {
  if (typeof window === "undefined") return false;
  return window.speechSynthesis?.speaking ?? false;
}

export function speakTaskList(tasks: { title: string }[]): void {
  if (tasks.length === 0) {
    speak("You have no tasks for today. Enjoy your free time!");
    return;
  }

  const intro = tasks.length === 1
    ? "You have 1 task for today."
    : `You have ${tasks.length} tasks for today.`;

  const taskList = tasks
    .map((t, i) => `${i + 1}. ${t.title}`)
    .join(". ");

  speak(`${intro} ${taskList}`);
}
