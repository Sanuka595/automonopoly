import { Compass, Sparkles } from 'lucide-react';

interface TrackContainerProps {
  currentCellTitle?: string;
}

export function TrackContainer({
  currentCellTitle = 'Вёдра (Клетка 0)',
}: TrackContainerProps) {
  return (
    <section className="flex-1 min-h-[260px] max-h-[320px] flex items-center justify-center relative bg-transparent py-2 select-none">
      {/* Прозрачный контейнер с центральным стеклянным кругом под будущее кольцо */}
      <div className="w-[220px] h-[220px] rounded-full glass-card border border-white/10 relative flex flex-col items-center justify-center p-4 text-center overflow-hidden">
        {/* Внутренние концентрические кольца */}
        <div className="absolute inset-2 rounded-full border border-dashed border-white/10 pointer-events-none" />
        <div className="absolute inset-6 rounded-full border border-white/5 pointer-events-none" />
        <div className="absolute inset-12 rounded-full bg-radial from-[#E5A93C]/5 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#E5A93C] shadow-[0_0_15px_rgba(229,169,60,0.2)]">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-widest text-[#E5A93C] font-semibold flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> АРЕНА ТРЕКА
            </span>
            <span className="text-xs font-semibold text-white mt-0.5">
              (Этап 4 · Кольцо трека)
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-full bg-black/40 border border-white/5 text-[11px] text-zinc-300">
            {currentCellTitle}
          </div>
        </div>
      </div>
    </section>
  );
}
