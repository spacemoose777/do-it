"use client";

export default function VoiceWaveform() {
  return (
    <div className="flex items-center justify-center gap-1 h-8">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="w-1 bg-accent rounded-full"
          style={{
            animation: `waveform 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.15}s`,
            height: "8px",
          }}
        />
      ))}
      <style jsx>{`
        @keyframes waveform {
          0%, 100% {
            height: 8px;
            opacity: 0.4;
          }
          50% {
            height: 32px;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
