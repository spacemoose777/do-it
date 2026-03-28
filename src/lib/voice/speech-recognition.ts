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

  // Track the complete final transcript across all onresult events.
  // We delay firing the final callback until onend so the full utterance
  // is always available — some mobile browsers fire a "final" onresult
  // mid-sentence before the utterance is complete, which caused words to
  // be cut off the end of the task title.
  let finalTranscriptAccumulated = "";
  const thisRecognition = recognition;

  recognition.onresult = (event: any) => {
    // Always iterate from 0 (not event.resultIndex) so we capture the full
    // transcript even if resultIndex > 0 on some mobile browsers, which was
    // causing words to be cut off the start/middle of the task title.
    let finalText = "";
    let interimText = "";

    for (let i = 0; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalText += t;
      } else {
        interimText += t;
      }
    }

    finalTranscriptAccumulated = finalText;

    // Report combined text for live display only — always as interim so we
    // don't trigger the command until onend fires with the full utterance.
    const displayText = finalText + interimText;
    if (displayText) {
      callbacks.onResult(displayText, false);
    }
  };

  recognition.onend = () => {
    // Only clear the module-level ref if it still points to THIS instance.
    // If the modal was closed and reopened quickly, a new instance may already
    // be running — we must not null it out.
    if (recognition === thisRecognition) recognition = null;
    // Fire the final command here, after the full utterance is complete.
    if (finalTranscriptAccumulated) {
      callbacks.onResult(finalTranscriptAccumulated, true);
    }
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
