// СЛОВАРЬ ЗАПУСКАТЕЛЯ дев-консоли — десять языков. `launch` перенесён ДОСЛОВНО из v1 `_shared/wave-i18n.ts`
// (`bannerLaunch`) по правилу переноса переводов; `failed` — единственная новая фраза (в v1 точного аналога
// нет). Микросервис самодостаточен: свои строки, не тянет `wave-i18n` из v1.
export type LauncherStrings = { launch: string; failed: string; busy: string };

// `launch` — из v1 `wave-i18n.bannerLaunch` дословно. `failed`/`busy` — новые (в v1 аналога нет). `busy` —
// guard конфликта: одна разработка за раз; `{a}` = адрес уже разрабатываемой автоматизации.
const I18N: Record<string, LauncherStrings> = {
  en: { launch: "Launch development", failed: "Could not open the console.", busy: "Finish the current development ({a}) first." },
  ru: { launch: "Запустить разработку", failed: "Не удалось открыть консоль.", busy: "Сначала заверши текущую разработку ({a})." },
  es: { launch: "Lanzar el desarrollo", failed: "No se pudo abrir la consola.", busy: "Termina primero el desarrollo actual ({a})." },
  fr: { launch: "Lancer le développement", failed: "Impossible d'ouvrir la console.", busy: "Terminez d'abord le développement en cours ({a})." },
  it: { launch: "Avvia lo sviluppo", failed: "Impossibile aprire la console.", busy: "Termina prima lo sviluppo in corso ({a})." },
  de: { launch: "Entwicklung starten", failed: "Konsole konnte nicht geöffnet werden.", busy: "Beende zuerst die laufende Entwicklung ({a})." },
  pt: { launch: "Lançar o desenvolvimento", failed: "Não foi possível abrir a consola.", busy: "Termine primeiro o desenvolvimento atual ({a})." },
  pl: { launch: "Uruchom rozwój", failed: "Nie udało się otworzyć konsoli.", busy: "Najpierw zakończ bieżący rozwój ({a})." },
  tr: { launch: "Geliştirmeyi başlat", failed: "Konsol açılamadı.", busy: "Önce mevcut geliştirmeyi ({a}) bitirin." },
  nl: { launch: "Ontwikkeling starten", failed: "Kon de console niet openen.", busy: "Rond eerst de huidige ontwikkeling ({a}) af." },
};

export function launcherStrings(lang: string): LauncherStrings {
  return I18N[lang.toLowerCase().slice(0, 2)] ?? I18N.en;
}
