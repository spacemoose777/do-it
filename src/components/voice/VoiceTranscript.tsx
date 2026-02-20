"use client";

interface VoiceTranscriptProps {
  transcript: string;
  interimTranscript: string;
}

export default function VoiceTranscript({ transcript, interimTranscript }: VoiceTranscriptProps) {
  if (!transcript && !interimTranscript) return null;

  return (
    <div className="bg-bg-secondary rounded-xl px-5 py-4 min-h-[60px] flex items-center justify-center">
      {transcript ? (
        <p className="text-lg text-text-primary font-medium animate-fade-in">
          {transcript}
        </p>
      ) : (
        <p className="text-lg text-text-secondary/60 italic animate-fade-in">
          {interimTranscript}
        </p>
      )}
    </div>
  );
}
