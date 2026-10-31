# INVARIANTS — что нельзя нарушать

Каждая строка подтверждена чтением кода 2026-10-31. Если теста нет — так и написано:
это не провал, а карта риска.

| Инвариант | Где обеспечен | Чем проверяется |
|---|---|---|
| Деньги — только `Euro` (bigint), никаких `number`/дробей в правилах | `server/money.ts:2` (тип), `server/money.ts:4-7` (`euro` отказывает в не-целых) | `server/money.test.ts:10-12` (дробь отклоняется). Граница сокета закрыта: строки → bigint в `server/validation.ts:26-40` |
| Баланс никогда не уходит в минус | `server/money.ts:22-25` (`sub` бросает `balance would go negative`) | `server/money.test.ts:5-8`; grep по `sub(` в правилах — каждое списание идёт через него |
| Клиент не считает деньги и не решает победу | правила только в `server/actions.ts`, `server/auction.ts`, `server/race.ts`, `server/loans.ts`, `server/turn.ts`; клиент только форматирует (`client/src/components/sheets/formatEuro.ts:1-12`) | ревью + `client/src/api/present.ts` (только подписи). Теста нет — охраняется архитектурой: у клиента нет функции правил |
| Клиент не генерирует случайность | броски только `server/rng.ts:4` (`crypto.randomInt`); сервер присылает `rolled` в ack для анимации (`server/room.ts:212-216, 231-237`) | grep `Math.random` по `client/` — 0 вхождений; `server/rng.ts:3` — комментарий-запрет |
| Ход принадлежит только `room.turn` | `server/turn.ts:9-13` (seat), `server/turn.ts:243` (`not your turn`) | `server/turn.test.ts:53-55`; `server/room.test.ts:79-85` (не-хост не стартует) |
| Фаза проверяется перед действием | `server/actions.ts:13-17` (`onCell`), `server/auction.ts:44`, `server/race.ts:22,57,87,113,156`, `server/turn.ts:17` | `server/actions.test.ts` (клеточные тесты), `server/mechanics.test.ts` |
| Отказ — только `RuleError`, не generic `throw` | класс `server/turn.ts:7`; все отклонения в правилах бросают его | `server/actions.test.ts:57` (`assert.throws(..., RuleError)`); полный аудит: единственный generic `throw` в правилах — защита целостности (`server/money.ts:5,23`, `server/track.ts:20,26`, `server/rng.ts:12`, `server/decks.ts:197,199`) |
| Любой intent нормализуется до гейта и правил | `server/validation.ts:66` (`normalizeIntent`: whitelist 17 типов, деньги → bigint, id ≤ 64, лишние поля отброшены), вызов до `assertIntent` `server/room.ts:203-204` | `server/validation.test.ts` (строковые деньги → bigint, мусор и `-50`/`abc`/`1.5`/`NaN` отклоняются) |
| Любой intent проходит гейт фазы/очереди до правил | `server/room.ts:204` (assertIntent до switch) | `server/turn.test.ts:53-55`; прямой тест гейта аукциона/гонки есть в `server/turn.ts:196-225`, но отдельного тест-файла нет — покрыто косвенно через room-тесты |
| initData проверяется HMAC до любого события | `server/auth.ts:11-41`; вызов в `auth`-обработчике до присоединения к комнате `server/room.ts:78`; `intent` без auth — `unauthenticated` `server/room.ts:105-110` | `server/auth.test.ts:17-33` (подпись/подделка); без-токеновый сокет не может вызвать intent — теста нет |
| userId берётся только из проверенного initData | `server/auth.ts:38-40` (id из распарсенного `user` после сверки хеша) | `server/auth.test.ts:26-33` (изменённый id отклоняется) |
| Минимум 3 игрока для старта, максимум 4 | `server/room.ts:171-173` (MIN), `server/room.ts:158` (lobby is full по MAX) | `server/types.ts:121-122` — константы; теста старта с <3 игроками нет |
| Старт только у хоста (lobby[0]) | `server/room.ts:175-177` | `server/room.test.ts:79-85` |
| Гараж максимум 4 машины | `server/actions.ts:133` (`garage full`), `server/types.ts:120` | теста покупки при полном гараже нет — только код |
| Просроченный долг блокирует покупку | `server/actions.ts:132` (`hasOverdueDebt` из `server/turn.ts:192`) | `server/actions.test.ts:97-114` |
| Победа только на сервере, в конце своего хода | `server/turn.ts:54-55` + вызов в `advanceTurn` `server/turn.ts:105-113` | `server/mechanics.test.ts:206-252` (ликвидационная победа); финансовая победа отдельным тестом не покрыта — теста нет |
| Банкротство при 3 подряд автоходах-таймаутах | `server/turn.ts:78-88` (missedLaps только при `wasAuto`), машины в сброс `server/turn.ts:94-102` | `server/mechanics.test.ts:206-252` (кейс missedLaps 2→3) |
| Ретро — только через аукцион, без такси и проката | покупка запрещена: `server/actions.ts:143-149` (в deckKey нет retro); такси: `server/actions.ts:123-124` (нет ключа в TAXI_MULT → `class cannot taxi`); прокат: `server/actions.ts:106` | `server/actions.test.ts:81-84, 92-95` |
| Прокат не фармуется на месте | `server/actions.ts:107-111` (получает деньги и `rentSteps: 0` только ready или `rentSteps >= TRACK_LEN`), шаги копятся в `server/turn.ts:31-35` | `server/actions.test.ts:69-79` (кулдаун 8 → отказ, 9 → выплата) |
| Ставка в гонке ≤ 50 % наличных цели; у цели ≥ 1 авто | `server/race.ts:30-34` | `server/mechanics.test.ts:84-113` (косвенно: ставка 2000 при балансе 10000) |
| Случайность только через `rng.ts` | единственные броски: `d6` `server/rng.ts:4`, перемешивание `shuffle` `server/rng.ts:6-17` | property/детерминизм-тестов нет — известное ограничение, см. `TESTING.md` |
| Снимок в SQLite — только при смене хода | `server/room.ts:394-403` (условие `turnChanged`) | `server/snapshot.test.ts:36-42` (round-trip); частота записи тестом не проверяется |
| SQLite в WAL-режиме с busy_timeout 5000 | `server/snapshot.ts:13-15` (pragmas в `openDb`) | `server/snapshot.test.ts:44-54` (файловая БД: `journal_mode = wal`, `busy_timeout = 5000`) |
| Комнаты восстанавливаются при старте сервера | `server/room.ts:45-70` (`loadPersistedRooms`), вызов `server/index.ts:50`; просроченный таймер → автоход сразу | `server/snapshot.test.ts:66-97` (рестарт: комната на месте, bigint цел), `server/snapshot.test.ts:99-126` (просрочка → автоход, missedLaps = 1) |
| Комнаты старше 24 ч удаляются | `server/snapshot.ts:46-55` (`cleanupOldRooms`), фоновый интервал `server/index.ts:53` (раз в час, unref) | `server/snapshot.test.ts:56-64` (25-часовая удаляется, свежая остаётся) |

## Известные разрывы инвариантов (не чинить здесь — см. FINDINGS)

1. **~~Граница сокета не приводит деньги к bigint.~~ РЕШЕНО в T1-core** (`dd129d2`):
   `normalizeIntent` (`server/validation.ts:66`) нормализует payload до правил —
   строковые `'100'` становятся `100n`, FINDINGS-1/2/3 закрыты. Тесты шлют строки
   в `server/validation.test.ts` — граница покрыта.
2. **Тесты room.test.ts шлют bigint напрямую** (`300n as any`,
   `server/room.test.ts:126-132`) — остаются правил-уровневым интеграционным тестом;
   строковая граница теперь покрыта `server/validation.test.ts`, а HTTP-периметр —
   `server/http.test.ts`.
