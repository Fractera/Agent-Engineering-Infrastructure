"use client";

// Приветственная врезка «сервер поднят» (шаг 501, Ф2). Показывается ОДИН раз за
// всё время и больше никогда.
//
// ПОЧЕМУ ОСТРОВОК, А НЕ СЕРВЕРНАЯ РАЗМЕТКА. «Этот человек уже видел
// приветствие» — факт его браузера, серверу он неизвестен. Прочитать его на
// сервере значило бы завести cookie и сделать страницу динамической ради одной
// врезки. Флаг тот же, что был в старой панели (`fractera.howToBuild.seen`),
// поэтому владелец, уже прочитавший руководство в старой оболочке, приветствие
// второй раз не увидит.
//
// Отказ хранилища считается как «уже видел»: приватное окно не должно
// показывать приветствие при каждом визите, а браузер, запрещающий хранилище, —
// не повод навязываться. Правило унаследовано из старой панели дословно.
//
// Само-открытие руководства при первом входе (в старой оболочке его открывала
// оболочка) вернётся на переключении, вместе с точкой входа после авторизации.

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const SEEN_KEY = "fractera.howToBuild.seen";

export function FirstRunNote({ title, body }: { title: string; body: string }) {
  // `null` = ещё не знаем; на сервере знать неоткуда. Показываем только после
  // монтирования, поэтому врезка не мигает у того, кто её уже видел.
  const [show, setShow] = useState<boolean | null>(null);

  useEffect(() => {
    let seen = true;
    try {
      seen = window.localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      seen = true;
    }
    setShow(!seen);
    if (!seen) {
      try {
        window.localStorage.setItem(SEEN_KEY, "1");
      } catch { /* хранилище отказало — приветствие просто покажется ещё раз */ }
    }
  }, []);

  if (!show) return null;

  return (
    <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
      <div className="mb-1.5 flex items-center gap-2">
        <Sparkles size={13} className="text-primary" />
        <span className="text-[12px] font-semibold text-foreground">{title}</span>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
