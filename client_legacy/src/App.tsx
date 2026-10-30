import { useEffect, useState } from 'react'
import { miniApp } from '@telegram-apps/sdk-react'
import { Dock } from './Dock'
import { Track, Token } from './Track'
import { CarSilhouette, StatusIcon } from './glyphs'
import { euro } from './format'
import { useSession } from './session'
import type { Car, Room } from './types'
import './table.css'

function useRemaining(expires: number | undefined, updatedAt: number | undefined): number | null {
  const [timeState, setTimeState] = useState(() => ({
    now: Date.now(),
    skew: updatedAt !== undefined ? updatedAt - Date.now() : 0,
    lastUpdated: updatedAt,
  }))

  useEffect(() => {
    const id = window.setInterval(() => {
      setTimeState((prev) => {
        const now = Date.now()
        const skew =
          updatedAt !== undefined && updatedAt !== prev.lastUpdated
            ? updatedAt - now
            : prev.skew
        return { now, skew, lastUpdated: updatedAt }
      })
    }, 250)
    return () => window.clearInterval(id)
  }, [updatedAt])

  if (expires === undefined) return null
  return Math.max(0, Math.ceil((expires - (timeState.now + timeState.skew)) / 1000))
}

function leave() {
  if (miniApp.close.isAvailable()) miniApp.close()
}

export default function App() {
  const { room, lobby, error, connected, myId, dev, roomId, sendIntent, startMatch, pickSeat } =
    useSession()
  const [draftRoom, setDraftRoom] = useState(roomId)
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('mock') === '3' ? 'c2' : null
  })
  const [taxiMode, setTaxiMode] = useState(false)
  const [highlight, setHighlight] = useState<number | null>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('mock') === '2' ? 4 : null
  })
  const seconds = useRemaining(room?.timerExpiresAt, room?.updatedAt)
  const me = room?.players.find((p) => p.id === myId) ?? room?.players[0]

  if (!room) {
    return (
      <main id="table" className="gate">
        <div className="gate-card">
          <header className="gate-header">
            <span className="gate-badge">ТАЧКА</span>
            <h1 className="gate-title">Перекупский покер</h1>
            <p className="gate-desc">Экономическая настольная игра для 3–4 игроков</p>
          </header>

          {myId && !connected && <p className="banner">нет связи</p>}
          {error && <p className="error-line">{error}</p>}

          {dev && !myId && (
            <section className="lobby-dev">
              <p className="dock-label">Выбор места (Dev)</p>
              <label className="field">
                Комната
                <input value={draftRoom} onChange={(e) => setDraftRoom(e.target.value)} />
              </label>
              <div className="btn-row">
                {['1', '2', '3', '4'].map((id) => (
                  <button key={id} className="btn gold" onClick={() => pickSeat(id, draftRoom)}>
                    Игрок {id}
                  </button>
                ))}
              </div>
            </section>
          )}

          {lobby.length > 0 && (
            <section className="lobby-table">
              <div className="lobby-header-row">
                <span className="dock-label">Игроки за столом ({lobby.length}/4)</span>
              </div>
              <div className="lobby-list">
                {lobby.map((user, index) => {
                  const isHost = index === 0
                  const isMe = user.id === myId
                  return (
                    <div key={user.id} className={`lobby-item ${isMe ? 'is-me' : ''}`}>
                      <div className="lobby-item-left">
                        {isHost ? (
                          <StatusIcon kind="crown" className="crown-icon" />
                        ) : (
                          <span className="seat-dot" />
                        )}
                        <span className="lobby-name">{user.name}</span>
                        {isMe && <span className="me-badge">ВЫ</span>}
                      </div>
                      <span className="lobby-status">{isHost ? 'Хост' : 'Готов'}</span>
                    </div>
                  )
                })}
              </div>

              {lobby[0]?.id === myId && (
                <button
                  className="btn gold btn-start-game"
                  disabled={lobby.length < 3}
                  onClick={startMatch}
                >
                  {lobby.length < 3 ? `Ожидание игроков (${lobby.length}/3)` : 'Начать партию'}
                </button>
              )}
            </section>
          )}
        </div>
      </main>
    )
  }

  const isMyTurn = room.players[room.turn]?.id === me?.id
  const isAuction = room.phase.name === 'auction'
  const currentTurnName = room.players[room.turn]?.name ?? ''
  const genitiveName =
    currentTurnName === 'Антон'
      ? 'Антона'
      : currentTurnName === 'Маша'
        ? 'Маши'
        : currentTurnName === 'Олег'
          ? 'Олега'
          : currentTurnName
  const turnTitle = isAuction
    ? isMyTurn
      ? 'Ваш шаг'
      : `Ход ${genitiveName}`
    : isMyTurn
      ? 'Ваш ход'
      : `Ход ${genitiveName}`

  return (
    <main id="table">
      {!connected && <p className="banner">нет связи с сервером</p>}

      {/* Z1: HUD */}
      <header className="hud">
        <div className="turn">
          <span className="cap">ход 14</span>
          <b>
            {isMyTurn && <span className="dot" />}
            {turnTitle}
          </b>
        </div>

        <div className="ord">
          {room.players.map((p, i) => (
            <span key={p.id} className={`oi ${i === room.turn ? 'on' : ''}`}>
              <Token index={i} size={20} />
            </span>
          ))}
        </div>

        <div className="bal">
          <b>{me ? euro(me.cash) : '—'}</b>
          <span className="cap">ЦЕЛЬ 32 000 €</span>
        </div>
      </header>

      {/* Z2: Rivals */}
      <section className="opps" aria-label="Соперники">
        {room.players
          .filter((p) => p.id !== me?.id)
          .map((player) => {
            const originalIndex = room.players.findIndex((p) => p.id === player.id)
            const isTurn = room.turn === originalIndex
            const isOverdue = player.loans.some((l) => l.overdue)
            const owesMe = player.loans.some((l) => l.lenderId === me?.id && !l.overdue)

            return (
              <div
                key={player.id}
                className={`chip ${isTurn ? 'act' : ''} ${player.bankrupt ? 'hatch' : ''}`}
              >
                <Token index={originalIndex} size={28} />
                <div>
                  <b>{player.name}</b>
                  <i>{euro(player.cash)}</i>
                  <small>авто {player.cars.length}/4</small>
                </div>
                {isOverdue && (
                  <span className="ic" style={{ color: '#E5534B' }}>
                    <StatusIcon kind="lock" size={14} />
                  </span>
                )}
                {!isOverdue && owesMe && (
                  <span className="ic" style={{ color: '#4FB286' }}>
                    <StatusIcon kind="debt-out" size={14} />
                  </span>
                )}
              </div>
            )
          })}
      </section>

      {/* Z3: Track */}
      <Track room={room} highlight={highlight} seconds={seconds} />

      {/* Z4: Garage */}
      <Garage
        me={me}
        selectedId={selectedId}
        selectable={taxiMode || selecting(room)}
        onSelect={setSelectedId}
        phaseCell={room.phase.name === 'resolve_cell' ? room.phase.cell : null}
        phaseName={room.phase.name}
      />

      {/* Z5: Dock */}
      <Dock
        room={room}
        me={me}
        error={error}
        send={sendIntent}
        selectedId={selectedId}
        onSelect={setSelectedId}
        taxiMode={taxiMode}
        setTaxiMode={setTaxiMode}
        onHighlight={setHighlight}
        seconds={seconds}
      />

      {room.phase.name === 'finished' && <End title="Победа" room={room} />}
      {me?.bankrupt && <End title="Банкрот" room={room} />}
    </main>
  )
}

function selecting(room: Room): boolean {
  return (
    room.phase.name === 'resolve_cell' &&
    (room.phase.cell === 'service' || room.phase.cell === 'buyout')
  )
}

function classLevel(carClass: Car['class']): 1 | 2 | 3 | 4 {
  if (carClass === 'bucket') return 1
  if (carClass === 'beaten') return 2
  if (carClass === 'premium') return 3
  return 4
}

function Garage({
  me,
  selectedId,
  selectable,
  onSelect,
  phaseCell,
  phaseName,
}: {
  me: CarOwner | undefined
  selectedId: string | null
  selectable: boolean
  onSelect: (id: string) => void
  phaseCell: string | null
  phaseName: string
}) {
  const slots: (Car | null)[] = [null, null, null, null]
  me?.cars.slice(0, 4).forEach((car, i) => {
    slots[i] = car
  })

  const isAuction = phaseName === 'auction'
  const isService = phaseCell === 'service'

  return (
    <section className="gar" aria-label="Гараж">
      {slots.map((car, i) => {
        if (!car) {
          return (
            <div key={`empty-${i}`} className="slot emp">
              Свободно
            </div>
          )
        }

        const isSelected = car.id === selectedId
        const lvl = classLevel(car.class)
        const isDim = isAuction || (isService && !isSelected)

        // Context price
        let priceLabel: string | null = null
        if (isService) {
          if (isSelected && car.status === 'broken') {
            if (car.defect.kind === 'fixed') priceLabel = `−${euro(car.defect.repair)}`
            else if (car.defect.kind === 'roll') priceLabel = `d6 × ${car.defect.multiplier}`
          } else {
            priceLabel = '—'
          }
        } else if (phaseCell === 'buyout' && car.status !== 'broken') {
          priceLabel = `+${euro(car.buyout)}`
        }

        return (
          <button
            key={car.id}
            className={`slot ${isSelected ? 'sel' : ''} ${isDim ? 'dim' : ''}`}
            disabled={!selectable}
            onClick={() => onSelect(car.id)}
          >
            <div className="dots">
              {Array.from({ length: lvl }).map((_, di) => (
                <span key={di} />
              ))}
            </div>

            <CarSilhouette classLevel={lvl} width={64} height={26} />

            <div className={`st ${car.status}`}>
              {car.status === 'ready' && (
                <>
                  <StatusIcon kind="ready" size={11} />
                  <span>ГОТОВА</span>
                </>
              )}
              {car.status === 'broken' && (
                <>
                  <StatusIcon kind="broken" size={11} />
                  <span>СЛОМАНА</span>
                </>
              )}
              {car.status === 'in_rent' && (
                <>
                  <StatusIcon kind="in_rent" size={11} />
                  <span>ПРОКАТ {car.rentSteps ?? 0}/9</span>
                </>
              )}
            </div>

            <div className="pr">{priceLabel ?? <>&nbsp;</>}</div>
          </button>
        )
      })}
    </section>
  )
}

type CarOwner = {
  cars: Car[]
}

function End({ title, room }: { title: string; room: Room }) {
  const phase = room.phase
  const isFinished = phase.name === 'finished'
  const winner = isFinished ? room.players.find((p) => p.id === phase.winnerId) : undefined
  const activeSurvivors = room.players.filter((p) => !p.bankrupt)
  const isElimination = activeSurvivors.length === 1

  return (
    <div className="overlay">
      <div className="overlay-card">
        {isFinished ? (
          <StatusIcon kind="crown" className="overlay-crown" />
        ) : (
          <StatusIcon kind="skull" className="overlay-skull" />
        )}
        <h1 className="overlay-title">{title}</h1>

        {winner && (
          <div className="overlay-winner-section">
            <span className="caption">Победитель партии</span>
            <p className="money money-lg overlay-winner-name">{winner.name}</p>
            <p className="money money-md overlay-winner-cash">{euro(winner.cash)}</p>
            <p className="overlay-reason">
              {isElimination ? 'Последний выживший игрок' : 'Капитал 32 000 € без открытых долгов'}
            </p>
          </div>
        )}

        {!isFinished && (
          <div className="overlay-bankrupt-section">
            <p className="overlay-reason">
              Превышен лимит пропусков ходов (3/3). Машины списаны, открытые долги аннулированы.
            </p>
          </div>
        )}

        <div className="overlay-meta">
          <span className="caption">
            Сыграно ходов: {winner?.turnCount ?? room.players[0]?.turnCount ?? 0}
          </span>
        </div>

        <button className="btn overlay-btn" onClick={leave}>
          Закрыть
        </button>
      </div>
    </div>
  )
}
