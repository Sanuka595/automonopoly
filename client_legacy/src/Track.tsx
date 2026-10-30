import type { Player, Room } from './types'
import { Glyph } from './glyphs'
import { CELLS } from './constants'
import { clock } from './format'

const CX = 180
const CY = 180
const R_OUT = 172
const R_IN = 108
const R_GLYPH = 150
const R_TOKEN = 122

const SHAPES: Record<string, string> = {
  c: '<circle r="12"/>',
  s: '<rect x="-11" y="-11" width="22" height="22" rx="3"/>',
  t: '<path d="M0 -13 L13 10 H-13 Z"/>',
  d: '<path d="M0 -14 L14 0 0 14 -14 0 Z"/>',
}

const PLAYER_PROPS = [
  { n: 1, c: '#E5A93C', sh: 'c' },
  { n: 2, c: '#8FB8DE', sh: 's' },
  { n: 3, c: '#C9704B', sh: 't' },
  { n: 4, c: '#B9C0C9', sh: 'd' },
]

function rad(a: number) {
  return (a * Math.PI) / 180
}

function pt(a: number, q: number): [number, number] {
  return [CX + q * Math.cos(rad(a)), CY + q * Math.sin(rad(a))]
}

function arc(a0: number, a1: number, o: number, i: number): string {
  const [x0, y0] = pt(a0, o)
  const [x1, y1] = pt(a1, o)
  const [x2, y2] = pt(a1, i)
  const [x3, y3] = pt(a0, i)
  return `M ${x0} ${y0} A ${o} ${o} 0 0 1 ${x1} ${y1} L ${x2} ${y2} A ${i} ${i} 0 0 0 ${x3} ${y3} Z`
}

export function Token({
  index,
  size = 24,
}: {
  index: number
  size?: number
}) {
  const p = PLAYER_PROPS[index % PLAYER_PROPS.length]
  const yShift = p.sh === 't' ? 8 : 5

  return (
    <svg width={size} height={size} viewBox="-15 -15 30 30" style={{ flex: 'none' }} aria-label={`Игрок ${p.n}`}>
      <g
        fill={p.c}
        stroke="var(--color-ink)"
        strokeWidth="2.4"
        strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: SHAPES[p.sh] }}
      />
      <text
        y={yShift}
        textAnchor="middle"
        fill="var(--color-ink)"
        style={{ font: '700 14px Inter, system-ui, sans-serif' }}
      >
        {p.n}
      </text>
    </svg>
  )
}

export function Track({
  room,
  highlight,
  seconds,
  totalTime = 30,
}: {
  room: Room
  highlight: number | null
  seconds: number | null
  totalTime?: number
}) {
  const phase = room.phase
  const activeIndex =
    highlight ??
    (phase.name === 'resolve_cell'
      ? CELLS.findIndex((c) => c.id === phase.cell)
      : room.players[room.turn]?.position ?? null)

  const activeCell = activeIndex != null ? CELLS[activeIndex] : null
  const targetCell = highlight != null ? CELLS[highlight] : null

  // Group players by cell position
  const playersByCell: Record<number, { player: Player; idx: number }[]> = {}
  room.players.forEach((p, idx) => {
    if (!p.bankrupt) {
      playersByCell[p.position] = playersByCell[p.position] || []
      playersByCell[p.position].push({ player: p, idx })
    }
  })

  // Timer fraction for hub rim progress ring
  const sec = seconds ?? 0
  const isUrgent = sec > 0 && sec < 5
  const fraction = Math.max(0, Math.min(1, sec / totalTime))

  return (
    <div className="track-wrap">
      <div className="track">
        <svg viewBox="0 0 360 360" className="ring" aria-hidden="true">
          <defs>
            <pattern id="k" width="8" height="8" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" fill="#D9DCE1" />
              <rect width="4" height="4" fill="#0D1117" />
              <rect x="4" y="4" width="4" height="4" fill="#0D1117" />
            </pattern>
            <pattern
              id="h"
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="3" height="6" fill="rgba(13,17,23,.6)" />
            </pattern>
          </defs>

          {/* Underlay dark disc slightly larger than the ring */}
          <circle cx="180" cy="180" r="179" fill="#0F151C" stroke="#1B232C" />

          {/* 9 cell sectors */}
          {CELLS.map((c, i) => {
            const m = -90 + 40 * i
            const a0 = m - 19
            const a1 = m + 19
            const isFull = (playersByCell[i]?.length ?? 0) >= 2
            const isAct = activeIndex === i && highlight == null
            const isTgt = highlight === i

            return (
              <g key={c.id}>
                <path d={arc(a0, a1, R_OUT, R_IN)} className={`sector sector-${c.id}`} />
                {i === 8 && <path d={arc(a0, a1, R_OUT, R_OUT - 6)} fill="url(#k)" />}
                {isFull && <path d={arc(a0, a1, R_OUT, R_IN)} fill="url(#h)" />}

                {/* Active sector rim */}
                {isAct && (
                  <path
                    d={`M ${pt(a0, R_OUT + 5)[0]} ${pt(a0, R_OUT + 5)[1]} A ${R_OUT + 5} ${R_OUT + 5} 0 0 1 ${pt(a1, R_OUT + 5)[0]} ${pt(a1, R_OUT + 5)[1]}`}
                    stroke="var(--color-primary)"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                )}

                {/* Target preview rim */}
                {isTgt && (
                  <path
                    d={`M ${pt(a0, R_OUT + 5)[0]} ${pt(a0, R_OUT + 5)[1]} A ${R_OUT + 5} ${R_OUT + 5} 0 0 1 ${pt(a1, R_OUT + 5)[0]} ${pt(a1, R_OUT + 5)[1]}`}
                    stroke="var(--color-primary)"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray="6 6"
                  />
                )}
              </g>
            )
          })}

          {/* Hub background & border */}
          <circle cx="180" cy="180" r="105" fill="#131A22" stroke="#262E38" strokeWidth="4" />

          {/* Hub timer progress ring */}
          <circle
            cx="180"
            cy="180"
            r="105"
            fill="none"
            stroke={isUrgent ? 'var(--color-broken)' : 'var(--color-primary)'}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${fraction * 659.7} 700`}
            transform="rotate(-90 180 180)"
          />

          {/* Player tokens placed on inner edge (r=122), avoiding glyphs */}
          {Object.entries(playersByCell).map(([cellIdx, group]) => {
            const c = Number(cellIdx)
            return group.map(({ idx }, j) => {
              const shift = group.length > 1 ? (j ? 10 : -10) : 0
              const [x, y] = pt(-90 + 40 * c + shift, R_TOKEN)
              const p = PLAYER_PROPS[idx % PLAYER_PROPS.length]
              const yShift = p.sh === 't' ? 8 : 5

              return (
                <g key={`token-${idx}`} transform={`translate(${x} ${y}) scale(.82)`}>
                  <g
                    fill={p.c}
                    stroke="var(--color-ink)"
                    strokeWidth="2.4"
                    strokeLinejoin="round"
                    dangerouslySetInnerHTML={{ __html: SHAPES[p.sh] }}
                  />
                  <text
                    y={yShift}
                    textAnchor="middle"
                    fill="var(--color-ink)"
                    style={{ font: '700 14px Inter, system-ui, sans-serif' }}
                  >
                    {p.n}
                  </text>
                </g>
              )
            })
          })}
        </svg>

        {/* Cell glyphs on outer half of arc (r=150) */}
        {CELLS.map((c, i) => {
          const m = -90 + 40 * i
          const [x, y] = pt(m, R_GLYPH)

          return (
            <span
              key={c.id}
              className={`cell-glyph ${c.id === 'retro' ? 'on-retro' : ''} ${c.id === 'race' ? 'on-race' : ''}`}
              style={{ left: `${(x / 360) * 100}%`, top: `${(y / 360) * 100}%` }}
            >
              <Glyph id={c.id} />
            </span>
          )
        })}

        {/* Central Hub Overlay */}
        <div className="hub">
          {phase.name === 'choose_move' && (
            <>
              <div className="hub-phase-title">ВЫБОР ХОДА</div>
              <div className={`hub-time ${isUrgent ? 'u' : ''}`}>{seconds == null ? '—' : clock(seconds)}</div>
              <div className="hub-subtitle">
                {targetCell ? (
                  <>
                    выбрано +3 ·{' '}
                    <span
                      className="dsc"
                      style={{
                        width: 18,
                        height: 18,
                        background: `var(--color-cell-${targetCell.id})`,
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Glyph id={targetCell.id} size={11} />
                    </span>{' '}
                    {targetCell.title}
                  </>
                ) : (
                  `ходит ${room.players[room.turn]?.name ?? ''}`
                )}
              </div>
            </>
          )}

          {phase.name === 'resolve_cell' && (
            <>
              <span
                className="dsc"
                style={{
                  width: 46,
                  height: 46,
                  background: `var(--color-cell-${activeCell?.id ?? 'service'})`,
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Glyph id={activeCell?.id ?? 'service'} size={24} />
              </span>
              <div className="hub-phase-title" style={{ color: '#E6EDF3', fontSize: 16 }}>
                {activeCell?.title ?? 'Автосервис'}
              </div>
              <div className={`hub-time ${isUrgent ? 'u' : ''}`} style={{ fontSize: 30, lineHeight: '34px' }}>
                {seconds == null ? '—' : clock(seconds)}
              </div>
            </>
          )}

          {phase.name === 'auction' && (
            <>
              <div className="hub-phase-title">
                Аукцион · {phase.state.car.class === 'retro' ? 'Ретро' : (phase.state.car.name ?? 'Лот')}
              </div>
              <div className="hub-bid" style={{ fontSize: 30, lineHeight: '34px', color: '#E5A93C' }}>
                {Number(phase.state.highestBid).toLocaleString('ru-RU')} €
              </div>
              <div className="hub-subtitle">
                лидер <Token index={room.players.findIndex((p) => p.id === phase.state.highestBidderId)} size={16} />{' '}
                {room.players.find((p) => p.id === phase.state.highestBidderId)?.name ?? 'Старт'}
              </div>
              <div className="hub-time-mini u" style={{ fontSize: 20, lineHeight: '24px' }}>
                {seconds == null ? '—' : clock(seconds)}
              </div>
            </>
          )}

          {phase.name === 'race' && (
            <>
              <div className="hub-phase-title">Гонка</div>
              <div className="hub-bid">{Number(phase.state.pool).toLocaleString('ru-RU')} €</div>
              <div className="hub-subtitle">
                {phase.state.status === 'invitation' ? 'Вызов дуэли' : 'Заезд'}
              </div>
              <div className={`hub-time-mini ${isUrgent ? 'u' : ''}`}>{seconds == null ? '—' : clock(seconds)}</div>
            </>
          )}

          {phase.name === 'finished' && (
            <>
              <div className="hub-phase-title">Финиш</div>
              <div className="hub-bid">Победа</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
