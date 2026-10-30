import type { Room } from './types'

export function getMockRoom(stateNum: number): Room {
  const carsPlayer1 = [
    {
      id: 'c1',
      name: 'Копейка',
      class: 'bucket' as const,
      purchase: '500',
      buyout: '600',
      defect: { kind: 'perfect' as const, desc: 'Идеальное состояние' },
      status: 'ready' as const,
      taxiMult: '1',
    },
    {
      id: 'c2',
      name: 'Волга ГАЗ-24',
      class: 'beaten' as const,
      purchase: '1200',
      buyout: '1400',
      defect: { kind: 'fixed' as const, repair: '400', desc: 'Вмятина на крыле' },
      status: 'broken' as const,
      taxiMult: '2',
    },
    {
      id: 'c3',
      name: 'Чайка',
      class: 'premium' as const,
      purchase: '3500',
      buyout: '4000',
      defect: { kind: 'perfect' as const, desc: 'Идеальное' },
      status: 'in_rent' as const,
      taxiMult: '3',
      rentSteps: 3,
    },
  ]

  const players = [
    {
      id: '1',
      name: 'Вы',
      cash: '1600',
      position: stateNum === 3 ? 5 : stateNum === 4 ? 6 : 1,
      cars: carsPlayer1,
      loans: [],
      missedLaps: 0,
      bankrupt: false,
      turnCount: 14,
    },
    {
      id: '2',
      name: 'Маша',
      cash: '900',
      position: stateNum === 3 ? 8 : stateNum === 4 ? 8 : 5,
      cars: [carsPlayer1[0]],
      loans: [],
      missedLaps: 0,
      bankrupt: false,
      turnCount: 14,
    },
    {
      id: '3',
      name: 'Олег',
      cash: '2400',
      position: stateNum === 3 ? 0 : stateNum === 4 ? 0 : 5,
      cars: [carsPlayer1[0], carsPlayer1[1], carsPlayer1[2], carsPlayer1[0]],
      loans: [{ id: 'l1', lenderId: '1', borrowerId: '3', principal: '300', due: '400', turnsLeft: 2, overdue: true }],
      missedLaps: 0,
      bankrupt: false,
      turnCount: 14,
    },
    {
      id: '4',
      name: 'Антон',
      cash: '1100',
      position: stateNum === 4 ? 3 : 7,
      cars: [carsPlayer1[0], carsPlayer1[1]],
      loans: [{ id: 'l2', lenderId: '1', borrowerId: '4', principal: '500', due: '600', turnsLeft: 1, overdue: false }],
      missedLaps: 0,
      bankrupt: false,
      turnCount: 14,
    },
  ]

  const now = Date.now()

  if (stateNum === 1) {
    return {
      id: 'room1',
      players,
      turn: 3, // Антон
      phase: { name: 'choose_move' },
      decks: {
        bucket: [carsPlayer1[0]],
        beaten: [carsPlayer1[1]],
        premium: [carsPlayer1[2]],
        retro: [carsPlayer1[2]],
      },
      discards: { bucket: [], beaten: [], premium: [], retro: [] },
      timerExpiresAt: now + 14000,
      updatedAt: now,
    }
  }

  if (stateNum === 3) {
    return {
      id: 'room1',
      players,
      turn: 0, // Вы
      phase: { name: 'resolve_cell', cell: 'service' },
      decks: {
        bucket: [carsPlayer1[0]],
        beaten: [carsPlayer1[1]],
        premium: [carsPlayer1[2]],
        retro: [carsPlayer1[2]],
      },
      discards: { bucket: [], beaten: [], premium: [], retro: [] },
      timerExpiresAt: now + 21000,
      updatedAt: now,
    }
  }

  if (stateNum === 4) {
    return {
      id: 'room1',
      players,
      turn: 0,
      phase: {
        name: 'auction',
        state: {
          car: {
            id: 'retro1',
            name: 'ЗИС-110',
            class: 'retro',
            purchase: '3500',
            buyout: '4000',
            defect: { kind: 'perfect' },
            status: 'ready',
            taxiMult: '0',
          },
          highestBid: '3500',
          highestBidderId: '2', // Маша
          currentTurnPlayerId: '1', // Вы
          activePlayerIds: ['1', '2', '4'],
        },
      },
      decks: {
        bucket: [carsPlayer1[0]],
        beaten: [carsPlayer1[1]],
        premium: [carsPlayer1[2]],
        retro: [carsPlayer1[2]],
      },
      discards: { bucket: [], beaten: [], premium: [], retro: [] },
      timerExpiresAt: now + 4000,
      updatedAt: now,
    }
  }

  // Default state 2: My turn, choose_move
  return {
    id: 'room1',
    players,
    turn: 0, // Вы
    phase: { name: 'choose_move' },
    decks: {
      bucket: [carsPlayer1[0]],
      beaten: [carsPlayer1[1]],
      premium: [carsPlayer1[2]],
      retro: [carsPlayer1[2]],
    },
    discards: { bucket: [], beaten: [], premium: [], retro: [] },
    timerExpiresAt: now + 14000,
    updatedAt: now,
  }
}
