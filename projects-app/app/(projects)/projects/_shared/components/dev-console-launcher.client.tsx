"use client";

import { useEffect, useState } from "react";
import { Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUiLang } from "../use-ui-lang";
import { waveStrings } from "../wave-i18n";
import { DevConsole } from "./dev-console.client";

// THE DEV CONSOLE LAUNCHER (step 298) — mounted ONCE in the projects-zone layout. It opens the SHARED dev
// console (terminal + PTY :3201 + rooms) for a version-2 automation.
//
// WHY HERE AND NOT IN THE AUTOMATION FOLDER (law 0). The console, the terminal, the PTY bridge and the
// rooms are shared projects-level infrastructure — no single automation folder can own them. A v2
// automation's own page (its notification banner, inside the self-contained folder) only DISPATCHES a DOM
// event, `fractera:launch-development`, carrying its slug. This zone-level listener catches it, fetches the
// v2 dev room (folder + mandate) and opens the console. So the self-contained folder imports nothing outside
// itself, and the shared console is reached without breaking the law.
//
// The launch button in the banner is the SAME "Launch development" the owner already knows from v1; here it
// finally reaches the real terminal instead of the placeholder.
const EVENT = "fractera:launch-development";

type Room = { roomPath: string; roomTask: string };

export function DevConsoleLauncher() {
  const lang = useUiLang();
  const L = waveStrings(lang); // reuse v1 strings (bannerLaunch) — no new translations
  const [open, setOpen] = useState(false);
  const [automation, setAutomation] = useState("");
  const [room, setRoom] = useState<Room | null>(null);

  useEffect(() => {
    const onLaunch = (e: Event) => {
      const detail = (e as CustomEvent).detail as { automation?: string } | undefined;
      const a = detail?.automation?.trim();
      if (!a) return;
      setAutomation(a);
      setRoom(null);
      setOpen(true);
      fetch(`/api/projects/dev-room?automation=${encodeURIComponent(a)}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((d: Room) => setRoom(d))
        .catch(() => { toast.error(L.postponeFailed); setOpen(false); });
    };
    window.addEventListener(EVENT, onLaunch);
    return () => window.removeEventListener(EVENT, onLaunch);
    // L is derived from lang; the toast text is only read at fire time — no need to re-bind the listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  return (
    // Esc / outside-click must NEVER kill a live agent session (v1 rule, start-development): Escape belongs
    // to the terminal (Claude Code interrupts with it). The X, Exit and Cancel are the only doors.
    <Dialog open={open} onOpenChange={(v) => { if (!v) setOpen(false); }}>
      <DialogContent
        className="flex max-h-[92vh] flex-col overflow-hidden sm:max-w-5xl"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="size-4" /> {L.bannerLaunch}
          </DialogTitle>
        </DialogHeader>
        {room ? (
          <DevConsole
            automation={automation}
            roomPath={room.roomPath}
            roomTask={room.roomTask}
            lang={lang}
            onExited={() => setOpen(false)}
          />
        ) : (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {L.bannerLaunch}…
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
