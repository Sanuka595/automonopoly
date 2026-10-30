import { Drawer } from 'vaul';
import type { CarClass, CarState } from '../../api/types.ts';
import type { CarAction } from '../../api/present.ts';
import { GlassSheet } from './GlassSheet.tsx';
import { formatCount, formatEuro } from './formatEuro.ts';

interface CarDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  car: CarState | null;
  actionsEnabled?: boolean;
  waitingName?: string;
  allowedActions?: readonly CarAction[];
  onAction?: (action: string) => void;
}

const CLASS_LABEL: Record<CarClass, string> = {
  bucket: 'Вёдра',
  beaten: 'Битьё',
  premium: 'Премиум',
  retro: 'Ретро',
};

function statusView(car: CarState): {
  label: string;
  pill: string;
  dot: string;
} {
  if (car.status === 'ready') {
    return {
      label: 'Готова к продаже',
      pill: 'border-[#4FB286]/20 bg-[#4FB286]/10 text-[#4FB286]',
      dot: 'bg-[#4FB286] shadow-[0_0_8px_rgba(79,178,134,0.6)]',
    };
  }
  if (car.status === 'broken') {
    return {
      label: 'Требует ремонта',
      pill: 'border-[#E5534B]/20 bg-[#E5534B]/10 text-[#E5534B]',
      dot: 'bg-[#E5534B] shadow-[0_0_8px_rgba(229,83,75,0.6)]',
    };
  }
  const step = car.rentSteps ?? 0;
  return {
    label: `В прокате ${step}/9`,
    pill: 'border-[#5B9BD5]/20 bg-[#5B9BD5]/10 text-[#5B9BD5]',
    dot: 'animate-pulse bg-[#5B9BD5] shadow-[0_0_8px_rgba(91,155,213,0.6)]',
  };
}

function bankPayout(car: CarState): { amount: string; note: string | null } {
  if (car.defect.kind === 'raspil') {
    return { amount: car.purchase, note: 'маржа 0 €' };
  }
  return { amount: car.buyout, note: null };
}

function DefectCard({ car }: { car: CarState }) {
  const defect = car.defect;

  if (defect.kind === 'perfect' || defect.kind === 'raspil') {
    const title = defect.kind === 'perfect' ? 'НЕ БИТ, НЕ КРАШЕН' : 'РАСПИЛ';
    const caption =
      defect.kind === 'raspil' ? 'маржа скупки 0 €' : (defect.desc ?? null);
    return (
      <div className="flex justify-center py-1">
        <div
          className="inline-flex max-w-full flex-col items-center border-[3px] border-double px-4 py-2.5 text-center"
          style={{
            backgroundColor: '#F6EFD9',
            color: '#B42318',
            borderColor: '#B42318',
            transform: defect.kind === 'raspil' ? 'rotate(2deg)' : 'rotate(-2.5deg)',
            boxShadow: 'inset 0 0 0 1px rgba(180, 35, 24, 0.28)',
            fontFamily: '"Courier New", Courier, monospace',
          }}
        >
          <span className="text-[13px] font-black uppercase leading-tight tracking-[0.14em]">
            {title}
          </span>
          {caption ? (
            <span className="mt-1 text-[10px] font-bold uppercase leading-tight tracking-[0.08em]">
              {caption}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  const desc = defect.desc ?? 'Поломка';
  const priceLine =
    defect.kind === 'fixed'
      ? `Стоимость ремонта: ${formatEuro(defect.repair)}`
      : `Ремонт по кубику: d6 × ${formatCount(defect.multiplier)}`;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
      <p className="text-sm leading-snug text-white/85">{desc}</p>
      <p className="tabular-money mt-2 text-xs text-white/55">{priceLine}</p>
    </div>
  );
}

const primaryButton =
  'touch-feedback flex h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-[#E5A93C] text-sm font-semibold text-[#090B10] shadow-[0_4px_20px_rgba(229,169,60,0.25)] active:bg-[#A97A22]';

const secondaryButton =
  'touch-feedback flex h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-sm font-semibold text-white';

const ghostButton =
  'touch-feedback flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-white/70';

export function CarDetailsSheet({
  open,
  onOpenChange,
  car,
  actionsEnabled = true,
  waitingName,
  allowedActions,
  onAction,
}: CarDetailsSheetProps) {
  const close = () => {
    onAction?.('close');
    onOpenChange(false);
  };

  const can = (action: CarAction) => {
    if (!actionsEnabled) return false;
    if (allowedActions && !allowedActions.includes(action)) return false;
    return true;
  };

  const actionClass = (action: CarAction, base: string) =>
    can(action) ? base : `${base} cursor-not-allowed opacity-40`;

  const act = (action: CarAction) => {
    if (!can(action)) return;
    onAction?.(action);
    if (action === 'scrap' || action === 'buyout') {
      onOpenChange(false);
    }
  };

  const payout = car ? bankPayout(car) : null;
  const status = car ? statusView(car) : null;

  return (
    <GlassSheet
      open={open && car !== null}
      onOpenChange={onOpenChange}
      header={
        car && status ? (
          <div className="mb-4">
            <div className="flex items-start justify-between gap-3">
              <Drawer.Title className="text-lg font-semibold leading-tight tracking-tight text-white">
                {car.name || CLASS_LABEL[car.class]}
              </Drawer.Title>
              <span className="shrink-0 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70">
                {CLASS_LABEL[car.class]}
              </span>
            </div>
            <div
              className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${status.pill}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              <span>{status.label}</span>
            </div>
            <Drawer.Description className="sr-only">
              Статус, выкуп банком и дефект автомобиля
            </Drawer.Description>
          </div>
        ) : null
      }
      footer={
        car ? (
          <>
            {!actionsEnabled && waitingName ? (
              <p className="text-center text-xs text-white/45">Ожидание хода {waitingName}</p>
            ) : null}
            {car.status === 'broken' ? (
              <button
                type="button"
                disabled={!can('repair')}
                className={actionClass('repair', primaryButton)}
                onClick={() => act('repair')}
              >
                Починить
              </button>
            ) : null}
            {car.status === 'broken' ? (
              <button
                type="button"
                disabled={!can('scrap')}
                className={actionClass('scrap', secondaryButton)}
                onClick={() => act('scrap')}
              >
                В чермет (+50 €)
              </button>
            ) : null}
            {car.status === 'ready' || car.status === 'in_rent' ? (
              <button
                type="button"
                disabled={!can('buyout')}
                className={actionClass('buyout', primaryButton)}
                onClick={() => act('buyout')}
              >
                Продать банку
              </button>
            ) : null}
            <button type="button" className={ghostButton} onClick={close}>
              Закрыть
            </button>
          </>
        ) : null
      }
    >
      {car && payout ? (
        <div className="flex flex-col gap-3 pb-1">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Выкуп банком
              </p>
              <p className="tabular-money mt-1 text-base font-semibold tracking-tight text-white">
                {formatEuro(payout.amount)}
              </p>
              {payout.note ? (
                <p className="mt-0.5 text-[10px] text-white/40">{payout.note}</p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Доход в такси
              </p>
              <p className="tabular-money mt-1 text-base font-semibold tracking-tight text-[#E5A93C]">
                d6 × {formatCount(car.taxiMult)}
              </p>
            </div>
          </div>
          <DefectCard car={car} />
        </div>
      ) : null}
    </GlassSheet>
  );
}
