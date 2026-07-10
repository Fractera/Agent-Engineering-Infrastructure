"use client";

import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Rocket, Send } from "lucide-react";
import { USE_CASES, UPDATE_LOGIC_TEXT, UPDATE_LOGIC_STEPS } from "../_data/use-cases";

// Use-cases accordion (step 207.10 items 4 & 6; step 207.16 adds the "How to update the logic" walkthrough:
// a button with the owner's canonical text verbatim + a fuller accordion item carrying the same text
// step-by-step and the automation's REAL Telegram link, resolved live via the bot-link route).
export function UseCasesAccordion() {
  // The automation's real t.me link — same bot identity the footer deep-links use. Null → link hidden.
  const [botLink, setBotLink] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/projects/personal/telegram-notes/bot-link", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.link) setBotLink(String(d.link)); })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-3">
      <Accordion type="single" collapsible defaultValue={USE_CASES[0]?.id} className="rounded-lg border px-4">
        {USE_CASES.map((u) => (
          <AccordionItem key={u.id} value={u.id}>
            <AccordionTrigger className="text-left">
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">{u.title}</span>
                <span className="text-xs font-normal text-muted-foreground">{u.summary}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
                {u.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </AccordionContent>
          </AccordionItem>
        ))}
        <AccordionItem value="update-logic">
          <AccordionTrigger className="text-left">
            <span className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 font-medium">
                <Rocket size={14} className="text-primary" />
                How to update the logic
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                Hand your change to a coding agent — step by step.
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
              {UPDATE_LOGIC_STEPS.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            {botLink && (
              <a
                href={botLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4"
              >
                <Send size={14} />
                Open this project’s Telegram chat
              </a>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      {/* The button (owner requirement): one tap → the canonical "how to update the logic" text, verbatim. */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Rocket size={14} />
            How to update the logic
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>How to update the logic</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-relaxed text-muted-foreground">{UPDATE_LOGIC_TEXT}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
