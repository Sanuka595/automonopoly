# VERIFICATION-T1 — отчёт о задаче T1 «Ядро сервера» (2026-10-31)

Ветка: `zcode/t1-core` (от `zcode/n1-docs`, `ab77fbe`). Бриф:
`~/Projects/zcode-weekend/briefs/T1-core-fixes.md`. Все команды ниже выполнены
фактически в этом прогоне; вывод — из него же.

## Что сделано по фазам

| Фаза | Коммит | Суть |
|---|---|---|
| 1 | `dd129d2` | `fix(server): normalize and validate inbound socket intents to bigint euro (FINDINGS-1, 2, 3)` |
| 2 | `c094dcd` | `fix(server): use taxi multiplier from eligible taxi car in auto-turn (FINDINGS-11)` |
| 3 | `da6f6d3` | `feat(persistence): enable WAL, restore rooms on startup, and add TTL cleanup (T1, FINDINGS-5)` |
| 4 | `eff984d` | `fix(security): lock down /dev/token in prod, restrict CORS, and fix 404 for static assets (T4)` |
| 5 | (этот коммит) | `docs: update MAP, FINDINGS, INVARIANTS, and add VERIFICATION-T1 report` |

### Фаза 1 — нормализация и валидация на границе сокета (FINDINGS-1/2/3)

- Новый `server/validation.ts`: `parseEuro` (bigint | safe-number | десятичная строка →
  неотрицательный `Euro`, иначе `null`) и `normalizeIntent` (whitelist 17 типов,
  деньги → bigint, id — непустые строки ≤ 64 символов, `steps` строго 1|2|3|4,
  `turns` — целое ≥ 1, неизвестные поля отбрасываются; нарушение — `RuleError`).
- Подключено в `RoomManager.handleIntent` (`server/room.ts`) до `assertIntent` —
  нормализованы и сокет-пейлоады, и прямые вызовы.
- Тесты `server/validation.test.ts` (9): строковый `bid.step: '100'` → `100n` и
  попадает в `[100n, 500n]`; строковый `loan_offer` проходит настоящий `grantLoan`
  (баланс — bigint, `due >= principal` на числах); строковый `stake` проходит
  настоящий `inviteRace`; отказы `-50`/`abc`/`1.5`/`NaN`/неизвестный `type`.
- Без новых npm-пакетов — чистый TypeScript.

### Фаза 2 — автоход такси (FINDINGS-11)

- `server/turn.ts`: множитель читается у найденной не-retro машины
  (`taxiCar.taxiMult`), а не у `cars[0]`.
- Регресс-тест в `server/turn.test.ts`: ретро первой (`taxiMult: 0n`), ведро второй
  (`taxiMult: 50n`), `applyAutoTurn(room, 3)` → `1600 + 50×3 = 1750 €`.

### Фаза 3 — персистентность (T1 + FINDINGS-5)

- `server/snapshot.ts`: `openDb` включает `PRAGMA journal_mode = WAL` и
  `PRAGMA busy_timeout = 5000`; новая `cleanupOldRooms(db, maxAgeMs = 24 ч)` —
  возвращает число удалённых строк.
- `server/room.ts`: `RoomManager.loadPersistedRooms()` — загружает комнаты при старте,
  просроченный сохранённый таймер бьёт автоход немедленно, живой — пересоздаётся на
  остаток окна; для `finished` таймер не ставится.
- `server/index.ts`: вызов `manager.loadPersistedRooms()` при старте; фоновый
  `setInterval(() => cleanupOldRooms(db), 3600_000).unref()`.
- Тесты `server/snapshot.test.ts` (5): WAL + busy_timeout на файловой БД; TTL
  (25-часовая удаляется, свежая остаётся); рестарт — комната восстановлена в новом
  `RoomManager` с bigint-балансом; рестарт с просроченным таймером — автоход отработал
  (`missedLaps = 1`).

### Фаза 4 — периметр HTTP (T4)

- HTTP-логика вынесена в новый `server/http.ts` (`createHttpHandler`,
  `corsAllowsOrigin`, `parseAllowedOrigins`, `makeDevInitData`) — без бандлера и новых
  зависимостей; `server/index.ts` собирает `perimeter` из env.
- `/dev/token`: в `NODE_ENV=production` — 404, если явно не задан `DEV_TOKEN=1`.
- Статика: путь с расширением файла, которого нет в `client/dist` → **404** (плюс
  защита от path-traversal с проверкой корня); `index.html` — только для роутов без
  расширения и `/`.
- CORS: env `ALLOWED_ORIGINS` (через запятую); без него в dev разрешён localhost
  (в т.ч. для сокета — `cors.origin` + `allowRequest` у socket.io), в prod без списка —
  только same-origin. Dev-плейграунд не сломан: `npm start` без `NODE_ENV` работает как
  раньше (проверено: `/health` 200, `/dev/token` 200, `/missing.js` 404).
- Тесты `server/http.test.ts` (5, нативный `fetch` на эфемерном порту, temp-dir для
  статики): prod `/dev/token` → 404; prod + `DEV_TOKEN=1` → 200; `/bundle.bad123.js` →
  404 (не HTML); traversal → 404; SPA-роут → index.html; `/health` → 200 JSON;
  CORS-политика и preflight 403.

### Фаза 5 — документация и приёмка

- `docs/agent/FINDINGS.md`: FINDINGS-1/2/3 (`dd129d2`), FINDINGS-11 (`c094dcd`),
  FINDINGS-5 (`da6f6d3`) помечены РЕШЕНО с файлами и свежими строками; тексты находок
  сохранены (строки — срез аудита `ab77fbe`, что отмечено в шапке).
- `docs/agent/MAP.md`: +4 модуля (`validation.ts`, `validation.test.ts`, `http.ts`,
  `http.test.ts`), покрытие 50/50; mermaid и «поток данных» включают нормализацию и
  восстановление комнат.
- `docs/agent/INVARIANTS.md`: инвариант нормализации входа, WAL, восстановление и TTL;
  разрыв «граница сокета» закрыт.
- `docs/agent/PROTOCOL.md`: строгая нормализация `intent` зафиксирована в контракте,
  словарь ошибок дополнен, метка «bid недоступен из живого клиента» снята.
- Синхронизированы `RUNBOOK.md`, `DATA-MODEL.md`, `INVENTORY.md`, `TESTING.md`,
  `AGENTS.md` (52 строки ≤ бюджета 60).
- `python3 ~/Projects/zcode-weekend/scripts/check-docs.py --repo .` → **итог: OK**
  (25 документов, 428 ссылок на код, покрытие MAP.md 50/50).

## Чек-лист приёмки брифа

| Пункт брифа | Статус |
|---|---|
| Ветка `zcode/t1-core` запушена в origin | да (`git push origin zcode/t1-core`) |
| Аукцион/займы/гонка принимают строковые числа (`validation.test.ts`) | да |
| Автоход использует множитель правильной машины (`turn.test.ts`) | да |
| Комнаты восстанавливаются, WAL включён, TTL работает (`snapshot.test.ts`) | да |
| `/dev/token` в prod → 404; статические 404 не маскируются (`http.test.ts`) | да |
| `npm test` — все тесты | **53 pass / 0 fail** (ожидалось ≥ 45) |
| `npm run typecheck` | **0 ошибок** |
| `check-docs.py --repo .` | **итог: OK** |
| `VERIFICATION-T1.md` создан | да (этот файл) |

## Соблюдение жёстких правил

- Новые серверные зависимости: **0** (`package.json` не менялся; `socket.io` остался
  единственным prod-зависимостью). Валидация и HTTP-периметр — нативный TS.
- Dev-плейграунд не сломан: `npm start` без `NODE_ENV` поднимается, `/health`,
  `/dev/token`, раздача `client/dist` и прокси vite работают (проверено curl'ом).
- Коммит на фазу: да, пять коммитов, сообщения — из брифа.

## Что осталось вне T1 (не регрессия)

- FINDINGS-4 (нет UI для race_accept/loan_accept/…), 6–10, 12–18 — не входят в объём T1.
- Обработчик `disconnect` в сокетах не покрыт тестом (см. `docs/agent/TESTING.md`).
- Восстановление лобби (до старта матча) не персистится — по-прежнему только RAM,
  это осознанное решение (сохранять до старта нечего).
