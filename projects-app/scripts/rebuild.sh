#!/usr/bin/env bash
# ПЕРЕСБОРКА projects-app (шаг 303) — запускается ТОЛЬКО из scheduleRebuild() (lib/nodes.ts) двойным
# fork'ом, чтобы сборка переподчинилась PID 1 и ВЫЖИЛА при `pm2 reload fractera-projects`.
#
# Корень, который это лечит (доказан живым экспериментом 2026-07-27): pm2 при reload убивает ВСЁ дерево
# процессов старого инстанса (treekill), а detached-сборка, порождённая route-handler'ом, остаётся в этом
# дереве. Сценарий «удалить → сразу создать»: сборка удаления в конце делает pm2 reload → treekill убивает
# сборку создания, ещё ждущую flock → маршрут новой автоматизации никогда не компилируется → вечный 404.
#
# $1 — момент запроса в наносекундах (Date.now()·10⁶). Коалесценция: если уже ЗАВЕРШИЛАСЬ сборка,
# НАЧАВШАЯСЯ после запроса, она сканировала папки уже с нашим изменением — повторная сборка не нужна.
REQ="${1:-0}"
LOCK=/tmp/projects-build.lock
DONE=/tmp/projects-build.done           # время СТАРТА последней успешной сборки (ns)
RELOAD_FLAG=/tmp/projects-build.reload-pending  # успешная сборка ждёт reload

# 🔒 RELOAD ДЕЛАЕТ ТОЛЬКО ПОСЛЕДНЯЯ СБОРКА ОЧЕРЕДИ (инцидент 2026-07-27, «Internal Server Error» на всей
# зоне). Если reload сделать, пока СЛЕДУЮЩАЯ сборка уже переписывает `.next`, свежеперезапущенный
# `next start` стартует поверх наполовину переписанного каталога (manifest на мгновение исчезает) и
# отдаёт 500 на КАЖДЫЙ запрос до конца той сборки. Поэтому: успешная сборка ставит RELOAD_FLAG, а сам
# reload выполняется только когда очередь пуста — сервер живёт на старом `.next` весь цикл очереди и
# перезапускается ровно один раз, по финальному состоянию.
#
# Очередь считается ЯВНЫМИ маркерами PID (не fuser: тот считал и собственный подпроцесс $(…) скрипта —
# reload откладывался вечно при пустой очереди). Каждый rebuild.sh до flock кладёт файл со своим PID,
# после захвата замка убирает; маркер мёртвого PID — мусор, чистится на месте.
QUEUE=/tmp/projects-build.queue
mkdir -p "$QUEUE"
echo $$ > "$QUEUE/$$"

queue_busy() {
  local f pid
  for f in "$QUEUE"/*; do
    [ -e "$f" ] || continue
    pid=$(basename "$f")
    if kill -0 "$pid" 2>/dev/null; then return 0; else rm -f "$f"; fi
  done
  return 1
}

reload_if_last() {
  if queue_busy; then
    [ -n "${LOG:-}" ] && echo "=== reload deferred: очередь не пуста — перезапустит последняя сборка" >>"$LOG"
    return 0
  fi
  if [ -f "$RELOAD_FLAG" ]; then
    rm -f "$RELOAD_FLAG"
    pm2 reload fractera-projects >>"${LOG:-/dev/null}" 2>&1
  fi
}

exec 9>"$LOCK"
flock 9
rm -f "$QUEUE/$$"   # замок наш — из очереди ожидания мы вышли

LAST_START=$(cat "$DONE" 2>/dev/null || echo 0)
if [ "$LAST_START" -gt "$REQ" ] 2>/dev/null; then
  # состояние папок на момент запроса уже собрано более поздней сборкой; но если та сборка отложила
  # reload на очередь (а очередь — это мы), перезапуск обязан случиться здесь
  reload_if_last
  exit 0
fi

START=$(date +%s%N)
LOG="/tmp/schedule-rebuild.$(date +%Y%m%d-%H%M%S).log"   # свой файл на КАЖДУЮ сборку — прежний общий
ln -sfn "$LOG" /tmp/schedule-rebuild.log                 # `>`-редирект затирал лог ещё идущей сборки

cd /opt/fractera/projects-app || exit 1

{
  echo "=== rebuild start $(date -Is) req=$REQ start=$START"
  # диагностика гонок: какие папки автоматизаций видит ИМЕННО ЭТА сборка на старте
  find "app/(projects)/projects" -mindepth 2 -maxdepth 2 -type d ! -path "*/_*" -printf "  seen: %p\n" 2>/dev/null
} >"$LOG" 2>&1

# только кэш ТИПОВ (осиротевшие ссылки удалённых страниц); полная rm -rf .next кладёт живой сайт — запрещена
rm -rf .next/types

if npm run build >>"$LOG" 2>&1; then
  echo "$START" >"$DONE"
  touch "$RELOAD_FLAG"
  echo "=== build ok $(date -Is)" >>"$LOG"
  reload_if_last
else
  echo "=== BUILD FAILED $(date -Is)" >>"$LOG"
fi

# держим последние 10 логов (симлинк /tmp/schedule-rebuild.log под шаблон не попадает)
ls -1t /tmp/schedule-rebuild.*.log 2>/dev/null | tail -n +11 | xargs -r rm -f
