import { useState } from "react";
import { FiBriefcase, FiPlus } from "react-icons/fi";
import { matchesNameOrPhone } from "../../data/search";
import { contractorTotals } from "../../data/stats";
import { useDB } from "../../data/store";
import { href, navigate, setQuery, useRoute } from "../../app/router";
import { formatMoney, formatPhone, plural } from "../../lib/format";
import { BarList } from "../../ui/BarList";
import { Button } from "../../ui/Button";
import { EmptyState } from "../../ui/feedback";
import { SearchInput } from "../../ui/inputs";
import { Fab, ListGroup, ListRow, PageHeader, SectionTitle } from "../../ui/layout";
import { ContractorFormSheet } from "./ContractorFormSheet";
import styles from "./contractors.module.css";

const TOP_COUNT = 5;

export function ContractorsScreen() {
  const db = useDB();
  const route = useRoute();
  const [adding, setAdding] = useState(false);
  const query = (route.query.get("q") ?? "").trim().toLowerCase();
  const totals = contractorTotals(db);
  const statsOf = (id: string) => totals.get(id) ?? { total: 0, orders: 0 };

  const top = db.contractors.filter((c) => statsOf(c.id).total > 0).sort((a, b) => statsOf(b.id).total - statsOf(a.id).total).slice(0, TOP_COUNT);
  const list = db.contractors.filter((c) => !query || matchesNameOrPhone(c, query)).sort((a, b) => a.name.localeCompare(b.name));
  const addButton = <Button variant="primary" icon={<FiPlus />} onClick={() => setAdding(true)}>Add contractor</Button>;

  return (
    <>
      <PageHeader title="Contractors" actions={<span className="desktop-only">{addButton}</span>} />

      {top.length > 0 && !query && (
        <>
          <SectionTitle>Top contractors · all time</SectionTitle>
          <BarList items={top.map((c) => ({ key: c.id, label: c.name, value: statsOf(c.id).total, display: formatMoney(statsOf(c.id).total), href: href(`contractors/${c.id}`) }))} />
        </>
      )}

      <SectionTitle>All contractors</SectionTitle>
      <div className={styles.search}>
        <SearchInput value={route.query.get("q") ?? ""} onChange={(q) => setQuery(route, { q: q || null })} placeholder="Search contractors" />
      </div>
      {list.length ? (
        <ListGroup>
          {list.map((c) => (
            <ListRow
              key={c.id}
              title={c.name}
              subtitle={[c.phone && formatPhone(c.phone), plural(statsOf(c.id).orders, "order")].filter(Boolean).join(" · ")}
              right={formatMoney(statsOf(c.id).total)}
              href={href(`contractors/${c.id}`)}
            />
          ))}
        </ListGroup>
      ) : db.contractors.length ? (
        <EmptyState icon={<FiBriefcase />} title="No matching contractors" message="Try a different name." />
      ) : (
        <EmptyState icon={<FiBriefcase />} title="No contractors yet" message="Add contractors to see who brings in which sales." action={addButton} />
      )}

      <Fab label="Add contractor" icon={<FiPlus />} onClick={() => setAdding(true)} />
      <ContractorFormSheet open={adding} onClose={() => setAdding(false)} onSaved={(id) => navigate(href(`contractors/${id}`))} />
    </>
  );
}
