# Перекуп D6 — Полная техническая документация
## Файл 5 из 6: Сервер, Бот и DevOps

---

## 1. Сервер (Node.js + Socket.IO)

Серверная часть расположена в `packages/server`. Реализована на **Express** и **Socket.IO 4**.

### Ключевые модули

- **`index.ts`**: Точка входа. HTTP-сервер, Socket.IO, Telegram-бот. Интервал очистки неактивных комнат (каждые 10 минут).
- **`roomManager.ts`**: Ядро. Авторитарные транзакции, Smart Event Director, EventFeed, MarketStats.
- **`socketHandlers.ts`**: Диспетчер событий. Progression gate для `diagnoseCar`/`diagnoseMarketCar`.

---

## 2. roomManager.ts — авторитарные транзакции

Все функции возвращают `TxResult | LoanResult` с явным `success: boolean`.

| Функция | Действие | Побочный эффект |
|---|---|---|
| `processBuyCar` | Покупка авто, списание баланса | `marketStats.boughtByTier[tier]++`, `pushFeedEvent('buy')` |
| `processSellCar` | Продажа, начисление, проверка победы | `player.totalEarned += sellPrice`, `pushFeedEvent('sell')` |
| `processRepairCar` | Ремонт дефекта | `marketStats.repairsDone++` |
| `processRentCar` | Прокат, начисление дохода | `marketStats.carsRented++` |
| `processRaceResolve` | D6 + `TIER_RACE_BONUS`, перевод ставки | `marketStats.racesWon++`, `pushFeedEvent('race_win')` |
| `processLoanOffer` | Размещение оффера | — |
| `processLoanAccept` | Перевод средств, блокировка залога | — |
| `processRepayDebt` | Погашение, разблокировка | — |
| `passTurn` | Смена хода, tick долгов, очистка гонок | Конфискация → `pushFeedEvent('confiscate')`; каждые 5 ходов → `selectWeightedNews()` |

### Вспомогательные функции
```typescript
// Добавляет запись в ленту, обрезает до 20 элементов
export function pushFeedEvent(room: RoomState, entry: Omit<EventFeedEntry, 'timestamp'>): void

// Инициализация статистики при создании комнаты
const EMPTY_MARKET_STATS: MarketStats = {
  boughtByTier: { Bucket: 0, Scrap: 0, Business: 0, Premium: 0, Rarity: 0 },
  repairsDone: 0, carsRented: 0, racesWon: 0,
};
```

---

## 3. socketHandlers.ts — прогрессия и безопасность

```typescript
// Progression gate: блокирует diagnoseCar / diagnoseMarketCar до $50k выручки
} else if (data.action === 'diagnoseCar' || data.action === 'diagnoseMarketCar') {
  const player = rm.getRoom(data.roomId)?.players.find(p => p.id === data.playerId);
  if (!player || !canUseDiagnostics(player)) {
    socket.emit('room_error', `Диагностика заблокирована 🔒 — нужно заработать $50,000`);
    return;
  }
}

// Фильтрация dev-команд в мультиплеере
const BLOCKED_ACTIONS = new Set(['devAddMoney', 'devClearGarage', 'devSetEnergy', 'devTeleport']);
```

---

## 4. Shared-зависимости сервера

```typescript
import {
  calculateCurrentMarketValue,
  calculateSellPrice,
  calculateCarHealth,
  calculateRentIncome,
  TIER_RACE_BONUS,           // общая константа бонусов гонки
  selectWeightedNews,        // Smart Event Director
  canUseDiagnostics,         // прогрессия-лок
  DIAGNOSTICS_UNLOCK_THRESHOLD,
} from '@tgperekup/shared';
```

---

## 5. Telegram Bot (node-telegram-bot-api)

Бот встроен в серверный процесс для экономии ресурсов.

**Функции:**
- Команда `/start` → кнопки `solo` / `multi` / `reset`
- Генерация deeplink `https://t.me/perekup_Buh_bot/play?startapp={ROOM_ID}` для приглашений
- Клиент копирует эту ссылку через кнопку "Пригласить друга" в `MultiplayerModal`

---

## 6. DevOps и Деплой

- **Docker**: Dockerfile собирает все пакеты монорепо и запускает сервер.
- **Railway.app**: Авто-деплой при пуше в `main`.
- **Healthcheck**: `GET /health` → статус + кол-во активных комнат.

### Переменные окружения
| Переменная | Описание |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Токен от @BotFather |
| `WEBAPP_URL` | Публичный URL приложения |
| `ALLOWED_ORIGINS` | CORS белый список |

---

## 7. Безопасность

- **Authoritative Server**: баланс и гараж никогда не обновляются с данными от клиента напрямую.
- **Progression gate**: `canUseDiagnostics(player)` проверяется на сервере — клиентский обход невозможен.
- **Dev-команды**: заблокированы в `BLOCKED_ACTIONS` — не ретранслируются другим игрокам.
- **Cleanup**: комнаты без активности >30 минут удаляются автоматически.

---

## 8. Известные проблемы и Технический долг

- **In-memory Storage**: комнаты в RAM. При перезагрузке сессии теряются → план: Redis (см. Roadmap).
- **Full State Sync**: `request_full_state` при реконнекте не реализован. Workaround: `connect` делает `joinRoom`.
- **Init Data Validation**: нет проверки HMAC-подписи Telegram → возможна подделка `playerId`.
