import { useEffect, useState, useTransition } from 'react'
import { io, Socket } from 'socket.io-client'
import type { Cell, Intent, Room } from './types'

const CELLS_INFO: { id: Cell; title: string; icon: string }[] = [
  { id: 'buckets', title: '0: Вёдра', icon: '🪣' },
  { id: 'beaten', title: '1: Битьё', icon: '💥' },
  { id: 'premium', title: '2: Премиум', icon: '💎' },
  { id: 'retro', title: '3: Ретро', icon: '🏛️' },
  { id: 'picker', title: '4: Подбор', icon: '🔍' },
  { id: 'service', title: '5: Сервис', icon: '🔧' },
  { id: 'buyout', title: '6: Скупка', icon: '💰' },
  { id: 'rent', title: '7: Прокат', icon: '🏢' },
  { id: 'race', title: '8: Гонка', icon: '🏁' },
]

const PLAYER_COLORS = ['#ff7b72', '#7ee787', '#79c0ff', '#d2a8ff']

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [lobby, setLobby] = useState<{ id: string; name: string }[]>([])
  const [myId, setMyId] = useState<string>('1')
  const [myName, setMyName] = useState<string>('Игрок 1')
  const [roomId] = useState<string>('room1')
  const [connected, setConnected] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [turnTimer, setTurnTimer] = useState<number>(30)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!room || room.phase.name === 'finished') return
    setTurnTimer(30)
    const interval = setInterval(() => {
      setTurnTimer((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [room?.turn, room?.phase.name])


  // Connect & Auth
  const handleConnect = async (playerNum: string) => {
    const id = playerNum
    const name = `Игрок ${playerNum}`
    setMyId(id)
    setMyName(name)

    if (socket) socket.disconnect()

    try {
      const res = await fetch(`/dev/token?id=${id}&name=${encodeURIComponent(name)}`)
      const data = await res.json()
      const initData = data.initData

      const s = io({ path: '/socket.io' })
      setSocket(s)

      s.on('connect', () => {
        setConnected(true)
        setErrorMsg(null)
        s.emit('auth', { initData, roomId }, (authRes: any) => {
          if (!authRes.ok) setErrorMsg(authRes.error)
        })
      })

      s.on('lobby:update', (list: any) => {
        startTransition(() => {
          setLobby(list)
          setRoom(null)
        })
      })

      s.on('room:state', (nextRoom: Room) => {
        startTransition(() => {
          setRoom(nextRoom)
          setLobby([])
        })
      })

      s.on('disconnect', () => {
        setConnected(false)
      })
    } catch (e: any) {
      setErrorMsg(e.message)
    }
  }

  const sendIntent = (intent: Intent) => {
    if (!socket) return
    socket.emit('intent', intent, (res: any) => {
      if (!res?.ok) setErrorMsg(res?.error)
      else setErrorMsg(null)
    })
  }

  const startMatch = () => {
    if (!socket) return
    socket.emit('lobby:start', (res: any) => {
      if (!res?.ok) setErrorMsg(res?.error)
    })
  }

  const activePlayer = room ? room.players[room.turn] : null
  const isMyTurn = activePlayer?.id === myId
  const myPlayer = room?.players.find((p) => p.id === myId)

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Header bar */}
      <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 16 }}>🏎️ ТАЧКА — Mini App Table</h2>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Комната: <b className="tabular-nums">{roomId}</b>
          </div>
        </div>
        <div>
          <span
            className="badge"
            style={{ background: connected ? 'var(--color-green)' : 'var(--border)' }}
          >
            {connected ? myName : 'OFFLINE'}
          </span>
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: 8, background: '#491818', color: '#ff8080', borderRadius: 8, marginBottom: 12, fontSize: 12 }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Connection Switcher (Dev Mode) */}
      {!connected && (
        <div className="panel">
          <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 8 }}>Вход за стол (Dev эмуляция)</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['1', '2', '3', '4'].map((num) => (
              <button key={num} onClick={() => handleConnect(num)}>
                Игрок {num}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lobby View */}
      {connected && lobby.length > 0 && !room && (
        <div className="panel">
          <h3>Лобби матча ({lobby.length} / 4)</h3>
          <div style={{ margin: '10px 0' }}>
            {lobby.map((u, i) => (
              <div key={u.id} style={{ padding: '4px 0', fontSize: 13 }}>
                👤 {u.name} {u.id === myId && '<b>(Вы)</b>'} {i === 0 && '👑'}
              </div>
            ))}
          </div>
          {lobby[0]?.id === myId && (
            <button
              className="btn-primary"
              disabled={lobby.length < 3}
              onClick={startMatch}
              style={{ width: '100%' }}
            >
              {lobby.length < 3 ? 'Нужно минимум 3 игрока' : 'Начать партию 🏁'}
            </button>
          )}
        </div>
      )}

      {/* Room Table View */}
      {room && (
        <>
          {/* Status Header */}
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Текущая фаза:</div>
                <div style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--accent-gold)' }}>
                  {room.phase.name} {room.phase.name === 'resolve_cell' && `(${room.phase.cell})`}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Таймер: <b className="tabular-nums" style={{ color: 'var(--accent-gold)' }}>{turnTimer}s</b></div>
                <div style={{ fontSize: 14, fontWeight: 'bold' }}>
                  {activePlayer?.name} {isMyTurn && '🔥 (ВЫ)'}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Track */}
          <div className="panel">
            <div style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: 6 }}>
              ИГРОВОЙ ТРЕК
            </div>
            <div className="track-board">
              {CELLS_INFO.map((cell, idx) => {
                const here = room.players
                  .map((p, pi) => ({ p, pi }))
                  .filter((x) => !x.p.bankrupt && x.p.position === idx)
                const isCurrentSeat = activePlayer?.position === idx

                return (
                  <div
                    key={cell.id}
                    className={`track-cell ${isCurrentSeat ? 'active-step' : ''}`}
                  >
                    <div className="cell-header">
                      {cell.icon} {cell.title}
                    </div>
                    <div className="cell-tokens">
                      {here.map((x) => (
                        <div
                          key={x.p.id}
                          className="player-token"
                          style={{ background: PLAYER_COLORS[x.pi] }}
                        >
                          {x.pi + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Action Pad */}
          <div className="panel">
            <div style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: 8 }}>
              ДЕЙСТВИЯ {isMyTurn ? 'ВАШЕГО ХОДА' : ''}
            </div>

            {/* Auction Action Sheet */}
            {room.phase.name === 'auction' && (
              <div>
                <div style={{ marginBottom: 8, fontSize: 13 }}>
                  🔨 Аукцион на <b>{room.phase.state.car.class}</b> | Ставка:{' '}
                  <b className="tabular-nums">{room.phase.state.highestBid} €</b>
                </div>
                {room.phase.state.currentTurnPlayerId === myId ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-primary" onClick={() => sendIntent({ type: 'bid', step: '100' })}>
                      +100 €
                    </button>
                    <button className="btn-primary" onClick={() => sendIntent({ type: 'bid', step: '500' })}>
                      +500 €
                    </button>
                    <button onClick={() => sendIntent({ type: 'pass' })}>Пас</button>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ожидание ставки соперника...</div>
                )}
              </div>
            )}

            {/* Race Action Sheet */}
            {room.phase.name === 'race' && (
              <div>
                <div style={{ marginBottom: 8, fontSize: 13 }}>
                  🏁 Гонка | Пул: <b className="tabular-nums">{room.phase.state.pool} €</b>
                </div>
                {room.phase.state.status === 'invitation' && room.phase.state.targetId === myId && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-primary" onClick={() => sendIntent({ type: 'race_accept' })}>
                      Принять дуэль ({room.phase.state.stake} €)
                    </button>
                    <button onClick={() => sendIntent({ type: 'race_forfeit' })}>
                      Откупиться (штраф 200 €)
                    </button>
                  </div>
                )}
                {room.phase.state.status === 'pool_entry' &&
                  !room.phase.state.participants.includes(myId) && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-gold" onClick={() => sendIntent({ type: 'race_join_pool' })}>
                        Войти в пул ({room.phase.state.stake} €)
                      </button>
                      <button onClick={() => sendIntent({ type: 'pass' })}>Пропустить</button>
                    </div>
                  )}
              </div>
            )}

            {/* Turn Choices */}
            {isMyTurn && room.phase.name === 'choose_move' && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {([1, 2, 3, 4] as const).map((step) => {
                  const cost = step > 2 ? ` (-${(step - 2) * 300}€)` : ' (0€)'
                  return (
                    <button
                      key={step}
                      className="btn-primary"
                      onClick={() => sendIntent({ type: 'move', steps: step })}
                    >
                      Шаг +{step} {cost}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Cell Context Actions */}
            {isMyTurn && room.phase.name === 'resolve_cell' && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {/* Taxi */}
                {myPlayer?.cars[0] && myPlayer.cars[0].class !== 'retro' && (
                  <button
                    className="btn-gold"
                    onClick={() => sendIntent({ type: 'taxi', carId: myPlayer.cars[0]!.id })}
                  >
                    🚖 Такси на [{myPlayer.cars[0].class}]
                  </button>
                )}

                {/* Service */}
                {room.phase.cell === 'service' &&
                  myPlayer?.cars
                    .filter((c) => c.status === 'broken')
                    .map((c) => (
                      <button
                        key={c.id}
                        className="btn-primary"
                        onClick={() => sendIntent({ type: 'repair', carId: c.id })}
                      >
                        🔧 Ремонт {c.class}
                      </button>
                    ))}

                {/* Buyout */}
                {room.phase.cell === 'buyout' &&
                  myPlayer?.cars
                    .filter((c) => c.status !== 'broken')
                    .map((c) => (
                      <button
                        key={c.id}
                        className="btn-primary"
                        onClick={() => sendIntent({ type: 'buyout', carId: c.id })}
                      >
                        💰 Сдать в скупку {c.class} (+{c.buyout}€)
                      </button>
                    ))}

                {/* Rent */}
                {room.phase.cell === 'rent' && (
                  <button className="btn-primary" onClick={() => sendIntent({ type: 'rent' })}>
                    🏢 Сдать в прокат
                  </button>
                )}

                {/* Race Invite */}
                {room.phase.cell === 'race' &&
                  room.players
                    .filter((p) => !p.bankrupt && p.id !== myId && p.cars.length > 0)
                    .map((target) => (
                      <button
                        key={target.id}
                        className="btn-gold"
                        onClick={() =>
                          sendIntent({ type: 'race_invite', targetId: target.id, stake: '500' })
                        }
                      >
                        🏁 Вызов {target.name} (500€)
                      </button>
                    ))}

                {/* Car Decks */}
                {['buckets', 'beaten', 'premium'].includes(room.phase.cell) && (() => {
                  const key = room.phase.cell === 'buckets' ? 'bucket' : (room.phase.cell as any)
                  const topCar = (room.decks as any)[key]?.[0]
                  if (!topCar) return null
                  return (
                    <button
                      className="btn-primary"
                      onClick={() => sendIntent({ type: 'buy', carId: topCar.id })}
                    >
                      Купить {topCar.class} ({topCar.purchase}€)
                    </button>
                  )
                })()}

                <button onClick={() => sendIntent({ type: 'pass' })}>Пас (Конец хода)</button>
              </div>
            )}
          </div>

          {/* Garage & Player Cards */}
          <div className="panel">
            <div style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: 8 }}>
              ГАРАЖ И БАЛАНСЫ ИГРОКОВ
            </div>
            {room.players.map((p, idx) => (
              <div
                key={p.id}
                style={{
                  border: `1px solid ${idx === room.turn ? 'var(--color-blue)' : 'var(--border)'}`,
                  borderRadius: 8,
                  padding: 8,
                  marginBottom: 8,
                  background: 'var(--bg-card)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div>
                    <span
                      className="player-token"
                      style={{ background: PLAYER_COLORS[idx], display: 'inline-flex', marginRight: 6 }}
                    >
                      {idx + 1}
                    </span>
                    <b>{p.name}</b> {p.id === myId && '(Вы)'}
                  </div>
                  <div>
                    <b className="tabular-nums" style={{ color: 'var(--accent-gold)' }}>
                      {p.cash} €
                    </b>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Гараж ({p.cars.length}/3):{' '}
                  {p.cars.length === 0
                    ? 'пусто'
                    : p.cars.map((c) => (
                        <span key={c.id} style={{ marginRight: 6 }}>
                          [{c.class}{' '}
                          <span className={`badge badge-${c.status}`}>{c.status}</span>
                          {' '}{c.defect.kind === 'fixed' ? `${c.defect.repair}€` : c.defect.kind === 'roll' ? `d6*${c.defect.multiplier}€` : c.defect.kind}]
                        </span>
                      ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
