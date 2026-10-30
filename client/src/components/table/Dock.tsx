import { useState } from 'react';
import type { CarState, PhaseState } from '../../api/types.ts';
import { cellTitle } from '../../api/present.ts';
import { ArrowRight, Coins, HandCoins, SkipForward } from 'lucide-react';
import { formatCount, formatEuro } from '../sheets/formatEuro.ts';
import { LoanSheet, type LoanOffer, type LoanOpponent } from '../sheets/LoanSheet.tsx';

interface DockProps {
  phase: PhaseState;
  isMyTurn: boolean;
  waitingName?: string;
  taxiDisabled?: boolean;
  offer?: CarState | null;
  onMove?: (steps: 1 | 2 | 3 | 4) => void;
  onPass?: () => void;
  onTaxi?: () => void;
  onBuy?: (carId: string) => void;
  onRent?: () => void;
  onStartAuction?: () => void;
  onAction?: () => void;
  opponents?: LoanOpponent[];
  lenderCash?: string;
  onLoanOffer?: (offer: LoanOffer) => void;
  actionTitle?: string;
  cellTitle?: string;
  actionEnabled?: boolean;
}

const STEPS = [
  { steps: 1 as const, label: '+1', cost: '0 €' },
  { steps: 2 as const, label: '+2', cost: '0 €' },
  { steps: 3 as const, label: '+3', cost: '-300 €' },
  { steps: 4 as const, label: '+4', cost: '-600 €' },
];

const CLASS_LABEL: Record<CarState['class'], string> = {
  bucket: 'Вёдра',
  beaten: 'Битьё',
  premium: 'Премиум',
  retro: 'Ретро',
};

function defectLine(car: CarState): string {
  const defect = car.defect;
  if (defect.kind === 'perfect') return 'Без дефекта';
  if (defect.kind === 'fixed') return `Ремонт ${formatEuro(defect.repair)}`;
  if (defect.kind === 'roll') return `Ремонт d6 × ${formatCount(defect.multiplier)}`;
  return 'Распил';
}

const goldButton =
  'touch-feedback flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#E5A93C] text-sm font-semibold text-[#090B10] shadow-[0_4px_20px_rgba(229,169,60,0.25)] active:bg-[#A97A22]';
const lockedButton =
  'flex h-11 w-full cursor-not-allowed items-center justify-center rounded-xl border border-white/5 bg-white/5 text-sm font-semibold text-white/30';
const ghostButton =
  'touch-feedback flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2 text-xs font-semibold text-white/80';

function formatStepWord(step: number): string {
  if (step === 1) return '1 шаг';
  if (step < 5) return `${step} шага`;
  return `${step} шагов`;
}

export function Dock({
  phase,
  isMyTurn,
  waitingName = 'соперника',
  taxiDisabled = false,
  offer,
  onMove,
  onPass,
  onTaxi,
  onBuy,
  onRent,
  onStartAuction,
  onAction,
  opponents = [],
  lenderCash,
  onLoanOffer,
  actionTitle = 'Действие клетки',
  cellTitle: cellTitleProp = 'Действие',
  actionEnabled = true,
}: DockProps) {
  const [selectedStep, setSelectedStep] = useState<1 | 2 | 3 | 4>(1);
  const [loanOpen, setLoanOpen] = useState(false);
  const [loanSession, setLoanSession] = useState(0);

  const isChooseMove = phase.name === 'choose_move';
  const isResolveCell = phase.name === 'resolve_cell';
  const waitingLabel = `Ожидание хода ${waitingName}`;
  const locked = !isMyTurn;
  const cell = phase.name === 'resolve_cell' ? phase.cell : null;
  const isShop = cell === 'buckets' || cell === 'beaten' || cell === 'premium';
  const title = cell ? cellTitle(cell) : cellTitleProp;

  const taxi = () => {
    if (locked || taxiDisabled) return;
    onTaxi?.();
  };
  const pass = () => {
    if (locked) return;
    onPass?.();
  };

  return (
    <>
      <nav className="glass-card relative z-20 flex h-[188px] min-h-[188px] flex-col justify-between overflow-hidden p-3 shadow-2xl">
        {isChooseMove && (
          <>
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-white/40">
                {isMyTurn ? 'Выберите перемещение' : waitingLabel}
              </span>
              <button
                type="button"
                disabled={locked}
                onClick={() => {
                  setLoanSession((n) => n + 1);
                  setLoanOpen(true);
                }}
                className={`glass-pill flex shrink-0 items-center gap-1.5 border border-white/10 px-2.5 py-1 text-xs text-zinc-300 touch-feedback ${
                  locked ? 'cursor-not-allowed opacity-40' : ''
                }`}
              >
                <HandCoins className="h-3.5 w-3.5 text-[#E5A93C]" />
                <span>+ Займ</span>
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-white/5 bg-black/40 p-1">
              {STEPS.map((item) => {
                const isSelected = selectedStep === item.steps;
                return (
                  <button
                    key={item.steps}
                    type="button"
                    disabled={locked}
                    onClick={() => setSelectedStep(item.steps)}
                    className={`flex flex-col items-center justify-center rounded-lg px-1 py-2 touch-feedback ${
                      isSelected
                        ? 'border border-[#E5A93C]/60 bg-white/10 font-semibold text-white shadow-[0_0_12px_rgba(229,169,60,0.15)]'
                        : 'border border-white/10 bg-white/[0.03] text-white/80'
                    } ${locked ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
                  >
                    <span className="text-sm font-semibold leading-none tracking-tight">{item.label}</span>
                    <span className={`mt-0.5 font-mono text-[9px] leading-tight ${isSelected ? 'text-[#E5A93C]' : 'text-zinc-400'}`}>
                      {item.cost}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={locked}
              title={locked ? waitingLabel : undefined}
              onClick={() => {
                if (locked) return;
                onMove?.(selectedStep);
              }}
              className={locked ? lockedButton : goldButton}
            >
              <span className="truncate">
                {isMyTurn ? `Поехать · ${formatStepWord(selectedStep)}` : waitingLabel}
              </span>
              {isMyTurn ? <ArrowRight className="h-4 w-4" /> : null}
            </button>
          </>
        )}

        {isResolveCell && cell && (
          <>
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-white/40">
                {isMyTurn ? title : waitingLabel}
              </span>
              {!isShop ? (
                <button
                  type="button"
                  disabled={locked || taxiDisabled}
                  onClick={taxi}
                  className={`${ghostButton} shrink-0 ${locked || taxiDisabled ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  <Coins className="h-3 w-3 text-[#E5A93C]" />
                  Такси
                </button>
              ) : null}
            </div>

            {isShop && offer ? (
              <div className="flex h-12 items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{offer.name || CLASS_LABEL[offer.class]}</p>
                  <p className="truncate text-[10px] text-white/45">
                    {CLASS_LABEL[offer.class]} · {defectLine(offer)}
                  </p>
                </div>
                <p className="tabular-money shrink-0 text-sm font-semibold text-[#E5A93C]">{formatEuro(offer.purchase)}</p>
              </div>
            ) : null}

            {isShop && offer === null ? (
              <p className="flex h-12 items-center justify-center rounded-xl border border-dashed border-white/10 text-xs text-white/40">
                В колоде нет авто
              </p>
            ) : null}

            {cell === 'service' ? (
              <p className="flex flex-1 items-center text-center text-xs leading-snug text-white/70">
                Нажмите на сломанное авто в гараже для ремонта
              </p>
            ) : null}

            {cell === 'buyout' ? (
              <p className="flex flex-1 items-center text-center text-xs leading-snug text-white/70">
                Нажмите на готовое авто в гараже для продажи банку
              </p>
            ) : null}

            {cell === 'rent' ? (
              <button
                type="button"
                disabled={locked}
                onClick={() => {
                  if (locked) return;
                  onRent?.();
                }}
                className={locked ? lockedButton : goldButton}
              >
                <span className="truncate px-2">
                  {isMyTurn ? 'Сдать все готовые авто в прокат' : waitingLabel}
                </span>
              </button>
            ) : null}

            {cell === 'picker' ? (
              <button
                type="button"
                disabled={locked}
                onClick={() => {
                  if (locked) return;
                  onStartAuction?.();
                }}
                className={locked ? lockedButton : goldButton}
              >
                {isMyTurn ? 'Выставить ретро' : waitingLabel}
              </button>
            ) : null}

            {isShop ? (
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={locked || taxiDisabled}
                  onClick={taxi}
                  className={`${ghostButton} ${locked || taxiDisabled ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  <Coins className="h-3 w-3 text-[#E5A93C]" />
                  Такси
                </button>
                <button
                  type="button"
                  disabled={locked}
                  onClick={pass}
                  className={`${ghostButton} min-w-0 ${locked ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  <SkipForward className="h-3 w-3 shrink-0" />
                  <span className="truncate">Пас (Завершить ход)</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={locked}
                onClick={pass}
                className={`w-full ${locked ? lockedButton : ghostButton}`}
              >
                {isMyTurn ? 'Пас (Завершить ход)' : waitingLabel}
              </button>
            )}

            {isShop && offer ? (
              <button
                type="button"
                disabled={locked}
                onClick={() => {
                  if (locked) return;
                  onBuy?.(offer.id);
                }}
                className={locked ? lockedButton : goldButton}
              >
                <span>{isMyTurn ? 'Купить авто' : waitingLabel}</span>
                {isMyTurn ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            ) : null}

            {isShop && offer === undefined && onAction ? (
              <button
                type="button"
                disabled={locked || !actionEnabled}
                onClick={() => {
                  if (locked || !actionEnabled) return;
                  onAction();
                }}
                className={locked || !actionEnabled ? lockedButton : goldButton}
              >
                {isMyTurn ? actionTitle : waitingLabel}
              </button>
            ) : null}
          </>
        )}

        {!isChooseMove && !isResolveCell && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#E5A93C]">Фаза: {phase.name}</span>
            <span className="text-xs text-white/60">{isMyTurn ? 'Ваше действие ожидается' : waitingLabel}</span>
          </div>
        )}
      </nav>
      <LoanSheet
        open={loanOpen}
        onOpenChange={setLoanOpen}
        opponents={opponents}
        availableCash={lenderCash}
        session={loanSession}
        onSubmit={(offerDraft) => onLoanOffer?.(offerDraft)}
      />
    </>
  );
}
