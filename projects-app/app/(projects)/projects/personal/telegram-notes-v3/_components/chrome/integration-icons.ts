import { Link, Mail, Send } from "lucide-react";

// КЛЮЧ КАНАЛА → ЕГО ИКОНКА. Один список, один читатель (карта перенесена из прежнего самописного
// `icons.tsx`, шаг 298: самописные SVG заменены на lucide — во v2 самописные UI-элементы запрещены).
// Незнакомый ключ иконки не получает — рисовать чужой значок хуже, чем ни одного.
export const INTEGRATION_ICONS: Record<string, typeof Send> = {
  "telegram-bot": Send,
  email: Mail,
  "external-automation": Link,
};
