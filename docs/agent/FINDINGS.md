# FINDINGS — несоответствия, найденные при документировании (2026-10-31)

Правило задания: найденное не чинить, только записать. Нумерация стабильна, на неё
ссылаются `INVARIANTS.md`, `DATA-MODEL.md`, `RUNBOOK.md` и ADR.

## Критичные (ломают живой клиент)

**FINDINGS-1. Ставка на аукционе невозможна из живого клиента.**
Клиент шлёт `{type:'bid', step:'100'}` строкой (`client/src/api/useGame.ts:185-188`),
сервер ждёт bigint и сверяет с массивом bigint-шагов (`server/auction.ts:6,48`).
`[100n,500n].includes('100')` — всегда false → `RuleError "invalid bid step"`.
Подтверждено офлайн-пробой 2026-10-31 (node --experimental-strip-types).

**FINDINGS-2. P2P-займы с живого клиента считаются как строки.**
`loan_offer` приходит с `principal/due` строками (`client/src/api/useGame.ts:211-215`).
Валидация `intent.due < intent.principal` (`server/room.ts:308`) сравнивает их
лексикографически: `'1000' < '200'` — true, корректный оффер отклоняется
(подтверждено пробой). Прошедший валидацию оффер сохраняет строки в `Loan`
(`server/loans.ts:37-45`), и в `end_turn` заёмщика `add()` выполняет конкатенацию:
`'2000' + '2000' = '20002000'` (подтверждено пробой) — взыскание долга падает.

**FINDINGS-3. Гонка с живого клиента падает на принятии.**
`stake` приходит строкой (`client/src/api/useGame.ts:190-194`); в `acceptRace` пул
складывается как `state.pool + state.stake` (`server/race.ts:67`) — для строк это
конкатенация, следующий `+ BANK_RACE_BONUS` (bigint) бросает TypeError.
Корень всех трёх один: граница сокета не приводит деньги к `Euro`
(`server/room.ts:80-91` не конвертирует payload), а тип `Intent` (`server/types.ts:100-117`)
обещает bigint. Интеграционные тесты мимо: шлют bigint напрямую
(`server/room.test.ts:126-132`).

**FINDINGS-4. Интенты race_accept / race_forfeit / race_join_pool / loan_accept /
loan_reject не имеют UI.** Они объявлены (`client/src/api/types.ts:126-132`) и есть
хелперы (`client/src/api/useGame.ts:196-209`), но ни `App.tsx`, ни компоненты их не
вызывают: в фазе `race` Dock показывает только заглушку «Фаза: race»
(`client/src/components/table/Dock.tsx:314-319`), входящий займ принимать некому.
Партия с вызовом на гонку или оффером займа упирается в таймер и автоход.

## Важные (расходятся с RULES.md)

**FINDINGS-5. Восстановление комнат из SQLite не подключено.** `loadRooms` определён
(`server/snapshot.ts:39-40`) и покрыт тестом, но не вызывается в `server/index.ts:100-105`.
`RULES.md:271` обещает восстановление после рестарта — его нет; после рестарта все
партии теряются (ло́гги тоже не пишутся).

**FINDINGS-6. Банкротство по «3 пропущенным кругам» — фактически по 3 пропущенным
ходам.** `RULES.md:106` говорит о кругах; код увеличивает `missedLaps` на каждый
автоход-таймаут (`server/turn.ts:78-88`), т.е. 3 таймаута по 30 с, а не 3 круга по 9 клеток.

**FINDINGS-7. Заявленный серверный debounce отсутствует.** `RULES.md:45` — «повторные
клики (debouncing на сервере)»; в `server/room.ts:80-91` никакой защиты от повторов нет,
только гейт фазы/очереди `assertIntent` (`server/turn.ts:195-247`).

**FINDINGS-8. Список интентов в RULES.md устарел.** `RULES.md:31` — 7 намерений;
фактически 17 (`server/types.ts:100-117`). Источник правды — types.ts.

**FINDINGS-9. Аукцион «при нехватке денег» не реализован.** `RULES.md:216` обещает
запуск аукциона при нехватке денег на покупку; фактически нехватка — просто отказ
`cannot pay purchase` (`server/actions.ts:154`), аукцион стартует только с клетки retro
(`server/room.ts:187-202`) и с picker (`server/room.ts:282-298`).

**FINDINGS-10. «Лот возвращается под низ колоды» — на деле в сброс.**
`concludeAuction` без лидера и `startAuction` без платёжеспособных биддеров кладут
машину в `discards` (`server/auction.ts:19-25, 114-121`); в колоду она вернётся только
после опустошения колоды (`server/decks.ts:148-168`).

**FINDINGS-11. Автоход берёт множитель такси не у той машины.**
`applyAutoTurn` ищет первую не-retro машину (`server/turn.ts:174`), а множитель берёт
у `cars[0]` (`server/turn.ts:176`). Если первая машина — ретро, а вторая — вёдра,
автоход «таксует» вёдрами с множителем 0: доход теряется.

## Мелкие

**FINDINGS-12. Дубли констант.** `STARTING_CASH` (`server/money.ts:9`) и `START_CASH`
(`server/decks.ts:5`, используется в `initGame`); `WIN_CASH` определён и в `server/money.ts:12`,
и в `server/turn.ts:47` (правила используют turn-версию); `BID_STEPS` и в `server/money.ts:19`, и в
`server/auction.ts:6` (используется auction-версия). Риск: поправить одно — забыть второе.

**FINDINGS-13. Стартовый «набор» в RULES описан как две карты.** `RULES.md:59` —
«1 Ведро + 1 карта скрытого дефекта»; фактически стартовое Ведро уже несёт свой дефект
(`server/decks.ts:196-202`), отдельной карты дефекта нет.

**FINDINGS-14. `@telegram-apps/sdk-react` объявлен, но не импортируется.**
Зависимость в `client/package.json:15`; grep по `client/src` — 0 импортов. Единственный
след Telegram в коде — CSS-переменная safe-area (`client/src/components/sheets/GlassSheet.tsx:41`).
`RULES.md:254` описывает SDK как часть стека.

**FINDINGS-15. Условие записи снимков описано неточно.** `RULES.md:270` — «по завершении
end_turn, auction_end, race_end»; фактически — когда сменился индекс хода или фаза стала
`finished` (`server/room.ts:368-377`). Практически близко, но формально другие триггеры.

**FINDINGS-16. `playwright` в devDependencies (`package.json:18`) не используется ни
одним тестом** — e2e-слоя пока нет.

**FINDINGS-17. Мёртвый код в `advanceTurn`.** Первое присваивание
`updatedCurrent = { ...current, turnCount: current.turnCount + 1 }`
(`server/turn.ts:70`) сразу перезаписывается на строке `server/turn.ts:75` —
инкремент выполняется один раз, но строка 70 только путает читателя.

**FINDINGS-18. `pass` в `race/pool_entry` — no-op.** Гейт его пропускает
(`server/turn.ts:216-220`), обработчик просто выходит из switch (`server/room.ts:256-258`):
игрок не исключается из окна пула, исход решает таймер. На результат не влияет,
но клиент не получает подтверждения отказа.
