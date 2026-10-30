# 📋 Чек-лист механик TGPerekup

Актуальный статус реализации всех игровых механик.

## 🟢 1. Базовый цикл (Core Loop) — ГОТОВО
- [x] Бросок D6, анимация, `position % 12`.
- [x] Тактический ход (+1/+2/+3) за 1 ед. энергии (`MAX_ENERGY = 3`).
- [x] Случайные встречи: 15% — ГАИ/заначка (`resolveRandomEncounter()`).
- [x] Покупка авто — авторитарно на сервере, синхронизация рынка.
- [x] Продажа авто — сервер, проверка победы, `totalEarned` трекинг.
- [x] Покупка энергии за $500 на клетках `sale`.

## 🟢 2. Экономика и Обслуживание — ГОТОВО
- [x] Smart Event Director: `selectWeightedNews(stats)` каждые 5 ходов (14 событий).
- [x] Ремонт дефектов — авторитарно, списание, `health` пересчёт.
- [x] Диагностика гаража ($200) — с progression gate 🔒 ($50k выручки).
- [x] Диагностика рынка ($200) — с progression gate 🔒.
- [x] Обновление рынка ($500) через `generateMarketForCell()`.
- [x] Прокат — `calculateRentIncome(tier)`.
- [x] Налоги — `calculateOwnershipTax(garage)` при каждом броске.

## 🟢 3. Мультиплеер — ГОТОВО
- [x] P2P займы: биржа, залог (`isLocked`), авто-конфискация.
- [x] Гонки: вызов, ставки, D6 + `TIER_RACE_BONUS`, авторитарный расчёт.
- [x] Победа: авторитарная проверка баланса при продаже.
- [x] Глобальная лента событий (`EventFeed.tsx`, `pushFeedEvent()`).

## 🟢 4. Контент и Прогрессия — ГОТОВО
- [x] 30+ моделей авто, 20+ дефектов + легендарные машины (ЗИЛ, Bentley, Электро-Волга).
- [x] Уникальные дефекты: `tracks_off`, `electric_fire`, `bureaucratic_block`.
- [x] `forcedDefectIds` — подпись легендарных моделей.
- [x] Система прогрессии: `totalEarned` → `canUseDiagnostics()` → разблокировка.
- [x] Сервер-гейт для диагностики в мультиплеере (анти-чит).

## 🟢 5. UX / FTUE — ГОТОВО
- [x] `TutorialOverlay.tsx` — 3-шаговый онбординг при первом запуске.
- [x] `ResetConfirmModal.tsx` — подтверждение перед сбросом прогресса.
- [x] Кнопка "Пригласить друга" в `MultiplayerModal` (deeplink в Telegram).

## 🟡 6. Карточки и Визуал — В РАЗРАБОТКЕ
- [x] `CarCard.tsx` — архитектурный скелет (imageId/SVG + emoji fallback).
- [x] `TIER_CONFIG` с `border` и `glow` токенами для card-фреймворка.
- [ ] SVG-ассеты для легендарных авто (zil_600, bentley_tracks, electro_volga).
- [ ] Полный glassmorphism-дизайн карточек.
- [ ] Интеграция `CarCard` в `GarageView` и `MarketView`.

## 🟡 7. Соло-режим — В РАЗРАБОТКЕ
- [x] Формула соло-гонки: `calculateSoloRaceWinChance(car)`.
- [ ] Бот Боря — умное поведение, перехват лотов.
- [ ] Квесты.
- [ ] Репутация как ось прогрессии.

## 🛠 Технические стандарты
1. **Zod DTOs**: все данные — через схемы из `shared/dtos`.
2. **Decimal.js**: финансовые расчёты строго через этот тип.
3. **Authoritative Server**: критическая логика — в `packages/server`.
4. **Shared-first**: формулы и константы — в `packages/shared`.
5. **Slice pattern**: Zustand `StateCreator` — домены изолированы, `gameStore.ts` — тонкий ассемблер.
6. **Progression gate**: сервер проверяет `canUseDiagnostics(player)` — клиентский обход невозможен.
