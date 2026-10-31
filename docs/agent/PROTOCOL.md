# PROTOCOL — сетевой контракт (факт из кода)

Канонический человекочитаемый контракт — `docs/API_AND_STATE.md`. Здесь — сверенная с
кодом выжимка для агентов: имена событий и тексты ошибок взяты из `server/room.ts` и
правил, не из документации.

## Принцип авторитета

Клиент шлёт **намерение** (`intent`), а не результат: он никогда не вычисляет деньги,
победу или броски. Все вычисления — в модулях правил на сервере; клиент только
отрисовывает `room:state` и показывает текст отказа из ack. Локальный таймер клиента
(`client/src/components/auction/AuctionModal.tsx:17-35`) — только визуализация
`timerExpiresAt`; источник правды — серверный `setTimeout` (`server/room.ts:416-427`).

## Подключение и лобби (отдельные события, не через `intent`)

| Событие | Payload | Ack | Логика |
|---|---|---|---|
| `auth` | `{ initData: string, roomId: string }` | `{ ok, state?: 'lobby'\|'playing', error? }` | HMAC-проверка `server/room.ts:78`; активная игра → rebind сокета, сброс грейс-таймера, немедленный `room:state` (`server/room.ts:85-95`); иначе в лобби (`server/room.ts:98-99`) |
| `lobby:start` | — | `{ ok, error? }` | только хост (`server/room.ts:175-177`), минимум 3 игрока (`server/room.ts:171-173`), порядок ходов — d6-переброски (`server/decks.ts:205-242`) |

## `intent` — единая точка игровых действий

`socket.emit('intent', payload, ack)`; ack: `{ ok: true, rolled?: number }` или
`{ ok: false, error: string }` (`server/room.ts:105-118`). Payload — сырой JSON:
перед гейтом и правилами он проходит строгую нормализацию `normalizeIntent`
(`server/validation.ts:66-118`, вызов в `server/room.ts:203`): whitelist 17 типов,
деньги `number | string | bigint` → неотрицательный bigint через `parseEuro`
(`server/validation.ts:26-40`), id — непустые строки ≤ 64 символов, `steps` — строго
1|2|3|4, `turns` — целое ≥ 1, неизвестные поля отбрасываются. Нарушение формы —
`RuleError` до `assertIntent`. Дальше гейт —
`assertIntent` (`server/turn.ts:195-247`): набор допустимых интентов зависит от фазы.

### 17 интентов (`server/types.ts:100-117`)

| # | Intent | Поля | Кто может | Фаза | Что меняет | Отказ (примеры) |
|---|---|---|---|---|---|---|
| 1 | `move` | `steps: 1\|2\|3\|4` | активный игрок | `choose_move` | позиция, списание 300 €/шаг свыше 2, `rentSteps` машин, фаза → `resolve_cell`; при посадке на retro — сразу аукцион (`server/room.ts:213-229`) | `not your turn`, `cannot pay the jump`, `not choose_move` |
| 2 | `buy` | `carId` | активный | `resolve_cell` на buckets/beaten/premium/picker | деньги −purchase, авто в гараж (`broken`; perfect → `ready`), колода без карты | `garage full`, `overdue debt blocks buying`, `cannot pay purchase`, `car not on offer`, `cell has no deck` |
| 3 | `repair` | `carId` | активный | `resolve_cell` на service | деньги −стоимость, статус → `ready`; d6 для beaten бросает RoomManager (`server/room.ts:235-241`), ack возвращает `rolled` | `not broken`, `cannot pay repair`, `car not in garage` |
| 4 | `scrap` | `carId` | активный | `resolve_cell` на service или buyout | +50 € (`server/actions.ts:59`), авто в сброс; на buyout ход завершается (`server/room.ts:247-252`) | `scrap only on service or buyout`, `only broken cars can be scrapped` |
| 5 | `buyout` | `carId` | активный | `resolve_cell` на buyout | +выкуп (raspil → цена покупки, `server/actions.ts:57`), авто в сброс, ход завершается | `not sellable` (broken), `car not in garage` |
| 6 | `rent` | — | активный | `resolve_cell` на rent | +500 €/ведро-битьё, +1000 €/премиум за все подходящие авто, статус `in_rent`, `rentSteps: 0` | `nothing to rent` (нет подходящих или кулдаун < 9 шагов) |
| 7 | `taxi` | `carId` | активный | `resolve_cell` (любая клетка) | +d6 × множитель класса, ход завершается; ack `rolled` | `class cannot taxi` (retro), `d6 out of range` |
| 8 | `race_invite` | `targetId`, `stake` | активный | `resolve_cell` на race | фаза → `race/invitation`, ставка списана у инициатора (`server/race.ts:45`); таймер 10 с (`server/room.ts:292`) | `not on race cell`, `cannot race yourself`, `target has no cars`, `stake exceeds 50% of target cash` |
| 9 | `race_accept` | — | цель вызова | `race/invitation` | ставка цели в пул, +1000 € банка, статус → `pool_entry`, таймер 10 с (`server/room.ts:295-299`) | `not target of race invite`, `cannot pay stake` |
| 10 | `race_forfeit` | — | цель вызова | `race/invitation` | неустойка 200 € цели → инициатору, ставка инициатора возвращается, ход завершается (`server/race.ts:86-109`) | `not target of race invite` |
| 11 | `race_join_pool` | — | любой не-участник | `race/pool_entry` | ставка в пул, участник добавлен (`server/race.ts:112-136`) | `pool entry closed`, `already in pool`, `cannot pay stake` |
| 12 | `bid` | `step` (100 или 500, принимается строкой) | текущий торгающий | `auction` | `highestBid += step`, лидер, очередь следующего активного, таймер 10 с (`server/room.ts:264-269`) | `not your auction turn`, `invalid bid step`, `cannot pay bid amount` |
| 13 | `pass` | — | активный / торгающий / вошедший в пул | `resolve_cell` → конец хода; `auction` → выход из торгов; `race/pool_entry` → no-op до таймера (`server/room.ts:270-288`) | завершение хода / свёртка аукциона | `not your turn`, `not your auction turn` |
| 14 | `start_auction` | — | активный | `resolve_cell` на picker | верх карты retro снята с колоды, аукцион открыт (`server/room.ts:308-324`) | молча нет-оп, если retro-колода пуста |
| 15 | `loan_offer` | `targetId`, `principal`, `due`, `turns` | активный (любая своя фаза) | любая кроме auction/race | `room.pendingLoan` создан (`server/room.ts:326-349`) | `cannot loan to self`, `target is bankrupt`, `lender lacks cash`, `turns must be >= 1`, `due must be >= principal` |
| 16 | `loan_accept` | `loanId` | заёмщик, **даже вне своего хода** (`server/turn.ts:227-231`) | любая при активном `pendingLoan` | деньги переводятся моментально, долг в `borrower.loans`, `pendingLoan: null` (`server/room.ts:350-367`) | `no pending loan`, `only borrower can accept loan` |
| 17 | `loan_reject` | — | заёмщик или кредитор (`server/room.ts:368-382`) | любая при активном `pendingLoan` | `pendingLoan: null` | `no pending loan`, `not authorized to reject loan` |

Правила по фазам (`server/turn.ts:196-225`): в `auction` — только `bid`/`pass`; в
`race/invitation` — только `race_accept`/`race_forfeit`; в `race/pool_entry` — только
`race_join_pool`/`pass`; в `rolling` — ничего (`rolling in progress`).

## События сервер → клиент

Фактические имена, все `emit` в коде:

| Событие | Payload | Где эмитится |
|---|---|---|
| `room:state` | сериализованный `RoomState` (деньги — строки) | после каждого изменения: `server/room.ts:498`, и при reconneсt `server/room.ts:92` |
| `lobby:update` | `LobbyUser[]` | вход/выход в лобби: `server/room.ts:166`, `server/room.ts:143` |

Других кастомных исходящих событий нет. `connect`/`disconnect`/`connect_error` —
встроенные события socket.io, клиент обрабатывает их в `client/src/api/useGame.ts:48-59`.

## Реконнект и дисконнект

- Разрыв сокета в лобби — игрок удаляется из лобби сразу (`server/room.ts:137-145`).
- Разрыв в игре — грейс 10 с (`DISCONNECT_GRACE_SEC`, `server/turn.ts:50`); если через
  10 с всё ещё ход этого игрока — таймер хода ужимается до 5 с
  (`server/room.ts:480-494`, `server/turn.ts:49`).
- Возвращение: `auth` по активной комнате мгновенно возвращает `room:state` и ack
  `{ok:true, state:'playing'}` (`server/room.ts:85-95`); клиент сам пере-отправляет
  `auth` на событии `connect` с сохранёнными кредами (`client/src/api/useGame.ts:38-52`).
- Каждый таймаут активного хода — автоход (+missedLaps); 3 подряд — банкротство
  (`server/turn.ts:78-88`).
- После рестарта сервера комната восстанавливается из SQLite (`loadPersistedRooms`,
  `server/room.ts:45-70`): игрокам достаточно снова отправить `auth` с тем же
  `roomId` — снимок вернётся через обычный rebind.

## Ошибки: `{ok:false, error}`

Полный словарь текстов `RuleError` (grep по `server/*.ts`, 2026-10-31):

- Авторизация/сессия: `unauthenticated`, `initData: no hash`, `initData: bad hash`,
  `initData: expired`, `initData: no user`, `room not found`
- Валидация payload (`server/validation.ts`): `invalid intent`,
  `unsupported intent: {type}`, `invalid move steps`, `invalid bid step`,
  `invalid race stake`, `invalid loan principal`, `invalid loan due`,
  `invalid loan turns`, `invalid carId`, `invalid targetId`, `invalid loanId`
- Лобби: `lobby is full`, `need at least 3 players`, `only lobby host can start`
- Очередь/фаза: `not your turn`, `not choose_move`, `move only in choose_move`,
  `not resolving`, `not on {cell}`, `not on race cell`, `rolling in progress`,
  `unsupported intent: {type}`
- Аукцион: `not in auction`, `only bid or pass allowed during auction`,
  `not your auction turn`, `invalid bid step`, `cannot pay bid amount`
- Гонка: `not in race`, `only race_accept or race_forfeit allowed during invitation`,
  `only race target can respond`, `only race_join_pool or pass allowed during pool entry`,
  `cannot race yourself`, `target has no cars`, `cannot pay stake`,
  `stake exceeds 50% of target cash`, `not target of race invite`, `pool entry closed`,
  `already in pool`
- Гараж/деньги: `no active player`, `garage full`, `cannot pay the jump`,
  `cannot pay purchase`, `cannot pay repair`, `cannot pay bid amount`, `car not in garage`,
  `car not on offer`, `cell has no deck`
- Клетки: `not broken`, `nothing to repair`, `nothing to rent`, `not sellable`,
  `only broken cars can be scrapped`, `scrap only on service or buyout`,
  `class cannot taxi`, `d6 out of range`, `overdue debt blocks buying`
- Займы: `no pending loan`, `only borrower can accept loan`,
  `not authorized to reject loan`, `cannot loan to self`, `target is bankrupt`,
  `lender lacks cash`, `turns must be >= 1`, `due must be >= principal`,
  `not target borrower`, `player not found`
- Целостность (не для игрока): `balance would go negative`, `euro: not a safe integer`,
  `step cost drifted`, `steps out of range`, `track index`, `lobby is full`

Русские подписи для UI — словарь `client/src/api/present.ts:3-25`; неизвестные тексты
показываются как есть (`errorLabel`, `client/src/api/present.ts:27-30`).
