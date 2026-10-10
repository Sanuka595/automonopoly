import type { Euro } from "./money.ts";
import type { Cell } from "./track.ts";

export type CarClass = "bucket" | "beaten" | "premium" | "retro";
export type CarStatus = "broken" | "ready" | "in_rent";

export type Defect =
  | { kind: "fixed"; repair: Euro }
  | { kind: "roll"; multiplier: Euro } // beaten: repair = d6 * multiplier
  | { kind: "perfect" } // ready immediately
  | { kind: "raspil" }; // buyout pays purchase price, margin 0

export type Car = {
  id: string;
  class: CarClass;
  purchase: Euro;
  buyout: Euro;
  defect: Defect;
  status: CarStatus;
  taxiMult: Euro; // 0 for retro: rules give no taxi multiplier
  // Set when the car is handed to rent. Cleared when it returns to ready.
  rentSteps?: number;
};

export type Loan = {
  id: string;
  lenderId: string;
  borrowerId: string;
  principal: Euro;
  due: Euro;
  // Personal turns of the borrower still left. Decremented on their end_turn.
  // Collection runs on the end_turn where this hits 0.
  turnsLeft: number;
  overdue: boolean;
};

export type Player = {
  id: string; // Telegram user id, taken only from verified initData
  name: string;
  cash: Euro;
  position: number;
  cars: Car[]; // max 3
  loans: Loan[]; // debts this player owes
  missedLaps: number;
  bankrupt: boolean;
  turnCount: number;
};

export type Phase =
  | { name: "lobby" }
  | { name: "choose_move" }
  | { name: "resolve_cell"; cell: Cell }
  | { name: "auction" }
  | { name: "race" }
  | { name: "loan_offer" }
  | { name: "end_turn" }
  | { name: "finished"; winnerId: string };

export type Room = {
  id: string;
  players: Player[]; // seat order is turn order
  turn: number; // index into players
  phase: Phase;
  decks: Record<CarClass, Car[]>;
  discards: Record<CarClass, Car[]>;
  updatedAt: number;
};

export type Intent =
  | { type: "move"; steps: 1 | 2 | 3 | 4 }
  | { type: "buy"; carId: string }
  | { type: "repair"; carId: string }
  | { type: "rent" }
  | { type: "race_invite"; targetId: string; stake: Euro }
  | { type: "bid"; step: Euro }
  | { type: "pass" }
  | { type: "taxi"; carId: string };

export const GARAGE_CAP = 3;
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 4;
