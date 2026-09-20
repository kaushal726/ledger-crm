import { FiBriefcase, FiCheck, FiMapPin } from "react-icons/fi";
import { itemsSummary, type OrderMoney } from "../../data/ledger";
import type { Order } from "../../data/types";
import { cx } from "../../lib/cx";
import { formatMoney } from "../../lib/format";
import { Avatar } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { StatusTag, orderAvatarTone, orderMoneyNote } from "./orderStatus";
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

export function OrderCard({ order, money, customerName, contractorName, onOpen, onComplete, onReceive }: OrderCardProps) {
  const name = customerName || "Unknown customer";
  const note = orderMoneyNote(order, money);
  const action =
    order.status === "pending" ? <Button size="sm" variant="primary" icon={<FiCheck />} onClick={onComplete}>Complete</Button>
    : order.status === "completed" && money.due > 0 ? <Button size="sm" onClick={onReceive}>Receive</Button>
    : null;
  const meta = (contractorName || order.site) && (
    <div className={styles.cardMeta}>
      {contractorName && <span><FiBriefcase aria-hidden />{contractorName}</span>}
      {order.site && <span><FiMapPin aria-hidden />{order.site}</span>}
    </div>
  );
  // The action row would otherwise sit half empty, so the meta line keeps it company.
  const metaInFoot = Boolean(action && !note);

  return (
    <article
      className={cx(styles.card, order.status === "cancelled" && styles.cancelled)}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) onOpen(); }}
    >
      <div className={styles.cardRow}>
        <Avatar name={name} tone={orderAvatarTone(order, money)} />
        <div className={styles.cardMain}>
          <div className={styles.cardName}>{name}</div>
          <div className={styles.cardItems}>{itemsSummary(order)}</div>
          {!metaInFoot && meta}
        </div>
        <div className={styles.cardSide}>
          <div className={cx(styles.cardAmount, "num")}>{formatMoney(money.total)}</div>
          <StatusTag order={order} money={money} />
        </div>
      </div>
      {(action || note) && (
        <div className={styles.cardFoot} onClick={(e) => e.stopPropagation()}>
          {note ? <span className={cx(styles.cardNote, "num")}>{note}</span> : metaInFoot && meta}
          {action}
        </div>
      )}
    </article>
  );
}
