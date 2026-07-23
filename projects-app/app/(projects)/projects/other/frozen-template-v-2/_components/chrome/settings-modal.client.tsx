"use client";

import { chromeStrings } from "./i18n";
import { CloseIcon } from "./icons";
import ChannelsSection, { type ChannelRow } from "./channels-section.client";

// НАСТРОЙКИ — модальное окно записи «Настройки» гамбургер-меню. Сюда переезжает всё, что НАСТРАИВАЮТ,
// и первым переехали каналы (решение владельца 2026-07-23).
//
// ПОЧЕМУ НЕ В САМОМ МЕНЮ. Меню — это навигация: короткий список, по которому пробегают глазами и жмут
// один раз. Настройка канала — работа: переключатели, состояния, форма ключей поверх. Работа внутри
// выпадающего списка растит его до высоты экрана и захлопывается от случайного клика мимо. Поэтому
// меню осталось меню, а настройки получили своё окно.
//
// ВЫСОТА ОГРАНИЧЕНА 600px, ПРОКРУТКА ВНУТРИ (требование владельца): настроек будет прибавляться, и окно
// не имеет права расти вниз за край экрана — иначе нижняя часть станет недостижимой.
export default function SettingsModal({
  lang,
  channels,
  open,
  onClose,
}: {
  lang: string;
  channels: ChannelRow[];
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  const L = chromeStrings(lang);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label={L.settingsItem}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[520px] flex-col rounded-lg border bg-background shadow-xl"
        style={{ maxHeight: 600 }}
      >
        {/* Шапка и подвал не прокручиваются — крестик обязан оставаться на месте при любом объёме настроек. */}
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">{L.settingsItem}</span>
          <button type="button" onClick={onClose} aria-label={L.cancel} className="text-muted-foreground hover:text-foreground">
            <CloseIcon className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <ChannelsSection channels={channels} lang={lang} />
        </div>
      </div>
    </div>
  );
}
