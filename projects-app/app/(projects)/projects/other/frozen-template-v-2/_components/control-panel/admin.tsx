import type { Entity } from "../../_data/automation.schema";
import { controlPanelStrings, pick } from "./i18n";
import { paramsOf } from "./first-control-panel";

// ПУЛЬТ ЗАПУСКА АДМИНИСТРАТИВНЫЙ — настройка запроса: то, что дописывается ПОД публичной половиной
// и видно только владельцу. Посетителю не отдаётся никогда (образец v1: активация — использование,
// настройка — управление).
//
// Раскрывашка на <details>: работает без JavaScript (канон статики). Показывает поля КАЖДОГО пульта
// вкладки ровно так, как они объявлены в ядре — источник истины один, здесь его видно глазами.
export default function ControlPanelAdmin({ entities, lang }: { entities: Entity[]; lang: string }) {
  const L = controlPanelStrings(lang);

  return (
    <section data-control-panel="admin" className="border-t pt-3">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-sm font-medium hover:underline">
          {L.settings}
          <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="space-y-4 pb-2 pt-1">
          <p className="text-xs text-muted-foreground">{L.settingsHint}</p>
          {entities.map((entity) => {
            const params = paramsOf(entity);
            return (
              <div key={entity.cuid} className="space-y-2">
                <p className="text-sm font-medium">{pick((entity.data as Record<string, unknown>).title, lang) || entity.name}</p>
                {params.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{L.noParams}</p>
                ) : (
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="py-1 pr-4 font-medium">{L.paramKey}</th>
                        <th className="py-1 pr-4 font-medium">{L.paramType}</th>
                        <th className="py-1 font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {params.map((p) => (
                        <tr key={p.key} className="border-b last:border-b-0">
                          <td className="py-1 pr-4 font-mono text-xs">{p.key}</td>
                          <td className="py-1 pr-4">{p.type ?? "text"}</td>
                          <td className="py-1 text-xs text-muted-foreground">{p.required ? L.required : L.optional}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      </details>
    </section>
  );
}
