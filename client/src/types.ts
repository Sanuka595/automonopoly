export type CarClass = 'bucket' | 'beaten' | 'premium' | 'retro'
export type CarStatus = 'broken' | 'ready' | 'in_rent'

export type Defect =
  | { kind: 'fixed'; repair: string }
  | { kind: 'roll'; multiplier: string }
  | { kind: 'perfect' }
  | { kind: 'raspil' }

export type Car = {
  id: string
  class: CarClass
  purchase: string
  buyout: string
  defect: Defect
  status: CarStatus
  taxiMult: string
  rentSteps?: number
}

export type Loan = {
  id: string
  lenderId: string
  borrowerId: string
  principal: string
  due: string
  turnsLeft: number
  overdue: boolean
}

export type Player = {
  id: string
  name: string
  cash: string
  position: number
  cars: Car[]
  loans: Loan[]
  missedLaps: number
  bankrupt: boolean
  turnCount: number
}

export type Cell =
  | 'buckets'
  | 'beaten'
  | 'premium'
  | 'retro'
  | 'picker'
  | 'service'
  | 'buyout'
  | 'rent'
  | 'race'

export type AuctionState = {
  car: Car
  highestBid: string
  highestBidderId: string | null
  currentTurnPlayerId: string
  activePlayerIds: string[]
}

export type RaceState = {
  initiatorId: string
  targetId: string
  stake: string
  pool: string
  status: 'invitation' | 'pool_entry' | 'rolling'
  participants: string[]
}

export type Phase =
  | { name: 'lobby' }
  | { name: 'choose_move' }
  | { name: 'resolve_cell'; cell: Cell }
  | { name: 'auction'; state: AuctionState }
  | { name: 'race'; state: RaceState }
  | { name: 'end_turn' }
  | { name: 'finished'; winnerId: string }

export type Room = {
  id: string
  players: Player[]
  turn: number
  phase: Phase
  decks: Record<CarClass, Car[]>
  discards: Record<CarClass, Car[]>
  updatedAt: number
}

export type Intent =
  | { type: 'move'; steps: 1 | 2 | 3 | 4 }
  | { type: 'buy'; carId: string }
  | { type: 'repair'; carId: string }
  | { type: 'buyout'; carId: string }
  | { type: 'rent' }
  | { type: 'race_invite'; targetId: string; stake: string }
  | { type: 'race_accept' }
  | { type: 'race_forfeit' }
  | { type: 'race_join_pool' }
  | { type: 'bid'; step: string }
  | { type: 'pass' }
  | { type: 'taxi'; carId: string }
  | { type: 'loan_offer'; targetId: string; principal: string; due: string; turns: number }
  | { type: 'loan_accept'; loanId: string }
