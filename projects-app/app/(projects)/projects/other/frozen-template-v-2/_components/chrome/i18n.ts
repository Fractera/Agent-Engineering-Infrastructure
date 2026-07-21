// СЛОВАРЬ ШАПКИ — десять языков (en, es, fr, it, ru, de, pt, pl, tr, nl), англ. фолбэк (закон 4г).
// Живёт в папке автоматизации: наружу не ходим (закон 0). Переводим ТОЛЬКО прозу интерфейса —
// значения enum (тип/жизненный цикл/шаринг) остаются машинными токенами и не переводятся.
export type ChromeStrings = {
  menuTitle: string;
  publicPage: string;
  containers: string;
  visible: string;
  hidden: string;
  dragHint: string;
  sendOpen: string;
  sendTitle: string;
  sendPlaceholder: string;
  sendSubmit: string;
  sendSending: string;
  sendSaved: string;
  sendFailed: string;
  cancel: string;
  howItWorks: string;
  howItWorksEmpty: string;
};

const I18N: Record<string, ChromeStrings> = {
  en: { menuTitle: "Menu", publicPage: "Public page", containers: "Containers", visible: "Visible", hidden: "Hidden", dragHint: "Drag to reorder", sendOpen: "Send task", sendTitle: "Task for the automation", sendPlaceholder: "Describe what the automation should do…", sendSubmit: "Send", sendSending: "Sending…", sendSaved: "Task saved to the automation.", sendFailed: "Could not save the task.", cancel: "Cancel", howItWorks: "How it works", howItWorksEmpty: "The answer will appear here once the automation is built." },
  es: { menuTitle: "Menú", publicPage: "Página pública", containers: "Contenedores", visible: "Visible", hidden: "Oculto", dragHint: "Arrastra para reordenar", sendOpen: "Enviar tarea", sendTitle: "Tarea para la automatización", sendPlaceholder: "Describe qué debe hacer la automatización…", sendSubmit: "Enviar", sendSending: "Enviando…", sendSaved: "Tarea guardada en la automatización.", sendFailed: "No se pudo guardar la tarea.", cancel: "Cancelar", howItWorks: "Cómo funciona", howItWorksEmpty: "La respuesta aparecerá aquí cuando se construya la automatización." },
  fr: { menuTitle: "Menu", publicPage: "Page publique", containers: "Conteneurs", visible: "Visible", hidden: "Masqué", dragHint: "Glisser pour réordonner", sendOpen: "Envoyer une tâche", sendTitle: "Tâche pour l'automatisation", sendPlaceholder: "Décrivez ce que l'automatisation doit faire…", sendSubmit: "Envoyer", sendSending: "Envoi…", sendSaved: "Tâche enregistrée dans l'automatisation.", sendFailed: "Impossible d'enregistrer la tâche.", cancel: "Annuler", howItWorks: "Comment ça marche", howItWorksEmpty: "La réponse apparaîtra ici une fois l'automatisation construite." },
  it: { menuTitle: "Menu", publicPage: "Pagina pubblica", containers: "Contenitori", visible: "Visibile", hidden: "Nascosto", dragHint: "Trascina per riordinare", sendOpen: "Invia attività", sendTitle: "Attività per l'automazione", sendPlaceholder: "Descrivi cosa deve fare l'automazione…", sendSubmit: "Invia", sendSending: "Invio…", sendSaved: "Attività salvata nell'automazione.", sendFailed: "Impossibile salvare l'attività.", cancel: "Annulla", howItWorks: "Come funziona", howItWorksEmpty: "La risposta apparirà qui una volta costruita l'automazione." },
  ru: { menuTitle: "Меню", publicPage: "Публичная страница", containers: "Контейнеры", visible: "Виден", hidden: "Скрыт", dragHint: "Перетащите для порядка", sendOpen: "Отправить задание", sendTitle: "Задание для автоматизации", sendPlaceholder: "Опишите, что должна делать автоматизация…", sendSubmit: "Отправить", sendSending: "Отправляю…", sendSaved: "Задание сохранено в автоматизации.", sendFailed: "Не удалось сохранить задание.", cancel: "Отмена", howItWorks: "Как это работает", howItWorksEmpty: "Ответ появится здесь, когда автоматизация будет построена." },
  de: { menuTitle: "Menü", publicPage: "Öffentliche Seite", containers: "Container", visible: "Sichtbar", hidden: "Verborgen", dragHint: "Zum Umsortieren ziehen", sendOpen: "Aufgabe senden", sendTitle: "Aufgabe für die Automatisierung", sendPlaceholder: "Beschreiben Sie, was die Automatisierung tun soll…", sendSubmit: "Senden", sendSending: "Senden…", sendSaved: "Aufgabe in der Automatisierung gespeichert.", sendFailed: "Aufgabe konnte nicht gespeichert werden.", cancel: "Abbrechen", howItWorks: "Wie es funktioniert", howItWorksEmpty: "Die Antwort erscheint hier, sobald die Automatisierung gebaut ist." },
  pt: { menuTitle: "Menu", publicPage: "Página pública", containers: "Contêineres", visible: "Visível", hidden: "Oculto", dragHint: "Arraste para reordenar", sendOpen: "Enviar tarefa", sendTitle: "Tarefa para a automação", sendPlaceholder: "Descreva o que a automação deve fazer…", sendSubmit: "Enviar", sendSending: "A enviar…", sendSaved: "Tarefa guardada na automação.", sendFailed: "Não foi possível guardar a tarefa.", cancel: "Cancelar", howItWorks: "Como funciona", howItWorksEmpty: "A resposta aparecerá aqui quando a automação for construída." },
  pl: { menuTitle: "Menu", publicPage: "Strona publiczna", containers: "Kontenery", visible: "Widoczny", hidden: "Ukryty", dragHint: "Przeciągnij, aby zmienić kolejność", sendOpen: "Wyślij zadanie", sendTitle: "Zadanie dla automatyzacji", sendPlaceholder: "Opisz, co ma robić automatyzacja…", sendSubmit: "Wyślij", sendSending: "Wysyłanie…", sendSaved: "Zadanie zapisane w automatyzacji.", sendFailed: "Nie udało się zapisać zadania.", cancel: "Anuluj", howItWorks: "Jak to działa", howItWorksEmpty: "Odpowiedź pojawi się tutaj, gdy automatyzacja zostanie zbudowana." },
  tr: { menuTitle: "Menü", publicPage: "Herkese açık sayfa", containers: "Kapsayıcılar", visible: "Görünür", hidden: "Gizli", dragHint: "Sıralamak için sürükleyin", sendOpen: "Görev gönder", sendTitle: "Otomasyon için görev", sendPlaceholder: "Otomasyonun ne yapması gerektiğini açıklayın…", sendSubmit: "Gönder", sendSending: "Gönderiliyor…", sendSaved: "Görev otomasyona kaydedildi.", sendFailed: "Görev kaydedilemedi.", cancel: "İptal", howItWorks: "Nasıl çalışır", howItWorksEmpty: "Otomasyon oluşturulduğunda yanıt burada görünecek." },
  nl: { menuTitle: "Menu", publicPage: "Openbare pagina", containers: "Containers", visible: "Zichtbaar", hidden: "Verborgen", dragHint: "Sleep om te herordenen", sendOpen: "Taak versturen", sendTitle: "Taak voor de automatisering", sendPlaceholder: "Beschrijf wat de automatisering moet doen…", sendSubmit: "Versturen", sendSending: "Versturen…", sendSaved: "Taak opgeslagen in de automatisering.", sendFailed: "Kon de taak niet opslaan.", cancel: "Annuleren", howItWorks: "Hoe het werkt", howItWorksEmpty: "Het antwoord verschijnt hier zodra de automatisering is gebouwd." },
};

/** The chrome strings for a two-letter code, English until/unless a match is found. */
export function chromeStrings(lang: string): ChromeStrings {
  return I18N[lang.toLowerCase().slice(0, 2)] ?? I18N.en;
}

/** A machine enum token shown as a badge: never translated (rule 4г), only the hyphen turned to a space. */
export function badgeLabel(token: string): string {
  return token.replace(/-/g, " ");
}
