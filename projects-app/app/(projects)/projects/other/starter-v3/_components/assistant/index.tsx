import type { Entity } from "../../_data/automation.schema";
import { DEFAULT_ASSISTANT } from "../../_lib/components/conversation/config";
import { loadAutomation } from "../../_data/load";
import AssistantForm, { type AssistantData } from "./public/assistant-form.client";
import AccessRoles from "./public/access-roles.client";
import AssistantAiRequest from "./admin/ai-request";

// ВКЛАДКА «АССИСТЕНТ» — интерфейс разговорного слоя (шаг 309). Одна сущность = один набор настроек речи
// автоматизации; её `data` читает узел `converse` (`assistantConfigOf`), а правит форма ниже через
// `api/patch`. Сервер-компонент только достаёт данные из ядра и отдаёт клиентской форме.
function toData(entity: Entity): AssistantData {
  const raw = (entity.data ?? {}) as Record<string, unknown>;
  const mem = (raw.memory ?? {}) as Record<string, unknown>;
  const lang = (raw.language ?? {}) as Record<string, unknown>;
  const qa = Array.isArray(raw.qa) ? raw.qa : [];
  return {
    instruction: typeof raw.instruction === "string" ? raw.instruction : DEFAULT_ASSISTANT.instruction,
    memory: {
      lastN: typeof mem.lastN === "number" ? mem.lastN : DEFAULT_ASSISTANT.lastN,
      ttlMinutes: typeof mem.ttlMinutes === "number" ? mem.ttlMinutes : DEFAULT_ASSISTANT.ttlMinutes,
      tokenBudget: typeof mem.tokenBudget === "number" ? mem.tokenBudget : DEFAULT_ASSISTANT.tokenBudget,
    },
    revealCapabilities: raw.revealCapabilities !== false,
    language: {
      mode: lang.mode === "fixed" ? "fixed" : "auto",
      fixed: typeof lang.fixed === "string" ? lang.fixed : "",
    },
    qa: qa.map((p) => ({ q: String((p as { q?: unknown }).q ?? ""), a: String((p as { a?: unknown }).a ?? "") })),
  };
}

export default async function Assistant({ entities, lang }: { entities: Entity[]; lang: string }) {
  const entity = entities[0];
  if (!entity) return null;
  // Роли доступа живут в ПАСПОРТЕ (не в entity вкладки) — читаем ядро; массив ролей (пусто = публично).
  const core = await loadAutomation();
  const access = Array.isArray(core.passport.access) ? core.passport.access.map(String) : [];
  return (
    <div data-entity="assistant" className="space-y-6">
      <AssistantForm cuid={entity.cuid} data={toData(entity)} lang={lang} />
      <div className="border-t pt-4">
        <AccessRoles access={access} lang={lang} />
      </div>
      <AssistantAiRequest entities={entities} lang={lang} />
    </div>
  );
}
