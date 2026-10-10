import { add, canPay, sub, euro, type Euro } from "./money.ts";
import { RuleError } from "./turn.ts";
import { GARAGE_CAP, type AuctionState, type Car, type Player, type Room } from "./types.ts";

export const AUCTION_TIMEOUT_SEC = 10;
export const BID_STEPS: Euro[] = [euro(100), euro(500)];

const playerById = (room: Room, id: string): Player => {
  const p = room.players.find((x) => x.id === id);
  if (!p) throw new RuleError("player not found");
  return p;
};

/** Initiates an auction for a car. Eligible bidders are non-bankrupt players with garage space. */
export const startAuction = (room: Room, car: Car): Room => {
  const eligible = room.players.filter(
    (p) => !p.bankrupt && p.cars.length < GARAGE_CAP,
  );
  if (eligible.length === 0) {
    // Nobody can buy: return car to bottom of deck/discard
    return {
      ...room,
      discards: { ...room.discards, [car.class]: [...room.discards[car.class], car] },
    };
  }

  const state: AuctionState = {
    car,
    highestBid: car.purchase, // starting price: card nominal
    highestBidderId: null,
    currentTurnPlayerId: eligible[0]!.id,
    activePlayerIds: eligible.map((p) => p.id),
  };

  return {
    ...room,
    phase: { name: "auction", state },
    updatedAt: Date.now(),
  };
};

/** Places a bid (+100 or +500). Raises highestBid, passes turn to next active bidder. */
export const applyBid = (room: Room, bidderId: string, step: Euro): Room => {
  if (room.phase.name !== "auction") throw new RuleError("not in auction");
  const state = room.phase.state;
  if (state.currentTurnPlayerId !== bidderId) throw new RuleError("not your auction turn");

  if (!BID_STEPS.includes(step)) throw new RuleError("invalid bid step");
  const newBid = add(state.highestBid, step);
  const bidder = playerById(room, bidderId);
  if (!canPay(bidder.cash, newBid)) throw new RuleError("cannot pay bid amount");

  // Advance currentTurnPlayerId to next active bidder
  const currentIndex = state.activePlayerIds.indexOf(bidderId);
  const nextIndex = (currentIndex + 1) % state.activePlayerIds.length;
  const nextPlayerId = state.activePlayerIds[nextIndex]!;

  return {
    ...room,
    phase: {
      name: "auction",
      state: {
        ...state,
        highestBid: newBid,
        highestBidderId: bidderId,
        currentTurnPlayerId: nextPlayerId,
      },
    },
    updatedAt: Date.now(),
  };
};

/** Pass in auction. Removes player from active bidders. If 0 or 1 left, concludes auction. */
export const applyAuctionPass = (room: Room, playerId: string): { room: Room; ended: boolean } => {
  if (room.phase.name !== "auction") throw new RuleError("not in auction");
  const state = room.phase.state;
  if (state.currentTurnPlayerId !== playerId) throw new RuleError("not your auction turn");

  const remainingIds = state.activePlayerIds.filter((id) => id !== playerId);

  // If no bidders left or only the highest bidder remains, auction ends
  if (remainingIds.length === 0 || (remainingIds.length === 1 && state.highestBidderId === remainingIds[0])) {
    return { room: concludeAuction(room), ended: true };
  }

  // Next active bidder
  const currentIndex = state.activePlayerIds.indexOf(playerId);
  const nextIndex = currentIndex % remainingIds.length;
  const nextPlayerId = remainingIds[nextIndex]!;

  return {
    room: {
      ...room,
      phase: {
        name: "auction",
        state: {
          ...state,
          activePlayerIds: remainingIds,
          currentTurnPlayerId: nextPlayerId,
        },
      },
      updatedAt: Date.now(),
    },
    ended: false,
  };
};

/** Finalizes auction: charges highest bidder and awards car, or discards if no bids. */
export const concludeAuction = (room: Room): Room => {
  if (room.phase.name !== "auction") throw new RuleError("not in auction");
  const state = room.phase.state;
  const car = state.car;

  if (!state.highestBidderId) {
    // Everyone passed from the start: car goes to discards
    return {
      ...room,
      discards: { ...room.discards, [car.class]: [...room.discards[car.class], car] },
      phase: { name: "end_turn" },
      updatedAt: Date.now(),
    };
  }

  const winner = playerById(room, state.highestBidderId);
  const boughtCar: Car = {
    ...car,
    status: car.defect.kind === "perfect" ? "ready" : "broken",
  };

  const updatedWinner: Player = {
    ...winner,
    cash: sub(winner.cash, state.highestBid),
    cars: [...winner.cars, boughtCar],
  };

  return {
    ...room,
    players: room.players.map((p) => (p.id === winner.id ? updatedWinner : p)),
    phase: { name: "end_turn" },
    updatedAt: Date.now(),
  };
};
