// ТИПЫ микросервиса «пульт запуска» (админ-половина) — ДЕВ-СЛОЙ. Автоматизация-агностичны: структурная
// форма того, что отдаёт дверь `api/core?select=tab:control-panel`, а не импорт схемы автоматизации.

/** Объявленное поле формы пульта (ядро: `entity.data.params`). */
export type Param = {
  key: string;
  type?: "text" | "longtext" | "number";
  required?: boolean;
  label?: unknown;
  placeholder?: unknown;
};

/** Сущность вкладки — один пульт. `data` несёт объявление формы и подписи. */
export type PanelEntity = {
  cuid: string;
  name: string;
  data: Record<string, unknown>;
};

/** Ответ двери чтения по адресу вкладки. */
export type ControlPanelTab = {
  name: string;
  entities: PanelEntity[];
};

export const paramsOf = (entity: PanelEntity): Param[] => {
  const raw = entity.data.params;
  return Array.isArray(raw) ? (raw as Param[]) : [];
};
