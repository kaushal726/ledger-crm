import { useState } from "react";
import { FiBriefcase, FiPlus } from "react-icons/fi";
import { PERIOD_LABELS, presetRange } from "../../data/periods";
import { matchesNameOrPhone } from "../../data/search";
import { contractorTotals } from "../../data/stats";
import { useDB } from "../../data/store";
import type { Contractor } from "../../data/types";
import { href, navigate, setQuery, useRoute } from "../../app/router";
import { formatMoney, formatPhone, plural } from "../../lib/format";
import { Avatar } from "../../ui/Avatar";
import { BarList } from "../../ui/BarList";
import { Button } from "../../ui/Button";
import { EmptyState } from "../../ui/feedback";
import { Fab, ListGroup, ListRow, PageHeader, SectionTitle } from "../../ui/layout";
import { FilterBar } from "../../ui/FilterBar";
import { Segmented } from "../../ui/Segmented";
import { ContractorFormSheet } from "./ContractorFormSheet";
import styles from "./contractors.module.css";

const TOP_COUNT = 5;
type Period = "all" | "month" | "lastMonth";
type Activity = "all" | "active" | "idle";
type Sort = "sales" | "name" | "orders";

const PERIODS: Period[] = ["all", "month", "lastMonth"];
const ACTIVITY_LABELS: Record<Activity, string> = { all: "All", active: "With sales", idle: "No sales" };
const SORTS: { value: Sort; label: string }[] = [
  { value: "sales", label: "Top sales" },
  { value: "name", label: "Name" },
  { value: "orders", label: "Most orders" },
];

const pick = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

export function ContractorsScreen() {
  const db = useDB();
  const route = useRoute();
  const [adding, setAdding] = useState(false);
  const query = route.query.get("q") ?? "";
  const period = pick(route.query.get("period"), PERIODS, "all");
  const activity = pick(route.query.get("activity"), ["all", "active", "idle"] as const, "all");
  const sort = pick(route.query.get("sort"), SORTS.map((s) => s.value), "sales");

  const totals = contractorTotals(db, presetRange(period));
  const statsOf = (id: string) => totals.get(id) ?? { total: 0, orders: 0 };
  const hasSales = (c: Contractor) => statsOf(c.id).total > 0;
  const counts: Record<Activity, number> = { all: db.contractors.length, active: db.contractors.filter(hasSales).length, idle: db.contractors.filter((c) => !hasSales(c)).length };

  const q = query.trim().toLowerCase();
  const byName = (a: Contractor, b: Contractor) => a.name.localeCompare(b.name);
  const list = db.contractors
    .filter((c) => (!q || matchesNameOrPhone(c, q)) && (activity === "all" || (activity === "active") === hasSales(c)))
    .sort(sort === "name" ? byName : sort === "orders"
      ? (a, b) => statsOf(b.id).orders - statsOf(a.id).orders || byName(a, b)
      : (a, b) => statsOf(b.id).total - statsOf(a.id).total || byName(a, b));
  const top = db.contractors.filter(hasSales).sort((a, b) => statsOf(b.id).total - statsOf(a.id).total).slice(0, TOP_COUNT);
  const addButton = <Button variant="primary" icon={<FiPlus />} onClick={() => setAdding(true)}>Add contractor</Button>;

  return (
    <>
      <PageHeader title="Contractors" actions={<span className="desktop-only">{addButton}</span>} />
      <Segmented label="Period" className={styles.period} value={period} onChange={(p) => setQuery(route, { period: p === "all" ? null : p })} options={PERIODS.map((p) => ({ value: p, label: PERIOD_LABELS[p] }))} />

      {top.length > 0 && !q && (
        <>
          <SectionTitle>Top contractors · {PERIOD_LABELS[period].toLowerCase()}</SectionTitle>
          <BarList items={top.map((c) => ({ key: c.id, label: c.name, value: statsOf(c.id).total, display: formatMoney(statsOf(c.id).total), href: href(`contractors/${c.id}`) }))} />
        </>
      )}

      <SectionTitle>All contractors</SectionTitle>
      <FilterBar
        className={styles.filters}
        search={{ value: query, onChange: (v) => setQuery(route, { q: v || null }), placeholder: "Search contractors" }}
        groups={[
          {
            key: "activity",
            label: "Activity",
            value: activity,
            options: (["all", "active", "idle"] as const).map((a) => ({ value: a, label: ACTIVITY_LABELS[a], count: counts[a] })),
            onChange: (a) => setQuery(route, { activity: a === "all" ? null : a }),
          },
          { key: "sort", label: "Sort by", value: sort, options: SORTS, onChange: (s) => setQuery(route, { sort: s === "sales" ? null : s }) },
        ]}
      />

      {list.length ? (
        <ListGroup>
          {list.map((c) => (
            <ListRow
              key={c.id}
              avatar={<Avatar name={c.name} tone={hasSales(c) ? "accent" : "primary"} />}
              title={c.name}
              subtitle={[c.phone && formatPhone(c.phone), plural(statsOf(c.id).orders, "order")].filter(Boolean).join(" · ")}
              right={formatMoney(statsOf(c.id).total)}
              href={href(`contractors/${c.id}`, { period: period === "all" ? null : period })}
            />
          ))}
        </ListGroup>
      ) : db.contractors.length ? (
        <EmptyState
          icon={<FiBriefcase />}
          title="No matching contractors"
          message="Try a different search or filter."
          action={<Button onClick={() => setQuery(route, { q: null, activity: null })}>Clear filters</Button>}
        />
      ) : (
        <EmptyState icon={<FiBriefcase />} title="No contractors yet" message="Add contractors to see who brings in which sales." action={addButton} />
      )}

      <Fab label="Add contractor" icon={<FiPlus />} onClick={() => setAdding(true)} />
      <ContractorFormSheet open={adding} onClose={() => setAdding(false)} onSaved={(id) => navigate(href(`contractors/${id}`))} />
    </>
  );
}
