interface HudProps {
  isMyTurn: boolean;
  activePlayerName?: string;
  cash: string;
  turnNumber?: number;
}

export function Hud({
  isMyTurn,
  activePlayerName = 'Игрок',
  cash,
  turnNumber = 1,
}: HudProps) {
  const displayCash = Number(cash || '0').toLocaleString('de-DE');

  return (
    <header className="glass-card h-[52px] min-h-[52px] px-3.5 flex items-center justify-between relative z-10">
      {/* Слева: плашка активного хода */}
      <div className="flex items-center gap-2 min-w-0">
        {isMyTurn ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E5A93C]/10 border border-[#E5A93C]/30 text-[#E5A93C] text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#E5A93C] shadow-[0_0_8px_rgba(229,169,60,0.8)] animate-pulse" />
            <span className="tracking-wide">Ваш ход</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-white/40" />
            <span className="truncate max-w-[80px]">Ход: {activePlayerName}</span>
          </div>
        )}
      </div>

      {/* В центре: нейтральный индикатор хода */}
      <div className="text-xs text-white/40 font-mono tabular-money select-none">
        Ход {turnNumber}
      </div>

      {/* Справа: наличные */}
      <div className="flex items-baseline gap-1 text-right">
        <span className="tabular-money text-base font-bold text-white tracking-tight">
          {displayCash}
        </span>
        <span className="text-sm font-semibold text-[#E5A93C]">€</span>
      </div>
    </header>
  );
}
