"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Zap, LayoutDashboard, Sparkles } from "lucide-react";

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3002";

const AI_TOOLS = [
  { name: "Claude Code",   color: "bg-orange-500/10 text-orange-400 border-orange-500/25" },
  { name: "Codex",         color: "bg-green-500/10  text-green-400  border-green-500/25"  },
  { name: "Gemini",        color: "bg-blue-500/10   text-blue-400   border-blue-500/25"   },
  { name: "Qwen Code",     color: "bg-violet-500/10 text-violet-400 border-violet-500/25" },
  { name: "Kimi Code",     color: "bg-cyan-500/10   text-cyan-400   border-cyan-500/25"   },
  { name: "Company Brain", color: "bg-amber-500/10  text-amber-400  border-amber-500/25"  },
];

export default function ShellPage() {
  const [appUrl, setAppUrl] = useState("");
  useEffect(() => { setAppUrl(window.location.origin); }, []);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">

      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-60 -left-60 w-[600px] h-[600px] rounded-full bg-primary/6 blur-[140px]" />
        <div className="absolute -bottom-60 -right-60 w-[600px] h-[600px] rounded-full bg-violet-500/6 blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-cyan-500/4 blur-[160px]" />
      </div>

      {/* Dot grid overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--foreground) / 0.07) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Vignette to fade grid at edges */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,transparent_40%,hsl(var(--background))_100%)]" />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center gap-9 text-center px-6 max-w-2xl w-full"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <span className="inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.18em] text-primary/80 uppercase border border-primary/20 rounded-full px-4 py-1.5 bg-primary/5 backdrop-blur-sm">
            <Sparkles size={10} />
            Production-Coding AI Server
          </span>
        </motion.div>

        {/* Wordmark + tagline */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-3"
        >
          <h1 className="text-7xl sm:text-8xl font-bold tracking-tight select-none leading-none bg-gradient-to-b from-foreground via-foreground/90 to-foreground/50 bg-clip-text text-transparent">
            Your Company App
          </h1>
          <p className="text-base text-muted-foreground max-w-md leading-relaxed">
            Your app is already live in production
            {appUrl && (
              <> at <span className="text-foreground font-mono font-medium">{appUrl}</span></>
            )}
            {" "}— a domain you can replace with your own at any time.{" "}
            Open the <span className="text-foreground font-medium">Admin Panel</span> to
            customize this page and turn it into your own product.
          </p>
        </motion.div>

        {/* AI tool pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.32, duration: 0.5 }}
          className="flex flex-wrap justify-center gap-2"
        >
          {AI_TOOLS.map((tool, i) => (
            <motion.span
              key={tool.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.34 + i * 0.07, duration: 0.35, ease: "easeOut" }}
              className={`text-[11px] font-mono px-3 py-1 rounded-full border backdrop-blur-sm ${tool.color}`}
            >
              {tool.name}
            </motion.span>
          ))}
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.45 }}
          className="flex items-center gap-3"
        >
          <a
            href={ADMIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/25"
          >
            <Zap size={14} />
            Start Coding
          </a>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 h-11 px-6 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted active:scale-95 transition-all"
          >
            <LayoutDashboard size={14} />
            Dashboard
          </a>
        </motion.div>

        {/* Footer micro-text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="text-[11px] font-mono text-muted-foreground/40 tracking-widest uppercase"
        >
          Your code &nbsp;·&nbsp; Your server &nbsp;·&nbsp; Your AI
        </motion.p>
      </motion.div>
    </main>
  );
}
