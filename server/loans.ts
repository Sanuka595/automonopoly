import { add, canPay, euro, sub, type Euro } from "./money.ts";
import { RuleError } from "./turn.ts";
import type { Loan, Player, Room } from "./types.ts";

export const OVERDUE_PENALTY = euro(200);

let loanIdCounter = 0;
const nextLoanId = () => `loan_${Date.now()}_${++loanIdCounter}`;

const playerById = (room: Room, id: string): Player => {
  const p = room.players.find((x) => x.id === id);
  if (!p) throw new RuleError("player not found");
  return p;
};

/**
 * Creates a P2P loan between lender and borrower.
 * Principal transferred immediately, turnsLeft initialized.
 */
export const grantLoan = (
  room: Room,
  lenderId: string,
  borrowerId: string,
  principal: Euro,
  due: Euro,
  turns: number,
): Room => {
  if (lenderId === borrowerId) throw new RuleError("cannot loan to self");
  if (turns < 1) throw new RuleError("turns must be >= 1");
  if (due < principal) throw new RuleError("due must be >= principal");

  const lender = playerById(room, lenderId);
  const borrower = playerById(room, borrowerId);

  if (!canPay(lender.cash, principal)) throw new RuleError("lender lacks cash");

  const newLoan: Loan = {
    id: nextLoanId(),
    lenderId,
    borrowerId,
    principal,
    due,
    turnsLeft: turns,
    overdue: false,
  };

  const updatedLender = { ...lender, cash: sub(lender.cash, principal) };
  const updatedBorrower = {
    ...borrower,
    cash: add(borrower.cash, principal),
    loans: [...borrower.loans, newLoan],
  };

  return {
    ...room,
    players: room.players.map((p) =>
      p.id === lenderId ? updatedLender : p.id === borrowerId ? updatedBorrower : p,
    ),
    updatedAt: Date.now(),
  };
};

/**
 * Decrements turnsLeft on active borrower's end_turn.
 * When turnsLeft reaches 0, attempts collection. If cash insufficient:
 * takes all cash, marks overdue, adds +200 penalty per turn.
 */
export const processPlayerLoansAtTurnEnd = (room: Room, borrowerId: string): Room => {
  const borrower = playerById(room, borrowerId);
  if (borrower.loans.length === 0) return room;

  let borrowerCash = borrower.cash;
  const remainingLoans: Loan[] = [];
  const lenderTransfers = new Map<string, Euro>();

  for (const loan of borrower.loans) {
    let currentDue = loan.due;
    let overdue = loan.overdue;
    let turnsLeft = loan.turnsLeft;

    if (overdue) {
      // Penalty of +200 € for each overdue turn
      currentDue = add(currentDue, OVERDUE_PENALTY);
    } else {
      turnsLeft -= 1;
      if (turnsLeft <= 0) {
        overdue = true;
      }
    }

    if (overdue) {
      // Attempt collection
      if (borrowerCash >= currentDue) {
        // Full repayment
        borrowerCash = sub(borrowerCash, currentDue);
        const prev = lenderTransfers.get(loan.lenderId) ?? 0n;
        lenderTransfers.set(loan.lenderId, add(prev, currentDue));
        // Loan fully paid, not kept
      } else {
        // Partial repayment: transfer all available cash
        const paid = borrowerCash;
        borrowerCash = 0n;
        const remainingDue = sub(currentDue, paid);
        if (paid > 0n) {
          const prev = lenderTransfers.get(loan.lenderId) ?? 0n;
          lenderTransfers.set(loan.lenderId, add(prev, paid));
        }
        remainingLoans.push({
          ...loan,
          due: remainingDue,
          turnsLeft: 0,
          overdue: true,
        });
      }
    } else {
      remainingLoans.push({
        ...loan,
        turnsLeft,
        overdue: false,
      });
    }
  }

  // Apply updates to room
  let players = room.players.map((p) => {
    if (p.id === borrowerId) {
      return { ...p, cash: borrowerCash, loans: remainingLoans };
    }
    const transfer = lenderTransfers.get(p.id);
    if (transfer) {
      return { ...p, cash: add(p.cash, transfer) };
    }
    return p;
  });

  return { ...room, players, updatedAt: Date.now() };
};
