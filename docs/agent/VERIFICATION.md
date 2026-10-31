# VERIFICATION — протокол приёмки (2026-10-31)

Окружение: Node v26.12.1, ветка `zcode/n1-docs`, репозиторий `~/Projects/tachka`.
Каждая команда выполнена фактически; код возврата и первая значимая строка — из этого прогона.

## Чек-лист приёмки

| # | Команда | Код | Первая значимая строка вывода |
|---|---|---|---|
| 1 | `python3 ~/Projects/zcode-weekend/scripts/check-docs.py --repo ~/Projects/tachka` | 0 | `repo: /home/forg/Projects/tachka` … итоговая строка `итог: OK` |
| 2 | `npm test` | 0 | `✔ one of each cell (0.503129ms)`; итог `ℹ tests 33 · ℹ pass 33 · ℹ fail 0` |
| 3 | `npm run typecheck` | 0 | (вывод пуст — `tsc --noEmit` молчит при отсутствии ошибок) |
| 4 | `git status --porcelain` | 0 | `?? AGENTS.md`, `?? docs/agent/`, `?? docs/user/` — только разрешённые пути |
| 5 | `node --experimental-strip-types --test server/track.test.ts` | 0 | `✔ one of each cell (…)`; итог `ℹ pass 3 · ℹ fail 0` |
| 6 | `PORT=3999 SQLITE_PATH=/tmp/n1-docs.sqlite npm start` | процесс жив | `Server listening on port 3999` (`server/index.ts:108`); после проверки остановлен |
| 7 | `curl -s http://127.0.0.1:3999/health` | 0 (HTTP 200) | `{"ok":true,"uptime":1.944622618}` |
| 8 | `curl -s "http://127.0.0.1:3999/dev/token?id=1&name=Player1"` | 0 | `{"initData":"auth_date=…&user=…&hash=…"}` — в доках заменено на `<INIT_DATA>` |
| 9 | `node --experimental-strip-types /tmp/tachka-socket-boundary.mts` (офлайн-проба FINDINGS-1/2) | 0 | `BID-STRING: throws -> RuleError "invalid bid step"`; далее `LOAN-ADD-STRINGS: "2000"+"2000" -> "20002000"` и `LOAN-COMPARE: "1000"<"200" -> true` |

## Итоговые числа

| Метрика | Значение |
|---|---|
| Файлов в `docs/agent/` | 15 (9 основных + 6 ADR) |
| Заметок в `docs/user/` | 10 (№ 00–09, из них 1 — `06 Карта кода.excalidraw.md`) |
| Mermaid-блоков | 8 (MAP flowchart · DATA-MODEL stateDiagram-v2 + erDiagram · TESTING mindmap · user/02 flowchart · user/03 sequenceDiagram · user/04 stateDiagram-v2 · user/05 flowchart) |
| Сцена Excalidraw | 1, 24 элемента (≥8 требуется), 3 подписанные стрелки |
| Покрытие MAP.md | 46/46 (22 файла `server/` + 24 файла `client/src/`) |
| Ссылок на код `файл:строка` | 384, все резолвятся, ни одна не выходит за длину файла |
| Викилинков | 19, все резолвятся в `docs/user/` |
| Секреты/PII | 0 предупреждений (BOT_TOKEN не цитируется, initData — плейсхолдер `<INIT_DATA>`) |
| AGENTS.md | 52 строки (бюджет 60) |
| Ошибок `check-docs.py` | 0 — `итог: OK` |

## Правила задания — соблюдение

- Код, тесты, конфиги, `package.json` не правились: `git status` показывает только `docs/` и `AGENTS.md`.
- `RULES.md` не менялся; найденные расхождения с ним — в `FINDINGS.md` (FINDINGS-6…10, 13).
- Игровые данные и токены не переносились; токен бота нигде не процитирован (в тестах он есть — `server/room.test.ts:10`, в доках упомянут без значения).
- Сервер поднимался только офлайн на порту 3999 с `SQLITE_PATH=/tmp/n1-docs.sqlite`; боевой `tachka.sqlite` не открывался; внешняя сеть не требовалась.
- В Obsidian vault ничего не писалось; `docs/user/` переносится владельцем как есть.

## Не сделано и почему

Не сделано — ничего из обязательного. Отмеченные в FINDINGS дефекты кода по условию
задания **не чинились** — это часть результата, а не недоделка: границы сокета
(FINDINGS-1…3), отсутствие UI гонки/займа (FINDINGS-4), неподключённое восстановление
из БД (FINDINGS-5). Порядок исправления предлагается тот же: 1→2→3 одним PR
(приведение денег к bigint на границе сокета), затем 4 и 5.
