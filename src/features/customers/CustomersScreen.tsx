import { useState } from "react";
import { FiPlus, FiUsers } from "react-icons/fi";
import { EMPTY_ACCOUNT, getLedgerIndex } from "../../data/ledger";
import { useDB } from "../../data/store";
import { href, navigate, setQuery, useRoute } from "../../app/router";
import { formatMoney, formatPhone, round2 } from "../../lib/format";
import { Avatar, type AvatarTone } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { EmptyState } from "../../ui/feedback";
import { Fab, ListGroup, ListRow, PageHeader, StatGrid } from "../../ui/layout";
import { FilterBar } from "../../ui/FilterBar";
import { Segmented } from "../../ui/Segmented";
import { BalanceText } from "./BalanceText";
import { CustomerFormSheet } from "./CustomerFormSheet";
import {
  CUSTOMER_SORTS, CUSTOMER_STATUSES, NO_CONTRACTOR, filterCustomers, statusCounts, statusOf,
  type CustomerFilters, type CustomerSort, type CustomerStatus,
} from "./customerFilters";
import styles from "./customers.module.css";

const PAGE_SIZE = 100;
const STATUS_LABELS: Record<CustomerStatus, string> = { all: "All", due: "Due", advance: "Advance", settled: "Settled" };
const AVATAR_TONE: Record<Exclude<CustomerStatus, "all">, AvatarTone> = { due: "due", advance: "paid", settled: "primary" };

function readFilters(query: URLSearchParams): CustomerFilters {
  const status = query.get("status") as CustomerStatus;
  const sort = query.get("sort") as CustomerSort;
  return {
    query: query.get("q") ?? "",
    status: CUSTOMER_STATUSES.includes(status) ? status : "all",
    contractor: query.get("contractor") ?? "",
    sort: CUSTOMER_SORTS.some((s) => s.value === sort) ? sort : "name",
  };
}

export function CustomersScreen() {
  const db = useDB();
  const route = useRoute();
  const [adding, setAdding] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const filters = readFilters(route.query);
  const index = getLedgerIndex(db);
  const balanceOf = (id: string) => (index.accounts.get(id) ?? EMPTY_ACCOUNT).balance;

  const counts = statusCounts(db);
  const totalDue = round2(db.customers.reduce((s, c) => s + Math.max(0, balanceOf(c.id)), 0));
  const list = filterCustomers(db, filters);
  const filtered = Boolean(filters.query || filters.status !== "all" || filters.contractor);
  // Counts on every choice, so a contractor with no customers is obvious before picking it.
  const perContractor = new Map<string, number>();
  db.customers.forEach((c) => {
    const key = c.contractorId ?? NO_CONTRACTOR;
    perContractor.set(key, (perContractor.get(key) ?? 0) + 1);
  });
  const contractorOptions = [
    { value: "", label: "All", count: counts.all },
    { value: NO_CONTRACTOR, label: "No contractor", count: perContractor.get(NO_CONTRACTOR) ?? 0 },
    ...[...db.contractors].sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ value: c.id, label: c.name, count: perContractor.get(c.id) ?? 0 })),
  ];
  const addButton = <Button variant="primary" icon={<FiPlus />} onClick={() => setAdding(true)}>Add customer</Button>;

  return (
    <>
      <PageHeader title="Customers" actions={<span className="desktop-only">{addButton}</span>} />
      <div className={styles.summary}>
        <StatGrid columns={2} stats={[
          { label: "Total due", value: formatMoney(totalDue), tone: totalDue > 0 ? "due" : undefined },
          { label: "Customers with due", value: `${counts.due} of ${counts.all}`, tone: counts.due > 0 ? "accent" : undefined },
        ]} />
      </div>

      <FilterBar
        className={styles.filters}
        search={{ value: filters.query, onChange: (q) => setQuery(route, { q: q || null }), placeholder: "Search name or phone" }}
        groups={[
          { key: "contractor", label: "Default contractor", value: filters.contractor, options: contractorOptions, onChange: (c) => setQuery(route, { contractor: c || null }) },
          { key: "sort", label: "Sort by", value: filters.sort, options: CUSTOMER_SORTS, onChange: (s) => setQuery(route, { sort: s === "name" ? null : s }) },
        ]}
      />
      <Segmented
        label="Balance"
        className={styles.statusTabs}
        value={filters.status}
        onChange={(s) => setQuery(route, { status: s === "all" ? null : s })}
        options={CUSTOMER_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s], count: counts[s] }))}
      />

      {list.length ? (
        <>
          <ListGroup>
            {list.slice(0, limit).map((c) => {
              const contractor = c.contractorId ? index.contractorsById.get(c.contractorId) : undefined;
              return (
                <ListRow
                  key={c.id}
                  avatar={<Avatar name={c.name} tone={AVATAR_TONE[statusOf(balanceOf(c.id))]} />}
                  title={c.name}
                  subtitle={[c.phone && formatPhone(c.phone), contractor?.name].filter(Boolean).join(" · ") || undefined}
                  right={<BalanceText balance={balanceOf(c.id)} />}
                  href={href(`customers/${c.id}`)}
                />
              );
            })}
          </ListGroup>
          {list.length > limit && <Button block className={styles.more} onClick={() => setLimit((l) => l + PAGE_SIZE)}>Show more</Button>}
        </>
      ) : filtered ? (
        <EmptyState
          icon={<FiUsers />}
          title="No matching customers"
          message="Try a different search or filter."
          action={<Button onClick={() => setQuery(route, { q: null, status: null, contractor: null })}>Clear filters</Button>}
        />
      ) : (
        <EmptyState icon={<FiUsers />} title="No customers yet" message="Add a customer, or create one while taking an order." action={addButton} />
      )}

      <Fab label="Add customer" icon={<FiPlus />} onClick={() => setAdding(true)} />
      <CustomerFormSheet open={adding} onClose={() => setAdding(false)} onSaved={(id) => navigate(href(`customers/${id}`))} />
    </>
  );
}
