# INVENTORY — снимок проекта «Тачка» (2026-10-31)

Собрано командами (`wc -l`, `grep`), не по памяти. Все ссылки проверены на существование и длину.

## Общие факты

| Параметр | Значение | Источник |
|---|---|---|
| Точка входа сервера | `server/index.ts` (109 строк) | `package.json:9` (`node --experimental-strip-types`) |
| Точка входа клиента | `client/src/main.tsx` (10 строк) → `App.tsx` | `client/package.json:7` (`vite`) |
| Prod-зависимости корня | только `socket.io` | `package.json:14` |
| Prod-зависимости клиента | react 19, socket.io-client, lucide-react, vaul, clsx, tailwind-merge, @telegram-apps/sdk-react (не импортируется, см. FINDINGS-14) | `client/package.json:11-19` |
| node:sqlite | встроенный модуль Node 22+, отдельной зависимости нет | `server/snapshot.ts:1` |
| Тесты | 8 файлов, `node --test`, 33 pass / 0 fail | `npm test` 2026-10-31 |
| Typecheck | `tsc --noEmit`, 0 ошибок | `npm run typecheck` 2026-10-31 |
| Node на машине | v26.12.1 (engines `>=22`) | `package.json:6` |
| БД | единственная таблица `rooms` | `server/snapshot.ts:5` |

## Файлы сервера (22 файла, 2855 строк)

| Файл | Строк | Назначение в одну строку |
|---|---|---|
| `index.ts` | 109 | env (PORT 3005, BOT_TOKEN, SQLITE_PATH), /health, /dev/token, раздача статики, запуск RoomManager |
| `room.ts` | 484 | RoomManager: сокеты, лобби, роутинг 17 интентов, таймеры, дисконнекты, сохранение снимков |
| `types.ts` | 122 | Car/Player/Room/Phase/Intent (17 интентов), константы GARAGE_CAP/MIN/MAX_PLAYERS |
| `turn.ts` | 250 | RuleError, applyMove, advanceTurn, checkWin, applyAutoTurn, assertIntent, константы таймингов |
| `actions.ts` | 167 | правила клеток: repair/scrap/buyout/rent/taxi/buy |
| `auction.ts` | 142 | startAuction, applyBid, applyAuctionPass, concludeAuction (шаг 100/500, таймер 10 с) |
| `race.ts` | 227 | дуэль: invite/accept/forfeit/joinPool, stepRaceRoll, тайбрейк-переброски |
| `loans.ts` | 137 | P2P-займы: grantLoan, взыскание в end_turn, просрочка +200 €/ход |
| `decks.ts` | 291 | каталоги 4 классов, дефекты, перемешивание, recycleDeck, initGame, rollTurnOrder |
| `money.ts` | 26 | Euro = bigint, константы баланса, add/sub/canPay |
| `track.ts` | 32 | 9 клеток, TRACK_LEN, stepCost (1-2 бесплатно, 3-4 по 300 €), stepsWalked |
| `snapshot.ts` | 42 | SQLite: таблица rooms, encode/decode `$euro`, serializeRoom, loadRooms |
| `auth.ts` | 41 | verifyInitData: HMAC-SHA256 по бот-токену, свежесть 3600 с |
| `rng.ts` | 17 | d6 через `crypto.randomInt`, shuffle — единственный источник случайности |
| `actions.test.ts` | 124 | тесты клеток |
| `auth.test.ts` | 33 | подпись/подделка initData |
| `mechanics.test.ts` | 296 | тесты аукциона, гонки, займов, ликвидации |
| `money.test.ts` | 12 | отказ от отрицательного баланса и дробей |
| `room.test.ts` | 170 | интеграционный: реальные сокеты, лобби → старт → автоход → займ → taxi ack |
| `snapshot.test.ts` | 34 | bigint-денежный round-trip через SQLite |
| `track.test.ts` | 22 | состав трека и цены шагов |
| `turn.test.ts` | 77 | перемещение, чужой ход, rentSteps |

## Файлы клиента (24 файла, 2949 строк)

| Файл | Строк | Назначение |
|---|---|---|
| `main.tsx` | 10 | корень React, StrictMode |
| `App.tsx` | 235 | LiveTable: dev-auth через /dev/token, выбор экрана, разводка колбэков |
| `MockTable.tsx` | 222 | статичная витрина стола для `?mock=1` |
| `api/index.ts` | 3 | barrel-реэкспорт api |
| `api/socket.ts` | 96 | синглтон socket.io (autoConnect off), auth/startMatch/sendIntent, fetchDevToken |
| `api/types.ts` | 144 | зеркальные типы контракта (деньги — строки) |
| `api/useGame.ts` | 251 | useGame: подписки, isMyTurn, executeIntent + 14 хелперов интентов |
| `api/present.ts` | 102 | словарь ошибок RU, фазовые/клеточные подписи, allowedCarActions, shopOffer |
| `components/table/Dock.tsx` | 331 | нижняя панель: шаги +1..+4, действия клетки, кнопка займа |
| `components/table/TrackWheel.tsx` | 306 | SVG-кольцо 9 секторов, фишки, центральный хаб |
| `components/table/GarageBar.tsx` | 115 | лента авто с диодами статуса, открытие CarDetailsSheet |
| `components/table/Hud.tsx` | 47 | баланс, бейдж хода, номер хода |
| `components/table/OpponentsBar.tsx` | 61 | карточки соперников |
| `components/table/TableLayout.tsx` | 36 | 5 зон стола |
| `components/table/TrackContainer.tsx` | 40 | заглушка арены (не используется в LiveTable) |
| `components/table/playerTokens.ts` | 10 | цвета 4 фишек |
| `components/table/index.ts` | 7 | barrel table-компонент |
| `components/auction/AuctionModal.tsx` | 161 | модалка аукциона: таймер со скью, +100/+500/пас |
| `components/lobby/LobbyScreen.tsx` | 160 | 4 слота, хост, кнопка старта, dev-ссылки сидений |
| `components/lobby/ConnectingScreen.tsx` | 38 | экран подключения/ошибки с retry |
| `components/sheets/CarDetailsSheet.tsx` | 246 | шторка авто: статус, выкуп, дефект, ремонт/чермет/продажа |
| `components/sheets/GlassSheet.tsx` | 64 | обёртка vaul-Drawer со стеклом и safe-area Telegram |
| `components/sheets/LoanSheet.tsx` | 252 | форма P2P-займа: пресеты, маржа, срок |
| `components/sheets/formatEuro.ts` | 12 | форматирование строк-денег (только показ) |

## Константы и лимиты

| Константа | Значение | Место |
|---|---|---|
| `STARTING_CASH` / `START_CASH` | 1600 € (дубли, см. FINDINGS-12) | `server/money.ts:9`, `server/decks.ts:5` |
| `WIN_CASH` | 32 000 € | `server/turn.ts:47` |
| `GARAGE_CAP` | 4 | `server/types.ts:120` |
| `MIN_PLAYERS` / `MAX_PLAYERS` | 3 / 4 | `server/types.ts:121-122` |
| `TRACK_LEN` | 9 клеток | `server/track.ts:14` |
| `MAX_STEP` / `FREE_STEPS` | 4 / 2 | `server/track.ts:15-16` |
| `EXTRA_STEP_COST` | 300 € за шаг свыше 2 | `server/money.ts:13` |
| `TURN_TIMEOUT_SEC` | 30 | `server/turn.ts:48` |
| `DISCONNECT_TIMEOUT_SEC` | 5 | `server/turn.ts:49` |
| `DISCONNECT_GRACE_SEC` | 10 | `server/turn.ts:50` |
| `AUCTION_TIMEOUT_SEC` | 10 | `server/auction.ts:5` |
| `RACE_POOL_TIMEOUT_SEC` | 10 | `server/race.ts:7` |
| `MAX_MISSED_LAPS` | 3 | `server/turn.ts:51` |
| initData maxAge | 3600 с | `server/auth.ts:15` |
| Порт по умолчанию | 3005 | `server/index.ts:15` |
| SQLITE_PATH по умолчанию | `./tachka.sqlite` | `server/index.ts:17` |

## Схема БД

```sql
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  updated_at INTEGER NOT NULL
)
```
Источник: `server/snapshot.ts:4-9`. Запись — upsert в `saveRoom` (`server/snapshot.ts:27-32`), вызывается только при смене хода (`server/room.ts:374-377`).
