# Перекуп D6 — Техническая документация
## Файл 6 из 6: Бизнес-логика и ценообразование

> Реализовано 2026-04-25. Все функции живут в `packages/shared/src/businessLogic.ts` — единственный источник правды для обоих пакетов.

---

## 1. Принцип

```
packages/shared/src/businessLogic.ts
         ↙                    ↘
packages/client           packages/server
gameStore.ts              roomManager.ts
(UI + оптимистичный UI)   (авторитативные транзакции)
```

Клиент вычисляет цену локально (оптимистично), применяет к state. Сервер независимо валидирует ту же формулу при `processBuyCar` / `processSellCar`. Если клиент подделает сумму — сервер не даст пройти: он сравнивает баланс с `calculateCurrentMarketValue`.

---

## 2. Зависимость

```
decimal.js@10.6.0 → packages/shared + packages/server + packages/client
import { Decimal } from 'decimal.js'  // именованный импорт, а не default
```

> **Важно:** `@types/decimal.js@0.0.32` (старый community types для v5/6) удалён из клиента — он перекрывал встроенные типы decimal.js v10 и вызывал `TS2709: Cannot use namespace 'Decimal' as a type` при `Node16` moduleResolution.

---

## 3. Константы

```typescript
SEVERITY_COST_RANGES: Record<SeverityLevel, [min, max]>
  Light: [50, 200], Medium: [200, 800], Serious: [800, 3000], Critical: [3000, 10000]

OWNERSHIP_TAX_RATES: Record<CarTier, number>
  Bucket: 20, Scrap: 50, Business: 100, Premium: 150, Rarity: 300

PROFIT_MARGINS: Record<CarTier, number>
  Bucket: 1.10, Scrap: 1.20, Business: 1.15, Premium: 1.15, Rarity: 1.0 (спец. формула)

RENT_INCOME: Record<CarTier, number>
  Bucket/Business: 200, Scrap: 500, Premium/Rarity: 1000
```

---

## 4. Публичные функции

### `calculateCarHealth(defects: DefectInstance[]): number`
```
health = 100
for defect where !isRepaired: health -= HEALTH_PENALTIES[defect.severity]
return max(0, health)
```
> `DefectInstance.severity` — денормализованное поле, добавленное 2026-04-25. По��воляет избежать lookup в DEFECTS_DB пр�� вычислении health.

---

### `applyNewsEffects(price, car, activeNews?) → Decimal`
```
multiplier = 1
  × activeNews.effects.tierMultipliers[car.tier]  (есл�� есть)
  × activeNews.effects.modelMultipliers[car.name] (если есть)
return price × multiplier
```

---

### `calculateCurrentMarketValue(car, activeNews?) → Decimal`
**Цена покупки на рынке (что платит покупатель).**
```
value = basePrice
value = applyNewsEffects(value, car, activeNews)
for defect where !isRepaired:
  value -= defect.repairCost × 1.2  ← штраф 20% = риск покупателя
return max(100, value)
```

---

### `calculateSellPrice(car, activeNews?) → Decimal`
**Цена продажи на Чапаевке (что получает продавец).**

Возвращает `Decimal(0)` если есть актив��ый `legal_block` дефект → продажа запрещена.
```
if legal_block unrepaired → return 0

value = basePrice
value = applyNewsEffects(value, car, activeNews)
for defect where !isRepaired:
  value -= defect.repairCost  ← без штрафа, честна�� цена

if tier === 'Rarity':
  value × deterministicMultiplier(car.id, 2, 4)
  bonus +$5,000 if health=100 AND ≤2 defects AND all repaired
else:
  value × PROFIT_MARGINS[tier]

return max(100, value)
```

---

### `calculateOwnershipTax(garage: Car[]) → Decimal`
```
Σ OWNERSHIP_TAX_RATES[car.tier] для всех машин в гараже
```
Спи��ывается при каждом броске кубика.

---

### `calculateRentIncome(tier: CarTier) → Decimal`
Возвращает `RENT_INCOME[tier]`.

---

### `generateRepairCost(severity, tier, defectTypeId?) → Decimal`
```
if defectTypeId === 'legal_block' → return 2000 (фиксированно)
base = randomInt(SEVERITY_COST_RANGES[severity])
if tier === 'Premium' || 'Rarity': base × 2
return base
```
Используется при генерации машин (пока на клиенте, Phase 4 — перенести на сервер).

---

### `deterministicMultiplier(seed, min, max) → number`
```
hash = polynomial_hash(seed, prime=31)
t = (hash % 1000) / 1000   // [0, 1)
return min + t × (max - min)
```
Для Rarity: одна и та же машина (`car.id`) всегда продаётся с одним множителем → честная игра, игрок может рассчитать P&L до покупки.

---

## 5. Модификации типов (2026-04-25)

### DefectInstance — добавлено поле `severity`
```typescript
export interface DefectInstance {
  id: string;
  defectTypeId: string;
  severity: SeverityLevel;   // ← НОВОЕ: денормализовано из DefectType
  isHidden: boolean;
  repairCost: string;
  isRepaired: boolean;
}
```
**Причина:** `calculateCarHealth` должна работать без lookup в DEFECTS_DB, получая severity напрямую из инстанса. Клиент при г��нерации машин обязан заполнять это поле.

---

## 6. Серверный поток транзакции (Phase 3 архитектура)

```
Client: emit('sync_action', { action: 'buyCar', payload: carId })
  │
  ▼
socketHandlers → processBuyCar(roomId, playerId, carId)
  │
  ├── validateTurn()                  → not_your_turn
  ├── market.find(carId)              → car_not_found
  ├── players.find(playerId)          → player_not_found
  ├── calculateCurrentMarketValue(    → uses room.activeEvent
  │     car, room.activeEvent)
  ├── balance.lt(price)               → insufficient_balance
  │
  └── OK: atomically deduct balance + add car to garage + remove from market
          boughtFor = price.toFixed(0)   ← фактическая цена покупки, не basePrice
          emit('room_updated', room)     ← все клиенты получают авторитативный стейт
          relay('sync_action_result')    ← анимация у других игроков
```

---

## 7. Известные ограничения (на 2026-04-25)

| # | Ограничение | Фаза |
| --- | --- | --- |
| 1 | `generateRepairCost` использует `Math.random()` → то��ько на клиенте при генерации машин | Phase 4 — сервер генерирует машины |
| 2 | Sell price на сервере теперь = `calculateSellPrice(basePrice)` без новостей, пока `activeEvent` не установлен хостом | Рабо��ает корректно с Phase 2 `updateActiveEvent` |
| 3 | `car.health` хранится как pre-calculated число — при изменении дефектов клиент обязан пересчитать | Авторитативный пересчёт на сервере — Phase 4 |
