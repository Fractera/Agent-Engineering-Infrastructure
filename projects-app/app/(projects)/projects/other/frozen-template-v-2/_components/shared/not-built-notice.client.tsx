"use client";

import { useState } from "react";
import Toast from "./toast.client";

// «АВТОМАТИЗАЦИЯ ЕЩЁ НЕ ПОСТРОЕНА» — то, что видит человек, пришедший по публичной ссылке на
// автоматизацию, которая пока остаётся замороженным шаблоном. Вместо страницы — один честный тост:
// показывать пустую витрину было бы обманом, а молча вести на 404 — тупиком.
//
// Тост НЕ гаснет сам: это не уведомление о событии, а единственное содержимое страницы. Закрыть можно
// кликом — тогда под ним останется пустая страница, что тоже честно.
//
// Тексты пока ТОЛЬКО английские (решение владельца на этот шаг); словарь на десять языков заводится,
// когда владелец скажет — правило 4г тогда применяется к этим же строкам.
const TEXT = "This automation has not been built yet. Open its control panel, finish the setup, then return to this link.";

export default function NotBuiltNotice() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return <Toast text={TEXT} tone="fail" onClose={() => setOpen(false)} />;
}
