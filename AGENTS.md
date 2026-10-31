# AGENTS.md — Тачка

Пошаговая настолка про перекуп машин в Telegram Mini App. Сервер: Node 22+ +
socket.io, TypeScript исполняется напрямую (`node --experimental-strip-types`).
Клиент: React 19 + Vite в `client/`.

## Команды (проверены)

```bash
npm start                 # сервер на :3005; PORT=3999 SQLITE_PATH=/tmp/x.sqlite npm start — для отладки
npm test                  # node --test, 10 файлов / 53 теста
npm run typecheck         # tsc --noEmit
node --experimental-strip-types --test server/track.test.ts   # один файл
cd client && npm run dev  # vite :5173 с прокси на :3005
```

env сервера: `PORT` (3005), `SQLITE_PATH` (`./tachka.sqlite`), `BOT_TOKEN` (из `.env`).
Без `BOT_TOKEN` сервер живёт, но любой `auth` отклоняется.

## Контракт сети

Клиент эмитит `auth` / `lobby:start` / `intent` (17 интентов), слушает `room:state` и
`lobby:update`. Полный протокол: `docs/agent/PROTOCOL.md`. Карта всех модулей:
`docs/agent/MAP.md`. Хранение и фазы: `docs/agent/DATA-MODEL.md`. Известные разрывы
кода и документации — `docs/agent/FINDINGS.md` (прочитай перед изменением аукциона,
займов и гонок: FINDINGS-1/2/3/5/11 решены в T1-core, остальное актуально).

## Нестандартные правила кода (не выводятся из окружения)

1. **Деньги — `Euro = bigint` из `server/money.ts`;** создаётся фабрикой `euro()`,
   складывается/вычитается только `add`/`sub`/`canPay`. По сети и в SQLite суммы —
   строки (`"1600"`, обёртка `{"$euro":…}`); на границе сокета вход нормализует
   `normalizeIntent` (`server/validation.ts`) — строки/числа → bigint, форма — `RuleError`.
2. **Игровой отказ — только `RuleError`** (`server/turn.ts:7`) с английским текстом:
   текст — часть контракта, клиент матчит его в словаре `client/src/api/present.ts`.
   Generic `throw` допустим только для нарушения внутренней целостности.
3. **Случайность — только `server/rng.ts`** (`d6`, `shuffle` на `crypto.randomInt`);
   в тестах случайность подменяется инъекцией `rollFn`/`shuffleFn`, `Math.random`
   в репозитории отсутствует.
4. **Иммутабельные комнаты:** каждый обработчик правила возвращает новый `Room`,
   старый не мутирует; таймеры/сокеты/БД живут только в `RoomManager`.
5. **Клиент не считает** деньги, кубики, победу и таймеры — он форматирует строки и
   показывает `timerExpiresAt`; любое «правило» на клиенте — баг.
6. **Импорты с явным `.ts`** на сервере и в клиенте (требование strip-types);
   enum/namespace/декораторы на сервере не исполняются.
7. **Клетки/фазы — union-типы** (`server/track.ts`, `server/types.ts`); новая клетка
   добавляется в `CELLS` и в клиентский `CELLS` (`TrackWheel`, `present.ts`) парой.

## Правила проекта

`RULES.md` — канон игровых правил (не переписывать без владельца). Человеческие
заметки — `docs/user/`, технические — `docs/agent/`.
