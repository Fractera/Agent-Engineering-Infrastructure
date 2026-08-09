// Метка рода документа (шаг 501, слой «Документы»).
//
// Серверный компонент: это подпись, а не поведение.
//
// Отвечает на вопрос, который иначе задаёт каждый, кто открыл страницу впервые:
// «мне это править или оно само?». Саморазвивающийся документ агент дополняет по
// ходу работы; заданный — пишет владелец, а агент ему подчиняется.

export function DocKindBadge(
  { kind, evolvingLabel, staticLabel, evolvingHint, staticHint }: {
    kind: "evolving" | "static";
    evolvingLabel: string;
    staticLabel: string;
    evolvingHint: string;
    staticHint: string;
  },
) {
  const evolving = kind === "evolving";
  return (
    <span
      title={evolving ? evolvingHint : staticHint}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
        evolving
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-border bg-muted text-muted-foreground"
      }`}
    >
      <span className={`size-1.5 rounded-full ${evolving ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
      {evolving ? evolvingLabel : staticLabel}
    </span>
  );
}
