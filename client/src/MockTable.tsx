import { useState } from 'react';
import type { CarState, PhaseState, PlayerState, RoomState } from './api/types.ts';
import {
  Hud,
  OpponentsBar,
  TrackWheel,
  GarageBar,
  Dock,
  TableLayout,
} from './components/table/index.ts';

const MOCK_CARS: CarState[] = [
  {
    id: 'c1',
    name: 'ВАЗ-2101 «Копейка»',
    class: 'bucket',
    purchase: '500',
    buyout: '600',
    defect: { kind: 'perfect', desc: 'Идеальное состояние' },
    status: 'ready',
    taxiMult: '50',
  },
  {
    id: 'c2',
    name: 'Волга ГАЗ-24',
    class: 'beaten',
    purchase: '1200',
    buyout: '1400',
    defect: { kind: 'fixed', repair: '400', desc: 'Поломка подвески' },
    status: 'broken',
    taxiMult: '100',
  },
  {
    id: 'c5',
    name: 'Ford Focus II',
    class: 'beaten',
    purchase: '1500',
    buyout: '2300',
    defect: { kind: 'roll', multiplier: '100', desc: 'Помято крыло и бампер' },
    status: 'broken',
    taxiMult: '100',
  },
  {
    id: 'c6',
    name: 'ВАЗ-2109 «Девятка»',
    class: 'bucket',
    purchase: '700',
    buyout: '1050',
    defect: { kind: 'raspil', repair: '300', desc: 'Скрытый распил (швы под шпаклёвкой)' },
    status: 'broken',
    taxiMult: '50',
  },
  {
    id: 'c7',
    name: 'ГАЗ-21 «Волга»',
    class: 'retro',
    purchase: '8000',
    buyout: '13500',
    defect: { kind: 'perfect', desc: 'Музейное состояние' },
    status: 'in_rent',
    taxiMult: '0',
    rentSteps: 3,
  },
];

const MOCK_OPPONENTS: PlayerState[] = [
  {
    id: '2',
    name: 'Маша',
    cash: '900',
    position: 5,
    cars: [
      {
        id: 'c3',
        name: 'Жигули',
        class: 'bucket',
        purchase: '400',
        buyout: '500',
        defect: { kind: 'perfect' },
        status: 'ready',
        taxiMult: '1',
      },
    ],
    loans: [],
    missedLaps: 0,
    bankrupt: false,
    turnCount: 4,
  },
  {
    id: '3',
    name: 'Олег',
    cash: '2400',
    position: 0,
    cars: [
      {
        id: 'c4',
        name: 'Чайка',
        class: 'premium',
        purchase: '3500',
        buyout: '4000',
        defect: { kind: 'perfect' },
        status: 'in_rent',
        taxiMult: '3',
      },
    ],
    loans: [],
    missedLaps: 0,
    bankrupt: false,
    turnCount: 4,
  },
];

const MOCK_ME: PlayerState = {
  id: '1',
  name: 'Вы',
  cash: '1600',
  position: 1,
  cars: MOCK_CARS,
  loans: [],
  missedLaps: 0,
  bankrupt: false,
  turnCount: 4,
};

export function MockTable() {
  const [selectedCarId, setSelectedCarId] = useState<string | null>('c1');
  const [devPhase, setDevPhase] = useState<'choose_move' | 'resolve_cell'>('choose_move');
  const [devCash, setDevCash] = useState(1600);
  const [devCars, setDevCars] = useState<CarState[]>(MOCK_CARS);

  const me = { ...MOCK_ME, cash: String(devCash), cars: devCars };
  const room: RoomState = {
    id: 'room-dev',
    players: [me, ...MOCK_OPPONENTS],
    turn: 0,
    phase: { name: 'choose_move' },
    decks: { bucket: [], beaten: [], premium: [], retro: [] },
    discards: { bucket: [], beaten: [], premium: [], retro: [] },
    timerExpiresAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
  };
  const phase: PhaseState =
    devPhase === 'choose_move'
      ? { name: 'choose_move' }
      : { name: 'resolve_cell', cell: 'beaten' };

  return (
    <TableLayout
      hud={
        <Hud
          isMyTurn
          activePlayerName={me.name}
          cash={me.cash}
          turnNumber={1}
        />
      }
      opponents={<OpponentsBar opponents={MOCK_OPPONENTS} currentTurnPlayerId={me.id} />}
      track={
        <TrackWheel
          players={room.players}
          currentTurnPlayerId={me.id}
          activeCellIndex={me.position}
          phaseName={devPhase === 'choose_move' ? 'ВЫБОР ШАГА' : 'ДЕЙСТВИЕ КЛЕТКИ'}
          lapNumber={1}
        />
      }
      garage={
        <GarageBar
          cars={me.cars}
          selectedCarId={selectedCarId}
          onSelectCar={setSelectedCarId}
          onCarAction={(action, car) => {
            if (action === 'repair') {
              const cost =
                car.defect.kind === 'fixed'
                  ? Number(car.defect.repair)
                  : car.defect.kind === 'raspil' && car.defect.repair
                    ? Number(car.defect.repair)
                    : 0;
              setDevCash((prev) => Math.max(0, prev - cost));
              setDevCars((prev) =>
                prev.map((item) => (item.id === car.id ? { ...item, status: 'ready' } : item)),
              );
              return;
            }
            if (action === 'scrap') {
              setDevCash((prev) => prev + 50);
              setDevCars((prev) => prev.filter((item) => item.id !== car.id));
              return;
            }
            if (action === 'buyout') {
              const payout = car.defect.kind === 'raspil' ? Number(car.purchase) : Number(car.buyout);
              setDevCash((prev) => prev + payout);
              setDevCars((prev) => prev.filter((item) => item.id !== car.id));
            }
          }}
        />
      }
      dock={
        <Dock
          phase={phase}
          isMyTurn
          onMove={(steps) => {
            const stepCost = steps > 2 ? (steps - 2) * 300 : 0;
            setDevCash((prev) => Math.max(0, prev - stepCost));
            setDevPhase('resolve_cell');
          }}
          onPass={() => setDevPhase('choose_move')}
          onTaxi={() => {
            setDevCash((prev) => prev + 200);
            setDevPhase('choose_move');
          }}
          onAction={() => setDevPhase('choose_move')}
          opponents={MOCK_OPPONENTS}
          lenderCash={me.cash}
          actionTitle="Купить авто (Битьё 1 200 €)"
          cellTitle="Битьё (Клетка 1)"
        />
      }
    />
  );
}
