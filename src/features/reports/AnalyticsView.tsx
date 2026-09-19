import { FiBarChart2, FiChevronLeft, FiChevronRight, FiTrendingDown, FiTrendingUp } from "react-icons/fi";
import { getLedgerIndex, orderTotal } from "../../data/ledger";
import { monthStats } from "../../data/stats";
import { useDB } from "../../data/store";
import { href, setQuery, useRoute } from "../../app/router";
import { formatMonth, shiftMonth, todayISO } from "../../lib/dates";
import { formatMoney, formatQty, round2 } from "../../lib/format";
import { BarList } from "../../ui/BarList";
import { IconButton } from "../../ui/Button";
import { EmptyState } from "../../ui/feedback";
import { ListGroup, ListRow, SectionTitle, StatGrid } from "../../ui/layout";
import styles from "./reports.module.css";

const TOP_CUSTOMERS = 5;

export function AnalyticsView() {
  const db = useDB();
  const route = useRoute();
  const month = route.query.get("month") || todayISO().slice(0, 7);
  const setMonth = (m: string) => setQuery(route, { month: m === todayISO().slice(0, 7) ? null : m });
  const current = monthStats(db, month);
  const previous = monthStats(db, shiftMonth(month, -1));
  const diff = round2(current.total - previous.total);
  const pct = previous.total > 0 ? (diff / previous.total) * 100 : current.total > 0 ? 100 : 0;
  const prevQty = new Map(previous.items.map((i) => [i.key, i.qty]));

  const index = getLedgerIndex(db);
  const byCustomer = new Map<string, number>();
  current.orders.forEach((o) => byCustomer.set(o.customerId, round2((byCustomer.get(o.customerId) ?? 0) + orderTotal(o))));
  const topCustomers = [...byCustomer.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_CUSTOMERS);

  return (
    <>
      <div className={styles.monthSwitch}>
        <IconButton label="Previous month" icon={<FiChevronLeft />} bare onClick={() => setMonth(shiftMonth(month, -1))} />
        {formatMonth(month)}
        <IconButton label="Next month" icon={<FiChevronRight />} bare onClick={() => setMonth(shiftMonth(month, 1))} />
      </div>
      <div className={styles.block}>
        <StatGrid columns={2} stats={[
          {
            label: "Sales",
            value: formatMoney(current.total),
            sub: (
              <span className={`${styles.delta} ${diff >= 0 ? styles.up : styles.down}`}>
                {diff >= 0 ? <FiTrendingUp aria-hidden /> : <FiTrendingDown aria-hidden />}
                {formatMoney(Math.abs(diff))} ({Math.abs(pct).toFixed(0)}%) vs last month
              </span>
            ),
          },
          { label: "Collected", value: formatMoney(current.collected), tone: "paid" },
          { label: "Orders", value: current.orders.length },
          { label: "Avg order value", value: formatMoney(current.orders.length ? current.total / current.orders.length : 0) },
        ]} />
      </div>

      {current.orders.length === 0 ? (
        <EmptyState icon={<FiBarChart2 />} title="No sales this month" message="Completed orders for this month show up here." />
      ) : (
        <>
          <SectionTitle>Category-wise sales</SectionTitle>
          <BarList items={current.categories.map((c) => ({ key: c.category, label: c.category, value: c.amount, display: formatMoney(c.amount) }))} />

          <SectionTitle>Item-wise sales</SectionTitle>
          <ListGroup>
            {current.items.map((i) => (
              <ListRow
                key={i.key}
                title={i.name}
                subtitle={`${formatQty(i.qty)} ${i.unit} · avg ${formatMoney(i.qty ? i.amount / i.qty : 0)} · last month ${formatQty(prevQty.get(i.key) ?? 0)}`}
                right={formatMoney(i.amount)}
              />
            ))}
          </ListGroup>

          <SectionTitle>Top customers</SectionTitle>
          <ListGroup>
            {topCustomers.map(([id, amount]) => (
              <ListRow key={id} title={index.customersById.get(id)?.name ?? "Unknown"} right={formatMoney(amount)} href={href(`customers/${id}`)} />
            ))}
          </ListGroup>
        </>
      )}
    </>
  );
}
