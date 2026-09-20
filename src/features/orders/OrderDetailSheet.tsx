import { FiAlertCircle, FiBriefcase, FiFileText, FiMapPin, FiMessageSquare, FiUser } from "react-icons/fi";
import { deleteOrder, setOrderStatus } from "../../data/actions";
import { EMPTY_ORDER_MONEY, getLedgerIndex, lineAmount } from "../../data/ledger";
import { paymentMethodLabel } from "../../data/paymentMethods";
import { useDB } from "../../data/store";
import type { Order } from "../../data/types";
import { formatDate } from "../../lib/dates";
import { formatMoney, formatQty } from "../../lib/format";
import { href, navigate } from "../../app/router";
import { Button } from "../../ui/Button";
import { useConfirm } from "../../ui/Confirm";
import { EmptyState } from "../../ui/feedback";
import { ListGroup, ListRow, SectionTitle, StatGrid } from "../../ui/layout";
import { Sheet } from "../../ui/Sheet";
import { useToast } from "../../ui/Toast";
import { StatusTag, orderMoneyNote } from "./orderStatus";
import { useOrderSheets } from "./OrderSheets";
import { useCompleteOrder } from "./useCompleteOrder";
import styles from "./orders.module.css";

export function OrderDetailSheet({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const db = useDB();
  if (!orderId) return null;
  const order = db.orders.find((o) => o.id === orderId);
  const customer = order ? db.customers.find((c) => c.id === order.customerId) : undefined;
  return (
    <Sheet open onClose={onClose} title={customer?.name ?? "Order"} subtitle={order ? formatDate(order.date) : undefined}>
      {order ? <OrderDetail order={order} onClose={onClose} /> : <EmptyState icon={<FiAlertCircle />} title="Order not found" message="It may have been deleted on another device." />}
    </Sheet>
  );
}

function OrderDetail({ order, onClose }: { order: Order; onClose: () => void }) {
  const db = useDB();
  const sheets = useOrderSheets();
  const confirm = useConfirm();
  const toast = useToast();
  const index = getLedgerIndex(db);
  const money = index.orderMoney.get(order.id) ?? EMPTY_ORDER_MONEY;
  const payments = index.paymentsByOrder.get(order.id) ?? [];
  const contractor = order.contractorId ? index.contractorsById.get(order.contractorId) : undefined;

  const completeOrder = useCompleteOrder();
  const complete = () => completeOrder(order.id);
  const cancel = async () => {
    if (await confirm({ title: "Cancel this order?", message: "It stays in the list as cancelled and won't count in sales.", confirmLabel: "Cancel order", danger: true })) {
      setOrderStatus(order.id, "cancelled");
    }
  };
  const remove = async () => {
    const message = payments.length ? "Payments taken for it stay in the customer's ledger." : "This can't be undone.";
    if (!(await confirm({ title: "Delete this order?", message, confirmLabel: "Delete", danger: true }))) return;
    deleteOrder(order.id);
    onClose();
    toast("Order deleted");
  };
  const receive = () => sheets.receivePayment({ customerId: order.customerId, orderId: order.id, amount: money.due || undefined });

  return (
    <>
      <div className={styles.detailHead}>
        <span className={styles.detailStatus}>
          <StatusTag order={order} money={money} />
          {orderMoneyNote(order, money) && <small className="num">{orderMoneyNote(order, money)}</small>}
        </span>
        <span className={`${styles.detailTotal} num`}>{formatMoney(money.total)}</span>
      </div>

      <ListGroup>
        {order.lineItems.map((li, i) => (
          <div key={i} className={styles.itemLine}>
            <span>
              <b>{li.name}</b>
              <small className="num">{formatQty(li.qty)} {li.unit} × {formatMoney(li.price)}</small>
            </span>
            <span>{formatMoney(lineAmount(li))}</span>
          </div>
        ))}
        <div className={styles.totalLine}><span>Total</span><span className="num">{formatMoney(money.total)}</span></div>
      </ListGroup>

      {order.status !== "cancelled" && (
        <>
          <SectionTitle>Payment</SectionTitle>
          <StatGrid stats={[
            { label: "Total", value: formatMoney(money.total), tone: "primary" },
            order.status === "pending" ? { label: "Advance", value: formatMoney(money.advance), tone: money.advance > 0 ? "paid" : undefined } : { label: "Paid", value: formatMoney(money.paid), tone: money.paid > 0 ? "paid" : undefined },
            { label: "Due", value: formatMoney(money.due), tone: money.due > 0 ? "due" : undefined },
          ]} />
          {payments.length > 0 && (
            <ListGroup className={styles.formBlock}>
              {payments.map((p) => (
                <ListRow key={p.id} title={`${paymentMethodLabel(p.method)} · ${formatDate(p.date)}`} subtitle={p.note || undefined} right={formatMoney(p.amount)} onClick={() => sheets.editPayment(p.id)} chevron />
              ))}
            </ListGroup>
          )}
        </>
      )}

      <SectionTitle>Details</SectionTitle>
      <ListGroup>
        <ListRow leading={<FiUser />} title={index.customersById.get(order.customerId)?.name ?? "Unknown"} subtitle="Customer ledger" onClick={() => navigate(href(`customers/${order.customerId}`))} chevron />
        {contractor && <ListRow leading={<FiBriefcase />} title={contractor.name} subtitle="Contractor" onClick={() => navigate(href(`contractors/${contractor.id}`))} chevron />}
        {order.site && <ListRow leading={<FiMapPin />} title={order.site} subtitle="Site" />}
        {order.note && <ListRow leading={<FiMessageSquare />} title={order.note} subtitle="Note" />}
      </ListGroup>

      <div className={styles.actions}>
        {order.status === "pending" && <Button variant="primary" className={styles.wide} onClick={complete}>Mark completed</Button>}
        {order.status === "completed" && money.due > 0 && <Button variant="primary" className={styles.wide} onClick={receive}>Receive payment</Button>}
        {order.status === "pending" && <Button onClick={receive}>Take advance</Button>}
        {order.status !== "cancelled" && <Button onClick={() => sheets.editOrder(order.id)}>Edit</Button>}
        {order.status === "completed" && <Button icon={<FiFileText />} onClick={() => navigate(href("reports", { tab: "export", type: "bill", order: order.id }))}>Bill PDF</Button>}
        {order.status === "pending" && <Button onClick={cancel}>Cancel order</Button>}
        {order.status === "cancelled" && <Button className={styles.wide} onClick={() => setOrderStatus(order.id, "pending")}>Reopen</Button>}
        <Button variant="danger" className={order.status === "pending" ? undefined : styles.wide} onClick={remove}>Delete order</Button>
      </div>
    </>
  );
}
