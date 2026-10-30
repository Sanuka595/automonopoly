# Перекуп D6 — Полная техническая документация
## Файл 3 из 6: Игровые Механики и Экономика

> Все формулы и константы — в `packages/shared/src/businessLogic.ts` и `constants.ts`. Клиент и сервер импортируют одни и те же чистые функции.

---

## 1. Карта и Перемещение

12 клеток. `newPosition = (currentPosition + steps) % 12`.

### Бросок D6
`rollDice()` в соло решается локально через `handleDiceRollResult`. В мультиплеере — сервер через `dice_roll`.

### Тактический ход (Энергия)
- **Максимум**: `MAX_ENERGY = 3`
- **Стоимость**: 1 ед. энергии за ход (+1/+2/+3 клетки)
- **Покупка**: $`ENERGY_PURCHASE_COST = 500` на клетке `sale`

### Случайные встречи — `resolveRandomEncounter()`
При каждом броске D6 с вероятностью **15%** срабатывает встреча:
```typescript
{ type: 'fine',  amount: $100–$300 }  // ГАИ — тонировка
{ type: 'bonus', amount: $50–$200  }  // Заначка в бардачке
```

---

## 2. Экономика и Цены

Все расчёты через `Decimal.js`.

### Покупка — `calculateCurrentMarketValue(car, activeNews?)`
```
basePrice → applyNewsEffects → − (repairCost × 1.2) за каждый дефект → min $100
```

### Продажа — `calculateSellPrice(car, activeNews?)`
```
basePrice → applyNewsEffects → − repairCost → × PROFIT_MARGINS[tier] → min $100
```
- `legal_block` на машине → возвращает `Decimal(0)`, продажа запрещена
- **Rarity**: детерминированный `deterministicMultiplier(car.id, 2, 4)` + бонус `+$5,000` при `health=100`

### Налоги — `calculateOwnershipTax(garage)`
При каждом броске: `Bucket $20 / Scrap $50 / Business $100 / Premium $150 / Rarity $300`

### Константы стоимостей
| Константа | Значение | Описание |
|---|---|---|
| `DIAGNOSTICS_COST` | $200 | Диагностика |
| `MARKET_REFRESH_COST` | $500 | Обновление лота |
| `ENERGY_PURCHASE_COST` | $500 | Покупка энергии |
| `SPECIAL_REPAIR_DISCOUNT` | 0.95 | Скидка на клетке Пехота |
| `DIAGNOSTICS_UNLOCK_THRESHOLD` | $50,000 | Порог разблокировки диагностики |

---

## 3. Система прогрессии — `canUseDiagnostics(player)`

Диагностика заблокирована до тех пор, пока суммарная выручка игрока (`totalEarned`) не достигнет `$50,000`.

```typescript
export function canUseDiagnostics(player: Player): boolean {
  return new Decimal(player.totalEarned ?? '0').gte(DIAGNOSTICS_UNLOCK_THRESHOLD);
}
```

- `totalEarned` — накопительный счётчик, увеличивается при каждой продаже авто, **никогда не уменьшается**.
- Трекинг на сервере: `processSellCar` прибавляет `sellPrice` к `player.totalEarned`.
- Трекинг на клиенте: `sellCar` обновляет `totalEarned` в соло-режиме.
- **Сервер блокирует**: `socketHandlers.ts` проверяет `canUseDiagnostics(player)` перед обработкой `diagnoseCar`/`diagnoseMarketCar` — читеры не обойдут.
- **UI**: кнопка диагностики показывает 🔒 с тултипом "Заработай $50,000" пока не разблокировано.

---

## 4. Генерация рынка — `generateMarketForCell(cellType)`

| Тип клетки | Генерируемые авто |
|---|---|
| `buy_bucket` | 3 × Bucket |
| `buy_scrap` | 3 × Scrap |
| `buy_business` | 3 × Business |
| `buy_premium` | 2 × Premium |
| `buy_retro` | 1 × Rarity |
| `buy_random` | 3 случайных тира |

Используется и при попадании на клетку (`executeCellAction`), и при обновлении рынка (`refreshMarket`).

---

## 5. Механика Гонки

### Мультиплеер — `processRaceResolve()` (сервер)
D6 + `TIER_RACE_BONUS` + бонус инициатора +1. Победитель забирает ставку (≤ 50% баланса инициатора).

```typescript
export const TIER_RACE_BONUS: Record<CarTier, number> = {
  Bucket: -1, Scrap: 0, Business: 0, Premium: +1, Rarity: +2,
};
```

После гонки: `room.marketStats.racesWon++`, `pushFeedEvent(room, 'race_win', …)`.

### Соло — `calculateSoloRaceWinChance(car)`
```typescript
winChance = (car.health / 100) * SOLO_RACE_TIER_MULTIPLIERS[car.tier]
// { Bucket: 0.5, Scrap: 0.7, Business: 1.0, Premium: 1.3, Rarity: 1.6 }
```
Победа → `+bet×2`, поражение → `-bet`.

---

## 6. Smart Event Director — `selectWeightedNews(stats)`

Каждые **5 ходов** сервер (`passTurn()`) выбирает новость **с учётом активности рынка** — не случайно.

```typescript
export function selectWeightedNews(stats: MarketStats | null): GameNews
```

**Весовые правила** (базовый вес каждого события = 100):

| Событие | Условие | Бонус |
|---|---|---|
| `scrap_utilization` | Никто не купил Scrap | +400 |
| `luxury_deficit` | Куплено ≥3 Premium | +300 |
| `racing_fever` | ≥2 выигранных гонок | +300 |
| `retro_hype` | Куплена хотя бы 1 Rarity | +250 |
| `tax_luxury` | Куплено ≥3 Premium | +250 |
| `taxi_boom` | Куплено ≥2 Business | +200 |
| `gai_raid` | Куплено ≥4 Bucket | +200 |
| `fuel_crisis` | Куплено ≥3 Bucket | +200 |
| `repair_season` | ≥5 ремонтов | +150 |

В соло-режиме клиент вызывает `selectWeightedNews(null)` → равновероятный выбор.

**Полный список событий (14 штук):**
Стандартные: `tax_luxury`, `fuel_crisis`, `retro_hype`, `taxi_boom`, `scrap_utilization`, `jdm_fest`, `ev_subsidies`, `export_ban`, `stable_economy`, `economic_growth`
Контекстные: `luxury_deficit`, `gai_raid`, `repair_season`, `racing_fever`

---

## 7. Глобальная лента событий — `EventFeedEntry[]`

Сервер накапливает до **20 записей** в `room.eventFeed`. Записи добавляются через `pushFeedEvent()` при ключевых транзакциях:

| Транзакция | Тип записи |
|---|---|
| `processBuyCar` | `buy` |
| `processSellCar` | `sell` |
| `processRaceResolve` (победитель) | `race_win` |
| Конфискация залога в `passTurn` | `confiscate` |

Клиент: компонент `EventFeed.tsx` — фиксированный оверлей справа вверху, показывает последние 5 записей с анимацией slide-in. Виден только в мультиплеере.

---

## 8. P2P Долги и Конфискация

1. Залог ≥ 80% суммы займа.
2. Машина блокируется (`isLocked = true`).
3. При `turnsLeft = 0` — авто автоматически переходит кредитору + запись в `eventFeed` (тип `confiscate`).

---

## 9. Условие победы

- **Цель**: `player.balance >= room.winCondition` (по умолчанию $500,000).
- **Проверка**: `processSellCar` на сервере после каждой продажи.
- **Завершение**: сервер ставит `winnerId`, клиенты получают `room_updated`.
