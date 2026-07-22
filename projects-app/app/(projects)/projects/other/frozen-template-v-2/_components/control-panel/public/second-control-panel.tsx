import type { Entity } from "../../../_data/automation.schema";
import type { Surface } from "../../surface";
import FirstControlPanel from "./first-control-panel";

// ВТОРОЙ ПУЛЬТ — ВРЕМЕННЫЙ ДУБЛЬ первого, заведённый ради проверки вложенных аккордеонов (владелец,
// 2026-07-22). Удаляется вместе со своей entity в ядре, как только проверка пройдена.
//
// Что пульт спрашивает и как отвечает — сказано в ядре (`entity.data`), поэтому дубль ссылается на тот же
// вид: у второго пульта своя entity, свои поля и свой ответ, а разметка одна.
export default function SecondControlPanel({ entity, lang, surface }: { entity: Entity; lang: string; surface: Surface }) {
  return <FirstControlPanel entity={entity} lang={lang} surface={surface} />;
}
