import type { PlayerState } from '../../api/types.ts';

interface OpponentsBarProps {
  opponents: PlayerState[];
  currentTurnPlayerId?: string;
}

const TOKENS = [
  { shape: '●', color: 'text-amber-400 bg-amber-400/20 border-amber-400/40' },
  { shape: '■', color: 'text-sky-400 bg-sky-400/20 border-sky-400/40' },
  { shape: '▲', color: 'text-purple-400 bg-purple-400/20 border-purple-400/40' },
  { shape: '◆', color: 'text-rose-400 bg-rose-400/20 border-rose-400/40' },
];

export function OpponentsBar({
  opponents,
  currentTurnPlayerId,
}: OpponentsBarProps) {
  return (
    <section className="h-[60px] min-h-[60px] flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
      {opponents.map((opp, idx) => {
        const token = TOKENS[idx % TOKENS.length] ?? TOKENS[0];
        const isTurn = opp.id === currentTurnPlayerId;
        const formattedCash = Number(opp.cash || '0').toLocaleString('de-DE');

        return (
          <div
            key={opp.id}
            className={`glass-pill min-w-[130px] flex-1 max-w-[160px] h-full px-2.5 py-1.5 flex items-center justify-between border-t border-white/15 transition-all ${
              isTurn
                ? 'bg-white/[0.08] ring-1 ring-[#E5A93C]/50 shadow-[0_0_12px_rgba(229,169,60,0.15)]'
                : 'bg-white/[0.025]'
            }`}
          >
            {/* Жетон и имя */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${token?.color}`}
              >
                {token?.shape}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-medium text-white/90 truncate leading-tight">
                  {opp.name}
                </span>
                <span className="tabular-money text-[11px] font-semibold text-[#E5A93C] leading-tight">
                  {formattedCash} €
                </span>
              </div>
            </div>

            {/* Количество авто */}
            <span className="text-xs text-white/60 font-medium whitespace-nowrap pl-1">
              {opp.cars.length} авто
            </span>
          </div>
        );
      })}
    </section>
  );
}
