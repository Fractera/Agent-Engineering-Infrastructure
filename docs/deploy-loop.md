# Build & Deploy Loop — архитектура и компоненты

> Документ описывает текущую реализацию цикла «AI написал код → пользователь увидел результат».
> Назначение: точка отсчёта для последующих итераций улучшений.
> Авторитетный контекст проекта — [`C:\Users\Usuario\Documents\code\CLAUDE.md`](../CLAUDE.md).

---

## Проблема, которую решает система

AI-платформы (Claude Code, Codex, Gemini CLI, Qwen Code, Kimi Code) работают в admin-панели
(`bridges/app`, порт 3002) и пишут файлы в `/opt/fractera/app/`. Без принудительного
`npm run build && pm2 reload fractera-app` пользователь не видит никаких изменений.

**Цель системы:** после завершения задачи AI выполняет одну команду → сборка запускается
автоматически → пользователь видит результат на `https://SUBDOMAIN.fractera.ai`.

---

## Ключевое ограничение (архитектурное)

| Слой | Роль | Может ли AI менять? |
|---|---|---|
| `app/` (порт 3000) | Приложение пользователя | ✅ только сюда |
| `bridges/app/` (порт 3002) | Admin-панель / IDE | ❌ запрещено |
| `services/auth/` (порт 3001) | Авторизация | ❌ запрещено |
| `services/data/` (порт 3300) | Медиа и данные | ❌ запрещено |
| `bridges/platforms/` (порт 3201–3206) | WebSocket мосты | ❌ запрещено |

Deploy-endpoint принудительно собирает только `app/` и перезапускает только `fractera-app`.

---

## Компоненты системы

### 1. Deploy API — триггер сборки

**Файл:** `bridges/app/app/api/deploy/route.ts`
**Доступен по:** `POST http://localhost:3002/api/deploy`

**Что делает:**
1. Проверяет авторизацию (сессия браузера **или** заголовок `X-Deploy-Secret`)
2. Проверяет lock-файл — если уже идёт сборка, возвращает `{error: "in_progress", jobId}`
3. Создаёт lock-файл `/tmp/fractera-deploy.lock`
4. Записывает WAL: `/opt/fractera/app/DEPLOY_STATE.json` → `STARTED`
5. Запускает `npm run build --prefix /opt/fractera/app` через `child_process.spawn` (async, не блокирует)
6. При успехе: `pm2 reload fractera-app` → health check → WAL `COMPLETED`
7. При ошибке: WAL `FAILED`, старый bundle продолжает работать
8. Немедленно возвращает `{ok: true, jobId, status: "started"}`

**Входящие параметры (JSON body):**
```json
{ "description": "краткое описание изменений" }
```

**Авторизация:**
- Браузер: cookie `authjs.session-token` через `requireAuth()` (`lib/require-auth.ts`)
- AI-терминал: заголовок `X-Deploy-Secret: <DEPLOY_SECRET из bridges/app/.env.local>`

---

### 2. Deploy Status — polling статуса

**Файл:** `bridges/app/app/api/deploy/status/route.ts`
**Доступен по:** `GET http://localhost:3002/api/deploy/status?jobId=<ID>`

**Что возвращает:**
```json
{
  "jobId": "1778124375868",
  "status": "in_progress | COMPLETED | FAILED | HEALTH_FAILED",
  "log": ["строки лога сборки..."],
  "wal": { "status": "...", "startedAt": "...", "completedAt": "..." }
}
```

Лог читается из `/tmp/fractera-deploy-<jobId>.log`.

---

### 3. Health Endpoint — smoke-test после сборки

**Файл:** `app/app/api/health/route.ts`
**Доступен по:** `GET http://localhost:3000/api/health`
**Авторизация:** нет (исключён из `proxy.ts`)

```json
{ "ok": true, "ts": 1778124479180 }
```

Вызывается автоматически из deploy-процесса после `pm2 reload` для подтверждения
что новый сервер поднялся корректно.

---

### 4. Deploy Button — кнопка в UI

**Файл:** `bridges/app/_components/coding-workspace/coding-window-shell.client.tsx`
**Расположение в UI:** Settings dropdown → кнопка «Deploy app» (иконка ракеты)

**Поведение:**
1. Клик → `handleDeploy()` → `POST /api/deploy`
2. Получает `jobId` → запускает polling `/api/deploy/status` каждые 3 сек
3. Обновляет deploy log-панель (внизу экрана, над footer)
4. При `COMPLETED`/`FAILED` — останавливает polling, показывает итог

---

### 5. Инструкции для AI-платформ

**Файлы в корне `app/`:**

| Файл | Для платформы |
|---|---|
| `app/AGENTS.md` | Claude Code (и общий стандарт) |
| `app/CODEX.md` | Codex |
| `app/GEMINI.md` | Gemini CLI |
| `app/KIMI.md` | Kimi Code |
| `app/QWEN.md` | Qwen Code |
| `app/OPENCODE.md` | OpenCode |

Все файлы содержат одинаковую секцию `## Deploy`:

```bash
DEPLOY_SECRET=$(grep "^DEPLOY_SECRET=" /opt/fractera/bridges/app/.env.local | cut -d'=' -f2)
RESULT=$(curl -s -X POST http://localhost:3002/api/deploy \
  -H "Content-Type: application/json" \
  -H "X-Deploy-Secret: $DEPLOY_SECRET" \
  -d "{\"description\":\"что изменилось\"}")
JOB_ID=$(echo $RESULT | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)

while true; do
  S=$(curl -s "http://localhost:3002/api/deploy/status?jobId=$JOB_ID")
  echo $S | grep -o '"status":"[^"]*"'
  echo $S | grep -qE '"status":"(COMPLETED|FAILED|HEALTH_FAILED)"' && break
  sleep 10
done
```

---

### 6. DEPLOY_SECRET — аутентификация AI-терминала

**Генерируется:** `bootstrap.sh` при каждой новой установке через `openssl rand -hex 32`
**Хранится в:** `/opt/fractera/bridges/app/.env.local` (не в git)
**Передаётся:** заголовок `X-Deploy-Secret` в curl-запросах из AI-терминала
**На текущем сервере:** добавляется вручную один раз (bootstrap обновит автоматически для новых серверов)

---

### 7. WAL (Write-Ahead Log)

**Файл:** `/opt/fractera/app/DEPLOY_STATE.json`

```json
{
  "status": "STARTED | COMPLETED | FAILED | HEALTH_FAILED",
  "jobId": "1778124375868",
  "startedAt": "2026-05-07T...",
  "completedAt": "2026-05-07T...",
  "description": "что менялось"
}
```

**Зачем:** новая AI-сессия читает этот файл при старте. Если `status !== "COMPLETED"` —
предыдущий деплой упал. AI обязан проанализировать причину перед повтором.

---

## Полный цикл (happy path)

```
AI пишет код в /opt/fractera/app/
        ↓
curl POST http://localhost:3002/api/deploy
  -H "X-Deploy-Secret: $DEPLOY_SECRET"
  -d '{"description":"what changed"}'
        ↓
Сервер: WAL=STARTED, lock создан
        ↓
spawn: npm run build --prefix /opt/fractera/app  (~2–4 мин)
        ↓
  FAIL → WAL=FAILED, lock удалён
         AI получает log[] с ошибками → исправляет → повтор
        ↓
  OK   → pm2 reload fractera-app (graceful, zero-downtime)
        ↓
  health check: curl localhost:3000/api/health → 200
        ↓
  WAL=COMPLETED, git commit "DEPLOY_SUCCESS"
        ↓
Пользователь видит изменения на https://SUBDOMAIN.fractera.ai
```

---

## Защита от поломок

| Сценарий | Что происходит |
|---|---|
| TypeScript ошибка в коде | Build падает, `.next/` не обновляется, старая версия работает |
| PM2 не поднялся после reload | Health check падает, WAL=HEALTH_FAILED, пользователь видит старую версию |
| Два одновременных деплоя | Второй получает `{error: "in_progress"}` |
| AI сессия оборвалась в середине деплоя | Новая сессия читает WAL, видит STARTED без COMPLETED — анализирует причину |

---

## Известные ограничения (следующие итерации)

1. **Нет `npm install`** — если AI добавил новый пакет в `package.json`, нужно
   запустить `npm install --prefix /opt/fractera/app` вручную перед деплоем.
   Следующая итерация: автодетект изменений `package.json` через `git diff`.

2. **Нет rollback** — при `HEALTH_FAILED` старый bundle продолжает работать, но
   pm2 уже перезагружен. Следующая итерация: сохранять предыдущий `.next/` как
   `.next.backup/` и восстанавливать при падении health check.

3. **Нет log-стриминга** — UI поллит каждые 3 сек, лог обновляется пачками.
   Следующая итерация: SSE (Server-Sent Events) для real-time стриминга лога.

4. **`@appSlot/` не создан** — инструкции в AGENTS.md говорят работать в `@appSlot/`,
   но параллельный роутинг (`@appSlot`) ещё не настроен в `app/`. Текущий shell — это
   `app/app/page.tsx` (статическая страница-приветствие). Следующая итерация:
   AI создаёт `app/app/@appSlot/page.tsx` как точку входа в пользовательское приложение.

---

## Расположение файлов (сводка)

```
ai-workspace/
├── app/
│   ├── proxy.ts                          ← middleware: /api/health исключён из auth
│   ├── AGENTS.md                         ← инструкции AI + секция ## Deploy
│   ├── CODEX.md / GEMINI.md / KIMI.md    ← то же для остальных платформ
│   ├── QWEN.md / OPENCODE.md
│   └── app/
│       └── api/
│           └── health/route.ts           ← GET {ok, ts}
│
└── bridges/
    └── app/
        ├── _components/coding-workspace/
        │   └── coding-window-shell.client.tsx  ← кнопка Deploy + log-панель
        └── app/
            └── api/
                └── deploy/
                    ├── route.ts          ← POST — запуск сборки
                    └── status/
                        └── route.ts     ← GET — статус по jobId

На сервере (/opt/fractera/):
├── app/DEPLOY_STATE.json                 ← WAL текущего деплоя
├── bridges/app/.env.local               ← содержит DEPLOY_SECRET
└── /tmp/fractera-deploy-<jobId>.log     ← лог сборки (временный)
```
