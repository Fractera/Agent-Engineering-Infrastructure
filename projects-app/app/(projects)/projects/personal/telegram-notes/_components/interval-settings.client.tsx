"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Cron-interval selector (step 188 Phase 4): how often the scheduled job runs — reminder
// delivery and (until the always-on listener lands in Phase 6) message polling. Writes
// the co-located cron.json schedule; fractera-cron re-reads it live. The substrate cron
// is minute-granular (5-field cron), so the floor is one minute, not 30 seconds.
const OPTIONS = [
  { schedule: "* * * * *", label: "Every minute" },
  { schedule: "*/5 * * * *", label: "Every 5 minutes" },
  { schedule: "*/15 * * * *", label: "Every 15 minutes" },
  { schedule: "*/30 * * * *", label: "Every 30 minutes" },
  { schedule: "0 * * * *", label: "Every hour" },
  { schedule: "0 */6 * * *", label: "Every 6 hours" },
  { schedule: "0 */12 * * *", label: "Every 12 hours" },
  { schedule: "0 0 * * *", label: "Once a day" },
];

export function IntervalSettings() {
  const [schedule, setSchedule] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/projects/personal/telegram-notes/settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { schedule?: string } | null) => setSchedule(d?.schedule ?? "* * * * *"))
      .catch(() => setSchedule("* * * * *"));
  }, []);

  async function change(next: string) {
    const prev = schedule;
    setSchedule(next);
    setBusy(true);
    try {
      const r = await fetch("/api/projects/personal/telegram-notes/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule: next }),
      });
      if (!r.ok) {
        setSchedule(prev);
        toast.error(`Could not update (HTTP ${r.status})`);
        return;
      }
      toast.success("Schedule updated");
    } catch {
      setSchedule(prev);
      toast.error("Could not update (network error)");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        How often the automation runs its scheduled work — delivering due reminders and
        checking for new messages. Pick whatever pace is comfortable for you: you may not
        want to be pinged every minute, and reviewing results once an hour or once a day is
        perfectly fine. This is purely for your own convenience.
      </p>
      <Select value={schedule ?? undefined} onValueChange={change} disabled={busy || schedule === null}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Loading…" />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((o) => (
            <SelectItem key={o.schedule} value={o.schedule}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        The shortest interval is one minute (the scheduler&apos;s granularity). Instant
        replies come from the always-on listener, added in a later step.
      </p>
    </div>
  );
}
