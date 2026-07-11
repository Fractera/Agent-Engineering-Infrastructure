"use client"

import { useState } from "react"
import { Check, Copy, Rocket, Trash2 } from "lucide-react"

// The post-Launch toast (step 210). Deliberately NOT dismissible until the
// message is copied: the development step now holds the spec (the records were
// cleared from /architecture), and this message is the only handoff artifact —
// the user must carry it to a coding agent. No close button, no backdrop close;
// Copy enables Done.

export type LaunchToastData = {
  kind: "launch" | "dismantle"
  /** page | project — what the node was, for the message wording. */
  what: "page" | "project"
  path: string
  stepNumber: number
}

export function launchToastMessage(d: LaunchToastData): string {
  const action = d.kind === "dismantle" ? "a dismantling order" : "an improvement"
  return (
    `For the ${d.what} ${d.path}, ${action} has been created as development step #${d.stepNumber}. ` +
    `Study step #${d.stepNumber} (DEVELOPMENT-STEPS/NEW-STEPS/), run the planning phase, and implement the task. ` +
    `When you have exhaustive planning results, ask your questions in the chat if anything is unclear.`
  )
}

export function LaunchToast({ data, onDone }: { data: LaunchToastData; onDone: () => void }) {
  const [copied, setCopied] = useState(false)
  const message = launchToastMessage(data)

  async function copy() {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
    } catch {
      // Clipboard API unavailable (plain-HTTP IP mode) — fall back to a manual
      // selection prompt so the gate can still be passed.
      window.prompt("Copy this message (Ctrl+C), then press OK:", message)
      setCopied(true)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-xl">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          {data.kind === "dismantle"
            ? <Trash2 size={14} className="text-red-600" />
            : <Rocket size={14} className="text-violet-600" />}
          Development step #{data.stepNumber} created
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-foreground/80">
          Choose your coding agent, activate its subscription, paste this message into
          its chat and run it. This toast closes only after the message is copied.
        </p>
        <div className="mt-3 rounded-md border border-border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed text-foreground">
          {message}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={copy}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-foreground/40 px-3 text-xs font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Copied" : "Copy message"}
          </button>
          <button
            onClick={onDone}
            disabled={!copied}
            className="inline-flex h-7 items-center rounded-md bg-foreground px-3 text-xs font-semibold text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
