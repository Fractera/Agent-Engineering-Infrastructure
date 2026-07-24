// СЛОВАРЬ админ-половины пульта — десять языков (закон 4г), англ. фолбэк. Дев-слой.
// Строки СКОПИРОВАНЫ ДОСЛОВНО из словаря вкладки (`_components/control-panel/i18n.ts`): переиспользуем
// готовую мультиязычность, ничего не сочиняем.
export type ControlPanelAdminStrings = {
  settings: string;
  settingsHint: string;
  noParams: string;
  paramKey: string;
  paramType: string;
  required: string;
  optional: string;
};

const I18N: Record<string, ControlPanelAdminStrings> = {
  en: { settings: "Request settings", settingsHint: "What this control panel asks for. The fields come from the core — change the core, the panel changes.", noParams: "This panel declares no fields yet.", paramKey: "Field", paramType: "Type", required: "required", optional: "optional" },
  ru: { settings: "Настройка запроса", settingsHint: "Что спрашивает этот пульт. Поля берутся из ядра — меняется ядро, меняется пульт.", noParams: "Пульт пока не объявил ни одного поля.", paramKey: "Поле", paramType: "Тип", required: "обязательное", optional: "необязательное" },
  es: { settings: "Ajustes de la consulta", settingsHint: "Lo que pide este panel. Los campos vienen del núcleo: cambia el núcleo y cambia el panel.", noParams: "Este panel aún no declara campos.", paramKey: "Campo", paramType: "Tipo", required: "obligatorio", optional: "opcional" },
  fr: { settings: "Réglages de la demande", settingsHint: "Ce que demande ce panneau. Les champs viennent du noyau : changez le noyau, le panneau change.", noParams: "Ce panneau ne déclare encore aucun champ.", paramKey: "Champ", paramType: "Type", required: "obligatoire", optional: "facultatif" },
  it: { settings: "Impostazioni della richiesta", settingsHint: "Cosa chiede questo pannello. I campi vengono dal nucleo: cambia il nucleo e cambia il pannello.", noParams: "Questo pannello non dichiara ancora campi.", paramKey: "Campo", paramType: "Tipo", required: "obbligatorio", optional: "facoltativo" },
  de: { settings: "Anfrage-Einstellungen", settingsHint: "Wonach dieses Pult fragt. Die Felder kommen aus dem Kern — ändere den Kern, ändert sich das Pult.", noParams: "Dieses Pult deklariert noch keine Felder.", paramKey: "Feld", paramType: "Typ", required: "erforderlich", optional: "optional" },
  pt: { settings: "Definições do pedido", settingsHint: "O que este painel pergunta. Os campos vêm do núcleo — muda o núcleo, muda o painel.", noParams: "Este painel ainda não declara campos.", paramKey: "Campo", paramType: "Tipo", required: "obrigatório", optional: "opcional" },
  pl: { settings: "Ustawienia zapytania", settingsHint: "O co pyta ten pulpit. Pola pochodzą z rdzenia — zmień rdzeń, zmieni się pulpit.", noParams: "Ten pulpit nie deklaruje jeszcze pól.", paramKey: "Pole", paramType: "Typ", required: "wymagane", optional: "opcjonalne" },
  tr: { settings: "İstek ayarları", settingsHint: "Bu panelin ne sorduğu. Alanlar çekirdekten gelir — çekirdeği değiştir, panel değişir.", noParams: "Bu panel henüz alan tanımlamıyor.", paramKey: "Alan", paramType: "Tür", required: "zorunlu", optional: "isteğe bağlı" },
  nl: { settings: "Aanvraaginstellingen", settingsHint: "Wat dit paneel vraagt. De velden komen uit de kern — verander de kern en het paneel verandert mee.", noParams: "Dit paneel declareert nog geen velden.", paramKey: "Veld", paramType: "Type", required: "verplicht", optional: "optioneel" },
};

export const controlPanelAdminStrings = (lang: string): ControlPanelAdminStrings =>
  I18N[lang.toLowerCase().slice(0, 2)] ?? I18N.en;

/** Текст ядра — строка либо карта языков; берём язык страницы (перенос `shared/localized.pick`). */
export function pick(value: unknown, lang: string): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const map = value as Record<string, unknown>;
    const v = map[lang.slice(0, 2)] ?? map.en;
    if (typeof v === "string") return v;
  }
  return "";
}
