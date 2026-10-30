# Перекуп D6 — Полная техническая документация
## Файл 1 из 6: Обзор и Архитектура

> **Цель документа:** Исчерпывающее описание текущего состояния игры «Перекуп D6», её архитектуры и технического стека.

---

## 1. Концепция

**Перекуп D6** — настольная бизнес-стратегия в формате Telegram Mini App (TMA). Игрок выступает в роли перекупщика автомобилей: покупка на рынке, ремонт дефектов и перепродажа с прибылью. Игра поддерживает одиночный режим и мультиплеер в реальном времени.

## 2. Технологический стек

| Слой | Технология | Версия |
|---|---|---|
| Frontend фреймворк | React | 19.x |
| Сборщик | Vite | последняя |
| Состояние | Zustand 5.x | последняя |
| Валидация / Типы | Zod | последняя |
| Финансовые расчёты | Decimal.js | 10.x |
| Анимации | Framer Motion | 12.x |
| WebSocket | Socket.IO (client + server) | 4.x |
| Backend | Node.js + Express | Node 20 |
| TypeScript | strict mode | последняя |
| Деплой | Railway.app | — |

---

## 3. Архитектура: три слоя

```
┌─────────────────────────────────────────────────┐
│  UI LAYER (packages/client)                     │
│  React 19, Framer Motion, Zustand 5             │
│  Тонкий стор — диспетчер событий и UI-стейт.   │
├─────────────────────────────────────────────────┤
│  DOMAIN LAYER (packages/shared)                 │
│  businessLogic.ts — ядро расчётов (pure fn)     │
│  constants.ts — игровые константы и пороги      │
│  carDatabase.ts, defectDatabase.ts — контент    │
│  newsDatabase.ts — события рынка (14 штук)      │
│  dtos/ — Zod схемы (единственный источник типов)│
├─────────────────────────────────────────────────┤
│  INFRASTRUCTURE LAYER (packages/server)         │
│  Authoritative Server (Express + Socket.IO)     │
│  Транзакции, Smart Event Director, EventFeed    │
└─────────────────────────────────────────────────┘
```

**Принцип shared-first:** все игровые формулы, константы и пороги прогрессии живут в `packages/shared`. Расчёты гарантированно идентичны на всех слоях.

---

## 4. Структура проекта (NPM Workspaces Monorepo)

```
TGPEREKUP/
├── packages/
│   ├── shared/                    # ОБЩИЙ ПАКЕТ
│   │   └── src/
│   │       ├── dtos/              # Zod схемы (Car, Player, Room, MarketStats, EventFeedEntry)
│   │       ├── businessLogic.ts   # Чистые функции: расчёты цен, гонки, прогрессия, событийный директор
│   │       ├── constants.ts       # Константы стоимостей + пороги разблокировки (DIAGNOSTICS_UNLOCK_THRESHOLD)
│   │       ├── carDatabase.ts     # Модели авто (imageId, forcedDefectIds для легенд)
│   │       ├── defectDatabase.ts  # Список дефектов (+ legendary: tracks_off, electric_fire)
│   │       ├── newsDatabase.ts    # 14 событий рынка (10 стандартных + 4 для Smart Event Director)
│   │       └── types.ts           # Системные типы и GAME_MAP
│   ├── client/                    # ФРОНТЕНД
│   │   └── src/
│   │       ├── components/
│   │       │   ├── game/
│   │       │   │   ├── ActionModal.tsx      # Действия на клетке (ремонт, диагностика с 🔒)
│   │       │   │   ├── CarCard.tsx          # TCG-карточка авто (imageId / emoji fallback)
│   │       │   │   ├── EventFeed.tsx        # Глобальная лента событий (fixed overlay, мультиплеер)
│   │       │   │   ├── TutorialOverlay.tsx  # Онбординг (3 слайда, localStorage флаг)
│   │       │   │   ├── ResetConfirmModal.tsx# Подтверждение сброса прогресса
│   │       │   │   ├── RadialBoard.tsx      # Карта 12 клеток (SVG + Framer Motion)
│   │       │   │   ├── DiceArea.tsx         # Бросок D6 + тактические ходы
│   │       │   │   ├── GarageView.tsx       # Гараж игрока
│   │       │   │   ├── MarketView.tsx       # Рынок (покупка/продажа, диагностика с 🔒)
│   │       │   │   ├── DealsView.tsx        # P2P займы
│   │       │   │   ├── RaceModal.tsx        # Гонки
│   │       │   │   └── MultiplayerModal.tsx # Создание/вход + кнопка "Пригласить"
│   │       │   └── ui/                      # Базовые компоненты (Button, …)
│   │       ├── config/
│   │       │   └── ui.ts                    # TIER_COLORS, TIER_CONFIG (с border/glow токенами)
│   │       ├── store/
│   │       │   ├── gameStore.ts             # Тонкий ассемблер (~68 строк)
│   │       │   ├── store.types.ts           # GameStore interface
│   │       │   ├── socketListeners.ts       # Socket.IO listeners
│   │       │   ├── storage.ts               # TMA-совместимый persist-адаптер
│   │       │   └── slices/
│   │       │       ├── playerSlice.ts       # Стейт + createPlayerSlice (с canUseDiagnostics guard)
│   │       │       ├── soloSlice.ts         # Стейт + createSoloSlice
│   │       │       └── multiplayerSlice.ts  # Стейт + createMultiplayerSlice (eventFeed)
│   │       └── lib/
│   │           ├── tmaProvider.ts           # Haptic feedback, TMA init, cloudStorage
│   │           └── socket.ts               # Socket.IO client singleton
│   └── server/                    # БЭКЕНД
│       └── src/
│           ├── index.ts            # Express + Socket.IO + Telegram Bot
│           ├── roomManager.ts      # Авторитарная логика: транзакции, pushFeedEvent, Smart Event Director
│           └── socketHandlers.ts   # Диспетчер + progression gate (diagnoseCar / diagnoseMarketCar)
├── Dockerfile
├── railway.json
└── package.json                   # Workspaces config
```

---

## 5. Переменные окружения

```env
BOT_TOKEN=...
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://...
VITE_SOCKET_URL=/
```

---

## 6. Серверная архитектура (Authoritative Server)

Сервер является единственным источником истины. Все важные изменения состояния происходят на сервере после валидации.

**Процесс действия:**
1. Клиент отправляет запрос через `sync_action`.
2. Сервер вызывает нужный метод `roomManager`.
3. При успехе сервер обновляет `RoomState` (включая `eventFeed` и `marketStats`) и рассылает `room_updated`.

---

## 7. Socket.IO — события

### Client → Server
| Событие | Payload | Описание |
|---|---|---|
| `create_room` | `{ player, winCondition }` | Создать игру |
| `join_room` | `{ roomId, player }` | Войти в игру |
| `dice_roll` | `{ roomId, playerId }` | Бросок кубика |
| `pass_turn` | `{ roomId, playerId }` | Передать ход (сервер запускает Smart Event Director) |
| `sync_action` | `{ action, payload }` | Игровое действие |

### Server → Client
| Событие | Payload | Описание |
|---|---|---|
| `room_updated` | `RoomState` | Полное состояние комнаты (включает `eventFeed`, `marketStats`, `activeEvent`) |
| `dice_roll_result` | `{ playerId, diceValue, newPosition }` | Результат броска |
| `sync_action_result` | `{ playerId, action, payload }` | Реле действия другого игрока |
| `room_error` | `string` | Ошибка валидации (в т.ч. прогрессия-лок диагностики) |

---

## 8. Безопасность

- **Авторитарный сервер**: баланс, гараж, позиция — только через `roomManager`.
- **Zod**: входящие DTO проходят проверку схем.
- **Progression gate**: `socketHandlers.ts` блокирует `diagnoseCar`/`diagnoseMarketCar` если `canUseDiagnostics(player) === false`.
- **Shared constants**: все числовые параметры игры в `constants.ts` — один источник правды.
- **Haptic**: обратная связь через Telegram Haptic Feedback.
