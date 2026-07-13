// TEN-LANGUAGE UI for the ROOT /projects index page (step 234.2 — CLAUDE.md 4г). This is fixed, known
// product chrome (breadcrumb, h1, description paragraph, the "N projects" badge wrapper) — hand-authored,
// same pattern as create-automation-i18n.ts / quiz-i18n.ts, NOT an LLM call (that's reserved for owner-typed
// category text, see lib/quiz.ts translateCategoryCopy). Category card titles/descriptions come from
// categories.ts's own titleI18n/descriptionI18n via categoryTitle()/categoryDescription() — not duplicated
// here. Project-name badges (live, per-project data) are never translated.

export type ProjectsIndexStrings = {
  breadcrumb: string;
  title: string;
  description: string;
  projectsCountOne: string;
  projectsCountMany: string; // {n}
  // step 238 — the "Group automations" card on the root index; the SAME title/description also serve as
  // groups-hub.server.tsx's own page heading (mirrors how categoryTitle() serves both a category's card
  // AND its hub page).
  groupAutomationsTitle: string;
  groupAutomationsDescription: string;
  groupAutomationsEmpty: string;
};

export const PROJECTS_INDEX_I18N: Record<string, ProjectsIndexStrings> = {
  en: {
    breadcrumb: "Projects",
    title: "All categories",
    description:
      "Independent lines of work this workspace runs — each project is a small finished application with " +
      "its own pages, data and workflow. Four permanent categories; a project is a named folder inside one of them.",
    projectsCountOne: "1 project", projectsCountMany: "{n} projects",
    groupAutomationsTitle: "Group automations",
    groupAutomationsDescription: "Chains of separate automations wired together by events — created from the global canvas at the bottom of this page.",
    groupAutomationsEmpty: "No group automations yet — create one from the global canvas at the bottom of the Projects page.",
  },
  ru: {
    breadcrumb: "Проекты",
    title: "Все категории",
    description:
      "Независимые направления работы этого рабочего пространства — каждый проект - небольшое законченное " +
      "приложение со своими страницами, данными и рабочим процессом. Четыре постоянные категории; проект — " +
      "именованная папка внутри одной из них.",
    projectsCountOne: "1 проект", projectsCountMany: "Проектов: {n}",
    groupAutomationsTitle: "Групповые автоматизации",
    groupAutomationsDescription: "Цепочки отдельных автоматизаций, связанных между собой событиями — создаются на глобальном холсте внизу этой страницы.",
    groupAutomationsEmpty: "Групповых автоматизаций пока нет — создайте её на глобальном холсте внизу страницы Projects.",
  },
  es: {
    breadcrumb: "Proyectos",
    title: "Todas las categorías",
    description:
      "Líneas de trabajo independientes que ejecuta este espacio de trabajo — cada proyecto es una pequeña " +
      "aplicación terminada con sus propias páginas, datos y flujo de trabajo. Cuatro categorías permanentes; " +
      "un proyecto es una carpeta con nombre dentro de una de ellas.",
    projectsCountOne: "1 proyecto", projectsCountMany: "{n} proyectos",
    groupAutomationsTitle: "Automatizaciones de grupo",
    groupAutomationsDescription: "Cadenas de automatizaciones independientes conectadas por eventos — se crean en el lienzo global al final de esta página.",
    groupAutomationsEmpty: "Aún no hay automatizaciones de grupo — crea una en el lienzo global al final de la página Projects.",
  },
  fr: {
    breadcrumb: "Projets",
    title: "Toutes les catégories",
    description:
      "Des lignes de travail indépendantes que cet espace de travail exécute — chaque projet est une petite " +
      "application terminée avec ses propres pages, données et flux de travail. Quatre catégories permanentes ; " +
      "un projet est un dossier nommé à l'intérieur de l'une d'elles.",
    projectsCountOne: "1 projet", projectsCountMany: "{n} projets",
    groupAutomationsTitle: "Automatisations de groupe",
    groupAutomationsDescription: "Des chaînes d'automatisations distinctes reliées par des événements — créées sur le canevas global en bas de cette page.",
    groupAutomationsEmpty: "Aucune automatisation de groupe pour l'instant — créez-en une sur le canevas global en bas de la page Projects.",
  },
  it: {
    breadcrumb: "Progetti",
    title: "Tutte le categorie",
    description:
      "Linee di lavoro indipendenti che questo spazio di lavoro esegue — ogni progetto è una piccola " +
      "applicazione completa con le proprie pagine, dati e flusso di lavoro. Quattro categorie permanenti; " +
      "un progetto è una cartella con nome all'interno di una di esse.",
    projectsCountOne: "1 progetto", projectsCountMany: "{n} progetti",
    groupAutomationsTitle: "Automazioni di gruppo",
    groupAutomationsDescription: "Catene di automazioni separate collegate da eventi — create sulla tela globale in fondo a questa pagina.",
    groupAutomationsEmpty: "Ancora nessuna automazione di gruppo — creane una sulla tela globale in fondo alla pagina Projects.",
  },
  de: {
    breadcrumb: "Projekte",
    title: "Alle Kategorien",
    description:
      "Unabhängige Arbeitslinien, die dieser Workspace betreibt — jedes Projekt ist eine kleine fertige " +
      "Anwendung mit eigenen Seiten, Daten und Workflow. Vier feste Kategorien; ein Projekt ist ein benannter " +
      "Ordner innerhalb einer davon.",
    projectsCountOne: "1 Projekt", projectsCountMany: "{n} Projekte",
    groupAutomationsTitle: "Gruppenautomatisierungen",
    groupAutomationsDescription: "Ketten separater Automatisierungen, die durch Ereignisse verbunden sind — erstellt auf der globalen Leinwand am Ende dieser Seite.",
    groupAutomationsEmpty: "Noch keine Gruppenautomatisierungen — erstelle eine auf der globalen Leinwand am Ende der Projects-Seite.",
  },
  pt: {
    breadcrumb: "Projetos",
    title: "Todas as categorias",
    description:
      "Linhas de trabalho independentes que este espaço de trabalho executa — cada projeto é uma pequena " +
      "aplicação concluída com as suas próprias páginas, dados e fluxo de trabalho. Quatro categorias " +
      "permanentes; um projeto é uma pasta nomeada dentro de uma delas.",
    projectsCountOne: "1 projeto", projectsCountMany: "{n} projetos",
    groupAutomationsTitle: "Automações de grupo",
    groupAutomationsDescription: "Cadeias de automações separadas ligadas por eventos — criadas na tela global no final desta página.",
    groupAutomationsEmpty: "Ainda não há automações de grupo — crie uma na tela global no final da página Projects.",
  },
  pl: {
    breadcrumb: "Projekty",
    title: "Wszystkie kategorie",
    description:
      "Niezależne linie pracy prowadzone przez tę przestrzeń roboczą — każdy projekt to niewielka, gotowa " +
      "aplikacja z własnymi stronami, danymi i przepływem pracy. Cztery stałe kategorie; projekt to nazwany " +
      "folder wewnątrz jednej z nich.",
    projectsCountOne: "1 projekt", projectsCountMany: "Projektów: {n}",
    groupAutomationsTitle: "Automatyzacje grupowe",
    groupAutomationsDescription: "Łańcuchy oddzielnych automatyzacji połączonych zdarzeniami — tworzone na globalnym płótnie na dole tej strony.",
    groupAutomationsEmpty: "Nie ma jeszcze automatyzacji grupowych — utwórz jedną na globalnym płótnie na dole strony Projects.",
  },
  tr: {
    breadcrumb: "Projeler",
    title: "Tüm kategoriler",
    description:
      "Bu çalışma alanının yürüttüğü bağımsız iş hatları — her proje kendi sayfaları, verileri ve iş akışıyla " +
      "küçük, tamamlanmış bir uygulamadır. Dört kalıcı kategori; bir proje bunlardan birinin içindeki " +
      "adlandırılmış bir klasördür.",
    projectsCountOne: "1 proje", projectsCountMany: "{n} proje",
    groupAutomationsTitle: "Grup otomasyonları",
    groupAutomationsDescription: "Olaylarla birbirine bağlanan ayrı otomasyon zincirleri — bu sayfanın altındaki genel tuval üzerinde oluşturulur.",
    groupAutomationsEmpty: "Henüz grup otomasyonu yok — Projects sayfasının altındaki genel tuvalde bir tane oluşturun.",
  },
  nl: {
    breadcrumb: "Projecten",
    title: "Alle categorieën",
    description:
      "Onafhankelijke werklijnen die deze werkruimte uitvoert — elk project is een kleine, afgeronde " +
      "applicatie met eigen pagina's, data en workflow. Vier permanente categorieën; een project is een " +
      "benoemde map binnen een van hen.",
    projectsCountOne: "1 project", projectsCountMany: "{n} projecten",
    groupAutomationsTitle: "Groepsautomatiseringen",
    groupAutomationsDescription: "Ketens van afzonderlijke automatiseringen die via events zijn verbonden — aangemaakt op het globale canvas onderaan deze pagina.",
    groupAutomationsEmpty: "Nog geen groepsautomatiseringen — maak er een aan op het globale canvas onderaan de Projects-pagina.",
  },
};

export function projectsIndexStrings(lang: string): ProjectsIndexStrings {
  return PROJECTS_INDEX_I18N[lang.slice(0, 2)] ?? PROJECTS_INDEX_I18N.en;
}
