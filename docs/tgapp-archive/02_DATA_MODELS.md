# Перекуп D6 — Полная техническая документация
## Файл 2 из 6: Типы данных и Модели

> Все типы базируются на **Zod-схемах** в пакете `packages/shared/src/dtos/`. Константы и формулы — в `constants.ts` и `businessLogic.ts`.

---

## 1. Примитивные типы

```typescript
// packages/shared/src/dtos/common.ts
export type SeverityLevel  = 'Light' | 'Medium' | 'Serious' | 'Critical';
export type CarTier        = 'Bucket' | 'Scrap' | 'Business' | 'Premium' | 'Rarity';
export type DefectCategory = 'Engine' | 'Electrical' | 'Suspension' | 'Body';
export type LogType        = 'bot' | 'system' | 'debt' | 'quest' | 'success' | 'error' | 'info';
```

---

## 2. Автомобиль и Дефекты

### CarModel (carDatabase.ts — шаблон)
```typescript
export interface CarModel {
  name: string;
  tier: CarTier;
  basePriceRange: [number, number];
  description: string;
  imageId?: string;          // ключ SVG-ассета: /assets/cars/{imageId}.svg
  forcedDefectIds?: string[]; // дефекты, всегда присутствующие у легендарных моделей
}
```

### DefectInstance (в составе Car)
```typescript
export interface DefectInstance {
  id: string;
  defectTypeId: string;   // ID из DEFECTS_DB
  name: string;
  severity: SeverityLevel;
  repairCost: string;     // Decimal string
  isRepaired: boolean;
  isHidden: boolean;      // true до диагностики (Premium / Rarity по умолчанию)
}
```

### Car (dtos/car.ts)
```typescript
export interface Car {
  id: string;
  name: string;
  tier: CarTier;
  basePrice: string;        // Decimal string
  defects: DefectInstance[];
  health: number;           // 0–100, рассчитывается через calculateCarHealth()
  history: string[];
  boughtFor: string;        // цена покупки; '0' если не куплена игроком
  isRented?: boolean;
  isLocked?: boolean;       // заблокирована как залог по долгу
  auditLog?: CarHistoryEntry[];
  imageId?: string;         // ключ SVG-ассета для карточки (передаётся из CarModel)
}
```

---

## 3. Игрок (Player)

```typescript
export interface Player {
  id: string;
  name?: string;
  balance: string;             // Decimal string — текущий баланс
  fuel: number;
  position: number;            // 0–11
  reputation: number;
  garage?: Car[];
  energy: number;              // 0–MAX_ENERGY (3)
  energyRegenCounter: number;
  totalEarned?: string;        // Decimal string — накопительная выручка (никогда не уменьшается)
                               // Используется для системы прогрессии (canUseDiagnostics)
}
```

---

## 4. Игровые константы (`constants.ts`)

```typescript
export const DIAGNOSTICS_COST            = 200;      // цена диагностики
export const MARKET_REFRESH_COST         = 500;      // обновление лота
export const ENERGY_PURCHASE_COST        = 500;      // покупка 1 ед. энергии
export const MAX_ENERGY                  = 3;        // максимум энергии
export const SPECIAL_REPAIR_DISCOUNT     = '0.95';   // скидка на клетке Пехота

// ── Прогрессия ────────────────────────────────────────────────────────────────
export const DIAGNOSTICS_UNLOCK_THRESHOLD = '50000'; // нужна суммарная выручка $50k
```

---

## 5. Состояние комнаты (RoomState)

```typescript
export interface RoomState {
  id: string;
  players: Player[];
  market: Car[];
  hostId: string;
  currentTurnIndex: number;
  winCondition: number;
  activeDebts?: Debt[];
  activeRace?: RaceDuel | null;
  activeEvent?: GameNews | null;
  winnerId?: string;
  totalTurns?: number;
  marketRefreshedAt?: number;
  marketStats?: MarketStats;       // статистика рынка для Smart Event Director
  eventFeed?: EventFeedEntry[];    // серверная лента событий (max 20)
}
```

### MarketStats (dtos/room.ts)
```typescript
export interface MarketStats {
  boughtByTier: Record<CarTier, number>; // сколько машин куплено по каждому тиру
  repairsDone: number;                   // количество ремонтов
  carsRented: number;                    // количество сдач в прокат
  racesWon: number;                      // количество выигранных гонок
}
```

### EventFeedEntry (dtos/room.ts)
```typescript
export type EventFeedEntryType = 'buy' | 'sell' | 'race_win' | 'race_loss' | 'loan' | 'confiscate';

export interface EventFeedEntry {
  playerId: string;
  playerName?: string;
  type: EventFeedEntryType;
  text: string;          // "купил Toyota Supra за $55,000"
  timestamp: number;     // unix ms
}
```

---

## 6. Игровая карта (GAME_MAP)

```typescript
export const GAME_MAP: BoardCell[] = [
  { id: 0,  type: 'sale',           name: 'Чапаевка',          icon: '💰' },
  { id: 1,  type: 'buy_bucket',     name: 'Вёдра',             icon: '🪣' },
  { id: 2,  type: 'repair',         name: 'Автосервис',        icon: '🛠️' },
  { id: 3,  type: 'race',           name: 'Гонка',             icon: '🏎️' },
  { id: 4,  type: 'buy_random',     name: 'Автоподбор',        icon: '🚗' },
  { id: 5,  type: 'buy_scrap',      name: 'Битьё',             icon: '🔨' },
  { id: 6,  type: 'sale',           name: 'Чапаевка',          icon: '💰' },
  { id: 7,  type: 'buy_premium',    name: 'Премиум',           icon: '⭐' },
  { id: 8,  type: 'special_repair', name: 'Автосервис Пехота', icon: '🛠️' },
  { id: 9,  type: 'race',           name: 'Гонка',             icon: '🏎️' },
  { id: 10, type: 'rent',           name: 'Прокат',            icon: '🚗' },
  { id: 11, type: 'buy_retro',      name: 'Ретро',             icon: '🏎️' },
];
```

---

## 7. Долг (Debt)

```typescript
export interface Debt {
  id: string;
  lenderId: string;
  borrowerId?: string;
  collateralCarId?: string;
  amount: string;
  interest: string;
  totalToPay: string;
  turnsLeft: number;
  initialTurns: number;
  status: 'pending' | 'active' | 'closed' | 'confiscated';
}
```

---

## 8. Синхронизация (SyncActionPayload)

Discriminated union — каждый экшен типизирован строго.

**Торговля**: `buyCar`, `sellCar`, `refreshMarket`, `updateMarket`
**Сервис**: `repairCar`, `diagnoseCar`*, `diagnoseMarketCar`*
**Доход**: `rentCar`, `buyEnergy`
**Движение**: `manualMove`
**P2P Долги**: `loanOffer`, `loanAccepted`, `repayDebt`, `confiscateCar`
**Гонки**: `raceLobbyOpen`, `raceChallengeInitiated`, `raceAccept`, `raceDecline`, `raceJoin`, `raceResults`
**Системные**: `newsUpdate`, `victory`

> *`diagnoseCar` / `diagnoseMarketCar` — сервер блокирует, если `player.totalEarned < $50,000`.
