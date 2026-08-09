// Список развёртываний (шаг 501, Ф2, партия 13). СЕРВЕРНЫЙ компонент.
//
// Каждый прогон — ссылка на себя же (`?run=<id>`), поэтому выбор прогона живёт в
// адресе: журнал открывается без JS, ссылку на конкретную сборку можно переслать, а
// «назад» закрывает журнал. В панели это было состоянием браузера.

import Link from "next/link";
import {
  CheckCircle2, XCircle, AlertTriangle, Clock, Undo2, MinusCircle, ArrowDownToLine,
} from "lucide-react";
import { whenLabel, howLong, type Run } from "../_lib/runs";

// Иконка на состояние. Виды взяты из панели дословно: у каждого свой смысл, и
// сводить их к «успех/провал» значило бы стереть откат и пропуск.
const ICON: Record<string, React.ReactNode> = {
  COMPLETED: <CheckCircle2 size={12} className="text-emerald-500" />,
  FAILED: <XCircle size={12} className="text-destructive" />,
  HEALTH_FAILED: <AlertTriangle size={12} className="text-amber-500" />,
  ROLLED_BACK: <Undo2 size={12} className="text-amber-500" />,
  RUNNING: <Clock size={12} className="text-sky-500" />,
  PULLED: <ArrowDownToLine size={12} className="text-sky-500" />,
  SKIPPED: <MinusCircle size={12} className="text-muted-foreground" />,
};

export function RunsList(
  { runs, activeId, hrefFor, labels }: {
    runs: Run[];
    activeId: string | null;
    hrefFor: (id: string) => string;
    labels: { empty: string; noCommit: string };
  },
) {
  if (!runs.length) {
    return <p className="py-8 text-center text-[11px] text-muted-foreground">{labels.empty}</p>;
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {runs.map((r) => {
        const active = r.id === activeId;
        return (
          <li key={r.id}>
            <Link
              href={hrefFor(r.id)}
              aria-current={active ? "true" : undefined}
              className={`flex flex-wrap items-center gap-2 px-3 py-2 text-[11px] transition-colors ${
                active ? "bg-muted" : "hover:bg-muted/50"
              }`}
            >
              {ICON[r.status] ?? <MinusCircle size={12} className="text-muted-foreground" />}
              <span className="font-mono text-[10px] whitespace-nowrap text-muted-foreground">
                {whenLabel(r.started_at)}
              </span>
              <span className="min-w-0 flex-1 truncate text-foreground">{r.description}</span>
              <span className="font-mono text-[10px] whitespace-nowrap text-muted-foreground">
                {r.commit_hash ? r.commit_hash.slice(0, 7) : labels.noCommit}
              </span>
              <span className="font-mono text-[10px] whitespace-nowrap text-muted-foreground">
                {howLong(r.duration_ms)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
