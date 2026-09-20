/* The day's money movements: customer payments, other money in, and money paid out. */
import { FiArrowDownLeft, FiArrowUpRight } from "react-icons/fi";
import { getLedgerIndex } from "../../data/ledger";
import { paymentMethodLabel } from "../../data/paymentMethods";
import type { DaySummary } from "../../data/stats";
import { useDB } from "../../data/store";
import { formatMoney } from "../../lib/format";
import { ListGroup, ListRow, SectionTitle } from "../../ui/layout";
import { useOrderSheets } from "../orders/OrderSheets";
import styles from "./cash.module.css";

interface Movement {
  key: string;
  title: string;
  detail: string;
  amount: number;
  direction: "in" | "out";
  open: () => void;
}

export function CashSection({ date, day }: { date: string; day: DaySummary }) {
  const db = useDB();
  const sheets = useOrderSheets();
  const index = getLedgerIndex(db);

  const fromPayments: Movement[] = db.payments
    .filter((p) => p.date === date)
    .map((p) => ({
      key: `p-${p.id}`,
      title: index.customersById.get(p.customerId)?.name || "Customer payment",
      detail: [paymentMethodLabel(p.method), p.note].filter(Boolean).join(" · "),
      amount: p.amount,
      direction: "in" as const,
      open: () => sheets.editPayment(p.id),
    }));

  const fromCash: Movement[] = day.cash.map((c) => ({
    key: `c-${c.id}`,
    title: c.party || (c.direction === "in" ? "Other money in" : "Paid out"),
    detail: [paymentMethodLabel(c.method), c.note].filter(Boolean).join(" · "),
    amount: c.amount,
    direction: c.direction,
    open: () => sheets.editCash(c.id),
  }));

  const movements = [...fromPayments, ...fromCash];
  if (!movements.length) return null;

  return (
    <>
      <SectionTitle right={<span className={styles.inHand}>In hand {formatMoney(day.inHand)}</span>}>Money today</SectionTitle>
      <ListGroup>
        {movements.map((m) => (
          <ListRow
            key={m.key}
            avatar={
              <span className={m.direction === "in" ? styles.badgeIn : styles.badgeOut} aria-hidden>
                {m.direction === "in" ? <FiArrowDownLeft /> : <FiArrowUpRight />}
              </span>
            }
            title={m.title}
            subtitle={m.detail || undefined}
            right={<span className={m.direction === "in" ? styles.in : styles.out}>{m.direction === "in" ? "+" : "−"} {formatMoney(m.amount)}</span>}
            onClick={m.open}
            chevron
          />
        ))}
      </ListGroup>
    </>
  );
}
