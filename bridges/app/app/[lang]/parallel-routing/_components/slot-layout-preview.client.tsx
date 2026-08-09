"use client";

import React from "react";
import type { SlotName } from "../_lib/slots";

// Живой чертёж раскладки (шаг 501, партия 18 — перенос без изменения поведения).
// Блоки двигаются и меняют размер за 300 мс, пока области включают и выключают:
// левая и правая выезжают, промо и центр подстраиваются.
//
// ЕДИНСТВЕННОЕ отличие от прежней версии: подписи областей приезжают ПРОПСАМИ.
// Раньше они были вшиты по-английски; словарь панели серверный (закон шага 501),
// поэтому клиентский файл не имеет права его импортировать.

function Block({
  label,
  active,
  hovered,
  style,
}: {
  label: string;
  active: boolean;
  hovered: boolean;
  style?: React.CSSProperties;
}) {
  const color = hovered
    ? "bg-primary/60 text-primary-foreground"
    : active
    ? "bg-primary text-primary-foreground"
    : "bg-muted text-muted-foreground";
  return (
    <div
      className={`flex items-center justify-center text-[9px] font-medium rounded transition-colors duration-300 select-none overflow-hidden ${color}`}
      style={style}
    >
      <span className="truncate px-1">{label}</span>
    </div>
  );
}

const PROMO_H = 14;
const CH_H = 15;
const CF_H = 15;

export function SlotLayoutPreview({
  active,
  hovered,
  labels,
  centerLabel,
}: {
  active: Set<SlotName>;
  hovered: SlotName | null;
  labels: Record<SlotName, string>;
  // При выключенной параллельной маршрутизации именованных областей нет вовсе:
  // середину заполняет собственный `children` Next. Назвать её «Центром» значило
  // бы назвать механизм, который не работает.
  centerLabel: string;
}) {
  const on = (s: SlotName) => active.has(s);
  const h = (s: SlotName) => hovered === s;

  return (
    <div className="flex-[3] p-4 border-r border-border flex flex-col gap-1 min-w-0">
      <Block label={labels.header} active={on("header")} hovered={h("header")} style={{ flex: "0 0 7%", minHeight: 20 }} />

      <div className="relative flex-1 min-h-0">
        <Block
          label={labels.left}
          active={on("left")}
          hovered={h("left")}
          style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: on("left") ? "calc(20% - 4px)" : 0, overflow: "hidden", transition: "width 300ms ease-in-out" }}
        />
        <Block
          label={labels.right}
          active={on("right")}
          hovered={h("right")}
          style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: on("right") ? "calc(20% - 4px)" : 0, overflow: "hidden", transition: "width 300ms ease-in-out" }}
        />

        {on("promoScreen") && (
          <Block
            label={labels.promoScreen}
            active={on("promoScreen")}
            hovered={h("promoScreen")}
            style={{ position: "absolute", top: 0, left: on("left") ? "calc(20% + 2px)" : 0, right: on("right") ? "calc(20% + 2px)" : 0, height: on("center") ? `${PROMO_H}%` : "100%", minHeight: 16, transition: "left 300ms ease-in-out, right 300ms ease-in-out, height 300ms ease-in-out" }}
          />
        )}

        {on("center") && (
          <div className="absolute bottom-0 flex flex-col gap-1" style={{ left: "20%", right: "20%", top: on("promoScreen") ? `calc(${PROMO_H}% + 4px)` : 0 }}>
            {on("centerHeader") && <Block label={labels.centerHeader} active={on("centerHeader")} hovered={h("centerHeader")} style={{ flex: `0 0 ${CH_H}%` }} />}
            <Block label={centerLabel} active={on("center")} hovered={h("center")} style={{ flex: 1 }} />
            {on("centerFooter") && <Block label={labels.centerFooter} active={on("centerFooter")} hovered={h("centerFooter")} style={{ flex: `0 0 ${CF_H}%` }} />}
          </div>
        )}
      </div>

      <Block label={labels.footer} active={on("footer")} hovered={h("footer")} style={{ flex: "0 0 5%", minHeight: 12 }} />
    </div>
  );
}
