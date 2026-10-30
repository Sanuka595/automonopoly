// Client-server contract types based on docs/API_AND_STATE.md
// All monetary amounts are serialized as string (BigInt representation on server).

export type CarClass = 'bucket' | 'beaten' | 'premium' | 'retro';

export type CarStatus = 'broken' | 'ready' | 'in_rent';

export type Cell =
  | 'buckets'
  | 'beaten'
  | 'premium'
  | 'retro'
  | 'picker'
  | 'service'
  | 'buyout'
  | 'rent'
  | 'race';

export type DefectState =
  | { kind: 'fixed'; repair: string; desc?: string }
  | { kind: 'roll'; multiplier: string; desc?: string }
  | { kind: 'perfect'; desc?: string }
  | { kind: 'raspil'; repair?: string; desc?: string };

export interface CarState {
  id: string;
  name?: string;
  class: CarClass;
  purchase: string;
  buyout: string;
  defect: DefectState;
  status: CarStatus;
  taxiMult: string;
  rentSteps?: number;
}

export interface LoanState {
  id: string;
  lenderId: string;
  borrowerId: string;
  principal: string;
  due: string;
  turnsLeft: number;
  overdue: boolean;
}

export interface PendingLoanState {
  id: string;
  lenderId: string;
  borrowerId: string;
  principal: string;
  due: string;
  turns: number;
}

export interface PlayerState {
  id: string;
  name: string;
  cash: string;
  position: number;
  cars: CarState[];
  loans: LoanState[];
  missedLaps: number;
  bankrupt: boolean;
  turnCount: number;
}

export interface AuctionState {
  car: CarState;
  highestBid: string;
  highestBidderId: string | null;
  currentTurnPlayerId: string;
  activePlayerIds: string[];
}

export interface RaceState {
  initiatorId: string;
  targetId: string;
  stake: string;
  pool: string;
  status: 'invitation' | 'pool_entry' | 'rolling';
  participants: string[];
  rolls?: Record<string, number>;
  tieContenders?: string[];
  winnerId?: string;
}

export type PhaseState =
  | { name: 'lobby' }
  | { name: 'choose_move' }
  | { name: 'resolve_cell'; cell: Cell }
  | { name: 'auction'; state: AuctionState }
  | { name: 'race'; state: RaceState }
  | { name: 'end_turn' }
  | { name: 'finished'; winnerId: string };

export interface RoomState {
  id: string;
  players: PlayerState[];
  turn: number;
  phase: PhaseState;
  decks: Record<CarClass, CarState[]>;
  discards: Record<CarClass, CarState[]>;
  pendingLoan?: PendingLoanState | null;
  timerExpiresAt?: number;
  updatedAt: number;
}

export interface LobbyUser {
  id: string;
  name: string;
  socketId?: string;
}

export type Intent =
  | { type: 'move'; steps: 1 | 2 | 3 | 4 }
  | { type: 'buy'; carId: string }
  | { type: 'repair'; carId: string }
  | { type: 'scrap'; carId: string }
  | { type: 'buyout'; carId: string }
  | { type: 'rent' }
  | { type: 'taxi'; carId: string }
  | { type: 'pass' }
  | { type: 'bid'; step: '100' | '500' }
  | { type: 'start_auction' }
  | { type: 'race_invite'; targetId: string; stake: string }
  | { type: 'race_accept' }
  | { type: 'race_forfeit' }
  | { type: 'race_join_pool' }
  | { type: 'loan_offer'; targetId: string; principal: string; due: string; turns: number }
  | { type: 'loan_accept'; loanId: string }
  | { type: 'loan_reject' };

export interface AuthResponse {
  ok: boolean;
  state?: 'lobby' | 'playing';
  error?: string;
}

export interface IntentResponse {
  ok: boolean;
  error?: string;
  rolled?: number;
}
