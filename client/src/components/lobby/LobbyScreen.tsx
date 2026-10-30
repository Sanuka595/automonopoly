import { Crown } from 'lucide-react';
import type { LobbyUser } from '../../api/types.ts';
import { seatHref } from '../../api/present.ts';

const SLOT_COUNT = 4;
const MIN_PLAYERS = 3;
const SEAT_LINKS = ['1', '2', '3'] as const;

const TOKENS = [
  'text-[#E5A93C] bg-[#E5A93C]/15 border-[#E5A93C]/40',
  'text-[#5B9BD5] bg-[#5B9BD5]/15 border-[#5B9BD5]/40',
  'text-amber-400 bg-amber-400/15 border-amber-400/40',
  'text-purple-300 bg-purple-400/15 border-purple-400/40',
];

interface LobbyScreenProps {
  seats: LobbyUser[];
  myId: string;
  roomId: string;
  devPlayerId: string;
  error?: string | null;
  starting?: boolean;
  onStart: () => void;
  onDismissError?: () => void;
}

export function LobbyScreen({
  seats,
  myId,
  roomId,
  devPlayerId,
  error,
  starting = false,
  onStart,
  onDismissError,
}: LobbyScreenProps) {
  const host = seats[0];
  const isHost = Boolean(host && host.id === myId);
  const canStart = isHost && seats.length >= MIN_PLAYERS && !starting;
  const startLabel = starting
    ? 'Запуск...'
    : !host
      ? 'Ждём игроков'
      : !isHost
        ? `Старт у ${host.name}`
        : seats.length < MIN_PLAYERS
          ? `Нужно ещё ${MIN_PLAYERS - seats.length}`
          : 'Начать партию';

  return (
    <main className="mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col justify-center gap-4 overflow-hidden p-4">
      <section className="glass-card flex flex-col gap-4 px-4 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
              Лобби
            </p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight text-white">
              Стол {roomId}
            </h1>
          </div>
          <span className="tabular-money rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/60">
            {seats.length}/{SLOT_COUNT}
          </span>
        </div>

        <ul className="flex flex-col gap-2">
          {Array.from({ length: SLOT_COUNT }, (_, index) => {
            const seat = seats[index];
            const isMe = seat?.id === myId;
            const token = TOKENS[index] ?? TOKENS[0];
            return (
              <li
                key={seat?.id ?? `empty-${index}`}
                className={`flex h-14 items-center gap-3 rounded-2xl border px-3 ${
                  seat
                    ? 'border-white/10 bg-white/[0.04]'
                    : 'border-dashed border-white/10 bg-white/[0.015]'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                    seat ? token : 'border-white/10 text-white/25'
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${seat ? 'text-white' : 'text-white/30'}`}>
                    {seat ? seat.name : 'Свободный слот'}
                  </p>
                  <p className="text-[11px] text-white/40">
                    {seat ? (isMe ? 'Вы' : 'За столом') : 'Ожидание'}
                  </p>
                </div>
                {index === 0 && seat ? (
                  <span className="inline-flex items-center gap-1 text-[#E5A93C]" title="Хост лобби">
                    <Crown className="h-4 w-4" />
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          disabled={!canStart}
          onClick={onStart}
          className={`touch-feedback flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold ${
            canStart
              ? 'cursor-pointer bg-[#E5A93C] text-[#090B10] shadow-[0_4px_20px_rgba(229,169,60,0.25)] active:bg-[#A97A22]'
              : 'cursor-not-allowed border border-white/5 bg-white/5 text-white/35'
          }`}
        >
          {startLabel}
        </button>
        {error ? (
          <button
            type="button"
            onClick={onDismissError}
            className="rounded-xl border border-[#E5534B]/30 bg-[#E5534B]/10 px-3 py-2 text-left text-xs text-[#F3C7C4]"
          >
            {error}
          </button>
        ) : null}
      </section>

      <section className="glass-card px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
          Соседние вкладки
        </p>
        <p className="mt-1 text-xs leading-relaxed text-white/55">
          Откройте игроков 1–3 в соседних вкладках этой же комнаты.
        </p>
        <div className="mt-3 flex gap-2">
          {SEAT_LINKS.map((id) => {
            const href = seatHref(id, roomId);
            const current = id === devPlayerId;
            return (
              <a
                key={id}
                href={href}
                target="_blank"
                rel="noreferrer"
                className={`touch-feedback flex-1 rounded-xl border px-2 py-2 text-center text-xs font-semibold ${
                  current
                    ? 'border-[#E5A93C]/50 bg-[#E5A93C]/10 text-[#E5A93C]'
                    : 'border-white/10 bg-white/[0.04] text-white/80'
                }`}
              >
                ?p={id}
              </a>
            );
          })}
        </div>
      </section>
    </main>
  );
}
