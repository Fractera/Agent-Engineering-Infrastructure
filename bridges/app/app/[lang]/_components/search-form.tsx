// Форма поиска (шаг 501). СЕРВЕРНЫЙ компонент, общий для всех разделов, которым
// нужен поиск: пользователи, медиатека, векторная память.
//
// Поиск живёт в АДРЕСЕ, а не в состоянии браузера. Обычная форма `method="get"`
// даёт то, чего задержка на каждой букве дать не может: работу без JS, ссылку с
// запросом, которую можно сохранить и переслать, и «назад», возвращающий
// предыдущий запрос вместо пустоты.
//
// Поднят из папки раздела в общую по правилу низшего общего предка: как только
// у данных появился второй потребитель, они переезжают ровно на один уровень
// выше — и не выше.

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchForm(
  { name = "q", value, placeholder, submit, resetPage = false }: {
    name?: string;
    value: string;
    placeholder: string;
    submit: string;
    // Разделам с постраничностью новый поиск обязан начинаться с первой
    // страницы: искать на пятой странице прежнего запроса — способ увидеть
    // пусто и не понять почему.
    resetPage?: boolean;
  },
) {
  return (
    <form method="get" className="flex items-center gap-2">
      {resetPage && <input type="hidden" name="page" value="1" />}
      <Input name={name} defaultValue={value} placeholder={placeholder} className="h-7 text-[11px]" />
      <Button type="submit" variant="outline" size="sm" className="h-7 shrink-0 text-[11px]">
        <Search size={11} />
        <span className="hidden sm:inline">{submit}</span>
      </Button>
    </form>
  );
}
