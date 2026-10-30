import type { ReactNode } from 'react';
import type { PlayerState } from '../../api/types.ts';
import { playerToken } from './playerTokens.ts';
import {
  Trash2,
  AlertTriangle,
  Gem,
  Crown,
  Search,
  Wrench,
  Banknote,
  KeyRound,
  Flag,
} from 'lucide-react';

export interface TrackWheelProps {
  players: PlayerState[];
  currentTurnPlayerId?: string;
  activeCellIndex?: number;
  targetCellIndex?: number;
  phaseName?: string;
  lapNumber?: number;
  onCellClick?: (index: number) => void;
}

interface CellDef {
  id: string;
  title: string;
  diodeColor: string;
  icon: (props: { className?: string; strokeWidth?: number }) => ReactNode;
  isRace?: boolean;
}

const CELLS: CellDef[] = [
  { id: 'buckets', title: 'Вёдра', diodeColor: '#8A94A0', icon: (p) => <Trash2 {...p} /> },
  { id: 'beaten', title: 'Битьё', diodeColor: '#C97B3A', icon: (p) => <AlertTriangle {...p} /> },
  { id: 'premium', title: 'Премиум', diodeColor: '#6F8FB8', icon: (p) => <Gem {...p} /> },
  { id: 'retro', title: 'Ретро', diodeColor: '#8E4A52', icon: (p) => <Crown {...p} /> },
  { id: 'picker', title: 'Автоподбор', diodeColor: '#B8A878', icon: (p) => <Search {...p} /> },
  { id: 'service', title: 'Автосервис', diodeColor: '#5E9C97', icon: (p) => <Wrench {...p} /> },
  { id: 'buyout', title: 'Скупка', diodeColor: '#6E9A78', icon: (p) => <Banknote {...p} /> },
  { id: 'rent', title: 'Прокат', diodeColor: '#7388B3', icon: (p) => <KeyRound {...p} /> },
  { id: 'race', title: 'Гонка', diodeColor: '#D9DCE1', icon: (p) => <Flag {...p} />, isRace: true },
];

const CX = 160;
const CY = 160;
const R_OUT = 145;
const R_IN = 95;
const R_MID = 120;
const R_ICON = 124;
const R_DIODE = 106;
const HUB_SIZE = 170; // 170px диаметр при R_IN=95 (диаметр 190px), оставляет ровно 10px зазора по кругу
const HUB_HALF = HUB_SIZE / 2; // 85px
const SECTOR_ANGLE = 40; // 360 / 9
const GAP_ANGLE = 0.6; // ~1px gap at R=120

function tokenPlace(count: number, index: number): { tangent: number; radial: number; radius: number } {
  if (count <= 1) return { tangent: 0, radial: 0, radius: 11 };
  if (count === 2) return { tangent: index === 0 ? -13 : 13, radial: 0, radius: 10 };
  const col = index % 2;
  const row = Math.floor(index / 2);
  return {
    tangent: col === 0 ? -10 : 10,
    radial: row === 0 ? -8 : 8,
    radius: 8,
  };
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function getSectorPath(index: number): string {
  const midAngle = -90 + index * SECTOR_ANGLE;
  const startAngle = degToRad(midAngle - SECTOR_ANGLE / 2 + GAP_ANGLE);
  const endAngle = degToRad(midAngle + SECTOR_ANGLE / 2 - GAP_ANGLE);

  const x1Out = CX + R_OUT * Math.cos(startAngle);
  const y1Out = CY + R_OUT * Math.sin(startAngle);
  const x2Out = CX + R_OUT * Math.cos(endAngle);
  const y2Out = CY + R_OUT * Math.sin(endAngle);

  const x2In = CX + R_IN * Math.cos(endAngle);
  const y2In = CY + R_IN * Math.sin(endAngle);
  const x1In = CX + R_IN * Math.cos(startAngle);
  const y1In = CY + R_IN * Math.sin(startAngle);

  return `M ${x1Out} ${y1Out} A ${R_OUT} ${R_OUT} 0 0 1 ${x2Out} ${y2Out} L ${x2In} ${y2In} A ${R_IN} ${R_IN} 0 0 0 ${x1In} ${y1In} Z`;
}

export function TrackWheel({
  players,
  currentTurnPlayerId,
  activeCellIndex,
  targetCellIndex,
  phaseName = 'ВЫБОР ШАГА',
  lapNumber = 1,
  onCellClick,
}: TrackWheelProps) {
  // Находим активного игрока для определения текущей клетки
  const activePlayer = players.find((p) => p.id === currentTurnPlayerId) ?? players[0];
  const currentSeatPosition = activeCellIndex ?? activePlayer?.position ?? 0;
  const activeCell = CELLS[currentSeatPosition];

  // Группируем игроков по клеткам (до 4 на клетку)
  const playersByCell: Record<number, Array<{ player: PlayerState; playerIndex: number }>> = {};
  players.forEach((p, idx) => {
    const pos = p.position % 9;
    if (!playersByCell[pos]) playersByCell[pos] = [];
    playersByCell[pos].push({ player: p, playerIndex: idx });
  });

  return (
    <div className="w-full max-w-[320px] aspect-square mx-auto relative flex items-center justify-center select-none">
      <svg
        viewBox="0 0 320 320"
        className="w-full h-full overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Свечение светодиодов */}
          <filter id="diode-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Золотое свечение активной клетки */}
          <filter id="gold-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#E5A93C" floodOpacity="0.6" />
          </filter>

          {/* Шахматный микро-паттерн для клетки Гонка (8) */}
          <pattern id="checkered-micro" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="3" height="3" fill="rgba(255, 255, 255, 0.04)" />
            <rect x="3" y="3" width="3" height="3" fill="rgba(255, 255, 255, 0.04)" />
          </pattern>
        </defs>

        {/* 1. Секторы кольца из матового темного титана */}
        {CELLS.map((cell, idx) => {
          const pathD = getSectorPath(idx);
          const isCurrentSeat = idx === currentSeatPosition;
          const isTarget = targetCellIndex !== undefined && idx === targetCellIndex;
          const isHighlighted = isCurrentSeat || isTarget;

          return (
            <g
              key={cell.id}
              onClick={() => onCellClick?.(idx)}
              className="cursor-pointer transition-all duration-200"
            >
              {/* Тело сектора (единый матовый темный титан) */}
              <path
                d={pathD}
                fill={isHighlighted ? '#181D2A' : '#141722'}
                stroke={isHighlighted ? '#E5A93C' : 'rgba(255, 255, 255, 0.08)'}
                strokeWidth={isHighlighted ? '2' : '1'}
                filter={isHighlighted ? 'url(#gold-glow)' : undefined}
                className="transition-colors duration-200"
              />

              {/* Шашечный микро-паттерн для клетки Гонка */}
              {cell.isRace && (
                <path
                  d={pathD}
                  fill="url(#checkered-micro)"
                  className="pointer-events-none opacity-80"
                />
              )}
            </g>
          );
        })}

        {/* 2. Иконки и светодиоды секторов */}
        {CELLS.map((cell, idx) => {
          const midAngle = degToRad(-90 + idx * SECTOR_ANGLE);
          const xIcon = CX + R_ICON * Math.cos(midAngle);
          const yIcon = CY + R_ICON * Math.sin(midAngle);
          const xDiode = CX + R_DIODE * Math.cos(midAngle);
          const yDiode = CY + R_DIODE * Math.sin(midAngle);
          const isCurrent = idx === currentSeatPosition;

          return (
            <g key={`elements-${cell.id}`} className="pointer-events-none">
              {/* Минималистичная линейная иконка */}
              <foreignObject
                x={xIcon - 9}
                y={yIcon - 9}
                width={18}
                height={18}
                className="overflow-visible"
              >
                <div
                  className={`w-full h-full flex items-center justify-center transition-colors ${
                    isCurrent ? 'text-[#E5A93C]' : 'text-white/75'
                  }`}
                >
                  {cell.icon({ className: 'w-[18px] h-[18px]', strokeWidth: 1.8 })}
                </div>
              </foreignObject>

              {/* Светящаяся точка-диод (4x4px) */}
              <circle
                cx={xDiode}
                cy={yDiode}
                r="2"
                fill={cell.diodeColor}
                filter="url(#diode-glow)"
              />
            </g>
          );
        })}

        {/* 3. Фишки игроков на треке */}
        {Object.entries(playersByCell).map(([cellIdxStr, cellPlayers]) => {
          const idx = Number(cellIdxStr);
          const midAngle = degToRad(-90 + idx * SECTOR_ANGLE);
          const cosA = Math.cos(midAngle);
          const sinA = Math.sin(midAngle);

          const tanX = -sinA;
          const tanY = cosA;
          const count = cellPlayers.length;

          return cellPlayers.map(({ player, playerIndex }, pIndex) => {
            const tokenStyle = playerToken(playerIndex);
            const place = tokenPlace(count, pIndex);
            const px = CX + R_MID * cosA + tanX * place.tangent + cosA * place.radial;
            const py = CY + R_MID * sinA + tanY * place.tangent + sinA * place.radial;

            return (
              <g
                key={player.id}
                transform={`translate(${px}, ${py})`}
                className="pointer-events-none transition-all duration-300"
              >
                <circle
                  r={place.radius}
                  fill={tokenStyle.bg}
                  stroke={tokenStyle.border}
                  strokeWidth="1.75"
                  className="shadow-lg"
                />
                {/* Инициал / символ фишки */}
                <text
                  x="0"
                  y="0"
                  fill={tokenStyle.text}
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="system-ui, sans-serif"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {tokenStyle.label}
                </text>
              </g>
            );
          });
        })}

        {/* 4. Концентрический идеальный круглый центральный хаб (Hub, 170x170px) */}
        <foreignObject
          x={CX - HUB_HALF}
          y={CY - HUB_HALF}
          width={HUB_SIZE}
          height={HUB_SIZE}
          className="overflow-visible"
        >
          <div
            className="w-[170px] h-[170px] rounded-full aspect-square bg-[#0D1017]/80 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center p-3 text-center relative overflow-hidden select-none"
            style={{
              boxShadow: 'inset 0 2px 16px rgba(0, 0, 0, 0.85), 0 8px 24px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Тонкий внутренний безель и золотистый отблеск */}
            <div className="absolute inset-1.5 rounded-full border border-white/5 pointer-events-none" />
            <div className="absolute inset-0 bg-radial from-[#E5A93C]/10 via-transparent to-transparent pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center gap-1.5">
              {/* Верхняя микро-метка */}
              <span className="text-[10px] tracking-widest text-white/40 uppercase font-semibold leading-none">
                {phaseName}
              </span>

              {/* Иконка клетки + Название крупнее и контрастнее */}
              <div className="flex items-center gap-1.5 text-base font-bold text-white tracking-wide leading-tight">
                {activeCell?.icon({ className: 'w-4 h-4 text-[#E5A93C]', strokeWidth: 2.2 })}
                <span>{activeCell?.title}</span>
              </div>

              {/* Нижний бейдж: компактная пилюля */}
              <span className="glass-pill px-2.5 py-0.5 text-[11px] text-white/50 border border-white/10 font-mono tracking-wider mt-0.5">
                Круг {lapNumber}
              </span>
            </div>
          </div>
        </foreignObject>
      </svg>
    </div>
  );
}
