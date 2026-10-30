---
name: telegram-mini-app
description: "Build or extend the Tachka Telegram Mini App. Use when changing the client SDK, initData auth, Socket.IO intents, server rules, or the table UI."
---

# Telegram Mini App (Тачка)

Клиент рисует. Сервер решает. Правила — `RULES.md`. Жёсткие ограничения сессии — `AGENTS.md`. Этот скил — порядок работы, не второй свод правил.

## Когда применять

- Меняешь клиент, сокет, проверку initData или механику комнаты.
- Не применять к обычному боту без Mini App и к вебу, который не открывается внутри Telegram.

## Порядок

1. Перед новой или сменённой зависимостью SDK выполни `npm view @telegram-apps/sdk-react version deprecated`. Поле `deprecated` должно быть пустым. Пакет `@tma.js/sdk-react` не ставить и не импортировать. Два SDK в одном бандле ломают mount.
2. Состояние матча живёт в `server/`. Клиент шлёт намерения из списка в `AGENTS.md`. Не считай на клиенте цену, кубик, победу или таймер как истину.
3. Авторизация — событие сокета `auth` и `verifyInitData` в `server/auth.ts`. Не пиши второй HMAC. Не бери `userId` из тела. `signature` в data-check string не входит. `auth_date` старше часа отклоняется.
4. Новую механику оформи чистой функцией над комнатой. Бросок d6 передай аргументом, источник — `server/rng.ts` (`randomInt`), не `Math.random`. Нелегальное действие бросает исключение до мутации. Деньги — `bigint`.
5. Если формулировка пользователя расходится с `RULES.md`, кодь формулировку и поправь `RULES.md` в том же изменении.
6. Докажи срез: `npm test`, затем `npm run typecheck`. Не переходи к следующей механике, пока оба красных нет.

## Ловушки

- `npm install` при `NODE_ENV=production` пропускает `devDependencies`. Ставь с `--include=dev`.
- `npx tsc` может резолвить npm-пакет `tsc`, а не локальный компилятор. Запускай `npm run typecheck`.
- Снимок SQLite — только в конце `end_turn`, `auction_end`, `race_end`. `JSON.stringify` без replacer роняет `bigint`.
- `GET /dev/token` подписывает dev-initData. Это не прод-вход.
- UI: без неона, фиолетовых градиентов и 3D. Цифры — tabular. `prefers-reduced-motion` выключает анимацию перемещения.

## Проверка

- `npm view @telegram-apps/sdk-react deprecated` пустой, если трогал зависимость.
- Фикстура в `server/auth.test.ts`: верная подпись возвращает id, подмена id бросает.
- Новая механика покрыта одним файлом `server/*.test.ts`, и `npm test` зелёный.
