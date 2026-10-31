# INVARIANTS — что нельзя нарушать

Каждая строка подтверждена чтением кода 2026-10-31. Если теста нет — так и написано:
это не провал, а карта риска.

| Инвариант | Где обеспечен | Чем проверяется |
|---|---|---|
| Деньги — только `Euro` (bigint), никаких `number`/дробей в правилах | `server/money.ts:2` (тип), `server/money.ts:4-7` (`euro` отказывает в не-целых) | `server/money.test.ts:10-12` (дробь отклоняется). **Разрыв на границе сокета:** JSON приносит строки, сервер их не приводит к bigint — см. FINDINGS-1/2/3 |
| Баланс никогда не уходит в минус | `server/money.ts:22-25` (`sub` бросает `balance would go negative`) | `server/money.test.ts:5-8`; grep по `sub(` в правилах — каждое списание идёт через него |
| Клиент не считает деньги и не решает победу | правила только в `server/actions.ts`, `server/auction.ts`, `server/race.ts`, `server/loans.ts`, `server/turn.ts`; клиент только форматирует (`client/src/components/sheets/formatEuro.ts:1-12`) | ревью + `client/src/api/present.ts` (только подписи). Теста нет — охраняется архитектурой: у клиента нет функции правил |
| Клиент не генерирует случайность | броски только `server/rng.ts:4` (`crypto.randomInt`); сервер присылает `rolled` в ack для анимации (`server/room.ts:212-216, 231-237`) | grep `Math.random` по `client/` — 0 вхождений; `server/rng.ts:3` — комментарий-запрет |
| Ход принадлежит только `room.turn` | `server/turn.ts:9-13` (seat), `server/turn.ts:243` (`not your turn`) | `server/turn.test.ts:53-55`; `server/room.test.ts:79-85` (не-хост не стартует) |
| Фаза проверяется перед действием | `server/actions.ts:13-17` (`onCell`), `server/auction.ts:44`, `server/race.ts:22,57,87,113,156`, `server/turn.ts:17` | `server/actions.test.ts` (клеточные тесты), `server/mechanics.test.ts` |
| Отказ — только `RuleError`, не generic `throw` | класс `server/turn.ts:7`; все отклонения в правилах бросают его | `server/actions.test.ts:57` (`assert.throws(..., RuleError)`); полный аудит: единственный generic `throw` в правилах — защита целостности (`server/money.ts:5,23`, `server/track.ts:20,26`, `server/rng.ts:12`, `server/decks.ts:197,199`) |
| Любой intent проходит гейт фазы/очереди до правил | `server/room.ts:178` (assertIntent до switch) | `server/turn.test.ts:53-55`; прямой тест гейта аукциона/гонки есть в `server/turn.ts:196-225`, но отдельного тест-файла нет — покрыто косвенно через room-тесты |
| initData проверяется HMAC до любого события | `server/auth.ts:11-41`; вызов в `auth`-обработчике до присоединения к комнате `server/room.ts:53`; `intent` без auth — `unauthenticated` `server/room.ts:81-84` | `server/auth.test.ts:17-33` (подпись/подделка); без-токеновый сокет не может вызвать intent — теста нет |
| userId берётся только из проверенного initData | `server/auth.ts:38-40` (id из распарсенного `user` после сверки хеша) | `server/auth.test.ts:26-33` (изменённый id отклоняется) |
| Минимум 3 игрока для старта, максимум 4 | `server/room.ts:146-148` (MIN), `server/room.ts:133` (lobby is full по MAX) | `server/types.ts:121-122` — константы; теста старта с <3 игроками нет |
| Старт только у хоста (lobby[0]) | `server/room.ts:149-151` | `server/room.test.ts:79-85` |
| Гараж максимум 4 машины | `server/actions.ts:133` (`garage full`), `server/types.ts:120` | теста покупки при полном гараже нет — только код |
| Просроченный долг блокирует покупку | `server/actions.ts:132` (`hasOverdueDebt` из `server/turn.ts:192`) | `server/actions.test.ts:97-114` |
| Победа только на сервере, в конце своего хода | `server/turn.ts:54-55` + вызов в `advanceTurn` `server/turn.ts:105-113` | `server/mechanics.test.ts:206-252` (ликвидационная победа); финансовая победа отдельным тестом не покрыта — теста нет |
| Банкротство при 3 подряд автоходах-таймаутах | `server/turn.ts:78-88` (missedLaps только при `wasAuto`), машины в сброс `server/turn.ts:94-102` | `server/mechanics.test.ts:206-252` (кейс missedLaps 2→3) |
| Ретро — только через аукцион, без такси и проката | покупка запрещена: `server/actions.ts:143-149` (в deckKey нет retro); такси: `server/actions.ts:123-124` (нет ключа в TAXI_MULT → `class cannot taxi`); прокат: `server/actions.ts:106` | `server/actions.test.ts:81-84, 92-95` |
| Прокат не фармуется на месте | `server/actions.ts:107-111` (получает деньги и `rentSteps: 0` только ready или `rentSteps >= TRACK_LEN`), шаги копятся в `server/turn.ts:31-35` | `server/actions.test.ts:69-79` (кулдаун 8 → отказ, 9 → выплата) |
| Ставка в гонке ≤ 50 % наличных цели; у цели ≥ 1 авто | `server/race.ts:30-34` | `server/mechanics.test.ts:84-113` (косвенно: ставка 2000 при балансе 10000) |
| Случайность только через `rng.ts` | единственные броски: `d6` `server/rng.ts:4`, перемешивание `shuffle` `server/rng.ts:6-17` | property/детерминизм-тестов нет — известное ограничение, см. `TESTING.md` |
| Снимок в SQLite — только при смене хода | `server/room.ts:368-377` (условие `turnChanged`) | `server/snapshot.test.ts:7-34` (round-trip); частота записи тестом не проверяется |

## Известные разрывы инвариантов (не чинить здесь — см. FINDINGS)

1. **Граница сокета не приводит деньги к bigint.** Клиент шлёт `bid.step: '100'`,
   `loan_offer.principal: '200'` как строки; сервер не приводит типы
   (`server/room.ts:239,300-341`). Ставка из живого клиента отклоняется, займы
   считаются конкатенацией строк. Проверено офлайн-пробой 2026-10-31, FINDINGS-1/2/3.
2. **Тесты room.test.ts обходят границу** — шлют bigint напрямую (`300n as any`,
   `server/room.test.ts:126-132`), поэтому разрыв №1 тестами не ловится.
