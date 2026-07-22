// СЛОВАРЬ ПУЛЬТА ЗАПУСКА — десять языков (en, es, fr, it, ru, de, pt, pl, tr, nl), англ. фолбэк (закон 4г).
// Живёт в папке вкладки: наружу не ходим (закон 0). Переводится только проза интерфейса; ключи параметров,
// имена узлов и значения enum остаются машинными токенами.
export type ControlPanelStrings = {
  ask: string;
  asking: string;
  required: string;
  optional: string;
  fill: string; // "{k}" — перечень незаполненных обязательных полей
  refused: string; // "{k}" — обучающий отказ движка
  done: string;
  settings: string;
  settingsHint: string;
  noParams: string;
  paramKey: string;
  paramType: string;
  noComponent: string; // "{k}" — ядро объявило пульт, файла под него нет
  devTitle: string;
  devPlaceholder: string;
  devSubmit: string;
  devSending: string;
  devSaved: string;
  devFailed: string;
  devPending: string; // текущее задание владельца, ещё не разобранное моделью
  failed: string; // прогон не удался, а причины узел не назвал
};

export const CONTROL_PANEL_I18N: Record<string, ControlPanelStrings> = {
  en: { ask: "Ask", asking: "Asking…", required: "required", optional: "optional", fill: "Fill in: {k}", refused: "The automation refused: {k}", done: "Done", settings: "Request settings", settingsHint: "What this control panel asks for. The fields come from the core — change the core, the panel changes.", noParams: "This panel declares no fields yet.", paramKey: "Field", paramType: "Type", noComponent: "The core declares the control panel «{k}», but there is no file for it in _components/control-panel/.", devTitle: "Send this panel into development", devPlaceholder: "Describe what this control panel should ask and do…", devSubmit: "Send to development", devSending: "Sending…", devSaved: "Saved to the core — the model will read it as the task.", devFailed: "Could not save.", devPending: "Task waiting for development:", failed: "The request could not be completed." },
  es: { ask: "Consultar", asking: "Consultando…", required: "obligatorio", optional: "opcional", fill: "Completa: {k}", refused: "La automatización rechazó: {k}", done: "Listo", settings: "Ajustes de la consulta", settingsHint: "Lo que pide este panel. Los campos vienen del núcleo: cambia el núcleo y cambia el panel.", noParams: "Este panel aún no declara campos.", paramKey: "Campo", paramType: "Tipo", noComponent: "El núcleo declara el panel «{k}», pero no hay archivo para él en _components/control-panel/.", devTitle: "Enviar este panel a desarrollo", devPlaceholder: "Describe qué debe pedir y hacer este panel…", devSubmit: "Enviar a desarrollo", devSending: "Enviando…", devSaved: "Guardado en el núcleo: el modelo lo leerá como la tarea.", devFailed: "No se pudo guardar.", devPending: "Tarea pendiente de desarrollo:", failed: "No se pudo completar la solicitud." },
  fr: { ask: "Demander", asking: "Demande…", required: "obligatoire", optional: "facultatif", fill: "Remplissez : {k}", refused: "L'automatisation a refusé : {k}", done: "Terminé", settings: "Réglages de la demande", settingsHint: "Ce que demande ce panneau. Les champs viennent du noyau : changez le noyau, le panneau change.", noParams: "Ce panneau ne déclare encore aucun champ.", paramKey: "Champ", paramType: "Type", noComponent: "Le noyau déclare le panneau « {k} », mais aucun fichier ne lui correspond dans _components/control-panel/.", devTitle: "Envoyer ce panneau en développement", devPlaceholder: "Décrivez ce que ce panneau doit demander et faire…", devSubmit: "Envoyer en développement", devSending: "Envoi…", devSaved: "Enregistré dans le noyau : le modèle le lira comme la tâche.", devFailed: "Enregistrement impossible.", devPending: "Tâche en attente de développement :", failed: "La demande n'a pas pu aboutir." },
  it: { ask: "Chiedi", asking: "Richiesta…", required: "obbligatorio", optional: "facoltativo", fill: "Compila: {k}", refused: "L'automazione ha rifiutato: {k}", done: "Fatto", settings: "Impostazioni della richiesta", settingsHint: "Cosa chiede questo pannello. I campi vengono dal nucleo: cambia il nucleo e cambia il pannello.", noParams: "Questo pannello non dichiara ancora campi.", paramKey: "Campo", paramType: "Tipo", noComponent: "Il nucleo dichiara il pannello «{k}», ma non esiste un file per esso in _components/control-panel/.", devTitle: "Manda questo pannello in sviluppo", devPlaceholder: "Descrivi cosa deve chiedere e fare questo pannello…", devSubmit: "Manda in sviluppo", devSending: "Invio…", devSaved: "Salvato nel nucleo: il modello lo leggerà come compito.", devFailed: "Impossibile salvare.", devPending: "Compito in attesa di sviluppo:", failed: "Non è stato possibile completare la richiesta." },
  ru: { ask: "Запросить", asking: "Запрашиваю…", required: "обязательное", optional: "необязательное", fill: "Заполните: {k}", refused: "Автоматизация отказала: {k}", done: "Готово", settings: "Настройка запроса", settingsHint: "Что спрашивает этот пульт. Поля берутся из ядра — меняется ядро, меняется пульт.", noParams: "Пульт пока не объявил ни одного поля.", paramKey: "Поле", paramType: "Тип", noComponent: "Ядро объявило пульт «{k}», но файла под него нет в _components/control-panel/.", devTitle: "Отправить пульт в разработку", devPlaceholder: "Опишите, что этот пульт должен спрашивать и делать…", devSubmit: "Отправить в разработку", devSending: "Отправляю…", devSaved: "Сохранено в ядре — модель прочитает это как задание.", devFailed: "Не удалось сохранить.", devPending: "Задание ждёт разработки:", failed: "Запрос выполнить не удалось." },
  de: { ask: "Abfragen", asking: "Abfrage…", required: "erforderlich", optional: "optional", fill: "Ausfüllen: {k}", refused: "Die Automatisierung hat abgelehnt: {k}", done: "Fertig", settings: "Anfrage-Einstellungen", settingsHint: "Wonach dieses Pult fragt. Die Felder kommen aus dem Kern — ändere den Kern, ändert sich das Pult.", noParams: "Dieses Pult deklariert noch keine Felder.", paramKey: "Feld", paramType: "Typ", noComponent: "Der Kern deklariert das Pult «{k}», aber es gibt keine Datei dafür in _components/control-panel/.", devTitle: "Dieses Pult in die Entwicklung geben", devPlaceholder: "Beschreibe, was dieses Pult fragen und tun soll…", devSubmit: "In die Entwicklung geben", devSending: "Senden…", devSaved: "Im Kern gespeichert — das Modell liest es als Aufgabe.", devFailed: "Speichern fehlgeschlagen.", devPending: "Aufgabe wartet auf Entwicklung:", failed: "Die Anfrage konnte nicht ausgeführt werden." },
  pt: { ask: "Consultar", asking: "A consultar…", required: "obrigatório", optional: "opcional", fill: "Preencha: {k}", refused: "A automação recusou: {k}", done: "Pronto", settings: "Definições do pedido", settingsHint: "O que este painel pergunta. Os campos vêm do núcleo — muda o núcleo, muda o painel.", noParams: "Este painel ainda não declara campos.", paramKey: "Campo", paramType: "Tipo", noComponent: "O núcleo declara o painel «{k}», mas não há ficheiro para ele em _components/control-panel/.", devTitle: "Enviar este painel para desenvolvimento", devPlaceholder: "Descreva o que este painel deve pedir e fazer…", devSubmit: "Enviar para desenvolvimento", devSending: "A enviar…", devSaved: "Guardado no núcleo — o modelo vai lê-lo como a tarefa.", devFailed: "Não foi possível guardar.", devPending: "Tarefa à espera de desenvolvimento:", failed: "Não foi possível concluir o pedido." },
  pl: { ask: "Zapytaj", asking: "Pytam…", required: "wymagane", optional: "opcjonalne", fill: "Uzupełnij: {k}", refused: "Automatyzacja odmówiła: {k}", done: "Gotowe", settings: "Ustawienia zapytania", settingsHint: "O co pyta ten pulpit. Pola pochodzą z rdzenia — zmień rdzeń, zmieni się pulpit.", noParams: "Ten pulpit nie deklaruje jeszcze pól.", paramKey: "Pole", paramType: "Typ", noComponent: "Rdzeń deklaruje pulpit «{k}», ale nie ma dla niego pliku w _components/control-panel/.", devTitle: "Wyślij ten pulpit do rozwoju", devPlaceholder: "Opisz, o co ten pulpit ma pytać i co ma robić…", devSubmit: "Wyślij do rozwoju", devSending: "Wysyłam…", devSaved: "Zapisano w rdzeniu — model odczyta to jako zadanie.", devFailed: "Nie udało się zapisać.", devPending: "Zadanie czeka na rozwój:", failed: "Nie udało się zrealizować zapytania." },
  tr: { ask: "Sorgula", asking: "Sorgulanıyor…", required: "zorunlu", optional: "isteğe bağlı", fill: "Doldurun: {k}", refused: "Otomasyon reddetti: {k}", done: "Tamam", settings: "İstek ayarları", settingsHint: "Bu panelin ne sorduğu. Alanlar çekirdekten gelir — çekirdeği değiştir, panel değişir.", noParams: "Bu panel henüz alan tanımlamıyor.", paramKey: "Alan", paramType: "Tür", noComponent: "Çekirdek «{k}» panelini tanımlıyor ama _components/control-panel/ içinde ona ait dosya yok.", devTitle: "Bu paneli geliştirmeye gönder", devPlaceholder: "Bu panelin ne sorması ve ne yapması gerektiğini yazın…", devSubmit: "Geliştirmeye gönder", devSending: "Gönderiliyor…", devSaved: "Çekirdeğe kaydedildi — model bunu görev olarak okuyacak.", devFailed: "Kaydedilemedi.", devPending: "Geliştirme bekleyen görev:", failed: "İstek tamamlanamadı." },
  nl: { ask: "Opvragen", asking: "Bezig…", required: "verplicht", optional: "optioneel", fill: "Vul in: {k}", refused: "De automatisering weigerde: {k}", done: "Klaar", settings: "Aanvraaginstellingen", settingsHint: "Wat dit paneel vraagt. De velden komen uit de kern — verander de kern en het paneel verandert mee.", noParams: "Dit paneel declareert nog geen velden.", paramKey: "Veld", paramType: "Type", noComponent: "De kern declareert het paneel «{k}», maar er is geen bestand voor in _components/control-panel/.", devTitle: "Stuur dit paneel naar ontwikkeling", devPlaceholder: "Beschrijf wat dit paneel moet vragen en doen…", devSubmit: "Naar ontwikkeling sturen", devSending: "Versturen…", devSaved: "Opgeslagen in de kern — het model leest dit als de taak.", devFailed: "Opslaan mislukt.", devPending: "Taak wacht op ontwikkeling:", failed: "Het verzoek kon niet worden voltooid." },
};

export const controlPanelStrings = (lang: string): ControlPanelStrings =>
  CONTROL_PANEL_I18N[lang.slice(0, 2)] ?? CONTROL_PANEL_I18N.en;

/** Текст из ядра приходит картой языков ({ru: "…", en: "…"}) — берём язык страницы, иначе английский. */
export function pick(text: unknown, lang: string): string {
  if (typeof text === "string") return text;
  if (text && typeof text === "object") {
    const m = text as Record<string, unknown>;
    const v = m[lang.slice(0, 2)] ?? m.en;
    if (typeof v === "string") return v;
  }
  return "";
}
