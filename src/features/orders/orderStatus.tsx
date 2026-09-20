import type { OrderMoney } from "../../data/ledger";
import type { Order } from "../../data/types";
import type { AvatarTone } from "../../ui/Avatar";
import { formatMoney } from "../../lib/format";
import styles from "./orders.module.css";

/** How an order reads at a glance: still open, money owed, settled, or dropped. */
export type OrderTone = "pending" | "due" | "paid" | "cancelled";

const AVATAR_TONE: Record<OrderTone, AvatarTone> = { pending: "accent", due: "due", paid: "paid", cancelled: "primary" };

export function orderTone(order: Order, money: OrderMoney): OrderTone {
  if (order.status === "cancelled") return "cancelled";
  if (order.status === "pending") return "pending";
  return money.due > 0 ? "due" : "paid";
}

export function orderAvatarTone(order: Order, money: OrderMoney): AvatarTone {
  return AVATAR_TONE[orderTone(order, money)];
}

export function orderStatusLabel(order: Order, money: OrderMoney): string {
  switch (orderTone(order, money)) {
    case "cancelled": return "Cancelled";
    case "pending": return "Pending";
    case "due": return `Due ${formatMoney(money.due)}`;
    case "paid": return "Paid";
  }
}

/** Money detail that doesn't fit in the status pill, e.g. a part payment. */
export function orderMoneyNote(order: Order, money: OrderMoney): string {
  if (order.status === "pending") return money.advance > 0 ? `Advance ${formatMoney(money.advance)}` : "";
  if (order.status === "completed" && money.due > 0 && money.paid > 0) return `Paid ${formatMoney(money.paid)} of ${formatMoney(money.total)}`;
  return "";
}

/** Small tinted pill carrying the order's state. */
export function StatusTag({ order, money }: { order: Order; money: OrderMoney }) {
  return <span className={styles.status} data-tone={orderTone(order, money)}>{orderStatusLabel(order, money)}</span>;
}
