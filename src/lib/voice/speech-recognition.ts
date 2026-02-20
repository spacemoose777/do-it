// Web Speech API wrapper for speech recognition

type SpeechRecognitionCallback = {
  onResult: (transcript: string, isFinal: boolean) => void;
  onEnd: () => void;
  onError: (error: string) => void;
};

let recognition: any = null;

export function isRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

export function startRecognition(callbacks: SpeechRecognitionCallback): void {
  if (!isRecognitionSupported()) {
    callbacks.onError("Speech recognition is not supported in this browser");
    return;
  }

  // Stop any existing recognition
  stopRecognition();

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: any) => {
    let finalTranscript = "";
    let interimTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    if (finalTranscript) {
      callbacks.onResult(finalTranscript, true);
    } else if (interimTranscript) {
      callbacks.onResult(interimTranscript, false);
    }
  };

  recognition.onend = () => {
    recognition = null;
    callbacks.onEnd();
  };

  recognition.onerror = (event: any) => {
    const errorMessages: Record<string, string> = {
      "no-speech": "No speech detected. Please try again.",
      "audio-capture": "No microphone found. Please check your mic.",
      "not-allowed": "Microphone access denied. Please allow mic access.",
      aborted: "Speech recognition was aborted.",
      network: "Network error during recognition.",
    };
    callbacks.onError(errorMessages[event.error] || `Error: ${event.error}`);
  };

  try {
    recognition.start();
  } catch (err) {
    callbacks.onError("Failed to start speech recognition");
  }
}

export function stopRecognition(): void {
  if (recognition) {
    try {
      recognition.stop();
    } catch {
      // Already stopped
    }
    recognition = null;
  }
}

export function isRecognitionActive(): boolean {
  return recognition !== null;
}
