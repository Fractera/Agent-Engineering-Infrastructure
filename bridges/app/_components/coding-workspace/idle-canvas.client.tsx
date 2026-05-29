"use client";

// Placeholder background shown when no embed (Brain/Memory), no terminal
// platform and no Site Preview are active. Keeps the workspace area from
// looking broken on a clean start.
export function IdleCanvas() {
  return (
    <div className="flex items-center justify-center w-full h-full bg-background select-none">
      <style>{`
        @keyframes fractera-pulse {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50%      { opacity: 0.85; transform: scale(1.02); }
        }
        @keyframes fractera-gradient {
          0%, 100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        .fractera-wordmark {
          font-size: clamp(40px, 8vw, 96px);
          font-weight: 800;
          letter-spacing: 0.18em;
          background: linear-gradient(
            90deg,
            hsl(var(--primary) / 0.9),
            hsl(var(--foreground) / 0.5),
            hsl(var(--primary) / 0.9)
          );
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: fractera-gradient 6s ease-in-out infinite, fractera-pulse 4s ease-in-out infinite;
        }
      `}</style>
      <div className="fractera-wordmark">FRACTERA</div>
    </div>
  );
}
