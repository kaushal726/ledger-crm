import { FiArrowDownLeft, FiArrowUpRight, FiBookOpen } from "react-icons/fi";
import { itemsSummary, type LedgerEntry } from "../../data/ledger";
import { paymentMethodLabel } from "../../data/paymentMethods";
import { cx } from "../../lib/cx";
import { formatDate } from "../../lib/dates";
import { formatBalance, formatMoney } from "../../lib/format";
import { ListGroup } from "../../ui/layout";
import styles from "./customers.module.css";

interface LedgerListProps {
  entries: LedgerEntry[];
  onOpenOrder: (orderId: string) => void;
  onOpenPayment: (paymentId: string) => void;
}

function describe(entry: LedgerEntry): { title: string; detail: string } {
  switch (entry.kind) {
    case "opening":
      return { title: "Opening balance", detail: "Before using this app" };
    case "order":
      return { title: "Order", detail: `${formatDate(entry.date)} · ${itemsSummary(entry.order)}` };
    case "payment":
      return { title: `Payment · ${paymentMethodLabel(entry.payment.method)}`, detail: [formatDate(entry.date), entry.payment.note].filter(Boolean).join(" · ") };
  }
}

/** Newest first, each with the balance after it. */
export function LedgerList({ entries, onOpenOrder, onOpenPayment }: LedgerListProps) {
  return (
    <ListGroup>
      {entries.map((entry) => {
        const { title, detail } = describe(entry);
        const isCredit = entry.amount < 0;
        const content = (
          <>
            <span className={cx(styles.badge, isCredit ? styles.badgeIn : entry.kind === "order" && styles.badgeOut)} aria-hidden>
              {entry.kind === "opening" ? <FiBookOpen /> : isCredit ? <FiArrowDownLeft /> : <FiArrowUpRight />}
            </span>
            <span className={styles.entryBody}>
              <b>{title}</b>
              <span>{detail}</span>
            </span>
            <span className={styles.entryRight}>
              <b className={isCredit ? styles.credit : undefined}>{isCredit ? "− " : "+ "}{formatMoney(Math.abs(entry.amount))}</b>
              <span className={entry.balance < 0 ? styles.advance : undefined}>{formatBalance(entry.balance)}</span>
            </span>
          </>
        );
        if (entry.kind === "order") return <button key={entry.key} type="button" className={styles.entry} onClick={() => onOpenOrder(entry.order.id)}>{content}</button>;
        if (entry.kind === "payment") return <button key={entry.key} type="button" className={styles.entry} onClick={() => onOpenPayment(entry.payment.id)}>{content}</button>;
        return <div key={entry.key} className={styles.entry}>{content}</div>;
      })}
    </ListGroup>
  );
}
