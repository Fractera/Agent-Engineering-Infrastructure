"use client";

// Background shown when no embed (Brain/Memory), no terminal and no Site
// Preview are open. Hard-coded black + animated FRACTERA wordmark so it
// always looks the same regardless of system theme (the rest of admin
// follows the user's light/dark preference; this is the brand canvas).
export function IdleCanvas() {
  return (
    <div
      className="flex items-center justify-center w-full h-full select-none"
      style={{ background: "#000" }}
    >
      <style>{`
        @keyframes fractera-pulse {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50%      { opacity: 0.95; transform: scale(1.02); }
        }
        @keyframes fractera-gradient {
          0%, 100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        .fractera-wordmark {
          font-size: clamp(40px, 8vw, 120px);
          font-weight: 800;
          letter-spacing: 0.22em;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.95),
            rgba(124, 58, 237, 0.85),
            rgba(255, 255, 255, 0.95)
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
