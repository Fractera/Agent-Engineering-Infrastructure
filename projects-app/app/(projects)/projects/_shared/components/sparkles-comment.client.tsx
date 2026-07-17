"use client";

import { useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useUiLang } from "../use-ui-lang";
import { VoiceInput } from "./voice-input.client";
import { StartDevelopment } from "./start-development.client";

// THE SPARKLES COMMENT (step 249, owner's request) — the entry point for the owner who does NOT know which
// node or entity to fix: he only knows what he dislikes. The ✦ button next to the automation menu opens a
// free-text (voice-enabled) box; the comment becomes the rawRequest of the automation-wide `general` entity
// (ONE carrier — the same transport every requirement uses, so it joins the staged set and the delta task
// automatically; a new comment APPENDS to a pending one, never a second store). "Send to development" then
// opens the same two-button hand-off dialog as the banner's launch.
type SC = {
  aria: string; title: string; intro: string; placeholder: string;
  send: string; sending: string; saved: string; failed: string;
};
const I18N: Record<string, SC> = {
  en: { aria: "Comment for development", title: "What should be different?", intro: "Describe in your own words what you dislike or want changed — the coding agent will work out where the fix belongs.", placeholder: "E.g.: the morning summary arrives without event times — I want each event to show when it starts…", send: "Send to development", sending: "Saving…", saved: "Comment saved — it is now part of the staged changes.", failed: "Could not save the comment." },
  ru: { aria: "Комментарий в разработку", title: "Что должно быть иначе?", intro: "Опишите своими словами, что вам не нравится или что хотите изменить — агент-программист сам разберётся, где это чинить.", placeholder: "Например: утренняя сводка приходит без времени событий — хочу видеть, когда начинается каждое…", send: "Отправить в разработку", sending: "Сохраняю…", saved: "Комментарий сохранён — теперь он в списке изменений на разработку.", failed: "Не удалось сохранить комментарий." },
  es: { aria: "Comentario para desarrollo", title: "¿Qué debería ser diferente?", intro: "Describe con tus palabras qué no te gusta o qué quieres cambiar — el agente de código averiguará dónde va el arreglo.", placeholder: "Por ejemplo: el resumen matinal llega sin la hora de los eventos — quiero ver cuándo empieza cada uno…", send: "Enviar a desarrollo", sending: "Guardando…", saved: "Comentario guardado — ya forma parte de los cambios pendientes.", failed: "No se pudo guardar el comentario." },
  fr: { aria: "Commentaire pour le développement", title: "Qu'est-ce qui devrait être différent ?", intro: "Décrivez avec vos mots ce qui ne vous plaît pas ou ce que vous voulez changer — l'agent de code trouvera où va le correctif.", placeholder: "Par exemple : le résumé du matin arrive sans l'heure des événements — je veux voir quand chacun commence…", send: "Envoyer en développement", sending: "Enregistrement…", saved: "Commentaire enregistré — il fait maintenant partie des changements en attente.", failed: "Impossible d'enregistrer le commentaire." },
  it: { aria: "Commento per lo sviluppo", title: "Cosa dovrebbe essere diverso?", intro: "Descrivi con parole tue cosa non ti piace o cosa vuoi cambiare — l'agente di codice capirà dove va la correzione.", placeholder: "Ad esempio: il riepilogo mattutino arriva senza l'orario degli eventi — voglio vedere quando inizia ciascuno…", send: "Invia allo sviluppo", sending: "Salvataggio…", saved: "Commento salvato — ora fa parte delle modifiche in attesa.", failed: "Impossibile salvare il commento." },
  de: { aria: "Kommentar für die Entwicklung", title: "Was soll anders sein?", intro: "Beschreibe mit deinen Worten, was dir nicht gefällt oder was du ändern willst — der Coding-Agent findet heraus, wohin der Fix gehört.", placeholder: "Z. B.: die Morgenzusammenfassung kommt ohne Uhrzeiten — ich will sehen, wann jeder Termin beginnt…", send: "In die Entwicklung senden", sending: "Speichere…", saved: "Kommentar gespeichert — er gehört jetzt zu den vorgemerkten Änderungen.", failed: "Der Kommentar konnte nicht gespeichert werden." },
  pt: { aria: "Comentário para desenvolvimento", title: "O que deveria ser diferente?", intro: "Descreva com as suas palavras o que não gosta ou o que quer mudar — o agente de código descobrirá onde entra a correção.", placeholder: "Por exemplo: o resumo da manhã chega sem a hora dos eventos — quero ver quando cada um começa…", send: "Enviar para desenvolvimento", sending: "A guardar…", saved: "Comentário guardado — já faz parte das alterações pendentes.", failed: "Não foi possível guardar o comentário." },
  pl: { aria: "Komentarz do rozwoju", title: "Co powinno być inaczej?", intro: "Opisz własnymi słowami, co ci się nie podoba lub co chcesz zmienić — agent kodujący sam ustali, gdzie należy poprawka.", placeholder: "Np.: poranne podsumowanie przychodzi bez godzin wydarzeń — chcę widzieć, kiedy każde się zaczyna…", send: "Wyślij do rozwoju", sending: "Zapisuję…", saved: "Komentarz zapisany — jest już częścią oczekujących zmian.", failed: "Nie udało się zapisać komentarza." },
  tr: { aria: "Geliştirme için yorum", title: "Ne farklı olmalı?", intro: "Neyi beğenmediğinizi veya neyin değişmesini istediğinizi kendi sözlerinizle anlatın — düzeltmenin nereye ait olduğunu kod ajanı bulur.", placeholder: "Örneğin: sabah özeti etkinlik saatleri olmadan geliyor — her birinin ne zaman başladığını görmek istiyorum…", send: "Geliştirmeye gönder", sending: "Kaydediliyor…", saved: "Yorum kaydedildi — artık bekleyen değişikliklerin bir parçası.", failed: "Yorum kaydedilemedi." },
  nl: { aria: "Opmerking voor ontwikkeling", title: "Wat zou anders moeten?", intro: "Beschrijf in je eigen woorden wat je niet bevalt of wat je wilt veranderen — de coding agent zoekt zelf uit waar de fix hoort.", placeholder: "Bijv.: de ochtendsamenvatting komt zonder tijden — ik wil zien wanneer elk event begint…", send: "Naar ontwikkeling sturen", sending: "Opslaan…", saved: "Opmerking opgeslagen — hij hoort nu bij de openstaande wijzigingen.", failed: "Kon de opmerking niet opslaan." },
};

export function SparklesComment({ automation }: { automation: string }) {
  const L = I18N[useUiLang()] ?? I18N.en;
  const [open, setOpen] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  async function send() {
    const brief = text.trim();
    if (!brief) return;
    setBusy(true);
    try {
      // ONE carrier (owner's rule against a double truth): read the pending general brief and APPEND —
      // a second comment before the first was developed must never overwrite it.
      const cur = await fetch(
        `/api/projects/general-architecture/extract-current-state-for-architecture?automation=${encodeURIComponent(automation)}`,
        { cache: "no-store" },
      ).then((r) => (r.ok ? r.json() : null)).catch(() => null) as
        { instances?: { rawRequest?: string }[] } | null;
      const existing = cur?.instances?.[0]?.rawRequest?.trim() ?? "";
      const merged = existing ? `${existing}\n\n${brief}` : brief;

      const r = await fetch(`/api/projects/general-architecture/add-new-transport-task-entry`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation, payload: { brief: merged } }),
      });
      if (!r.ok) { toast.error(L.failed); return; }
      toast.success(L.saved);
      setText("");
      setOpen(false);
      setHandoffOpen(true);   // straight into the same two-button hand-off dialog (owner's flow)
    } finally { setBusy(false); }
  }

  return (
    <>
      <Button variant="ghost" size="sm" aria-label={L.aria} title={L.aria} onClick={() => setOpen(true)}>
        <Sparkles className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!busy) setOpen(v); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-4" /> {L.title}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{L.intro}</p>
          <div className="space-y-2">
            <Textarea
              ref={areaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={L.placeholder}
              rows={5}
            />
            <div className="flex items-center justify-between gap-2">
              <VoiceInput targetRef={areaRef} value={text} onChange={setText} disabled={busy} />
              <Button onClick={send} disabled={busy || !text.trim()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {busy ? L.sending : L.send}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <StartDevelopment automation={automation} open={handoffOpen} onOpenChange={setHandoffOpen} />
    </>
  );
}
