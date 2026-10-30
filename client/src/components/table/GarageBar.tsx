import { useState } from 'react';
import type { CarState } from '../../api/types.ts';
import type { CarAction } from '../../api/present.ts';
import { Car, Plus } from 'lucide-react';
import { CarDetailsSheet } from '../sheets/CarDetailsSheet.tsx';

interface GarageBarProps {
  cars: CarState[];
  selectedCarId?: string | null;
  onSelectCar?: (carId: string) => void;
  onCarAction?: (action: string, car: CarState) => void;
  onAddSlot?: () => void;
  actionsEnabled?: boolean;
  waitingName?: string;
  allowedActions?: readonly CarAction[];
}

export function GarageBar({
  cars,
  selectedCarId,
  onSelectCar,
  onCarAction,
  onAddSlot,
  actionsEnabled,
  waitingName,
  allowedActions,
}: GarageBarProps) {
  const [selectedCar, setSelectedCar] = useState<CarState | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const shownCar = selectedCar
    ? (cars.find((car) => car.id === selectedCar.id) ?? null)
    : null;

  return (
    <>
    <section className="h-[84px] min-h-[84px] flex items-center overflow-x-auto no-scrollbar gap-2.5 py-1">
      {cars.map((car) => {
        const isSelected = selectedCarId === car.id;
        const isReady = car.status === 'ready';
        const isBroken = car.status === 'broken';
        const isInRent = car.status === 'in_rent';

        return (
          <button
            key={car.id}
            type="button"
            onClick={() => {
              setSelectedCar(car);
              setDetailsOpen(true);
              onSelectCar?.(car.id);
            }}
            className={`w-[140px] flex-shrink-0 h-full p-2.5 flex flex-col justify-between text-left touch-feedback transition-all cursor-pointer relative overflow-hidden glass-card ${
              isSelected
                ? 'ring-1 ring-[#E5A93C] bg-white/[0.08] shadow-[0_0_12px_rgba(229,169,60,0.2)]'
                : 'hover:bg-white/[0.04]'
            }`}
          >
            {/* Верхний ряд: иконка и статус-диод */}
            <div className="flex items-center justify-between w-full">
              <Car className="w-3.5 h-3.5 text-zinc-400" />
              {/* Живой светодиод статуса */}
              <div className="flex items-center gap-1">
                {isReady && (
                  <span className="w-2 h-2 rounded-full bg-[#4FB286] shadow-[0_0_8px_rgba(79,178,134,0.8)] animate-pulse" />
                )}
                {isBroken && (
                  <span className="w-2 h-2 rounded-full bg-[#E5534B] shadow-[0_0_8px_rgba(229,83,75,0.8)]" />
                )}
                {isInRent && (
                  <span className="w-2 h-2 rounded-full bg-[#5B9BD5] shadow-[0_0_8px_rgba(91,155,213,0.8)] animate-pulse" />
                )}
              </div>
            </div>

            {/* Нижний ряд: двухстрочное название модели и бейдж статуса */}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white/90 line-clamp-2 leading-tight">
                {car.name || car.class}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 leading-tight mt-0.5">
                {isReady ? 'ГОТОВ' : isBroken ? 'СЛОМАН' : 'ПРОКАТ'}
              </span>
            </div>
          </button>
        );
      })}

      {/* Компактная кнопка «+» в конце ленты */}
      <button
        type="button"
        onClick={onAddSlot}
        className="w-11 h-full flex-shrink-0 rounded-xl border border-dashed border-white/15 bg-white/[0.015] flex items-center justify-center text-white/30 hover:border-white/25 hover:text-white/60 transition-colors touch-feedback"
        title="Добавить авто"
      >
        <Plus className="w-4 h-4" />
      </button>
    </section>
    <CarDetailsSheet
      open={detailsOpen && shownCar !== null}
      onOpenChange={setDetailsOpen}
      car={shownCar}
      actionsEnabled={actionsEnabled}
      waitingName={waitingName}
      allowedActions={allowedActions}
      onAction={(action) => {
        if (!shownCar) return;
        onCarAction?.(action, shownCar);
        if (action === 'scrap' || action === 'buyout') {
          setDetailsOpen(false);
        }
      }}
    />
    </>
  );
}
