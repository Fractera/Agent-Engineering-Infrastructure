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
};

export const PROJECTS_INDEX_I18N: Record<string, ProjectsIndexStrings> = {
  en: {
    breadcrumb: "Projects",
    title: "All categories",
    description:
      "Independent lines of work this workspace runs — each project is a small finished application with " +
      "its own pages, data and workflow. Four permanent categories; a project is a named folder inside one of them.",
    projectsCountOne: "1 project", projectsCountMany: "{n} projects",
  },
  ru: {
    breadcrumb: "Проекты",
    title: "Все категории",
    description:
      "Независимые направления работы этого рабочего пространства — каждый проект - небольшое законченное " +
      "приложение со своими страницами, данными и рабочим процессом. Четыре постоянные категории; проект — " +
      "именованная папка внутри одной из них.",
    projectsCountOne: "1 проект", projectsCountMany: "Проектов: {n}",
  },
  es: {
    breadcrumb: "Proyectos",
    title: "Todas las categorías",
    description:
      "Líneas de trabajo independientes que ejecuta este espacio de trabajo — cada proyecto es una pequeña " +
      "aplicación terminada con sus propias páginas, datos y flujo de trabajo. Cuatro categorías permanentes; " +
      "un proyecto es una carpeta con nombre dentro de una de ellas.",
    projectsCountOne: "1 proyecto", projectsCountMany: "{n} proyectos",
  },
  fr: {
    breadcrumb: "Projets",
    title: "Toutes les catégories",
    description:
      "Des lignes de travail indépendantes que cet espace de travail exécute — chaque projet est une petite " +
      "application terminée avec ses propres pages, données et flux de travail. Quatre catégories permanentes ; " +
      "un projet est un dossier nommé à l'intérieur de l'une d'elles.",
    projectsCountOne: "1 projet", projectsCountMany: "{n} projets",
  },
  it: {
    breadcrumb: "Progetti",
    title: "Tutte le categorie",
    description:
      "Linee di lavoro indipendenti che questo spazio di lavoro esegue — ogni progetto è una piccola " +
      "applicazione completa con le proprie pagine, dati e flusso di lavoro. Quattro categorie permanenti; " +
      "un progetto è una cartella con nome all'interno di una di esse.",
    projectsCountOne: "1 progetto", projectsCountMany: "{n} progetti",
  },
  de: {
    breadcrumb: "Projekte",
    title: "Alle Kategorien",
    description:
      "Unabhängige Arbeitslinien, die dieser Workspace betreibt — jedes Projekt ist eine kleine fertige " +
      "Anwendung mit eigenen Seiten, Daten und Workflow. Vier feste Kategorien; ein Projekt ist ein benannter " +
      "Ordner innerhalb einer davon.",
    projectsCountOne: "1 Projekt", projectsCountMany: "{n} Projekte",
  },
  pt: {
    breadcrumb: "Projetos",
    title: "Todas as categorias",
    description:
      "Linhas de trabalho independentes que este espaço de trabalho executa — cada projeto é uma pequena " +
      "aplicação concluída com as suas próprias páginas, dados e fluxo de trabalho. Quatro categorias " +
      "permanentes; um projeto é uma pasta nomeada dentro de uma delas.",
    projectsCountOne: "1 projeto", projectsCountMany: "{n} projetos",
  },
  pl: {
    breadcrumb: "Projekty",
    title: "Wszystkie kategorie",
    description:
      "Niezależne linie pracy prowadzone przez tę przestrzeń roboczą — każdy projekt to niewielka, gotowa " +
      "aplikacja z własnymi stronami, danymi i przepływem pracy. Cztery stałe kategorie; projekt to nazwany " +
      "folder wewnątrz jednej z nich.",
    projectsCountOne: "1 projekt", projectsCountMany: "Projektów: {n}",
  },
  tr: {
    breadcrumb: "Projeler",
    title: "Tüm kategoriler",
    description:
      "Bu çalışma alanının yürüttüğü bağımsız iş hatları — her proje kendi sayfaları, verileri ve iş akışıyla " +
      "küçük, tamamlanmış bir uygulamadır. Dört kalıcı kategori; bir proje bunlardan birinin içindeki " +
      "adlandırılmış bir klasördür.",
    projectsCountOne: "1 proje", projectsCountMany: "{n} proje",
  },
  nl: {
    breadcrumb: "Projecten",
    title: "Alle categorieën",
    description:
      "Onafhankelijke werklijnen die deze werkruimte uitvoert — elk project is een kleine, afgeronde " +
      "applicatie met eigen pagina's, data en workflow. Vier permanente categorieën; een project is een " +
      "benoemde map binnen een van hen.",
    projectsCountOne: "1 project", projectsCountMany: "{n} projecten",
  },
};

export function projectsIndexStrings(lang: string): ProjectsIndexStrings {
  return PROJECTS_INDEX_I18N[lang.slice(0, 2)] ?? PROJECTS_INDEX_I18N.en;
}
