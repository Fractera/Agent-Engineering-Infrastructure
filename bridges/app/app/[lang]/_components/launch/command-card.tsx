import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// АНАТОМИЯ КАРТОЧКИ КОМАНДЫ (28-12, 2026-08-31). Серверный элемент.
//
// 🔒 ОДИН ФАЙЛ НА ТРИ КАРТОЧКИ, И ЭТО НЕ ЭКОНОМИЯ СТРОК. Порядок «значок →
// заголовок → описание → действие» переставить снаружи нельзя, а действие можно
// не дать вовсе. Три карточки, написанные по отдельности, разъезжаются — замер,
// оплаченный в 28-2 на экране выбора пути, а не опасение.
//
// 🔒 ДЕЙСТВИЕ ПРИХОДИТ ДЕТЁНЫШЕМ, А НЕ ПРОПСОМ-ФУНКЦИЕЙ. Карточка серверная,
// кнопка клиентская: серверный элемент не имеет права знать, что происходит по
// нажатию, — он знает только, ГДЕ это происходит. Так островок остаётся один на
// всю страницу, а не по одному на карточку.
//
// 🔒 РАЗМЕРЫ ТЕКСТА — КЛАССАМИ ПАНЕЛИ, а не своими числами: у панели своя шкала
// (`[11px]`/`[12px]`), и карточка обязана попадать в неё, а не спорить с соседями.
export function CommandCard({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  /** Кнопка команды. Нет действия — карточка остаётся описанием, как была. */
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border p-3" data-command-card>
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
        <Icon size={12} className="text-muted-foreground" />
        {title}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{body}</p>
      {action ? <div className="mt-2.5">{action}</div> : null}
    </div>
  );
}
