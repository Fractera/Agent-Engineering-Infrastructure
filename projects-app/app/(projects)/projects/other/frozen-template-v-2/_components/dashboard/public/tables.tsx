import { DevSlot } from "../../shared/dev-slot";
import { DevDashboard } from "../../shared/dev-slot.client";

// ПУБЛИЧНАЯ ПОЛОВИНА дашборда — та же перенесённая таблица v1, но в режиме ТОЛЬКО ЧТЕНИЕ (`mode="view"`):
// посетитель витрины видит записи, ищет и листает их, открывает карточку записи и «живое» значение — но
// строк не добавляет, не правит и не удаляет (мост админа ей не передаётся, ровно как в v1).
export default function DashboardPublic({ lang }: { lang: string }) {
  return (
    <DevSlot>
      <DevDashboard lang={lang} mode="view" />
    </DevSlot>
  );
}
