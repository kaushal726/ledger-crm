import { FiBriefcase, FiCheck } from "react-icons/fi";
import { itemsSummary, type OrderMoney } from "../../data/ledger";
import type { Order } from "../../data/types";
import { cx } from "../../lib/cx";
import { formatMoney } from "../../lib/format";
import { Button } from "../../ui/Button";
import { Chip } from "../../ui/feedback";
import styles from "./orders.module.css";

interface OrderCardProps {
  order: Order;
  money: OrderMoney;
  customerName: string;
  contractorName: string;
  onOpen: () => void;
  onComplete: () => void;
  onReceive: () => void;
}

type CardTone = "pending" | "due" | "paid" | "cancelled";

function cardTone(order: Order, money: OrderMoney): CardTone {
  if (order.status === "cancelled") return "cancelled";
  if (order.status === "pending") return "pending";
  return money.due > 0 ? "due" : "paid";
}

export function OrderCard({ order, money, customerName, contractorName, onOpen, onComplete, onReceive }: OrderCardProps) {
  const meta = [contractorName, order.site].filter(Boolean).join(" · ");
  return (
    <article
      className={cx(styles.card, order.status === "cancelled" && styles.cancelled)}
      data-tone={cardTone(order, money)}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) onOpen(); }}
    >
      <div className={styles.cardTop}>
        <div className={styles.cardName}>{customerName || "Unknown customer"}</div>
        <div className={cx(styles.cardAmount, "num")}>{formatMoney(money.total)}</div>
      </div>
      <div className={styles.cardItems}>{itemsSummary(order)}</div>
      {meta && (
        <div className={styles.cardMeta}>
          {contractorName && <FiBriefcase aria-hidden />}
          {meta}
        </div>
      )}
      <div className={styles.cardFoot} onClick={(e) => e.stopPropagation()}>
        <OrderStatus order={order} money={money} />
        {order.status === "pending" && (
          <Button size="sm" variant="primary" icon={<FiCheck />} onClick={onComplete}>Mark completed</Button>
        )}
        {order.status === "completed" && money.due > 0 && (
          <Button size="sm" onClick={onReceive}>Receive</Button>
        )}
      </div>
    </article>
  );
}

export function OrderStatus({ order, money }: { order: Order; money: OrderMoney }) {
  if (order.status === "cancelled") return <Chip>Cancelled</Chip>;
  if (order.status === "pending") {
    return (
      <span className={styles.cardFootInfo}>
        <Chip>Pending</Chip>
        {money.advance > 0 && <span className="num">Advance {formatMoney(money.advance)}</span>}
      </span>
    );
  }
  if (money.due <= 0) return <Chip tone="paid">Paid</Chip>;
  return (
    <span className={styles.cardFootInfo}>
      <Chip tone="due">Due {formatMoney(money.due)}</Chip>
      {money.paid > 0 && <span className="num">Paid {formatMoney(money.paid)}</span>}
    </span>
  );
}
