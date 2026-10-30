# Перекуп D6 — Дорожная карта (Roadmap)

---

## 1. Стабильность и Надёжность (High Priority)

### [ ] Переход на Redis для Room State
- **Проблема**: Комнаты в RAM — при перезагрузке сервера сессии стираются.
- **Решение**: Redis с TTL 24 часа.

### [ ] Full State Sync при реконнекте
- **Проблема**: Клиент может пропустить события при потере связи.
- **Решение**: Событие `request_full_state` → полный `RoomState`. Вызывать автоматически при `connect` (помимо `joinRoom`).

### [ ] Полное Zod-покрытие на сервере
- **Проблема**: Не все обработчики в `socketHandlers.ts` валидируют входящие данные схемой.
- **Решение**: `schema.parse()` на каждое входящее событие.

---

## 2. Завершённые задачи (✅)

### [x] Рефакторинг gameStore.ts (Phase 0)
`gameStore.ts` 912 строк → 68 строк. Декомпозиция на `createPlayerSlice`, `createSoloSlice`, `createMultiplayerSlice`. Выделены `store.types.ts` и `socketListeners.ts`.

### [x] Расширение Shared Logic (Phase 0)
`constants.ts`: стоимостные константы + `DIAGNOSTICS_UNLOCK_THRESHOLD`.
`businessLogic.ts`: `TIER_RACE_BONUS`, `generateMarketForCell`, `resolveRandomEncounter`, `calculateSoloRaceWinChance`, `canUseDiagnostics`, `selectWeightedNews`.

### [x] Легендарный автопарк (Phase 1)
`carDatabase.ts`: `imageId` и `forcedDefectIds` на `CarModel`. Новые легенды:
- **ЗИЛ 600 сил** (Rarity) — огромный налог, огромная цена продажи
- **Bentley на гусеницах** (Rarity) — принудительный дефект `tracks_off`
- **Электро-Волга** (Premium) — принудительный дефект `electric_fire`
- **Нива Легенда** (Bucket), **КамАЗ Дакар** (Scrap)

`defectDatabase.ts`: `tracks_off`, `electric_fire`, `bureaucratic_block`.

`businessLogic.ts`: `generateCar()` поддерживает `forcedDefectIds` и `imageId`.

### [x] Smart Event Director (Phase 2)
`selectWeightedNews(stats)` — 9 весовых правил на основе `MarketStats` (boughtByTier, repairsDone, racesWon).
4 новых контекстных события: `luxury_deficit`, `gai_raid`, `repair_season`, `racing_fever`.
Сервер: `passTurn()` вызывает Smart Event Director каждые 5 ходов — клиент больше не управляет выбором новостей в мультиплеере.

### [x] Система прогрессии (Phase 3)
`canUseDiagnostics(player)` — разблокировка через `totalEarned >= $50,000`.
`totalEarned` трекается на сервере (`processSellCar`) и в соло на клиенте.
Сервер блокирует `diagnoseCar`/`diagnoseMarketCar` через progression gate в `socketHandlers.ts`.
UI: кнопка 🔒 с тултипом в `ActionModal` и `MarketView`.

### [x] Глобальная лента событий (Phase 4)
`pushFeedEvent()` вызывается в `processBuyCar`, `processSellCar`, `processRaceResolve`, конфискации в `passTurn`.
`EventFeed.tsx` — фиксированный оверлей: последние 5 из 20 событий с slide-in анимацией.

### [x] FTUE — Онбординг и защита (Phase 5)
`TutorialOverlay.tsx` — 3 слайда при первом запуске (флаг в localStorage).
`ResetConfirmModal.tsx` — диалог подтверждения вместо прямого сброса по deep-link.

### [x] Архитектура карточек (Phase 6)
`TIER_CONFIG` расширен токенами `border` и `glow` для card-фреймворка.
`CarCard.tsx` — основа TCG-стиля: `imageId` → SVG, fallback → эмодзи, health bar, badge дефектов, badge 🔒.

---

## 3. Геймплей и Контент (Future)

### [ ] Соло-режим 2.0 — Боря-перехватчик
ИИ-оппонент, перекупающий лоты с рынка, предлагающий кабальные займы.

### [ ] Система аккаунтов (PostgreSQL)
Постоянный профиль, история сделок, коллекция редких авто.

### [ ] SVG-ассеты для карточек
Силуэты авто для `imageId` (легенды в первую очередь: `zil_600`, `bentley_tracks`, `electro_volga`).

### [ ] Репутация как вторая ось прогрессии
Репутация влияет на скидки в сервисах, удачу в гонках, доступные займы.

---

## 4. Чек-лист качества

- [x] `npm run typecheck` — 0 ошибок на всех 3 пакетах.
- [x] Финансовые операции — только через `Decimal.js`.
- [x] Скрытые дефекты не передаются на клиент до диагностики.
- [x] Нет `any` и `ts-ignore` без веской причины.
- [x] Формулы и константы — только в `packages/shared`.
- [x] `TIER_RACE_BONUS` — единственный источник в `shared`, сервер и клиент используют одно значение.
- [ ] Zod-валидация всех входящих Socket-событий.
- [ ] HMAC-проверка Telegram Init Data.
