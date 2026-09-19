import { useState } from "react";
import { FiPlus, FiUsers } from "react-icons/fi";
import { EMPTY_ACCOUNT, getLedgerIndex } from "../../data/ledger";
import { matchesNameOrPhone } from "../../data/search";
import { useDB } from "../../data/store";
import { href, navigate, setQuery, useRoute } from "../../app/router";
import { formatMoney, formatPhone, round2 } from "../../lib/format";
import { Button } from "../../ui/Button";
import { EmptyState } from "../../ui/feedback";
import { SearchInput } from "../../ui/inputs";
import { Fab, ListGroup, ListRow, PageHeader, StatGrid } from "../../ui/layout";
import { Segmented } from "../../ui/Segmented";
import { BalanceText } from "./BalanceText";
import { CustomerFormSheet } from "./CustomerFormSheet";
import styles from "./customers.module.css";

const PAGE_SIZE = 100;
type Filter = "all" | "due";

export function CustomersScreen() {
  const db = useDB();
  const route = useRoute();
  const [adding, setAdding] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const query = route.query.get("q") ?? "";
  const filter: Filter = route.query.get("filter") === "due" ? "due" : "all";
  const index = getLedgerIndex(db);
  const balanceOf = (id: string) => (index.accounts.get(id) ?? EMPTY_ACCOUNT).balance;

  const balances = db.customers.map((c) => balanceOf(c.id));
  const totals = {
    due: round2(balances.filter((b) => b > 0).reduce((s, b) => s + b, 0)),
    withDue: balances.filter((b) => b > 0).length,
  };

  const q = query.trim().toLowerCase();
  const matched = db.customers.filter((c) => (!q || matchesNameOrPhone(c, q)) && (filter === "all" || balanceOf(c.id) > 0));
  const list = filter === "due"
    ? matched.sort((a, b) => balanceOf(b.id) - balanceOf(a.id))
    : matched.sort((a, b) => a.name.localeCompare(b.name));

  const addButton = <Button variant="primary" icon={<FiPlus />} onClick={() => setAdding(true)}>Add customer</Button>;

  return (
    <>
      <PageHeader title="Customers" actions={<span className="desktop-only">{addButton}</span>} />
      <div className={styles.summary}>
        <StatGrid columns={2} stats={[
          { label: "Total due", value: formatMoney(totals.due), tone: totals.due > 0 ? "due" : undefined },
          { label: "Customers with due", value: `${totals.withDue} of ${db.customers.length}` },
        ]} />
      </div>
      <div className={styles.search}>
        <SearchInput value={query} onChange={(q) => setQuery(route, { q: q || null })} placeholder="Search name or phone" />
      </div>
      <Segmented
        label="Filter customers"
        className={styles.filters}
        value={filter}
        onChange={(f) => setQuery(route, { filter: f === "all" ? null : f })}
        options={[{ value: "all", label: "All" }, { value: "due", label: "With due", count: totals.withDue }]}
      />

      {list.length ? (
        <>
          <ListGroup>
            {list.slice(0, limit).map((c) => {
              const contractor = c.contractorId ? index.contractorsById.get(c.contractorId) : undefined;
              return (
                <ListRow
                  key={c.id}
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
      ) : db.customers.length ? (
        <EmptyState icon={<FiUsers />} title="No matching customers" message="Try a different name or phone number." />
      ) : (
        <EmptyState icon={<FiUsers />} title="No customers yet" message="Add a customer, or create one while taking an order." action={addButton} />
      )}

      <Fab label="Add customer" icon={<FiPlus />} onClick={() => setAdding(true)} />
      <CustomerFormSheet open={adding} onClose={() => setAdding(false)} onSaved={(id) => navigate(href(`customers/${id}`))} />
    </>
  );
}
