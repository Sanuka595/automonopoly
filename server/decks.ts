import { euro } from "./money.ts";
import { d6, shuffle } from "./rng.ts";
import type { Car, CarClass, Defect, Player, Room } from "./types.ts";

export const START_CASH = euro(1_600);

export const BUCKET_CATALOG: Omit<Car, "id" | "defect" | "status">[] = [
  { class: "bucket", purchase: euro(400), buyout: euro(600), taxiMult: euro(50) },
  { class: "bucket", purchase: euro(600), buyout: euro(900), taxiMult: euro(50) },
  { class: "bucket", purchase: euro(800), buyout: euro(1_100), taxiMult: euro(50) },
  { class: "bucket", purchase: euro(1_000), buyout: euro(1_300), taxiMult: euro(50) },
];

export const BEATEN_CATALOG: Omit<Car, "id" | "defect" | "status">[] = [
  { class: "beaten", purchase: euro(1_500), buyout: euro(2_200), taxiMult: euro(100) },
  { class: "beaten", purchase: euro(2_200), buyout: euro(3_100), taxiMult: euro(100) },
  { class: "beaten", purchase: euro(3_000), buyout: euro(4_000), taxiMult: euro(100) },
  { class: "beaten", purchase: euro(3_500), buyout: euro(4_600), taxiMult: euro(100) },
];

export const PREMIUM_CATALOG: Omit<Car, "id" | "defect" | "status">[] = [
  { class: "premium", purchase: euro(5_000), buyout: euro(7_500), taxiMult: euro(200) },
  { class: "premium", purchase: euro(7_000), buyout: euro(10_000), taxiMult: euro(200) },
  { class: "premium", purchase: euro(8_500), buyout: euro(12_000), taxiMult: euro(200) },
  { class: "premium", purchase: euro(10_000), buyout: euro(14_000), taxiMult: euro(200) },
];

export const RETRO_CATALOG: Omit<Car, "id" | "defect" | "status">[] = [
  { class: "retro", purchase: euro(8_000), buyout: euro(13_000), taxiMult: euro(0) },
  { class: "retro", purchase: euro(10_000), buyout: euro(16_000), taxiMult: euro(0) },
  { class: "retro", purchase: euro(12_000), buyout: euro(19_000), taxiMult: euro(0) },
];

const BUCKET_DEFECTS: Defect[] = [
  { kind: "fixed", repair: euro(200) },
  { kind: "fixed", repair: euro(300) },
  { kind: "fixed", repair: euro(400) },
  { kind: "fixed", repair: euro(600) },
  { kind: "perfect" },
  { kind: "raspil" },
];

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}_${Date.now()}_${++idCounter}`;

export const makeBucketDeck = (): Car[] =>
  shuffle(
    BUCKET_CATALOG.flatMap((spec, i) =>
      BUCKET_DEFECTS.map((defect, di) => ({
        ...spec,
        id: `bucket_${i}_${di}_${nextId("c")}`,
        defect,
        status: "broken" as const,
      })),
    ),
  );

export const makeBeatenDeck = (): Car[] =>
  shuffle(
    BEATEN_CATALOG.flatMap((spec, i) =>
      [100, 200, 300, 400].map((mult, di) => ({
        ...spec,
        id: `beaten_${i}_${di}_${nextId("c")}`,
        defect: { kind: "roll" as const, multiplier: euro(mult) },
        status: "broken" as const,
      })),
    ),
  );

export const makePremiumDeck = (): Car[] =>
  shuffle(
    PREMIUM_CATALOG.flatMap((spec, i) =>
      [euro(1_500), euro(2_500), euro(3_500)].map((rep, di) => ({
        ...spec,
        id: `premium_${i}_${di}_${nextId("c")}`,
        defect: { kind: "fixed" as const, repair: rep },
        status: "broken" as const,
      })),
    ),
  );

export const makeRetroDeck = (): Car[] =>
  shuffle(
    RETRO_CATALOG.map((spec, i) => ({
      ...spec,
      id: `retro_${i}_${nextId("c")}`,
      defect: { kind: "fixed" as const, repair: euro(3_000) },
      status: "broken" as const,
    })),
  );

/** Creates starting car for a player from the bucket deck */
export const dealStartingBucket = (bucketDeck: Car[]): { car: Car; remainingDeck: Car[] } => {
  if (bucketDeck.length === 0) throw new Error("bucket deck exhausted");
  const [car, ...remainingDeck] = bucketDeck;
  if (!car) throw new Error("empty car");
  const defect = car.defect.kind === "perfect" ? "ready" : "broken";
  return { car: { ...car, status: defect }, remainingDeck };
};

/** Rolls order of players using d6. In ties, rerolls tied participants until distinct sequence. */
export const rollTurnOrder = <T>(participants: T[]): T[] => {
  if (participants.length <= 1) return [...participants];

  type Entry = { item: T; roll: number };
  let current: T[] = [...participants];
  const ordered: T[] = [];

  while (current.length > 0) {
    if (current.length === 1) {
      const last = current[0];
      if (last) ordered.push(last);
      break;
    }

    // Roll d6 for each in current
    const rolls: Entry[] = current.map((item) => ({ item, roll: d6() }));
    const maxRoll = Math.max(...rolls.map((r) => r.roll));
    const highest = rolls.filter((r) => r.roll === maxRoll);

    if (highest.length === 1) {
      const winner = highest[0]?.item;
      if (winner) {
        ordered.push(winner);
        current = current.filter((x) => x !== winner);
      }
    } else {
      // Tie for first place: reroll only the tied ones in next iteration to place top first
      const tiedWinners = rollTurnOrder(highest.map((h) => h.item));
      const firstTied = tiedWinners[0];
      if (firstTied) {
        ordered.push(firstTied);
        current = current.filter((x) => x !== firstTied);
      }
    }
  }

  return ordered;
};

/** Initializes a started game room from lobby players. */
export const initGame = (
  roomId: string,
  lobbyUsers: { id: string; name: string }[],
): Room => {
  let bucketDeck = makeBucketDeck();
  const beatenDeck = makeBeatenDeck();
  const premiumDeck = makePremiumDeck();
  const retroDeck = makeRetroDeck();

  const orderedUsers = rollTurnOrder(lobbyUsers);

  const players: Player[] = orderedUsers.map((user) => {
    const { car, remainingDeck } = dealStartingBucket(bucketDeck);
    bucketDeck = remainingDeck;
    return {
      id: user.id,
      name: user.name,
      cash: START_CASH,
      position: 0,
      cars: [car],
      loans: [],
      missedLaps: 0,
      bankrupt: false,
      turnCount: 0,
    };
  });

  return {
    id: roomId,
    players,
    turn: 0,
    phase: { name: "choose_move" },
    decks: {
      bucket: bucketDeck,
      beaten: beatenDeck,
      premium: premiumDeck,
      retro: retroDeck,
    },
    discards: {
      bucket: [],
      beaten: [],
      premium: [],
      retro: [],
    },
    updatedAt: Date.now(),
  };
};
