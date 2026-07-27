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
DONE=/tmp/projects-build.done   # время СТАРТА последней успешной сборки (ns)

exec 9>"$LOCK"
flock 9

LAST_START=$(cat "$DONE" 2>/dev/null || echo 0)
if [ "$LAST_START" -gt "$REQ" ] 2>/dev/null; then
  exit 0  # состояние папок на момент запроса уже собрано более поздней сборкой
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
  echo "=== build ok $(date -Is) — pm2 reload" >>"$LOG"
  pm2 reload fractera-projects >>"$LOG" 2>&1
else
  echo "=== BUILD FAILED $(date -Is)" >>"$LOG"
fi

# держим последние 10 логов (симлинк /tmp/schedule-rebuild.log под шаблон не попадает)
ls -1t /tmp/schedule-rebuild.*.log 2>/dev/null | tail -n +11 | xargs -r rm -f
