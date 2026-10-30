import { useState } from 'react';
import { Drawer } from 'vaul';
import { GlassSheet } from './GlassSheet.tsx';
import { formatEuro } from './formatEuro.ts';

export interface LoanOffer {
  targetId: string;
  principal: string;
  due: string;
  turns: 1 | 2 | 3 | 4;
}

export interface LoanOpponent {
  id: string;
  name: string;
}

interface LoanSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opponents: LoanOpponent[];
  availableCash?: string;
  session?: number;
  onSubmit?: (offer: LoanOffer) => void;
}

const PRESETS = [200, 500, 1000] as const;
const TERMS = [1, 2, 3, 4] as const;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '').slice(0, 9);
}

function asInt(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}

function termLabel(turns: number): string {
  if (turns === 1) return '1 ход';
  return `${turns} хода`;
}

function marginHint(principal: string, due: string): { text: string; invalid: boolean } {
  const p = asInt(principal);
  const d = asInt(due);
  if (p === null || p <= 0) return { text: 'Укажите сумму займа', invalid: true };
  if (d === null) return { text: 'Укажите сумму к возврату', invalid: true };
  if (d < p) return { text: 'К возврату не меньше суммы займа', invalid: true };
  const margin = d - p;
  const pct = Math.round((margin / p) * 100);
  return {
    text: `Маржа ${formatEuro(String(margin))} · ${pct}%`,
    invalid: false,
  };
}

const fieldClass =
  'tabular-money h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none select-text focus:border-[#E5A93C]/60';

export function LoanSheet({
  open,
  onOpenChange,
  opponents,
  availableCash,
  session = 0,
  onSubmit,
}: LoanSheetProps) {
  const [borrowerId, setBorrowerId] = useState<string | null>(
    () => opponents[0]?.id ?? null,
  );
  const [principal, setPrincipal] = useState('200');
  const [due, setDue] = useState('200');
  const [turns, setTurns] = useState<1 | 2 | 3 | 4>(1);
  const [seenSession, setSeenSession] = useState(session);
  if (session !== seenSession) {
    setSeenSession(session);
    setBorrowerId(opponents[0]?.id ?? null);
    setPrincipal('200');
    setDue('200');
    setTurns(1);
  }

  const hint = marginHint(principal, due);
  const cash = availableCash !== undefined ? asInt(availableCash) : null;
  const principalN = asInt(principal);
  const overCash = cash !== null && principalN !== null && principalN > cash;
  const canSubmit = Boolean(borrowerId) && !hint.invalid && !overCash;

  const applyPrincipal = (next: string) => {
    const clean = digitsOnly(next);
    setPrincipal(clean);
    const nextN = asInt(clean);
    const dueN = asInt(due);
    if (nextN !== null && (dueN === null || dueN < nextN)) {
      setDue(clean);
    }
  };

  const submit = () => {
    if (!borrowerId || !canSubmit) return;
    onSubmit?.({ targetId: borrowerId, principal, due, turns });
    onOpenChange(false);
  };

  return (
    <GlassSheet
      open={open}
      onOpenChange={onOpenChange}
      header={
        <div className="mb-4">
          <Drawer.Title className="text-lg font-semibold tracking-tight text-white">
            P2P Кредитование
          </Drawer.Title>
          <Drawer.Description className="mt-1 text-xs text-white/45">
            Оффер уходит заёмщику. Деньги спишутся только после принятия.
          </Drawer.Description>
        </div>
      }
      footer={
        <button
          type="button"
          disabled={!canSubmit}
          onClick={submit}
          className={`touch-feedback flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold transition-all ${
            canSubmit
              ? 'cursor-pointer bg-[#E5A93C] text-[#090B10] shadow-[0_4px_20px_rgba(229,169,60,0.25)] active:bg-[#A97A22]'
              : 'cursor-not-allowed border border-white/5 bg-white/5 text-white/30'
          }`}
        >
          Предложить заём
        </button>
      }
    >
      <div className="flex flex-col gap-4 pb-1">
        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Заёмщик
          </p>
          {opponents.length === 0 ? (
            <p className="text-xs text-white/45">Нет соперников за столом</p>
          ) : (
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {opponents.map((opp) => {
                const selected = opp.id === borrowerId;
                return (
                  <button
                    key={opp.id}
                    type="button"
                    onClick={() => setBorrowerId(opp.id)}
                    className={`touch-feedback shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium ${
                      selected
                        ? 'border-[#E5A93C]/60 bg-white/10 text-white'
                        : 'border-white/10 bg-white/[0.04] text-white/70'
                    }`}
                  >
                    {opp.name}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Сумма займа
          </p>
          <div className="mb-2 grid grid-cols-3 gap-1.5">
            {PRESETS.map((amount) => {
              const selected = principal === String(amount);
              return (
                <button
                  key={amount}
                  type="button"
                  onClick={() => applyPrincipal(String(amount))}
                  className={`touch-feedback cursor-pointer rounded-xl border py-2 text-xs font-semibold tabular-money ${
                    selected
                      ? 'border-[#E5A93C]/60 bg-white/10 text-white'
                      : 'border-white/10 bg-white/[0.04] text-white/70'
                  }`}
                >
                  {formatEuro(String(amount))}
                </button>
              );
            })}
          </div>
          <input
            inputMode="numeric"
            autoComplete="off"
            aria-label="Сумма займа"
            value={principal}
            onChange={(event) => applyPrincipal(event.target.value)}
            className={fieldClass}
            style={{ WebkitUserSelect: 'text' }}
          />
          {overCash ? (
            <p className="mt-1.5 text-[11px] text-[#E5534B]">
              Не хватает наличных · есть {formatEuro(availableCash ?? '0')}
            </p>
          ) : null}
        </section>

        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Сумма к возврату
          </p>
          <input
            inputMode="numeric"
            autoComplete="off"
            aria-label="Сумма к возврату"
            placeholder="не меньше суммы займа"
            value={due}
            onChange={(event) => setDue(digitsOnly(event.target.value))}
            className={fieldClass}
            style={{ WebkitUserSelect: 'text' }}
          />
          <p className={`mt-1.5 text-[11px] ${hint.invalid ? 'text-[#E5534B]' : 'text-white/45'}`}>
            {hint.text}
          </p>
        </section>

        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Срок займа
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {TERMS.map((term) => {
              const selected = turns === term;
              return (
                <button
                  key={term}
                  type="button"
                  onClick={() => setTurns(term)}
                  className={`touch-feedback cursor-pointer rounded-xl border py-2 text-xs font-semibold ${
                    selected
                      ? 'border-[#E5A93C]/60 bg-white/10 text-white'
                      : 'border-white/10 bg-white/[0.04] text-white/70'
                  }`}
                >
                  {termLabel(term)}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-white/40">Личные ходы заёмщика</p>
        </section>
      </div>
    </GlassSheet>
  );
}
