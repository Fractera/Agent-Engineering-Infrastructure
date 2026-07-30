"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// ДЕЙСТВИЯ DANGER ZONE (шаг 301) — переименовать / клонировать / удалить автоматизацию. Подключены к
// настоящим дверям. Строки — десять языков (закон 4г; шаг 302: были захардкожены на английском). `lang`
// приходит из меню (то же, что читает `page.tsx` из cookie/дефолта). Это КОКПИТ, обращён к строителю.
//
// Адрес автоматизации папка знает только по URL (закон 0): `<категория>/<слаг>`. Свои двери — от пути
// страницы (`api/patch`); платформенные (`/api/projects/clone|delete`) — абсолютным путём зоны.
const apiBase = () => location.pathname.replace(/\/+$/, "") + "/api";
function automationFromPath(): string {
  const p = location.pathname.split("?")[0].split("/").filter(Boolean);
  return p.length >= 3 && p[0] === "projects" ? `${p[1]}/${p[2]}` : "";
}
const slugFromPath = () => automationFromPath().split("/")[1] ?? "";

type DangerStrings = {
  renameTitle: string; renameBody: string; renamePlaceholder: string; renameBtn: string; renameOk: string; renameErr: string;
  cloneTitle: string; cloneBody: string; clonePlaceholder: string; cloneBtn: string; cloneOk: string; cloneOkDesc: string; cloneErr: string;
  deleteTitle: string; deleteBody: string; deleteConfirm: string; deleteBtn: string; deleteOk: string; deleteErr: string;
  cancel: string;
};

// `deleteConfirm` несёт маркер `{n}` — на его месте рисуется моноширинный слаг (см. `splitOnSlug`).
const DANGER_I18N: Record<string, DangerStrings> = {
  en: { renameTitle: "Rename this automation", renameBody: "Only the display name changes — the automation's address (its folder) stays the same.", renamePlaceholder: "Automation name", renameBtn: "Rename", renameOk: "Automation renamed.", renameErr: "Could not rename the automation.", cloneTitle: "Clone this automation", cloneBody: "A clean copy — same nodes, components and use cases, its own fresh identity, no run data. Give it a name.", clonePlaceholder: "Clone name", cloneBtn: "Clone", cloneOk: "Clone created — building its page (~1-2 min).", cloneOkDesc: "It appears in the same category once the build finishes.", cloneErr: "Could not clone the automation.", deleteTitle: "Delete this automation", deleteBody: "This is permanent. The whole automation — its nodes, components, data and run history — is removed and cannot be recovered.", deleteConfirm: "Type its name {n} to confirm:", deleteBtn: "Delete permanently", deleteOk: "Automation deleted.", deleteErr: "Could not delete the automation.", cancel: "Cancel" },
  ru: { renameTitle: "Переименовать автоматизацию", renameBody: "Меняется только отображаемое имя — адрес автоматизации (её папка) остаётся прежним.", renamePlaceholder: "Имя автоматизации", renameBtn: "Переименовать", renameOk: "Автоматизация переименована.", renameErr: "Не удалось переименовать автоматизацию.", cloneTitle: "Клонировать автоматизацию", cloneBody: "Чистая копия — те же узлы, компоненты и кейсы, своя новая идентичность, без данных запусков. Дайте ей имя.", clonePlaceholder: "Имя клона", cloneBtn: "Клонировать", cloneOk: "Клон создан — идёт сборка его страницы (~1–2 мин).", cloneOkDesc: "Он появится в той же категории, когда сборка завершится.", cloneErr: "Не удалось клонировать автоматизацию.", deleteTitle: "Удалить автоматизацию", deleteBody: "Это необратимо. Вся автоматизация — её узлы, компоненты, данные и история запусков — удаляется без возможности восстановления.", deleteConfirm: "Впишите её имя {n} для подтверждения:", deleteBtn: "Удалить навсегда", deleteOk: "Автоматизация удалена.", deleteErr: "Не удалось удалить автоматизацию.", cancel: "Отмена" },
  es: { renameTitle: "Renombrar esta automatización", renameBody: "Solo cambia el nombre visible — la dirección de la automatización (su carpeta) permanece igual.", renamePlaceholder: "Nombre de la automatización", renameBtn: "Renombrar", renameOk: "Automatización renombrada.", renameErr: "No se pudo renombrar la automatización.", cloneTitle: "Clonar esta automatización", cloneBody: "Una copia limpia — mismos nodos, componentes y casos de uso, su propia identidad nueva, sin datos de ejecución. Ponle un nombre.", clonePlaceholder: "Nombre del clon", cloneBtn: "Clonar", cloneOk: "Clon creado — construyendo su página (~1-2 min).", cloneOkDesc: "Aparece en la misma categoría cuando termina la construcción.", cloneErr: "No se pudo clonar la automatización.", deleteTitle: "Eliminar esta automatización", deleteBody: "Esto es permanente. Toda la automatización — sus nodos, componentes, datos e historial de ejecución — se elimina y no se puede recuperar.", deleteConfirm: "Escribe su nombre {n} para confirmar:", deleteBtn: "Eliminar permanentemente", deleteOk: "Automatización eliminada.", deleteErr: "No se pudo eliminar la automatización.", cancel: "Cancelar" },
  fr: { renameTitle: "Renommer cette automatisation", renameBody: "Seul le nom affiché change — l'adresse de l'automatisation (son dossier) reste la même.", renamePlaceholder: "Nom de l'automatisation", renameBtn: "Renommer", renameOk: "Automatisation renommée.", renameErr: "Impossible de renommer l'automatisation.", cloneTitle: "Cloner cette automatisation", cloneBody: "Une copie propre — mêmes nœuds, composants et cas d'usage, sa propre nouvelle identité, sans données d'exécution. Donnez-lui un nom.", clonePlaceholder: "Nom du clone", cloneBtn: "Cloner", cloneOk: "Clone créé — génération de sa page (~1-2 min).", cloneOkDesc: "Il apparaît dans la même catégorie une fois la génération terminée.", cloneErr: "Impossible de cloner l'automatisation.", deleteTitle: "Supprimer cette automatisation", deleteBody: "C'est définitif. Toute l'automatisation — ses nœuds, composants, données et historique d'exécution — est supprimée et ne peut pas être récupérée.", deleteConfirm: "Saisissez son nom {n} pour confirmer :", deleteBtn: "Supprimer définitivement", deleteOk: "Automatisation supprimée.", deleteErr: "Impossible de supprimer l'automatisation.", cancel: "Annuler" },
  it: { renameTitle: "Rinomina questa automazione", renameBody: "Cambia solo il nome visualizzato — l'indirizzo dell'automazione (la sua cartella) resta invariato.", renamePlaceholder: "Nome dell'automazione", renameBtn: "Rinomina", renameOk: "Automazione rinominata.", renameErr: "Impossibile rinominare l'automazione.", cloneTitle: "Clona questa automazione", cloneBody: "Una copia pulita — stessi nodi, componenti e casi d'uso, una propria nuova identità, senza dati di esecuzione. Dalle un nome.", clonePlaceholder: "Nome del clone", cloneBtn: "Clona", cloneOk: "Clone creato — creazione della sua pagina (~1-2 min).", cloneOkDesc: "Appare nella stessa categoria al termine della creazione.", cloneErr: "Impossibile clonare l'automazione.", deleteTitle: "Elimina questa automazione", deleteBody: "Questa azione è permanente. L'intera automazione — i suoi nodi, componenti, dati e cronologia delle esecuzioni — viene rimossa e non può essere recuperata.", deleteConfirm: "Digita il suo nome {n} per confermare:", deleteBtn: "Elimina definitivamente", deleteOk: "Automazione eliminata.", deleteErr: "Impossibile eliminare l'automazione.", cancel: "Annulla" },
  de: { renameTitle: "Diese Automatisierung umbenennen", renameBody: "Nur der Anzeigename ändert sich — die Adresse der Automatisierung (ihr Ordner) bleibt gleich.", renamePlaceholder: "Name der Automatisierung", renameBtn: "Umbenennen", renameOk: "Automatisierung umbenannt.", renameErr: "Automatisierung konnte nicht umbenannt werden.", cloneTitle: "Diese Automatisierung klonen", cloneBody: "Eine saubere Kopie — dieselben Knoten, Komponenten und Anwendungsfälle, eine eigene neue Identität, keine Ausführungsdaten. Gib ihr einen Namen.", clonePlaceholder: "Name des Klons", cloneBtn: "Klonen", cloneOk: "Klon erstellt — seine Seite wird gebaut (~1-2 Min).", cloneOkDesc: "Er erscheint in derselben Kategorie, sobald der Build fertig ist.", cloneErr: "Automatisierung konnte nicht geklont werden.", deleteTitle: "Diese Automatisierung löschen", deleteBody: "Dies ist dauerhaft. Die gesamte Automatisierung — ihre Knoten, Komponenten, Daten und Ausführungshistorie — wird entfernt und kann nicht wiederhergestellt werden.", deleteConfirm: "Gib ihren Namen {n} ein, um zu bestätigen:", deleteBtn: "Endgültig löschen", deleteOk: "Automatisierung gelöscht.", deleteErr: "Automatisierung konnte nicht gelöscht werden.", cancel: "Abbrechen" },
  pt: { renameTitle: "Renomear esta automação", renameBody: "Apenas o nome exibido muda — o endereço da automação (a sua pasta) permanece o mesmo.", renamePlaceholder: "Nome da automação", renameBtn: "Renomear", renameOk: "Automação renomeada.", renameErr: "Não foi possível renomear a automação.", cloneTitle: "Clonar esta automação", cloneBody: "Uma cópia limpa — mesmos nós, componentes e casos de uso, a sua própria identidade nova, sem dados de execução. Dê-lhe um nome.", clonePlaceholder: "Nome do clone", cloneBtn: "Clonar", cloneOk: "Clone criado — a construir a sua página (~1-2 min).", cloneOkDesc: "Aparece na mesma categoria quando a construção termina.", cloneErr: "Não foi possível clonar a automação.", deleteTitle: "Eliminar esta automação", deleteBody: "Isto é permanente. Toda a automação — os seus nós, componentes, dados e histórico de execução — é removida e não pode ser recuperada.", deleteConfirm: "Escreva o nome {n} para confirmar:", deleteBtn: "Eliminar permanentemente", deleteOk: "Automação eliminada.", deleteErr: "Não foi possível eliminar a automação.", cancel: "Cancelar" },
  pl: { renameTitle: "Zmień nazwę tej automatyzacji", renameBody: "Zmienia się tylko wyświetlana nazwa — adres automatyzacji (jej folder) pozostaje bez zmian.", renamePlaceholder: "Nazwa automatyzacji", renameBtn: "Zmień nazwę", renameOk: "Nazwa automatyzacji zmieniona.", renameErr: "Nie udało się zmienić nazwy automatyzacji.", cloneTitle: "Sklonuj tę automatyzację", cloneBody: "Czysta kopia — te same węzły, komponenty i przypadki użycia, własna nowa tożsamość, bez danych uruchomień. Nadaj jej nazwę.", clonePlaceholder: "Nazwa klona", cloneBtn: "Sklonuj", cloneOk: "Klon utworzony — trwa budowanie jego strony (~1-2 min).", cloneOkDesc: "Pojawi się w tej samej kategorii po zakończeniu budowania.", cloneErr: "Nie udało się sklonować automatyzacji.", deleteTitle: "Usuń tę automatyzację", deleteBody: "To działanie jest nieodwracalne. Cała automatyzacja — jej węzły, komponenty, dane i historia uruchomień — zostaje usunięta i nie można jej odzyskać.", deleteConfirm: "Wpisz jej nazwę {n}, aby potwierdzić:", deleteBtn: "Usuń na stałe", deleteOk: "Automatyzacja usunięta.", deleteErr: "Nie udało się usunąć automatyzacji.", cancel: "Anuluj" },
  tr: { renameTitle: "Bu otomasyonu yeniden adlandır", renameBody: "Yalnızca görünen ad değişir — otomasyonun adresi (klasörü) aynı kalır.", renamePlaceholder: "Otomasyon adı", renameBtn: "Yeniden adlandır", renameOk: "Otomasyon yeniden adlandırıldı.", renameErr: "Otomasyon yeniden adlandırılamadı.", cloneTitle: "Bu otomasyonu klonla", cloneBody: "Temiz bir kopya — aynı düğümler, bileşenler ve kullanım senaryoları, kendi yeni kimliği, çalıştırma verisi yok. Ona bir ad verin.", clonePlaceholder: "Klon adı", cloneBtn: "Klonla", cloneOk: "Klon oluşturuldu — sayfası oluşturuluyor (~1-2 dk).", cloneOkDesc: "Oluşturma bitince aynı kategoride görünür.", cloneErr: "Otomasyon klonlanamadı.", deleteTitle: "Bu otomasyonu sil", deleteBody: "Bu kalıcıdır. Otomasyonun tamamı — düğümleri, bileşenleri, verileri ve çalıştırma geçmişi — kaldırılır ve geri alınamaz.", deleteConfirm: "Onaylamak için adını {n} yazın:", deleteBtn: "Kalıcı olarak sil", deleteOk: "Otomasyon silindi.", deleteErr: "Otomasyon silinemedi.", cancel: "İptal" },
  nl: { renameTitle: "Deze automatisering hernoemen", renameBody: "Alleen de weergavenaam verandert — het adres van de automatisering (de map) blijft hetzelfde.", renamePlaceholder: "Naam van de automatisering", renameBtn: "Hernoemen", renameOk: "Automatisering hernoemd.", renameErr: "Kon de automatisering niet hernoemen.", cloneTitle: "Deze automatisering klonen", cloneBody: "Een schone kopie — dezelfde nodes, componenten en use-cases, een eigen nieuwe identiteit, geen uitvoeringsgegevens. Geef het een naam.", clonePlaceholder: "Naam van de kloon", cloneBtn: "Klonen", cloneOk: "Kloon aangemaakt — pagina wordt gebouwd (~1-2 min).", cloneOkDesc: "Hij verschijnt in dezelfde categorie zodra de build klaar is.", cloneErr: "Kon de automatisering niet klonen.", deleteTitle: "Deze automatisering verwijderen", deleteBody: "Dit is permanent. De hele automatisering — de nodes, componenten, gegevens en uitvoeringsgeschiedenis — wordt verwijderd en kan niet worden hersteld.", deleteConfirm: "Typ de naam {n} om te bevestigen:", deleteBtn: "Permanent verwijderen", deleteOk: "Automatisering verwijderd.", deleteErr: "Kon de automatisering niet verwijderen.", cancel: "Annuleren" },
};

function dangerStrings(lang: string): DangerStrings {
  return DANGER_I18N[lang.toLowerCase().slice(0, 2)] ?? DANGER_I18N.en;
}
/** «Type its name {n} to confirm:» → [до, после] вокруг маркера слага. */
function splitOnSlug(tpl: string): [string, string] {
  const i = tpl.indexOf("{n}");
  return i === -1 ? [tpl, ""] : [tpl.slice(0, i), tpl.slice(i + 3)];
}

// ── RENAME — правит `passport.title` через собственную дверь `api/patch`. Слаг/папка НЕ меняются (это
//    идентичность, решение владельца). Пересборка не нужна: страница читает имя из ядра на каждый запрос. ──
export function RenameDialog({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: string }) {
  const router = useRouter();
  const L = dangerStrings(lang);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    void fetch(`${apiBase()}/core?select=passport`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { title?: string } | null) => { if (d?.title) setTitle(String(d.title)); })
      .catch(() => {});
  }, [open]);

  async function save() {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      const r = await fetch(`${apiBase()}/patch`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: { object: "passport" }, set: { title: title.trim() } }),
      });
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) { toast.error(d.error ?? L.renameErr); return; }
      toast.success(L.renameOk);
      onClose();
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="size-4" /> {L.renameTitle}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{L.renameBody}</p>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={L.renamePlaceholder} onKeyDown={(e) => { if (e.key === "Enter") void save(); }} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>{L.cancel}</Button>
          <Button onClick={save} disabled={busy || !title.trim()} className="gap-2">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Pencil className="size-4" />} {L.renameBtn}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── CLONE — копия этой автоматизации со ВСЕМ содержимым, но новой идентичностью (дверь `/api/projects/clone`
//    ветвится на v2: свежая uuid + подстановка слага). Клон появляется в той же категории после пересборки. ──
export function CloneDialog({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: string }) {
  const L = dangerStrings(lang);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) setName(""); }, [open]);

  async function clone() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/clone`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ automation: automationFromPath(), title: name.trim() }),
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; url?: string };
      if (!r.ok || !d.ok) { toast.error(d.error ?? L.cloneErr); return; }
      toast.success(L.cloneOk, { description: L.cloneOkDesc });
      onClose();
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Copy className="size-4" /> {L.cloneTitle}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{L.cloneBody}</p>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={L.clonePlaceholder} onKeyDown={(e) => { if (e.key === "Enter") void clone(); }} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>{L.cancel}</Button>
          <Button onClick={clone} disabled={busy || !name.trim()} className="gap-2">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />} {L.cloneBtn}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── DELETE — необратимо. Danger-zone-подтверждение: владелец ВПЕЧАТЫВАЕТ слаг автоматизации (дверь того же
//    и требует). Успех → папка снесена, уходим в зону (страницы больше нет). ──
export function DeleteDialog({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: string }) {
  const L = dangerStrings(lang);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const slug = typeof window !== "undefined" ? slugFromPath() : "";
  const [confPre, confPost] = splitOnSlug(L.deleteConfirm);

  useEffect(() => { if (open) setConfirm(""); }, [open]);

  async function del() {
    if (confirm.trim() !== slug || busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/delete`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ automation: automationFromPath(), confirm: confirm.trim() }),
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok) { toast.error(d.error ?? L.deleteErr); return; }
      toast.success(L.deleteOk);
      // Снять «оптимистичную» карточку этой автоматизации из localStorage зоны СРАЗУ — иначе после
      // перезагрузки на хабе повиснет карточка-призрак (маршрут ещё отвечает 2xx во время пересборки, и
      // разовая проверка сочла бы её живой). Ключ — контракт с `_shared/components/pending-automations`.
      try {
        const [cat, s] = automationFromPath().split("/");
        const key = `pending-automations:${cat}`;
        const arr = JSON.parse(localStorage.getItem(key) || "[]") as Array<{ slug?: string }>;
        localStorage.setItem(key, JSON.stringify(arr.filter((e) => e.slug !== s)));
      } catch { /* localStorage недоступен — призрак снимет самолечащийся опрос зоны */ }
      // Страницы автоматизации больше нет — уходим на список её категории.
      window.location.href = `/projects/${automationFromPath().split("/")[0] || ""}`;
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400"><Trash2 className="size-4" /> {L.deleteTitle}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{L.deleteBody}</p>
        <p className="text-sm">
          {confPre}<span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold">{slug}</span>{confPost}
        </p>
        <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={slug} autoComplete="off" onKeyDown={(e) => { if (e.key === "Enter") void del(); }} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>{L.cancel}</Button>
          <Button variant="destructive" onClick={del} disabled={busy || confirm.trim() !== slug} className="gap-2">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} {L.deleteBtn}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
