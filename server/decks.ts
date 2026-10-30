import { euro } from "./money.ts";
import { d6, shuffle } from "./rng.ts";
import type { Car, CarClass, CarStatus, Defect, Player, Room } from "./types.ts";

export const START_CASH = euro(1_600);

export const BUCKET_CATALOG: Omit<Car, "id" | "defect" | "status">[] = [
  { name: "ВАЗ-2107 «Семёрка»", class: "bucket", purchase: euro(400), buyout: euro(650), taxiMult: euro(50) },
  { name: "ИЖ-2126 «Ода»", class: "bucket", purchase: euro(450), buyout: euro(700), taxiMult: euro(50) },
  { name: "Москвич-2140", class: "bucket", purchase: euro(500), buyout: euro(750), taxiMult: euro(50) },
  { name: "ВАЗ-2106 «Шаха»", class: "bucket", purchase: euro(550), buyout: euro(800), taxiMult: euro(50) },
  { name: "Daewoo Matiz", class: "bucket", purchase: euro(600), buyout: euro(900), taxiMult: euro(50) },
  { name: "ВАЗ-2109 «Девятка»", class: "bucket", purchase: euro(700), buyout: euro(1_050), taxiMult: euro(50) },
  { name: "ГАЗ-3110 «Волга»", class: "bucket", purchase: euro(800), buyout: euro(1_150), taxiMult: euro(50) },
  { name: "Lada 2114 «Четырка»", class: "bucket", purchase: euro(900), buyout: euro(1_250), taxiMult: euro(50) },
  { name: "Lada Kalina I", class: "bucket", purchase: euro(950), buyout: euro(1_300), taxiMult: euro(50) },
  { name: "Daewoo Nexia", class: "bucket", purchase: euro(1_000), buyout: euro(1_350), taxiMult: euro(50) },
];

export const BEATEN_CATALOG: Omit<Car, "id" | "defect" | "status">[] = [
  { name: "Ford Focus II", class: "beaten", purchase: euro(1_500), buyout: euro(2_300), taxiMult: euro(100) },
  { name: "Hyundai Solaris I", class: "beaten", purchase: euro(1_800), buyout: euro(2_650), taxiMult: euro(100) },
  { name: "Opel Astra H", class: "beaten", purchase: euro(2_000), buyout: euro(2_900), taxiMult: euro(100) },
  { name: "Volkswagen Passat B5", class: "beaten", purchase: euro(2_200), buyout: euro(3_150), taxiMult: euro(100) },
  { name: "Mazda 3 BK", class: "beaten", purchase: euro(2_400), buyout: euro(3_350), taxiMult: euro(100) },
  { name: "Mitsubishi Lancer IX", class: "beaten", purchase: euro(2_500), buyout: euro(3_500), taxiMult: euro(100) },
  { name: "Chevrolet Cruze", class: "beaten", purchase: euro(2_800), buyout: euro(3_850), taxiMult: euro(100) },
  { name: "BMW 3 E46", class: "beaten", purchase: euro(3_000), buyout: euro(4_100), taxiMult: euro(100) },
  { name: "Skoda Octavia Tour", class: "beaten", purchase: euro(3_200), buyout: euro(4_300), taxiMult: euro(100) },
  { name: "Audi A4 B6", class: "beaten", purchase: euro(3_500), buyout: euro(4_700), taxiMult: euro(100) },
];

export const PREMIUM_CATALOG: Omit<Car, "id" | "defect" | "status">[] = [
  { name: "BMW 5 E60", class: "premium", purchase: euro(5_000), buyout: euro(7_600), taxiMult: euro(200) },
  { name: "Mercedes-Benz E W211", class: "premium", purchase: euro(5_500), buyout: euro(8_200), taxiMult: euro(200) },
  { name: "Infiniti FX35", class: "premium", purchase: euro(6_000), buyout: euro(8_900), taxiMult: euro(200) },
  { name: "Lexus GS 300", class: "premium", purchase: euro(6_500), buyout: euro(9_500), taxiMult: euro(200) },
  { name: "BMW X5 E53", class: "premium", purchase: euro(7_000), buyout: euro(10_200), taxiMult: euro(200) },
  { name: "Porsche Cayenne 955", class: "premium", purchase: euro(8_000), buyout: euro(11_800), taxiMult: euro(200) },
  { name: "Range Rover Sport L320", class: "premium", purchase: euro(8_500), buyout: euro(12_500), taxiMult: euro(200) },
  { name: "Mercedes-Benz S W220", class: "premium", purchase: euro(9_000), buyout: euro(13_200), taxiMult: euro(200) },
  { name: "Audi A8 D3", class: "premium", purchase: euro(10_000), buyout: euro(14_500), taxiMult: euro(200) },
];

export const RETRO_CATALOG: Omit<Car, "id" | "defect" | "status">[] = [
  { name: "ГАЗ-21 «Волга»", class: "retro", purchase: euro(8_000), buyout: euro(13_500), taxiMult: euro(0) },
  { name: "Mercedes-Benz W123", class: "retro", purchase: euro(9_000), buyout: euro(15_000), taxiMult: euro(0) },
  { name: "BMW 635 CSi E24", class: "retro", purchase: euro(10_500), buyout: euro(17_000), taxiMult: euro(0) },
  { name: "Chevrolet Corvette C3", class: "retro", purchase: euro(12_000), buyout: euro(19_500), taxiMult: euro(0) },
  { name: "Jaguar E-Type Series 3", class: "retro", purchase: euro(13_500), buyout: euro(21_500), taxiMult: euro(0) },
  { name: "Porsche 911 (930) Turbo", class: "retro", purchase: euro(15_000), buyout: euro(24_000), taxiMult: euro(0) },
];

export const BUCKET_DEFECTS: Defect[] = [
  { kind: "fixed", repair: euro(200), desc: "Пробита прокладка ГБЦ" },
  { kind: "fixed", repair: euro(250), desc: "Течёт радиатор и патрубки" },
  { kind: "fixed", repair: euro(300), desc: "Гнилые пороги и арки" },
  { kind: "fixed", repair: euro(350), desc: "Закисли тормозные суппорты" },
  { kind: "fixed", repair: euro(400), desc: "Убито сцепление и кулиса" },
  { kind: "fixed", repair: euro(500), desc: "Сгорел генератор и проводка" },
  { kind: "fixed", repair: euro(600), desc: "Стучит распредвал в ГБЦ" },
  { kind: "perfect", desc: "Капсула времени (идеальное состояние)" },
  { kind: "raspil", repair: euro(300), desc: "Скрытый распил (швы под шпаклёвкой)" },
];

export const BEATEN_DEFECTS: Defect[] = [
  { kind: "roll", multiplier: euro(100), desc: "Помято крыло и бампер" },
  { kind: "roll", multiplier: euro(150), desc: "Удар в водительскую дверь" },
  { kind: "roll", multiplier: euro(200), desc: "Повело телевизор и капот" },
  { kind: "roll", multiplier: euro(250), desc: "Сработали подушки безопасности" },
  { kind: "roll", multiplier: euro(300), desc: "Пострадал передний лонжерон" },
  { kind: "roll", multiplier: euro(400), desc: "Нарушена геометрия кузова" },
  { kind: "perfect", desc: "Не бита, не крашена (дефектов нет)" },
  { kind: "raspil", repair: euro(500), desc: "Тотал из двух половин" },
];

export const PREMIUM_DEFECTS: Defect[] = [
  { kind: "fixed", repair: euro(1_500), desc: "Задиры в цилиндрах" },
  { kind: "fixed", repair: euro(2_000), desc: "Умерла турбина и ТНВД" },
  { kind: "fixed", repair: euro(2_500), desc: "Сдулась пневмоподвеска" },
  { kind: "fixed", repair: euro(3_000), desc: "Глючит блок управления SAM" },
  { kind: "fixed", repair: euro(3_500), desc: "АКПП встала в аварийный режим" },
  { kind: "fixed", repair: euro(4_500), desc: "Проворот шатунных вкладышей" },
  { kind: "perfect", desc: "Дилерское обслуживание (идеал)" },
  { kind: "raspil", repair: euro(1_000), desc: "Криминальный двойник (перебиты номера)" },
];

export const RETRO_DEFECTS: Defect[] = [
  { kind: "fixed", repair: euro(3_000), desc: "Реставрация карбюраторов и хрома" },
  { kind: "fixed", repair: euro(3_500), desc: "Поиск редких оригинальных запчастей" },
  { kind: "fixed", repair: euro(4_000), desc: "Капитальный ремонт редкого мотора" },
  { kind: "fixed", repair: euro(5_000), desc: "Полный перевар рамы и кузова" },
  { kind: "perfect", desc: "Музейное состояние (100% оригинал)" },
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
        status: (defect.kind === "perfect" ? "ready" : "broken") as CarStatus,
      })),
    ),
  );

export const makeBeatenDeck = (): Car[] =>
  shuffle(
    BEATEN_CATALOG.flatMap((spec, i) =>
      BEATEN_DEFECTS.map((defect, di) => ({
        ...spec,
        id: `beaten_${i}_${di}_${nextId("c")}`,
        defect,
        status: (defect.kind === "perfect" ? "ready" : "broken") as CarStatus,
      })),
    ),
  );

export const makePremiumDeck = (): Car[] =>
  shuffle(
    PREMIUM_CATALOG.flatMap((spec, i) =>
      PREMIUM_DEFECTS.map((defect, di) => ({
        ...spec,
        id: `premium_${i}_${di}_${nextId("c")}`,
        defect,
        status: (defect.kind === "perfect" ? "ready" : "broken") as CarStatus,
      })),
    ),
  );

export const makeRetroDeck = (): Car[] =>
  shuffle(
    RETRO_CATALOG.flatMap((spec, i) =>
      RETRO_DEFECTS.map((defect, di) => ({
        ...spec,
        id: `retro_${i}_${di}_${nextId("c")}`,
        defect,
        status: (defect.kind === "perfect" ? "ready" : "broken") as CarStatus,
      })),
    ),
  );

/** Recycles discard pile into a new shuffled deck when the deck is empty. */
export const recycleDeck = (
  decks: Record<CarClass, Car[]>,
  discards: Record<CarClass, Car[]>,
  carClass: CarClass,
  shuffleFn = shuffle,
): { decks: Record<CarClass, Car[]>; discards: Record<CarClass, Car[]> } => {
  if (decks[carClass].length === 0 && discards[carClass].length > 0) {
    const recycled = shuffleFn(
      discards[carClass].map((c) => ({
        ...c,
        status: (c.defect.kind === "perfect" ? "ready" : "broken") as CarStatus,
        rentSteps: 0,
      })),
    );
    return {
      decks: { ...decks, [carClass]: recycled },
      discards: { ...discards, [carClass]: [] },
    };
  }
  return { decks, discards };
};

/** Checks all 4 decks; reshuffles discards into any deck that has 0 cards. */
export const recycleAllEmptyDecks = (
  decks: Record<CarClass, Car[]>,
  discards: Record<CarClass, Car[]>,
  shuffleFn = shuffle,
): { decks: Record<CarClass, Car[]>; discards: Record<CarClass, Car[]> } => {
  let nextDecks = decks;
  let nextDiscards = discards;
  for (const carClass of ["bucket", "beaten", "premium", "retro"] as CarClass[]) {
    if (nextDecks[carClass].length === 0 && nextDiscards[carClass].length > 0) {
      if (nextDecks === decks) nextDecks = { ...decks };
      if (nextDiscards === discards) nextDiscards = { ...discards };
      nextDecks[carClass] = shuffleFn(
        nextDiscards[carClass].map((c) => ({
          ...c,
          status: (c.defect.kind === "perfect" ? "ready" : "broken") as CarStatus,
          rentSteps: 0,
        })),
      );
      nextDiscards[carClass] = [];
    }
  }
  return { decks: nextDecks, discards: nextDiscards };
};

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
