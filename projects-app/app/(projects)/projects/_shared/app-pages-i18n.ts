// TEN-LANGUAGE UI for the "Application pages" accordion (step 242, CLAUDE.md rule 4г) — en, es, fr, it, ru,
// de, pt, pl, tr, nl; anything else → English. Covers the description (a 3-line teaser + a "Read more" essay
// that opens the full depth), the folder tree, the "Add page" modal, the per-page to-do list, and the
// AI-brainstorm dialog. {n}/{folder} are filled with String.replace.

export type AppPagesStrings = {
  descTeaser: string;
  readMore: string;
  showLess: string;
  descFull: string;
  addPage: string;
  treeLoading: string;
  treeEmpty: string;
  badgeLive: string;
  badgeDeclared: string;
  tasksN: string;          // {n}
  pickHint: string;
  // declare modal
  modalTitle: string;      // {folder}
  rootFolder: string;
  titleField: string;
  titlePlaceholder: string;
  dynamicField: string;
  multilingualField: string;
  declare: string;
  declaring: string;
  declared: string;
  declareFailed: string;
  cancel: string;
  // detail / to-dos
  detailTitle: string;
  detailHint: string;
  urlLabel: string;
  folderLabel: string;
  taskPlaceholder: string;
  emptyTasks: string;
  saveFailed: string;
  withAi: string;
  // AI dialog
  aiTitle: string;
  aiStartFailed: string;
  aiPlaceholder: string;
  aiSend: string;
  aiApply: string;
  aiApplying: string;
  aiApplied: string;       // {n}
  aiThinking: string;
};

const EN_FULL =
  "Every automation you build starts as a tool for you. But the project's whole promise is that you can turn it " +
  "into a SERVICE other people use — imagine a calorie tracker where not only you, but anyone, can register and " +
  "log what they ate. That needs pages the outside world can reach: a public interface, a registration page, the " +
  "design around them. Until now the automation had no place to bring those pages into being. This is that place. " +
  "You see the whole application layer as a folder tree; you pick any folder, press Add page, and describe what a " +
  "visitor should see and do — by voice or with the Quiz. Each wish becomes a to-do a coding agent picks up, and " +
  "the page is multilingual by default, so your service can reach the whole world. This is the core idea the " +
  "project has always held: any owner automates the creation of the project's own pages, using the very automation " +
  "tools the project itself provides.";

const RU_FULL =
  "Любая автоматизация, которую вы делаете, начинается как инструмент для вас. Но весь смысл проекта в том, что " +
  "её можно превратить в СЕРВИС для других людей — представьте счётчик калорий, где не только вы, но и любой " +
  "человек может зарегистрироваться и записывать съеденное. Для этого нужны страницы, доступные внешнему миру: " +
  "публичный интерфейс, страница регистрации, дизайн вокруг них. До сих пор у автоматизации не было места, где " +
  "эти страницы можно было бы создать. Это — то самое место. Вы видите весь слой приложения как дерево папок; " +
  "выбираете любую папку, нажимаете «Добавить страницу» и описываете, что должен видеть и делать посетитель — " +
  "голосом или в квизе. Каждое пожелание становится задачей, которую подхватывает агент-программист, а страница " +
  "по умолчанию мультиязычна — чтобы ваш сервис мог охватить весь мир. Это и есть главная идея, которой проект " +
  "держался всегда: любой владелец автоматизирует создание страниц проекта теми самыми инструментами " +
  "автоматизации, к которым стремится сам проект.";

export const APP_PAGES_I18N: Record<string, AppPagesStrings> = {
  en: {
    descTeaser: "Take this automation beyond your own space: declare PUBLIC pages of the application — a registration page, a public interface — that external people can use, not just you. Pick a folder, press Add page, describe it by voice or the Quiz — a coding agent builds it.",
    readMore: "Read more", showLess: "Show less", descFull: EN_FULL,
    addPage: "Add page", treeLoading: "Loading the application tree…", treeEmpty: "No folders yet in the application layer.",
    badgeLive: "live", badgeDeclared: "declared", tasksN: "{n} to-do(s)",
    pickHint: "Select a declared page to add tasks, or press Add page above.",
    modalTitle: "Declare a page in {folder}", rootFolder: "the application root",
    titleField: "Page title", titlePlaceholder: "e.g. Register",
    dynamicField: "Dynamic segment ([id] — a page per record)", multilingualField: "Multilingual (build for all languages)",
    declare: "Declare page", declaring: "Declaring…", declared: "Page declared.", declareFailed: "Could not declare the page.", cancel: "Cancel",
    detailTitle: "To-do for this page", detailHint: "Tasks a coding agent picks up. Add by typing or by voice.",
    urlLabel: "URL", folderLabel: "Folder", taskPlaceholder: "Add a task…", emptyTasks: "No tasks yet.",
    saveFailed: "Could not save the task.", withAi: "Add with AI",
    aiTitle: "Describe the page with AI", aiStartFailed: "Could not start the AI.", aiPlaceholder: "Answer, or add anything you want…",
    aiSend: "Send", aiApply: "Add to to-dos", aiApplying: "Adding…", aiApplied: "{n} to-do(s) added.", aiThinking: "Thinking…",
  },
  ru: {
    descTeaser: "Выведите автоматизацию за пределы вашего пространства: объявите ПУБЛИЧНЫЕ страницы приложения — регистрацию, публичный интерфейс, — которыми смогут пользоваться внешние люди, а не только вы. Выберите папку, нажмите «Добавить страницу», опишите её голосом или в квизе — агент её построит.",
    readMore: "Читать больше", showLess: "Свернуть", descFull: RU_FULL,
    addPage: "Добавить страницу", treeLoading: "Загружаю дерево приложения…", treeEmpty: "В слое приложения пока нет папок.",
    badgeLive: "готова", badgeDeclared: "объявлена", tasksN: "задач: {n}",
    pickHint: "Выберите объявленную страницу, чтобы добавить задачи, или нажмите «Добавить страницу» выше.",
    modalTitle: "Объявить страницу в {folder}", rootFolder: "корне приложения",
    titleField: "Заголовок страницы", titlePlaceholder: "напр. Регистрация",
    dynamicField: "Динамический сегмент ([id] — страница на запись)", multilingualField: "Мультиязычная (сборка на всех языках)",
    declare: "Объявить страницу", declaring: "Объявляю…", declared: "Страница объявлена.", declareFailed: "Не удалось объявить страницу.", cancel: "Отмена",
    detailTitle: "Задачи для этой страницы", detailHint: "Задачи, которые подхватит агент-программист. Добавляйте текстом или голосом.",
    urlLabel: "URL", folderLabel: "Папка", taskPlaceholder: "Добавить задачу…", emptyTasks: "Задач пока нет.",
    saveFailed: "Не удалось сохранить задачу.", withAi: "Добавить с помощью ИИ",
    aiTitle: "Опишите страницу с помощью ИИ", aiStartFailed: "Не удалось запустить ИИ.", aiPlaceholder: "Ответьте или добавьте, что хотите…",
    aiSend: "Отправить", aiApply: "Добавить в задачи", aiApplying: "Добавляю…", aiApplied: "Добавлено задач: {n}.", aiThinking: "Думаю…",
  },
  es: {
    descTeaser: "Lleva esta automatización más allá de tu espacio: declara páginas PÚBLICAS de la aplicación — registro, interfaz pública — que personas externas puedan usar, no solo tú. Elige una carpeta, pulsa Añadir página, descríbela por voz o con el Quiz — un agente la construye.",
    readMore: "Leer más", showLess: "Mostrar menos", descFull: EN_FULL,
    addPage: "Añadir página", treeLoading: "Cargando el árbol de la aplicación…", treeEmpty: "Aún no hay carpetas en la capa de aplicación.",
    badgeLive: "activa", badgeDeclared: "declarada", tasksN: "{n} tarea(s)",
    pickHint: "Selecciona una página declarada para añadir tareas, o pulsa Añadir página arriba.",
    modalTitle: "Declarar una página en {folder}", rootFolder: "la raíz de la aplicación",
    titleField: "Título de la página", titlePlaceholder: "p. ej. Registro",
    dynamicField: "Segmento dinámico ([id] — una página por registro)", multilingualField: "Multilingüe (construir para todos los idiomas)",
    declare: "Declarar página", declaring: "Declarando…", declared: "Página declarada.", declareFailed: "No se pudo declarar la página.", cancel: "Cancelar",
    detailTitle: "Tareas para esta página", detailHint: "Tareas que recoge un agente de código. Añade escribiendo o por voz.",
    urlLabel: "URL", folderLabel: "Carpeta", taskPlaceholder: "Añadir una tarea…", emptyTasks: "Aún no hay tareas.",
    saveFailed: "No se pudo guardar la tarea.", withAi: "Añadir con IA",
    aiTitle: "Describe la página con IA", aiStartFailed: "No se pudo iniciar la IA.", aiPlaceholder: "Responde o añade lo que quieras…",
    aiSend: "Enviar", aiApply: "Añadir a las tareas", aiApplying: "Añadiendo…", aiApplied: "{n} tarea(s) añadida(s).", aiThinking: "Pensando…",
  },
  fr: {
    descTeaser: "Emmenez cette automatisation au-delà de votre espace : déclarez des pages PUBLIQUES de l'application — inscription, interface publique — que des personnes externes peuvent utiliser, pas seulement vous. Choisissez un dossier, cliquez sur Ajouter une page, décrivez-la par la voix ou le Quiz — un agent la construit.",
    readMore: "Lire plus", showLess: "Réduire", descFull: EN_FULL,
    addPage: "Ajouter une page", treeLoading: "Chargement de l'arborescence…", treeEmpty: "Aucun dossier dans la couche application pour le moment.",
    badgeLive: "en ligne", badgeDeclared: "déclarée", tasksN: "{n} tâche(s)",
    pickHint: "Sélectionnez une page déclarée pour ajouter des tâches, ou cliquez sur Ajouter une page ci-dessus.",
    modalTitle: "Déclarer une page dans {folder}", rootFolder: "la racine de l'application",
    titleField: "Titre de la page", titlePlaceholder: "ex. Inscription",
    dynamicField: "Segment dynamique ([id] — une page par enregistrement)", multilingualField: "Multilingue (construire pour toutes les langues)",
    declare: "Déclarer la page", declaring: "Déclaration…", declared: "Page déclarée.", declareFailed: "Impossible de déclarer la page.", cancel: "Annuler",
    detailTitle: "Tâches pour cette page", detailHint: "Des tâches qu'un agent de code reprend. Ajoutez au clavier ou à la voix.",
    urlLabel: "URL", folderLabel: "Dossier", taskPlaceholder: "Ajouter une tâche…", emptyTasks: "Aucune tâche pour l'instant.",
    saveFailed: "Impossible d'enregistrer la tâche.", withAi: "Ajouter avec l'IA",
    aiTitle: "Décrire la page avec l'IA", aiStartFailed: "Impossible de démarrer l'IA.", aiPlaceholder: "Répondez ou ajoutez ce que vous voulez…",
    aiSend: "Envoyer", aiApply: "Ajouter aux tâches", aiApplying: "Ajout…", aiApplied: "{n} tâche(s) ajoutée(s).", aiThinking: "Réflexion…",
  },
  it: {
    descTeaser: "Porta questa automazione oltre il tuo spazio: dichiara pagine PUBBLICHE dell'applicazione — registrazione, interfaccia pubblica — che persone esterne possono usare, non solo tu. Scegli una cartella, premi Aggiungi pagina, descrivila a voce o col Quiz — un agente la costruisce.",
    readMore: "Leggi di più", showLess: "Mostra meno", descFull: EN_FULL,
    addPage: "Aggiungi pagina", treeLoading: "Caricamento dell'albero dell'applicazione…", treeEmpty: "Ancora nessuna cartella nel livello applicazione.",
    badgeLive: "attiva", badgeDeclared: "dichiarata", tasksN: "{n} attività",
    pickHint: "Seleziona una pagina dichiarata per aggiungere attività, o premi Aggiungi pagina sopra.",
    modalTitle: "Dichiara una pagina in {folder}", rootFolder: "la radice dell'applicazione",
    titleField: "Titolo della pagina", titlePlaceholder: "es. Registrazione",
    dynamicField: "Segmento dinamico ([id] — una pagina per record)", multilingualField: "Multilingue (costruisci per tutte le lingue)",
    declare: "Dichiara pagina", declaring: "Dichiarazione…", declared: "Pagina dichiarata.", declareFailed: "Impossibile dichiarare la pagina.", cancel: "Annulla",
    detailTitle: "Attività per questa pagina", detailHint: "Attività che un agente di codice raccoglie. Aggiungi scrivendo o a voce.",
    urlLabel: "URL", folderLabel: "Cartella", taskPlaceholder: "Aggiungi un'attività…", emptyTasks: "Ancora nessuna attività.",
    saveFailed: "Impossibile salvare l'attività.", withAi: "Aggiungi con l'IA",
    aiTitle: "Descrivi la pagina con l'IA", aiStartFailed: "Impossibile avviare l'IA.", aiPlaceholder: "Rispondi o aggiungi ciò che vuoi…",
    aiSend: "Invia", aiApply: "Aggiungi alle attività", aiApplying: "Aggiunta…", aiApplied: "{n} attività aggiunte.", aiThinking: "Sto pensando…",
  },
  de: {
    descTeaser: "Führe diese Automatisierung über deinen eigenen Raum hinaus: deklariere ÖFFENTLICHE Seiten der Anwendung — eine Registrierungsseite, eine öffentliche Oberfläche —, die externe Personen nutzen können, nicht nur du. Wähle einen Ordner, klicke auf Seite hinzufügen, beschreibe sie per Sprache oder Quiz — ein Coding-Agent baut sie.",
    readMore: "Mehr lesen", showLess: "Weniger anzeigen", descFull: EN_FULL,
    addPage: "Seite hinzufügen", treeLoading: "Anwendungsbaum wird geladen…", treeEmpty: "Noch keine Ordner in der Anwendungsschicht.",
    badgeLive: "live", badgeDeclared: "deklariert", tasksN: "{n} Aufgabe(n)",
    pickHint: "Wähle eine deklarierte Seite, um Aufgaben hinzuzufügen, oder klicke oben auf Seite hinzufügen.",
    modalTitle: "Eine Seite in {folder} deklarieren", rootFolder: "dem Anwendungs-Root",
    titleField: "Seitentitel", titlePlaceholder: "z. B. Registrieren",
    dynamicField: "Dynamisches Segment ([id] — eine Seite pro Datensatz)", multilingualField: "Mehrsprachig (für alle Sprachen bauen)",
    declare: "Seite deklarieren", declaring: "Wird deklariert…", declared: "Seite deklariert.", declareFailed: "Die Seite konnte nicht deklariert werden.", cancel: "Abbrechen",
    detailTitle: "To-dos für diese Seite", detailHint: "Aufgaben, die ein Coding-Agent aufnimmt. Tippend oder per Sprache hinzufügen.",
    urlLabel: "URL", folderLabel: "Ordner", taskPlaceholder: "Aufgabe hinzufügen…", emptyTasks: "Noch keine Aufgaben.",
    saveFailed: "Die Aufgabe konnte nicht gespeichert werden.", withAi: "Mit KI hinzufügen",
    aiTitle: "Die Seite mit KI beschreiben", aiStartFailed: "Die KI konnte nicht gestartet werden.", aiPlaceholder: "Antworte oder ergänze, was du willst…",
    aiSend: "Senden", aiApply: "Zu den To-dos hinzufügen", aiApplying: "Wird hinzugefügt…", aiApplied: "{n} To-do(s) hinzugefügt.", aiThinking: "Denke nach…",
  },
  pt: {
    descTeaser: "Leve esta automação para além do seu espaço: declare páginas PÚBLICAS da aplicação — registo, interface pública — que pessoas externas possam usar, não só você. Escolha uma pasta, clique em Adicionar página, descreva-a por voz ou no Quiz — um agente constrói-a.",
    readMore: "Ler mais", showLess: "Mostrar menos", descFull: EN_FULL,
    addPage: "Adicionar página", treeLoading: "A carregar a árvore da aplicação…", treeEmpty: "Ainda não há pastas na camada da aplicação.",
    badgeLive: "ativa", badgeDeclared: "declarada", tasksN: "{n} tarefa(s)",
    pickHint: "Selecione uma página declarada para adicionar tarefas, ou clique em Adicionar página acima.",
    modalTitle: "Declarar uma página em {folder}", rootFolder: "a raiz da aplicação",
    titleField: "Título da página", titlePlaceholder: "ex.: Registo",
    dynamicField: "Segmento dinâmico ([id] — uma página por registo)", multilingualField: "Multilingue (construir para todos os idiomas)",
    declare: "Declarar página", declaring: "A declarar…", declared: "Página declarada.", declareFailed: "Não foi possível declarar a página.", cancel: "Cancelar",
    detailTitle: "Tarefas para esta página", detailHint: "Tarefas que um agente de código executa. Adicione escrevendo ou por voz.",
    urlLabel: "URL", folderLabel: "Pasta", taskPlaceholder: "Adicionar uma tarefa…", emptyTasks: "Ainda sem tarefas.",
    saveFailed: "Não foi possível guardar a tarefa.", withAi: "Adicionar com IA",
    aiTitle: "Descrever a página com IA", aiStartFailed: "Não foi possível iniciar a IA.", aiPlaceholder: "Responda ou acrescente o que quiser…",
    aiSend: "Enviar", aiApply: "Adicionar às tarefas", aiApplying: "A adicionar…", aiApplied: "{n} tarefa(s) adicionada(s).", aiThinking: "A pensar…",
  },
  pl: {
    descTeaser: "Wyprowadź tę automatyzację poza własną przestrzeń: zadeklaruj PUBLICZNE strony aplikacji — rejestrację, publiczny interfejs — z których mogą korzystać osoby z zewnątrz, nie tylko Ty. Wybierz folder, kliknij Dodaj stronę, opisz ją głosem lub w Quizie — agent ją zbuduje.",
    readMore: "Czytaj więcej", showLess: "Pokaż mniej", descFull: EN_FULL,
    addPage: "Dodaj stronę", treeLoading: "Ładowanie drzewa aplikacji…", treeEmpty: "W warstwie aplikacji nie ma jeszcze folderów.",
    badgeLive: "aktywna", badgeDeclared: "zadeklarowana", tasksN: "zadań: {n}",
    pickHint: "Wybierz zadeklarowaną stronę, aby dodać zadania, albo kliknij Dodaj stronę powyżej.",
    modalTitle: "Zadeklaruj stronę w {folder}", rootFolder: "katalogu głównym aplikacji",
    titleField: "Tytuł strony", titlePlaceholder: "np. Rejestracja",
    dynamicField: "Segment dynamiczny ([id] — strona na rekord)", multilingualField: "Wielojęzyczna (buduj dla wszystkich języków)",
    declare: "Zadeklaruj stronę", declaring: "Deklarowanie…", declared: "Strona zadeklarowana.", declareFailed: "Nie udało się zadeklarować strony.", cancel: "Anuluj",
    detailTitle: "Zadania dla tej strony", detailHint: "Zadania, które podejmuje agent programista. Dodawaj pisząc lub głosem.",
    urlLabel: "URL", folderLabel: "Folder", taskPlaceholder: "Dodaj zadanie…", emptyTasks: "Brak zadań.",
    saveFailed: "Nie udało się zapisać zadania.", withAi: "Dodaj z pomocą AI",
    aiTitle: "Opisz stronę z pomocą AI", aiStartFailed: "Nie udało się uruchomić AI.", aiPlaceholder: "Odpowiedz lub dodaj, co chcesz…",
    aiSend: "Wyślij", aiApply: "Dodaj do zadań", aiApplying: "Dodawanie…", aiApplied: "Dodano zadań: {n}.", aiThinking: "Myślę…",
  },
  tr: {
    descTeaser: "Bu otomasyonu kendi alanının ötesine taşı: uygulamanın yalnızca senin değil, dış kişilerin de kullanabileceği GENEL sayfalarını — kayıt sayfası, genel arayüz — tanımla. Bir klasör seç, Sayfa ekle'ye bas, sesle veya Quiz ile anlat — bir kodlama ajanı onu oluşturur.",
    readMore: "Daha fazla oku", showLess: "Daha az göster", descFull: EN_FULL,
    addPage: "Sayfa ekle", treeLoading: "Uygulama ağacı yükleniyor…", treeEmpty: "Uygulama katmanında henüz klasör yok.",
    badgeLive: "yayında", badgeDeclared: "tanımlı", tasksN: "{n} görev",
    pickHint: "Görev eklemek için tanımlı bir sayfa seçin veya yukarıdan Sayfa ekle'ye basın.",
    modalTitle: "{folder} içinde bir sayfa tanımla", rootFolder: "uygulama kökü",
    titleField: "Sayfa başlığı", titlePlaceholder: "örn. Kayıt",
    dynamicField: "Dinamik segment ([id] — kayıt başına bir sayfa)", multilingualField: "Çok dilli (tüm diller için oluştur)",
    declare: "Sayfayı tanımla", declaring: "Tanımlanıyor…", declared: "Sayfa tanımlandı.", declareFailed: "Sayfa tanımlanamadı.", cancel: "İptal",
    detailTitle: "Bu sayfa için görevler", detailHint: "Bir kodlama ajanının aldığı görevler. Yazarak veya sesle ekleyin.",
    urlLabel: "URL", folderLabel: "Klasör", taskPlaceholder: "Görev ekle…", emptyTasks: "Henüz görev yok.",
    saveFailed: "Görev kaydedilemedi.", withAi: "Yapay zekâ ile ekle",
    aiTitle: "Sayfayı yapay zekâ ile anlat", aiStartFailed: "Yapay zekâ başlatılamadı.", aiPlaceholder: "Yanıtlayın veya istediğinizi ekleyin…",
    aiSend: "Gönder", aiApply: "Görevlere ekle", aiApplying: "Ekleniyor…", aiApplied: "{n} görev eklendi.", aiThinking: "Düşünüyor…",
  },
  nl: {
    descTeaser: "Til deze automatisering boven je eigen ruimte uit: declareer OPENBARE pagina's van de applicatie — een registratiepagina, een openbare interface — die externe mensen kunnen gebruiken, niet alleen jij. Kies een map, klik op Pagina toevoegen, beschrijf die met spraak of de Quiz — een coding agent bouwt hem.",
    readMore: "Meer lezen", showLess: "Minder tonen", descFull: EN_FULL,
    addPage: "Pagina toevoegen", treeLoading: "Applicatieboom laden…", treeEmpty: "Nog geen mappen in de applicatielaag.",
    badgeLive: "live", badgeDeclared: "gedeclareerd", tasksN: "{n} taak/taken",
    pickHint: "Selecteer een gedeclareerde pagina om taken toe te voegen, of klik hierboven op Pagina toevoegen.",
    modalTitle: "Een pagina declareren in {folder}", rootFolder: "de applicatie-root",
    titleField: "Paginatitel", titlePlaceholder: "bijv. Registreren",
    dynamicField: "Dynamisch segment ([id] — een pagina per record)", multilingualField: "Meertalig (voor alle talen bouwen)",
    declare: "Pagina declareren", declaring: "Declareren…", declared: "Pagina gedeclareerd.", declareFailed: "Kon de pagina niet declareren.", cancel: "Annuleren",
    detailTitle: "Taken voor deze pagina", detailHint: "Taken die een coding agent oppakt. Voeg toe met typen of spraak.",
    urlLabel: "URL", folderLabel: "Map", taskPlaceholder: "Een taak toevoegen…", emptyTasks: "Nog geen taken.",
    saveFailed: "Kon de taak niet opslaan.", withAi: "Toevoegen met AI",
    aiTitle: "Beschrijf de pagina met AI", aiStartFailed: "Kon de AI niet starten.", aiPlaceholder: "Antwoord of voeg toe wat je wilt…",
    aiSend: "Versturen", aiApply: "Aan taken toevoegen", aiApplying: "Toevoegen…", aiApplied: "{n} taak/taken toegevoegd.", aiThinking: "Aan het denken…",
  },
};

export function appPagesStrings(lang: string): AppPagesStrings {
  return APP_PAGES_I18N[lang.slice(0, 2)] ?? APP_PAGES_I18N.en;
}
