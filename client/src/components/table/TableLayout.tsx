import type { ReactNode } from 'react';

interface TableLayoutProps {
  hud: ReactNode;
  opponents: ReactNode;
  track: ReactNode;
  garage: ReactNode;
  dock: ReactNode;
}

export function TableLayout({
  hud,
  opponents,
  track,
  garage,
  dock,
}: TableLayoutProps) {
  return (
    <main className="h-[100dvh] w-full max-w-[480px] mx-auto p-2 flex flex-col justify-between gap-2 overflow-hidden relative select-none">
      {/* Z1: HUD (52px) */}
      {hud}

      {/* Z2: Соперники (60px) */}
      {opponents}

      {/* Z3: Трек / Арена (flex/clamp) */}
      {track}

      {/* Z4: Гараж игрока (84px) */}
      {garage}

      {/* Z5: Интерактивный Dock (188px) */}
      {dock}
    </main>
  );
}
