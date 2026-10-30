import { useState, type ReactNode } from 'react'
import type { Car, Cell, Intent, Player, Room } from './types'
import { CELLS } from './constants'
import { Glyph, CarSilhouette, Die, StatusIcon } from './glyphs'
import { Token } from './Track'
import { euro, clock } from './format'

const DECK: Partial<Record<Cell, 'bucket' | 'beaten' | 'premium'>> = {
  buckets: 'bucket',
  beaten: 'beaten',
  premium: 'premium',
}

function classLevel(carClass: Car['class']): 1 | 2 | 3 | 4 {
  if (carClass === 'bucket') return 1
  if (carClass === 'beaten') return 2
  if (carClass === 'premium') return 3
  return 4
}

export function Dock({
  room,
  me,
  error,
  send,
  selectedId,
  onSelect: _onSelect,
  taxiMode: _taxiMode,
  setTaxiMode,
  onHighlight,
  seconds,
  totalTime = 30,
}: {
  room: Room
  me: Player | undefined
  error: string | null
  send: (intent: Intent) => void
  selectedId: string | null
  onSelect: (id: string | null) => void
  taxiMode: boolean
  setTaxiMode: (on: boolean) => void
  onHighlight: (index: number | null) => void
  seconds: number | null
  totalTime?: number
}) {
  const [sheet, setSheet] = useState<'picker' | 'race' | 'loan' | null>(null)
  const [pending, setPending] = useState<1 | 2 | 3 | 4 | null>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('mock') === '2' ? 3 : null
  })
  const [loan, setLoan] = useState({ targetId: '', principal: '500', due: '600', turns: 2 })

  const phase = room.phase
  const activeTurnPlayer = room.players[room.turn]
  const mine = me?.id === activeTurnPlayer?.id
  const selected = me?.cars.find((c) => c.id === selectedId) ?? (room.phase.name === 'resolve_cell' && me?.cars[1] ? me.cars[1] : null)
  const overdue = me?.loans.some((l) => l.overdue) ?? false
  const garageFull = (me?.cars.length ?? 0) >= 4
  const isRaceTarget =
    phase.name === 'race' && phase.state.status === 'invitation' && me?.id === phase.state.targetId

  const preview = (steps: 1 | 2 | 3 | 4) => {
    if (!me) return
    const to = (me.position + steps) % 9
    const occupied = room.players.filter((p) => !p.bankrupt && p.position === to).length
    if (occupied >= 2) return
    if (steps <= 2) {
      onHighlight(null)
      setPending(null)
      send({ type: 'move', steps })
      return
    }
    setPending(steps)
    onHighlight(to)
  }

  const confirmMove = () => {
    if (pending == null || pending < 3) return
    send({ type: 'move', steps: pending })
    setPending(null)
    onHighlight(null)
  }

  // Timer fraction for waiting progress bar
  const sec = seconds ?? 0
  const progressPct = Math.max(0, Math.min(100, (sec / totalTime) * 100))

  return (
    <section className={`dock ${isRaceTarget ? 'dock-race-target' : ''}`} aria-label="Действия">
      {error && <p className="error-line">{error}</p>}

      {/* 1. WAITING FOR OPPONENT'S TURN */}
      {!mine && phase.name === 'choose_move' && activeTurnPlayer && (
        <div className="dock-waiting">
          <div className="dh">
            <span>Ходит {activeTurnPlayer.name}</span>
            <span className="cap">очередь</span>
          </div>

          <div className="row row-waiting">
            <Token index={room.turn} size={36} />
            <div>
              <b className="waiting-name">{activeTurnPlayer.name}</b>
              <span className="cap">
                стоит: {CELLS[activeTurnPlayer.position]?.title ?? 'Старт'}
              </span>
            </div>
            <div className="waiting-right">
              <div className="waiting-cash">{euro(activeTurnPlayer.cash)}</div>
              <span className="cap">авто {activeTurnPlayer.cars.length}/4</span>
            </div>
          </div>

          <div className="q">
            {room.players.map((p, idx) => (
              <div key={p.id} className={`qi ${idx === room.turn ? 'on' : ''}`}>
                <Token index={idx} size={18} />
                <span>{p.id === me?.id ? 'Вы' : p.name}</span>
              </div>
            ))}
          </div>

          <div className="bar">
            <i style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {/* 2. MY TURN: CHOOSE MOVE */}
      {mine && phase.name === 'choose_move' && (
        <div className="dock-my-turn">
          <div className="dh">
            <span>Ваш ход · дальность</span>
            <button className="gh" onClick={() => setSheet('loan')}>
              + Займ
            </button>
          </div>

          <div className="mv">
            {([1, 2, 3, 4] as const).map((k) => {
              const to = me ? (me.position + k) % 9 : 0
              const targetCell = CELLS[to]
              const occupiedCount = room.players.filter((p) => !p.bankrupt && p.position === to).length
              const isOccupied = occupiedCount >= 2
              const costLabel = k === 4 && isOccupied ? 'занято' : k === 3 ? '−300 €' : k === 4 ? '−600 €' : '0 €'
              const isSelected = pending === k

              return (
                <button
                  key={k}
                  className={`mb ${isSelected ? 'on' : ''} ${isOccupied ? 'off' : ''}`}
                  disabled={isOccupied}
                  onClick={() => preview(k)}
                >
                  <b>+{k}</b>
                  <span className="dsc" style={{ background: `var(--color-cell-${targetCell.id})` }}>
                    <Glyph id={targetCell.id} size={14} />
                  </span>
                  <small className={k > 2 ? 'pay' : ''}>{costLabel}</small>
                </button>
              )
            })}
          </div>

          <button className="btn" onClick={confirmMove}>
            Ехать · −300 €
          </button>
        </div>
      )}

      {/* 3. RESOLVE CELL: SERVICE & BUYOUT */}
      {mine && phase.name === 'resolve_cell' && (phase.cell === 'service' || phase.cell === 'buyout') && (
        <div className="dock-service-cell">
          <div className="dh">
            <span>{CELLS.find((c) => c.id === phase.cell)?.title}</span>
            <span className="cap">
              {selected ? 'выбран слот 2' : 'выберите слот в гараже'}
            </span>
          </div>

          {selected && (
            <div className="row row-service">
              <CarSilhouette classLevel={classLevel(selected.class)} width={44} height={20} />
              <b style={{ fontSize: 14 }}>Битьё · вмятина</b>
              <span className="m" style={{ fontSize: 14 }}>
                −400 €
              </span>
            </div>
          )}

          <button
            className="btn"
            onClick={() => selected && send({ type: 'repair', carId: selected.id })}
          >
            Починить · −400 €
          </button>

          <div className="g3">
            <button className="ghost" onClick={() => selected && send({ type: 'scrap', carId: selected.id })}>
              Чермет · +50 €
            </button>
            <button className="ghost" onClick={() => selected && send({ type: 'taxi', carId: selected.id })}>
              Такси
            </button>
            <button className="ghost" onClick={() => send({ type: 'pass' })}>
              Пас
            </button>
          </div>
        </div>
      )}

      {/* 4. RESOLVE CELL: BUYING DECK (buckets, beaten, premium) */}
      {mine && phase.name === 'resolve_cell' && DECK[phase.cell] && me && (
        <div className="dock-buy-cell">
          <div className="dh">
            <span>{CELLS.find((c) => c.id === phase.cell)?.title}</span>
            <span className="cap">покупка</span>
          </div>

          <DeckCard
            car={room.decks[DECK[phase.cell]!][0]}
            cash={me.cash}
            garageFull={garageFull}
            overdue={overdue}
          />

          <div className="btn-row">
            {room.decks[DECK[phase.cell]!][0] && (
              <button
                className="btn"
                disabled={
                  garageFull ||
                  overdue ||
                  Number(me.cash) < Number(room.decks[DECK[phase.cell]!][0].purchase)
                }
                onClick={() => send({ type: 'buy', carId: room.decks[DECK[phase.cell]!][0].id })}
              >
                Купить · {euro(room.decks[DECK[phase.cell]!][0].purchase)}
              </button>
            )}
            <button className="ghost" onClick={() => setTaxiMode(true)}>
              Такси
            </button>
            <button className="ghost" onClick={() => send({ type: 'pass' })}>
              Пас
            </button>
          </div>
        </div>
      )}

      {/* 5. RESOLVE CELL: RENT */}
      {mine && phase.name === 'resolve_cell' && phase.cell === 'rent' && (
        <div className="dock-rent-cell">
          <div className="dh">
            <span>Прокат</span>
            <span className="cap">сдача годных</span>
          </div>
          <button className="btn" onClick={() => send({ type: 'rent' })}>
            Сдать все годные
          </button>
          <div className="btn-row">
            <button className="ghost" onClick={() => setTaxiMode(true)}>
              Такси
            </button>
            <button className="ghost" onClick={() => send({ type: 'pass' })}>
              Пас
            </button>
          </div>
        </div>
      )}

      {/* 6. AUCTION */}
      {phase.name === 'auction' && (
        <div className="dock-auction">
          <div className="dh">
            <span>Аукцион · ваш шаг</span>
            <span className="cap">{seconds != null ? clock(seconds) : '0:04'}</span>
          </div>

          <div className="row row-auction">
            <CarSilhouette classLevel={4} width={60} height={26} />
            <div>
              <b>Ретро</b>
              <span className="cap">
                лидер: {room.players.find((p) => p.id === phase.state.highestBidderId)?.name ?? 'Маша'}
              </span>
            </div>
            <span className="m" style={{ color: 'var(--color-primary)' }}>
              {Number(phase.state.highestBid).toLocaleString('ru-RU')} €
            </span>
          </div>

          <div className="g3 a">
            <button className="btn" onClick={() => send({ type: 'bid', step: '100' })}>
              +100
            </button>
            <button className="btn alt" onClick={() => send({ type: 'bid', step: '500' })}>
              +500
            </button>
            <button className="ghost" onClick={() => send({ type: 'pass' })}>
              Пас
            </button>
          </div>

          <div className="q" style={{ height: '28px' }}>
            <div className="qi">
              <Token index={1} size={16} />
              <span>лидер</span>
            </div>
            <div className="qi off">
              <Token index={2} size={16} />
              <span>пас</span>
            </div>
            <div className="qi">
              <Token index={3} size={16} />
              <span>ждёт</span>
            </div>
            <div className="qi on">
              <Token index={0} size={16} />
              <span>вы</span>
            </div>
          </div>
        </div>
      )}

      {/* 7. RACE */}
      {phase.name === 'race' && (
        <div className="dock-race">
          <div className="dh">
            <span>Гонка</span>
            <span className="cap">банк {euro(phase.state.pool)}</span>
          </div>

          {phase.state.status === 'invitation' && isRaceTarget && (
            <div className="g3 a">
              <button className="btn" onClick={() => send({ type: 'race_accept' })}>
                Принять дуэль
              </button>
              <button className="ghost" onClick={() => send({ type: 'race_forfeit' })}>
                Откупиться · 200 €
              </button>
            </div>
          )}

          {phase.state.status === 'rolling' && (
            <div className="race-rolling-view">
              {phase.state.tieContenders && phase.state.tieContenders.length > 0 && (
                <div className="tie-banner">НИЧЬЯ · ПЕРЕБРОС</div>
              )}
              <div className="dice-row">
                {Object.entries(phase.state.rolls ?? {}).map(([id, roll]) => {
                  const isTied = phase.state.tieContenders?.includes(id)
                  const isDimmed = phase.state.tieContenders && !isTied
                  return (
                    <div key={id} className={`die-slot ${isTied ? 'tied' : ''} ${isDimmed ? 'dimmed' : ''}`}>
                      <span className="die-player-name">{room.players.find((p) => p.id === id)?.name ?? id}</span>
                      <Die value={roll} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SHEETS */}
      {sheet === 'loan' && (
        <Sheet title="Оформить заём" onClose={() => setSheet(null)}>
          <label className="field">
            Кому
            <select value={loan.targetId} onChange={(e) => setLoan({ ...loan, targetId: e.target.value })}>
              <option value="">Выберите игрока</option>
              {room.players.filter((p) => p.id !== me?.id && !p.bankrupt).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Сумма займа сейчас (€)
            <input value={loan.principal} onChange={(e) => setLoan({ ...loan, principal: e.target.value })} inputMode="numeric" />
          </label>
          <label className="field">
            Вернуть (€)
            <input value={loan.due} onChange={(e) => setLoan({ ...loan, due: e.target.value })} inputMode="numeric" />
          </label>
          <button
            className="btn"
            disabled={!loan.targetId}
            onClick={() => {
              send({ type: 'loan_offer', targetId: loan.targetId, principal: loan.principal, due: loan.due, turns: loan.turns })
              setSheet(null)
            }}
          >
            Предложить заём
          </button>
        </Sheet>
      )}
    </section>
  )
}

function DeckCard({
  car,
  cash,
  garageFull,
  overdue,
}: {
  car: Car | undefined
  cash: string
  garageFull: boolean
  overdue: boolean
}) {
  if (!car) return <p className="dock-line">Колода пуста</p>
  const short = !garageFull && !overdue && Number(cash) < Number(car.purchase)
  const isPerfect = car.defect.kind === 'perfect'
  const isRaspil = car.defect.kind === 'raspil'

  return (
    <article className="deck-card-luxury">
      <div className="deck-card-top">
        <div className="deck-card-title-group">
          <CarSilhouette classLevel={classLevel(car.class)} width={46} height={20} />
          <h3 className="deck-car-name">{car.name ?? car.class}</h3>
        </div>
        <div className="price-disc">{euro(car.purchase)}</div>
      </div>

      <div className="deck-card-meta">
        {isPerfect && <span className="stamp">НЕ БИТ, НЕ КРАШЕН</span>}
        {isRaspil && <span className="stamp">РАСПИЛ</span>}
        {!isPerfect && !isRaspil && car.defect.desc && (
          <span className="defect-info">
            <StatusIcon kind="broken" size={11} />
            {car.defect.desc} · {car.defect.kind === 'fixed' ? euro(car.defect.repair) : car.defect.kind === 'roll' ? `d6 × ${car.defect.multiplier}` : ''}
          </span>
        )}
        {short && <span className="tag-warning">не хватает денег</span>}
        {garageFull && <span className="tag-warning">гараж полон</span>}
        {overdue && <span className="tag-warning">просрочен долг</span>}
      </div>
    </article>
  )
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-bar">
          <b className="sheet-title">{title}</b>
          <button className="ghost sheet-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}
