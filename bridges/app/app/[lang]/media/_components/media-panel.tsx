// Разметка раздела «media» (шаг 501, каркас). Серверный компонент — в браузер
// не уезжает ни байта JS. Когда сюда придёт взаимодействие, интерактивная часть
// станет соседним файлом `media.client.tsx`, а слова приедут в него пропсами.

export function MediaPanel() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="space-y-2">
        <div className="h-3 w-1/3 rounded bg-muted" />
        <div className="h-3 w-2/3 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
      </div>
    </div>
  );
}
