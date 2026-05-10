"use client";

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3002";

export default function ShellPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 text-center px-8 max-w-lg">

        <span className="text-xs font-mono tracking-widest text-muted-foreground uppercase border border-border rounded-full px-4 py-1">
          Welcome
        </span>

        <div className="flex flex-col items-center gap-1">
          <h1 className="text-5xl font-bold tracking-tight select-none text-foreground">
            Fractera
          </h1>
          <p className="text-sm font-mono tracking-wider text-muted-foreground uppercase">
            Production-Coding AI Platform
          </p>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Claude Code, Codex, Gemini, Qwen Code, Kimi Code and Company Brain (LightRAG)
          are waiting inside — ready to build your apps in minutes,
          with no dependency on cloud providers.
          <br /><br />
          <span className="text-foreground font-medium">Your code. Your server. Your AI.</span>
        </p>

        <div className="flex items-center gap-2">
          <a
            href={ADMIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md border border-border text-sm text-foreground hover:bg-muted transition-colors"
          >
            Start Coding ↗
          </a>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md border border-border text-sm text-foreground hover:bg-muted transition-colors"
          >
            Dashboard
          </a>
        </div>

      </div>
    </main>
  );
}
