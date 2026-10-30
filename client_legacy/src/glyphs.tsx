import type { Cell } from './types'

const G: Record<string, string> = {
  bucket: 'M6 8h12l-1.5 11h-9zM5 8h14M9 8V5.5h6V8',
  bolt: 'M13 3 6 13h5l-1 8 8-11h-5z',
  gem: 'M12 3l7 6-7 12L5 9zM5 9h14',
  col: 'M4 20h16M7 20V11M12 20V11M17 20V11M4 11h16M12 4l8 7H4z',
  lens: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.5 15.5 21 21',
  wrench: 'M15 4.5a4.5 4.5 0 0 0 4.5 6L10 20a2.1 2.1 0 0 1-3-3l9.5-9.5a4.5 4.5 0 0 0-1.5-3z',
  cash: 'M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  fob: 'M8 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 12h9M18 12v3M21 12v2',
  flag: 'M6 21V4M6 5h11l-2 4 2 4H6',
  ok: 'M5 12.5l4.5 4.5L19 7.5',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  up: 'M7 17 17 7M9 7h8v8',
  crown: 'M3 11.5h10M3 11.5l1-6 3.5 3 2.5-4 2.5 4 3.5-3 1 6z',
  skull: 'M4 7a4 4 0 1 1 8 0c0 2-1 3-2 3.5V12H6v-1.5C5 10 4 9 4 7z',
}

const CELL_GLYPHS: Record<Cell, string> = {
  buckets: 'bucket',
  beaten: 'bolt',
  premium: 'gem',
  retro: 'col',
  picker: 'lens',
  service: 'wrench',
  buyout: 'cash',
  rent: 'fob',
  race: 'flag',
}

export function Glyph({ id, size = 20, strokeWidth = 2 }: { id: Cell; size?: number; strokeWidth?: number }) {
  const name = CELL_GLYPHS[id] || 'bucket'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={G[name]} />
    </svg>
  )
}

export function StatusIcon({
  kind,
  size = 14,
  className,
}: {
  kind: 'broken' | 'ready' | 'in_rent' | 'lock' | 'skull' | 'crown' | 'debt-in' | 'debt-out'
  size?: number
  className?: string
}) {
  const iconKey =
    kind === 'ready'
      ? 'ok'
      : kind === 'broken'
        ? 'wrench'
        : kind === 'in_rent'
          ? 'fob'
          : kind === 'debt-out'
            ? 'up'
            : kind === 'debt-in'
              ? 'up'
              : kind

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`status-icon ${kind} ${className ?? ''}`}
      aria-hidden="true"
      style={kind === 'debt-in' ? { transform: 'rotate(180deg)' } : undefined}
    >
      <path d={G[iconKey] || G.ok} />
    </svg>
  )
}

export function Die({ value }: { value: number }) {
  const pips: Record<number, [number, number][]> = {
    1: [[16, 16]],
    2: [[10, 10], [22, 22]],
    3: [[9, 9], [16, 16], [23, 23]],
    4: [[10, 10], [22, 10], [10, 22], [22, 22]],
    5: [[9, 9], [23, 9], [16, 16], [9, 23], [23, 23]],
    6: [[10, 9], [22, 9], [10, 16], [22, 16], [10, 23], [22, 23]],
  }
  const pts = pips[Math.min(6, Math.max(1, value))] ?? pips[1]

  return (
    <svg className="die-cube" viewBox="0 0 32 32" aria-label={`Кубик ${value}`}>
      <rect x="2" y="2" width="28" height="28" rx="6" fill="var(--color-raised)" stroke="var(--color-border)" strokeWidth="1.5" />
      {pts.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2.5" fill="var(--color-primary)" />
      ))}
    </svg>
  )
}

const SIL: Record<number, string> = {
  1: 'M3 21V14Q3 11 6 10L15 8 22 3H42L50 9 58 11Q61 12 61 15V21Z',
  2: 'M2 21V14L6 11H14L22 4H38L46 11H58L62 14V21Z',
  3: 'M2 21V16Q2 13 8 12L26 5Q32 2 40 4L50 9 60 12Q63 13 63 16V21Z',
  4: 'M3 21V15Q3 12 7 12L12 11Q14 5 24 4H36Q46 5 50 11L58 12Q62 13 62 16V21Z',
}

const TINT: Record<number, string> = {
  1: '#8A94A0',
  2: '#C97B3A',
  3: '#6F8FB8',
  4: '#B5646F',
}

export function CarSilhouette({
  classLevel,
  width = 64,
  height = 28,
}: {
  classLevel: 1 | 2 | 3 | 4
  width?: number
  height?: number
}) {
  const tint = TINT[classLevel] || '#8A94A0'
  const path = SIL[classLevel] || SIL[1]
  return (
    <svg viewBox="0 0 64 28" width={width} height={height} style={{ flex: 'none' }} aria-hidden="true">
      <path d={path} fill={tint} />
      <path d="M25 9.5 28.5 6H37L42 9.5Z" fill="#161B22" opacity="0.8" />
      <circle cx="15" cy="22" r="5" fill="#0D1117" stroke={tint} strokeWidth="2.5" />
      <circle cx="50" cy="22" r="5" fill="#0D1117" stroke={tint} strokeWidth="2.5" />
    </svg>
  )
}
