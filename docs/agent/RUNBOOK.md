# RUNBOOK — команды, которые реально выполнялись (2026-10-31)

Все команды даны с фактическим выводом (первая значимая строка + код возврата).
Ни одна команда здесь не запускалась «по памяти».

## Запуск сервера локально

```bash
cd ~/Projects/tachka
PORT=3999 SQLITE_PATH=/tmp/n1-docs.sqlite npm start
```

- Первая строка осмысленного вывода: `Server listening on port 3999` (код возврата процесса 0, пока жив; печатает `server/index.ts:59-61`).
- Если `BOT_TOKEN` пуст, перед этим в логе: `WARNING: BOT_TOKEN is empty. InitData verification will fail.` (`server/index.ts:18-20`). Без токена сокет-`auth` отклонит подключение с `initData: bad hash`.
- Переменные (`server/index.ts:14-16` и `server/index.ts:22-28`): `PORT` (по умолчанию 3005), `SQLITE_PATH` (по умолчанию `./tachka.sqlite` — не открывать боевой файл), `BOT_TOKEN` (подхватывается из `.env` через `process.loadEnvFile`, `server/index.ts:10-12`), `NODE_ENV=production` (вкл. прод-режим периметра), `DEV_TOKEN=1` (разрешить `/dev/token` даже в проде), `ALLOWED_ORIGINS` (CORS-белый список через запятую; в dev localhost разрешён без неё — `server/http.ts:33-39`).

## Проверка живости и dev-токен

```bash
curl -s http://127.0.0.1:3999/health
# → {"ok":true,"uptime":1.944622618}   (HTTP 200; эндпоинт: server/http.ts:80-84)

curl -s "http://127.0.0.1:3999/dev/token?id=1&name=Player1"
# → {"initData":"auth_date=…&user=…&hash=…"}   (server/http.ts:86-97)
```

`/dev/token` подписывает initData **реальным** `BOT_TOKEN` из окружения — годится для
локальной отладки в браузере: клиент по умолчанию идёт на `?p=1&room=room1`
(`client/src/App.tsx:230-232`) и сам тянет токен (`client/src/App.tsx:40-58`).

## Тесты и типы

```bash
npm test
# хвост вывода: "ℹ tests 53 … ℹ pass 53 … ℹ fail 0"; exit 0

npm run typecheck
# вывод пуст (tsc --noEmit молчит), exit 0
```

Один файл:

```bash
node --experimental-strip-types --test server/track.test.ts
# "ℹ pass 3 … ℹ fail 0"; exit 0
```

Под капотом `npm test` — `node --experimental-strip-types --test server/**/*.test.ts`
(`package.json:10`); отдельный фреймворк не нужен, это встроенный `node:test`.

## Сборка клиента

```bash
cd client && npm run build
# tsc -b + vite build → client/dist/ (раздаётся сервером, server/http.ts:100-126)
```

Для разработки: `cd client && npm run dev` — Vite на 5173 с прокси `/socket.io`,
`/dev`, `/health` на 127.0.0.1:3005 (`client/vite.config.ts:8-26`), сервер держать на
дефолтном порту 3005.

## Частые поломки

| Симптом | Причина | Что делать |
|---|---|---|
| `EADDRINUSE` при старте | порт занят другим процессом (обычно прошлый запуск) | сменить `PORT=…` или убить процесс; проверка: `curl -s http://127.0.0.1:3005/health` |
| `initData: bad hash` у каждого подключения | `BOT_TOKEN` пуст или не тот бот | заполнить `.env` (файл в .gitignore); проверка без секрета невозможна по дизайну (`server/auth.ts:28-32`) |
| `initData: expired` | строке initData больше 3600 с (`server/auth.ts:15`) | перезайти в Mini App / перезапросить `/dev/token` |
| БД залочена / падение на open | старый процесс держит файл | убить процесс; для экспериментов всегда отдельный `SQLITE_PATH=/tmp/…` |
| Клиент «Нет связи со столом» (`client/src/api/useGame.ts:56-59`) | сервер не поднят или `VITE_SERVER_URL` при сборке указал не туда | поднять сервер; при сборке задать `VITE_SERVER_URL` (читается в `client/src/api/socket.ts:4`); в dev работает прокси vite |
| Комната «пропала» после рестарта сервера | до T1-core восстановления не было; теперь `loadPersistedRooms` поднимает комнаты из SQLite (`server/room.ts:45-70`) | если комната всё же пропала — проверь `SQLITE_PATH`: тот же ли файл, и не старше ли она 24 ч (TTL `cleanupOldRooms`) |

## Посмотреть состояние комнаты

Внешнего admin-API нет. Способы:

- лог сервера — только `Server listening …` и warning про токен; логов интентов нет;
- во время разработки: `console.log(manager.getRoom('room1'))` — публичный геттер есть
  (`server/room.ts:40-42`), тесты именно так и делают (`server/room.test.ts:109-119`);
- SQLite-снимок: `sqlite3 /tmp/n1-docs.sqlite "select state from rooms"` — JSON комнаты
  с деньгами в виде `{"$euro":"1600"}`.
