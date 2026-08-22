// Слова страницы «Секции» — ТОЛЬКО ПО-АНГЛИЙСКИ, и это решение владельца
// (2026-08-22): «секции не переводим».
//
// 🔒 ПОЭТОМУ ОНИ ЖИВУТ ЗДЕСЬ, А НЕ В СЛОВАРЕ ПАНЕЛИ. Словарь требует значения на
// каждый включённый язык, и русская ячейка с английским текстом внутри — ложь
// механизму: проверка полноты считала бы её переводом, а следующая партия перевода
// послушно перевела бы обратно. Страница, которая не переводится, не должна делать
// вид, что переводится.
//
// Названия типов, назначения и описания видов приходят из каталога приложения и
// тоже английские: это общий словарь архитектора и агента, а не текст для
// посетителя.
//
// Навигация и хлебные крошки остаются переведёнными — это мебель панели, и она
// живёт в общем словаре как у всех страниц.

export const SECTIONS_UI = {
  introTitle: "Sections and blocks — the same thing seen from two sides",
  intro: [
    "A page here is a LIST OF BLOCKS, not a laid-out file: the words live as data, and how they look is decided by the section that draws them. A rule added to one kind reaches every page where it appears.",
    "A section is a kind of block with a purpose. The eleven types below sort them by that purpose — ten are the classic parts of a landing page, the eleventh is the material a page is written from: paragraphs, lists, tables, code.",
  ],

  addTitle: "How to add a new section",
  addBody: [
    "New sections are written by the agent-programmer, not in this panel. Open the project on your own machine and say, in your own words:",
  ],
  addQuote:
    "I want to create a new section in the <Hero> group. Here is what it should do: … You may add a code example.",
  addAfter:
    "When the section is ready, come back to this tab and look at what the design turned out to be. Not right — go back and refine it. The catalogue here is rebuilt with the project, so the new section shows up on its own.",

  previewNote:
    "This is the DEFAULT look. On your site the section is repainted by your own tokens — colour, font, corner radius, density — so it will look different there. What the preview shows faithfully is the structure: what stands where, how many elements, whether there is an image.",

  typeEmpty: "No section serves this type yet",
  pickHint: "Open a type on the left and pick a section to see what it looks like.",
  back: "All sections",

  idLabel: "id",
  fieldsLabel: "What it carries",
  descriptionLabel: "What the agent reads when choosing this section",
  noDescription:
    "No notes yet. They are written the moment something is learned about a section — usually when the owner corrects how it looks and says why.",
  usedOnLabel: "Where it stands today",
  usedNowhere: "Not used on any page yet",
  usedTimes: "×",
  orderLabel: "position",

  emptyTitle: "No section catalogue in the project",
  emptyBody:
    "The panel reads sections/SECTIONS.json from the application. The file appears when the application is built; a guest project without a sections layer does not have one at all, and that is normal.",
} as const;
