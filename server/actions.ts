import { add, canPay, RENT_PAY, sub, TAXI_MULT, type Euro } from "./money.ts";
import { TRACK_LEN, type Cell } from "./track.ts";
import { GARAGE_CAP, type Car, type CarClass, type Player, type Room } from "./types.ts";
import { RuleError, hasOverdueDebt } from "./turn.ts";

const seat = (room: Room): Player => {
  const player = room.players[room.turn];
  if (!player) throw new RuleError("no active player");
  return player;
};

const onCell = (room: Room, cell: string): void => {
  if (room.phase.name !== "resolve_cell" || room.phase.cell !== cell) {
    throw new RuleError(`not on ${cell}`);
  }
};

const replace = (room: Room, player: Player): Room => ({
  ...room,
  players: room.players.map((p) => (p.id === player.id ? player : p)),
});

const ownCar = (player: Player, carId: string): Car => {
  const car = player.cars.find((c) => c.id === carId);
  if (!car) throw new RuleError("car not in garage");
  return car;
};

const repairCost = (car: Car, roll: number): Euro => {
  if (car.defect.kind === "fixed") return car.defect.repair;
  if (car.defect.kind === "roll") {
    if (!Number.isInteger(roll) || roll < 1 || roll > 6) throw new RuleError("d6 out of range");
    return car.defect.multiplier * BigInt(roll);
  }
  throw new RuleError("nothing to repair");
};

/** Any number of cars, one call each. `roll` is the server d6 for beaten cars. */
export const applyRepair = (room: Room, carId: string, roll = 0): Room => {
  onCell(room, "service");
  const player = seat(room);
  const car = ownCar(player, carId);
  if (car.status !== "broken") throw new RuleError("not broken");
  const cost = repairCost(car, roll);
  if (!canPay(player.cash, cost)) throw new RuleError("cannot pay repair");
  return replace(room, {
    ...player,
    cash: sub(player.cash, cost),
    cars: player.cars.map((c) => (c.id === carId ? { ...c, status: "ready" } : c)),
  });
};

const buyoutPay = (car: Car): Euro => (car.defect.kind === "raspil" ? car.purchase : car.buyout);

/** ready and in_rent both sell. broken does not. Frees the garage slot. */
export const applyBuyout = (room: Room, carId: string): Room => {
  onCell(room, "buyout");
  const player = seat(room);
  const car = ownCar(player, carId);
  if (car.status === "broken") throw new RuleError("not sellable");
  return {
    ...replace(room, {
      ...player,
      cash: add(player.cash, buyoutPay(car)),
      cars: player.cars.filter((c) => c.id !== carId),
    }),
    discards: { ...room.discards, [car.class]: [...room.discards[car.class], car] },
  };
};

/**
 * Pays every eligible car once and starts its cooldown.
 * A car already in_rent pays again only after a full lap of steps.
 * Retro never rents. No eligible car is an error, not a free pass.
 */
export const applyRent = (room: Room): Room => {
  onCell(room, "rent");
  const player = seat(room);
  let cash = player.cash;
  let paid = 0;
  const cars = player.cars.map((car) => {
    if (car.class === "retro") return car;
    const cooled = car.status === "in_rent" && (car.rentSteps ?? 0) >= TRACK_LEN;
    if (car.status !== "ready" && !cooled) return car;
    cash = add(cash, RENT_PAY[car.class]);
    paid += 1;
    return { ...car, status: "in_rent" as const, rentSteps: 0 };
  });
  if (paid === 0) throw new RuleError("nothing to rent");
  return replace(room, { ...player, cash, cars });
};

/** Taxi replaces the cell action. Broken cars are allowed. Retro is not. */
export const applyTaxi = (room: Room, carId: string, roll: number): Room => {
  if (room.phase.name !== "resolve_cell") throw new RuleError("not resolving");
  if (!Number.isInteger(roll) || roll < 1 || roll > 6) throw new RuleError("d6 out of range");
  const player = seat(room);
  const car = ownCar(player, carId);
  const mult = TAXI_MULT[car.class as keyof typeof TAXI_MULT];
  if (mult === undefined) throw new RuleError("class cannot taxi");
  return replace(room, { ...player, cash: add(player.cash, mult * BigInt(roll)) });
};

/** Buy from the open deck of the cell the piece stands on. */
export const applyBuy = (room: Room, carId: string): Room => {
  if (room.phase.name !== "resolve_cell") throw new RuleError("not resolving");
  const player = seat(room);
  if (hasOverdueDebt(player)) throw new RuleError("overdue debt blocks buying");
  if (player.cars.length >= GARAGE_CAP) throw new RuleError("garage full");
  const deckKey: Partial<Record<Cell, CarClass>> = {
    buckets: "bucket",
    beaten: "beaten",
    premium: "premium",
  };
  const key = deckKey[room.phase.cell];
  if (key === undefined) throw new RuleError("cell has no deck");
  const deck = room.decks[key];
  const car = deck.find((c) => c.id === carId);
  if (!car) throw new RuleError("car not on offer");
  if (!canPay(player.cash, car.purchase)) throw new RuleError("cannot pay purchase");
  const bought: Car = { ...car, status: car.defect.kind === "perfect" ? "ready" : "broken" };
  return {
    ...replace(room, {
      ...player,
      cash: sub(player.cash, car.purchase),
      cars: [...player.cars, bought],
    }),
    decks: { ...room.decks, [key]: deck.filter((c) => c.id !== carId) },
  };
};
