# Перекуп D6 — Полная техническая документация
## Файл 4 из 6: Стейт-менеджмент и Компоненты

---

## 1. Zustand Store — архитектура слайсов

Zustand 5 с паттерном `StateCreator`. Каждый слайс содержит **и типы состояния, и реализацию экшенов**. Основной стор — тонкий ассемблер (~68 строк).

```
packages/client/src/store/
├── gameStore.ts             # create() + persist + resetAccount + dev tools
├── store.types.ts           # GameStore interface (объединяет все слайсы)
├── socketListeners.ts       # initSocketListeners() — отдельный модуль
├── storage.ts               # TMA-совместимый persist-адаптер
└── slices/
    ├── playerSlice.ts       # Стейт + createPlayerSlice (canUseDiagnostics guards)
    ├── soloSlice.ts         # Стейт + createSoloSlice
    └── multiplayerSlice.ts  # Стейт + createMultiplayerSlice (eventFeed)
```

---

## 2. Паттерн StateCreator

`get()` внутри любого слайса возвращает **весь** стор — перекрёстный доступ гарантирован.

```typescript
export const createPlayerSlice: StateCreator<GameStore, [['zustand/persist', unknown]], [], PlayerSlice> =
  (set, get) => ({
    ...initialPlayerState,
    buyCar: (carId) => {
      const { player, market, activeEvent } = get();
      // ...
    },
  });

// gameStore.ts
export const useGameStore = create<GameStore>()(
  persist(
    (set, get, api) => ({
      ...createPlayerSlice(set, get, api),
      ...createSoloSlice(set, get, api),
      ...createMultiplayerSlice(set, get, api),
      resetAccount: () => { ... },       // cross-slice
      devAddMoney: (amount) => { ... },  // dev tools
    }),
    { name: 'perekup-storage', ... }
  )
);
```

---

## 3. Типы стора

### GameStore (`store.types.ts`)
```typescript
export interface GameStore extends PlayerSlice, SoloSlice, MultiplayerSlice {
  resetAccount: () => void;
  devAddMoney: (amount: string) => void;
  devAddEnergy: (amount: number) => void;
  devTeleport: (cellId: number) => void;
  devResetTurn: () => void;
}
```

### PlayerSlice — ключевые поля
```typescript
interface PlayerState {
  player: Player;       // включает totalEarned для прогрессии
  garage: Car[];
  market: Car[];
  currentEvent: BoardCell | null;
  lastDiceRoll: number | null;
  hasRolledThisTurn: boolean;
  logs: LogEntry[];
  activeEvent: GameNews | null;
  totalTurns: number;
}
```

**Экшены с защитой прогрессии:**
- `diagnoseCar`, `diagnoseMarketCar` — проверяют `canUseDiagnostics(player)` перед выполнением
- `sellCar` — инкрементирует `player.totalEarned` в соло-режиме

### MultiplayerSlice — ключевые поля
```typescript
interface MultiplayerState {
  roomId: string | null;
  players: Player[];
  activeDebts: Debt[];
  isHost: boolean;
  currentTurnIndex: number;
  winCondition: number;
  winnerId: string | null;
  activeRace: RaceDuel | null;
  pendingRaceChallenge: RaceDuel | null;
  eventFeed: EventFeedEntry[];   // ← серверная лента событий (Phase 4)
}
```

`syncRoomState` получает `room_updated` и обновляет `eventFeed: roomState.eventFeed ?? state.eventFeed`.

---

## 4. Socket.IO listeners (`socketListeners.ts`)

```typescript
// App.tsx — вызывается один раз при монтировании
import { initSocketListeners } from './store/gameStore';
useEffect(() => { initSocketListeners(); }, []);
```

Обрабатываемые события:
- `room_updated` → `syncRoomState` (обновляет весь стор включая `eventFeed`)
- `dice_roll_result` → `handleDiceRollResult`
- `sync_action_result` → `handleRemoteAction`
- `room_error` → `addLog('[SERVER ERROR]: …')`
- `connect` → переподключение к комнате при реконнекте

---

## 5. Компоненты (React 19)

### Игровой цикл
| Компонент | Описание |
|---|---|
| `RadialBoard.tsx` | Карта 12 клеток (SVG + Framer Motion) |
| `DiceArea.tsx` | Бросок D6 + тактические ходы (+1/+2/+3) |
| `ActionModal.tsx` | Действия на клетке (ремонт, диагностика с 🔒 при `!canUseDiagnostics`) |
| `GarageView.tsx` | Гараж игрока |
| `MarketView.tsx` | Рынок (покупка/продажа, диагностика с 🔒) |
| `DealsView.tsx` | P2P займы |
| `RaceModal.tsx` | Интерфейс гонок |
| `MultiplayerModal.tsx` | Создание / вход + кнопка "Пригласить друга" |

### Новые компоненты (Phase 4–6)
| Компонент | Описание |
|---|---|
| `EventFeed.tsx` | Глобальная лента: фиксированный оверлей справа вверху, последние 5 событий, AnimatePresence slide-in. Виден только в мультиплеере. |
| `TutorialOverlay.tsx` | Онбординг при первом запуске: 3 слайда (покупка → ремонт → победа), прогресс-дотки, флаг `perekup-tutorial-done` в localStorage. |
| `ResetConfirmModal.tsx` | Диалог подтверждения сброса прогресса. Вызывается вместо прямого `resetAccount()` при deep-link `/reset`. |
| `CarCard.tsx` | TCG-карточка авто: `imageId` → SVG-ассет, fallback — тирный эмодзи; health bar с цветом тира; badge дефектов; badge 🔒 для залога. |

### UI-конфиг (`config/ui.ts`)
```typescript
export const TIER_CONFIG: Record<CarTier, {
  color:  string;   // gradient Tailwind: 'from-X to-Y'
  label:  string;   // локализованное название
  border: string;   // border-color для CarCard
  glow:   string;   // shadow-color для карточки
}> = { ... };
```

---

## 6. Обработка Deep Links

| `start_param` | Поведение |
|---|---|
| `solo` | Запуск одиночного режима |
| `multi` | Открытие MultiplayerModal |
| `reset` | Открывает `ResetConfirmModal` (раньше — прямой сброс без предупреждения) |
| `ROOM_ID` | Автоматическое присоединение к комнате |

---

## 7. Оптимизация

- **Атомарные селекторы**: `useGameStore(s => s.player.balance)` — ререндер только при изменении конкретного поля.
- **React.memo**: `EventFeedItem` мемоизирован для предотвращения ненужных ре-рендеров при обновлении ленты.
- **Decimal.js**: все финансовые операции только через этот тип.
- **eventFeed cap**: максимум 20 записей в `RoomState.eventFeed` — размер `room_updated` не растёт неограниченно.
