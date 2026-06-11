"use client"

import { Blocks, LayoutTemplate, Palette, MousePointerClick, ShieldAlert } from "lucide-react"

// P0/P1 scaffold — rich intro header (persists into later sub-steps) plus a
// placeholder body. The left tree, right detail panel, add flow and live-polling
// land in P2–P9, mirroring /architecture and /development-steps. Filesystem-backed
// (PATTERNS/), no DB.
export function PatternsApp() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex items-start gap-3">
          <Blocks size={22} className="mt-0.5 shrink-0 text-amber-500" />
          <div className="space-y-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Patterns &amp; Anti-patterns</h1>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                A reuse library the AI consults while it builds. A <span className="font-medium text-foreground">pattern</span> is
                a proven, reusable piece of code — a button style, a whole section, a brandbook rule — so the model
                builds the next one by reusing or extending what already works instead of re-deriving it each time.
                Patterns are skills&rsquo; counterpart: a skill is <em>how the model thinks</em>; a pattern is{" "}
                <em>what it reuses</em>. Everything lives as real files under{" "}
                <code className="rounded bg-muted px-1 font-mono text-xs">PATTERNS/</code> — the same filesystem-as-source
                model as Architecture and Development steps.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Blocks size={14} className="text-amber-500" />
                  Patterns
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  A one-level tree, grouped by category. The model files each reusable example under one of them and
                  pulls it back when building something similar.
                </p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-1.5"><MousePointerClick size={12} className="text-amber-500" /> UI Elements — buttons, inputs, custom element styles &amp; animations</li>
                  <li className="flex items-center gap-1.5"><LayoutTemplate size={12} className="text-amber-500" /> Sections — ready blocks like reviews or FAQ</li>
                  <li className="flex items-center gap-1.5"><Palette size={12} className="text-amber-500" /> Brandbook — H1/H2 rules, backgrounds, the shared look</li>
                </ul>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldAlert size={14} className="text-amber-500" />
                  Anti-patterns
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  A flat list of deployment pitfalls — mistakes that bite during a deploy. The model reads these
                  <span className="whitespace-nowrap"> before it deploys</span> so it doesn&rsquo;t repeat them.
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Two stages, like Architecture:</span> you don&rsquo;t spell out
                  how a pattern should look — you just request one, and an agent generates it. A requested-but-unbuilt
                  entry shows{" "}
                  <span className="font-medium text-amber-600">orange with a&nbsp;(req)&nbsp;badge</span>; an existing entry
                  with pending work keeps a black title and a&nbsp;(req)&nbsp;badge; a settled one is plain black.
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-8 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          The pattern tree and editor are coming online.
        </div>
      </div>
    </main>
  )
}
