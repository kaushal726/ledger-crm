import { FiClipboard, FiPlus } from "react-icons/fi";
import { displayName } from "../../data/business";
import { EMPTY_ORDER_MONEY, getLedgerIndex } from "../../data/ledger";
import { daySummary } from "../../data/stats";
import { useDB } from "../../data/store";
import type { Order } from "../../data/types";
import { setQuery, useRoute } from "../../app/router";
import { SyncBadge } from "../../app/SyncBadge";
import { todayISO } from "../../lib/dates";
import { formatMoney } from "../../lib/format";
import { Button } from "../../ui/Button";
import { EmptyState } from "../../ui/feedback";
import { Fab, PageHeader, StatGrid } from "../../ui/layout";
import { Segmented } from "../../ui/Segmented";
import { DateSwitcher } from "./DateSwitcher";
import { OrderCard } from "./OrderCard";
import { useOrderSheets } from "./OrderSheets";
import { useCompleteOrder } from "./useCompleteOrder";
import styles from "./orders.module.css";

type Filter = "all" | "pending" | "completed";

const FILTERS: Record<Filter, (o: Order) => boolean> = {
  all: () => true,
  pending: (o) => o.status === "pending",
  completed: (o) => o.status === "completed",
};

const EMPTY_COPY: Record<Filter, { title: string; message: string }> = {
  all: { title: "No orders on this day", message: "Tap New order to add one for this date." },
  pending: { title: "Nothing pending", message: "Pending orders for this date show up here." },
  completed: { title: "No completed orders", message: "Orders marked completed for this date show up here." },
};

export function OrdersScreen() {
  const db = useDB();
  const route = useRoute();
  const sheets = useOrderSheets();
  const complete = useCompleteOrder();
  const date = route.query.get("date") || todayISO();
  const filter = (route.query.get("filter") as Filter) in FILTERS ? (route.query.get("filter") as Filter) : "all";

  const index = getLedgerIndex(db);
  const day = daySummary(db, date);
  const orders = day.orders.filter(FILTERS[filter]);
  const newOrder = () => sheets.newOrder({ date });

  return (
    <>
      <PageHeader
        eyebrow={displayName(db)}
        title="Orders"
        actions={
          <>
            <span className="mobile-only"><SyncBadge /></span>
            <Button variant="primary" icon={<FiPlus />} className="desktop-only" onClick={newOrder}>New order</Button>
          </>
        }
      />
      <DateSwitcher date={date} onChange={(d) => setQuery(route, { date: d === todayISO() ? null : d })} />
      <div className={styles.summary}>
        <StatGrid stats={[
          { label: "Sales", value: formatMoney(day.sales) },
          { label: "Collected", value: formatMoney(day.collected) },
          { label: "Due", value: formatMoney(day.due), tone: day.due > 0 ? "due" : undefined },
        ]} />
      </div>
      <Segmented
        label="Filter orders"
        className={styles.filters}
        value={filter}
        onChange={(f) => setQuery(route, { filter: f === "all" ? null : f })}
        options={[
          { value: "all", label: "All", count: day.orders.length },
          { value: "pending", label: "Pending", count: day.pendingCount },
          { value: "completed", label: "Completed", count: day.completedCount },
        ]}
      />
      {orders.length ? (
        <div className={styles.cards}>
          {orders.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              money={index.orderMoney.get(o.id) ?? EMPTY_ORDER_MONEY}
              customerName={index.customersById.get(o.customerId)?.name ?? ""}
              contractorName={(o.contractorId && index.contractorsById.get(o.contractorId)?.name) || ""}
              onOpen={() => sheets.showOrder(o.id)}
              onComplete={() => complete(o.id)}
              onReceive={() => sheets.receivePayment({ customerId: o.customerId, orderId: o.id, amount: index.orderMoney.get(o.id)?.due })}
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={<FiClipboard />} {...EMPTY_COPY[filter]} />
      )}
      <Fab label="New order" icon={<FiPlus />} onClick={newOrder} />
    </>
  );
}
