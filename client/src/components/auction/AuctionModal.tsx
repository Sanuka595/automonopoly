import { useEffect, useState } from 'react';
import type { AuctionState, PlayerState } from '../../api/types.ts';
import { formatEuro } from '../sheets/formatEuro.ts';
import { playerToken } from '../table/playerTokens.ts';

interface AuctionModalProps {
  auction: AuctionState | null;
  players: PlayerState[];
  myId: string;
  timerExpiresAt?: number;
  updatedAt?: number;
  error?: string | null;
  onBid: (step: '100' | '500') => void;
  onPass: () => void;
}

function useSecondsLeft(expiresAt?: number, updatedAt?: number): number | null {
  const [clock, setClock] = useState(() => ({
    skew: 0,
    now: Date.now(),
  }));

  useEffect(() => {
    const skew = updatedAt == null ? 0 : updatedAt - Date.now();
    setClock({ skew, now: Date.now() });
    if (expiresAt == null) return;
    const id = window.setInterval(() => {
      setClock((prev) => ({ skew: prev.skew, now: Date.now() }));
    }, 250);
    return () => window.clearInterval(id);
  }, [expiresAt, updatedAt]);

  if (expiresAt == null) return null;
  return Math.max(0, Math.ceil((expiresAt - (clock.now + clock.skew)) / 1000));
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AuctionModal({
  auction,
  players,
  myId,
  timerExpiresAt,
  updatedAt,
  error,
  onBid,
  onPass,
}: AuctionModalProps) {
  const seconds = useSecondsLeft(timerExpiresAt, updatedAt);
  if (!auction) return null;

  const mine = auction.currentTurnPlayerId === myId;
  const bidder = players.find((player) => player.id === auction.currentTurnPlayerId);
  const leaderIndex = players.findIndex((player) => player.id === auction.highestBidderId);
  const leader = leaderIndex >= 0 ? players[leaderIndex] : undefined;
  const leaderToken = leaderIndex >= 0 ? playerToken(leaderIndex) : null;
  const urgent = seconds != null && seconds < 5;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 sm:items-center">
      <section
        className="glass-card w-full max-w-[480px] px-4 py-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auction-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p id="auction-title" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E5A93C]">
              Открытый аукцион
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">
              {auction.car.name || 'Ретро'}
            </h2>
          </div>
          {seconds != null ? (
            <span
              className={`tabular-money rounded-full border px-2.5 py-1 text-sm font-semibold ${
                urgent
                  ? 'border-[#E5534B]/40 bg-[#E5534B]/10 text-[#E5534B]'
                  : 'border-white/10 bg-white/[0.04] text-white/70'
              }`}
            >
              {formatClock(seconds)}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Класс</p>
            <p className="mt-0.5 text-sm font-semibold text-white">Ретро</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Выкуп банком</p>
            <p className="tabular-money mt-0.5 text-sm font-semibold text-white">{formatEuro(auction.car.buyout)}</p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Текущая ставка</p>
          <p className="tabular-money mt-1 text-3xl font-semibold tracking-tight text-[#E5A93C]">
            {formatEuro(auction.highestBid)}
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-white/75">
            {leader && leaderToken ? (
              <>
                <span
                  className="h-2.5 w-2.5 rounded-full border"
                  style={{ background: leaderToken.bg, borderColor: leaderToken.border }}
                />
                <span>Лидирует: {leader.name}</span>
              </>
            ) : (
              <span>Ставок нет</span>
            )}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {mine ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onBid('100')}
                  className="touch-feedback h-12 rounded-xl border border-[#E5A93C]/50 bg-white/10 text-sm font-semibold text-white"
                >
                  +100 €
                </button>
                <button
                  type="button"
                  onClick={() => onBid('500')}
                  className="touch-feedback h-12 rounded-xl border border-[#E5A93C]/50 bg-white/10 text-sm font-semibold text-white"
                >
                  +500 €
                </button>
              </div>
              <button
                type="button"
                onClick={onPass}
                className="touch-feedback h-11 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-white/80"
              >
                Пас
              </button>
            </>
          ) : (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-center text-sm text-white/60">
              Ставку делает {bidder?.name ?? 'соперник'}...
            </p>
          )}
          {error ? <p className="text-center text-xs text-[#F3C7C4]">{error}</p> : null}
        </div>
      </section>
    </div>
  );
}
