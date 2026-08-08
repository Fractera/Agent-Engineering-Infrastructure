// Переключатель языка в правом нижнем углу (шаг 501). Серверный компонент,
// обычные ссылки — ни байта JS.
//
// Каждая ссылка ведёт в `/api/lang/<код>`, который читает Referer, подменяет
// первый сегмент адреса и отвечает 302 на ту же страницу в выбранном языке,
// запоминая выбор в cookie. Поэтому переключатель не обязан знать, на какой
// странице он сейчас находится, и layout остаётся статическим.
//
// Пока языков два, это две подписи рядом. Когда словарь дорастёт до 82, здесь
// встанет `<details>`-список (тот же приём, что у гамбургера, тоже без JS), а
// маршрут-обработчик не изменится.

import { adminLanguages } from "@/lib/i18n/admin-strings";

// Родное имя языка — то, что человек ищет глазами. Список ведётся здесь и
// растёт вместе со словарём; это НЕ переводимые строки (правило 4г).
const NATIVE: Record<string, string> = {
  en: "EN",
  ru: "RU",
};

export function LanguageSwitch({ lang }: { lang: string }) {
  const languages = adminLanguages();

  return (
    <span className="flex shrink-0 items-center rounded border border-border">
      {languages.map((code) => {
        const active = code === lang;
        return (
          <a
            key={code}
            href={`/api/lang/${code}`}
            aria-current={active ? "true" : undefined}
            title={NATIVE[code] ?? code.toUpperCase()}
            className={`px-1.5 py-0.5 font-mono text-[10px] transition-colors first:rounded-l last:rounded-r ${
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {NATIVE[code] ?? code.toUpperCase()}
          </a>
        );
      })}
    </span>
  );
}
