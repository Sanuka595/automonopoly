import type { Cell, PhaseState, RoomState } from './types.ts';

const ERROR_RU: Record<string, string> = {
  'cell is full': 'Клетка занята',
  'cannot pay the jump': 'Не хватает на прыжок',
  'not your turn': 'Сейчас не ваш ход',
  'garage full': 'Гараж полон',
  'cannot pay purchase': 'Не хватает на покупку',
  'cannot pay repair': 'Не хватает на ремонт',
  'not broken': 'Машина не сломана',
  'not sellable': 'Эту машину нельзя продать',
  'car not in garage': 'Машины нет в гараже',
  'only broken cars can be scrapped': 'В чермет только сломанные',
  'scrap only on service or buyout': 'Чермет только на сервисе или скупке',
  'class cannot taxi': 'Ретро нельзя сдать в такси',
  'lobby is full': 'Лобби заполнено',
  'only lobby host can start': 'Старт только у хоста',
  'need at least 3 players': 'Нужно минимум 3 игрока',
  'nothing to rent': 'Нечего сдавать в прокат',
  'not on service': 'Вы не на автосервисе',
  'car not on offer': 'Авто нет на витрине',
  'overdue debt blocks buying': 'Просроченный долг блокирует покупку',
  unauthenticated: 'Нет авторизации',
  'Socket not connected': 'Нет связи со столом',
};

export function errorLabel(error: string): string {
  const gloss = ERROR_RU[error];
  return gloss ? `${gloss} · ${error}` : error;
}

export function phaseLabel(phase: PhaseState): string {
  switch (phase.name) {
    case 'choose_move':
      return 'ВЫБОР ШАГА';
    case 'resolve_cell':
      return 'ДЕЙСТВИЕ КЛЕТКИ';
    case 'auction':
      return 'АУКЦИОН';
    case 'race':
      return 'ГОНКА';
    case 'end_turn':
      return 'КОНЕЦ ХОДА';
    case 'finished':
      return 'ФИНИШ';
    case 'lobby':
      return 'ЛОББИ';
  }
}

const CELL_TITLE: Record<Cell, string> = {
  buckets: 'Вёдра',
  beaten: 'Битьё',
  premium: 'Премиум',
  retro: 'Ретро',
  picker: 'Автоподбор',
  service: 'Автосервис',
  buyout: 'Скупка',
  rent: 'Прокат',
  race: 'Гонка',
};

export function cellTitle(cell: Cell): string {
  return CELL_TITLE[cell];
}

export type CarAction = 'repair' | 'scrap' | 'buyout';

export function allowedCarActions(phase: PhaseState, isMyTurn: boolean): CarAction[] {
  if (!isMyTurn || phase.name !== 'resolve_cell') return [];
  if (phase.cell === 'service') return ['repair', 'scrap'];
  if (phase.cell === 'buyout') return ['scrap', 'buyout'];
  return [];
}

export function shopOffer(room: RoomState) {
  if (room.phase.name !== 'resolve_cell') return null;
  const cell = room.phase.cell;
  if (cell === 'buckets') return room.decks.bucket[0] ?? null;
  if (cell === 'beaten') return room.decks.beaten[0] ?? null;
  if (cell === 'premium') return room.decks.premium[0] ?? null;
  return null;
}

export function playerIdFromInitData(initData: string): string | null {
  const userRaw = new URLSearchParams(initData).get('user');
  if (!userRaw) return null;
  try {
    const user = JSON.parse(userRaw) as { id?: number | string };
    return user.id == null ? null : String(user.id);
  } catch {
    return null;
  }
}

export function seatHref(playerId: string, roomId: string): string {
  const params = new URLSearchParams(window.location.search);
  params.set('p', playerId);
  params.set('room', roomId);
  params.delete('mock');
  return `${window.location.pathname}?${params.toString()}`;
}
