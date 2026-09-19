import { useState } from "react";
import { FiAlertCircle, FiEdit2, FiFileText, FiInbox, FiMessageCircle, FiPhone } from "react-icons/fi";
import { getLedgerIndex, itemsSummary, orderTotal } from "../../data/ledger";
import { PERIOD_LABELS, presetRange } from "../../data/periods";
import { contractorSummary, type ContractorSummary } from "../../data/stats";
import { useDB } from "../../data/store";
import { href, navigate, setQuery, useRoute } from "../../app/router";
import { telLink, whatsappLink } from "../../lib/contact";
import { formatDate } from "../../lib/dates";
import { formatMoney, formatPhone, formatQty, plural, round2 } from "../../lib/format";
import { Button } from "../../ui/Button";
import { EmptyState } from "../../ui/feedback";
import { ListGroup, ListRow, PageHeader, StatGrid } from "../../ui/layout";
import { Segmented } from "../../ui/Segmented";
import { useOrderSheets } from "../orders/OrderSheets";
import { ContractorFormSheet } from "./ContractorFormSheet";
import styles from "./contractors.module.css";

type Tab = "items" | "sites" | "customers" | "orders";
type Period = "month" | "lastMonth" | "all";

const PERIODS: Period[] = ["month", "lastMonth", "all"];
const TABS: { value: Tab; label: string }[] = [
  { value: "items", label: "Items" },
  { value: "sites", label: "Sites" },
  { value: "customers", label: "Customers" },
  { value: "orders", label: "Orders" },
];
const BACK = { label: "Contractors", href: href("contractors") };

export function ContractorDetailScreen({ contractorId }: { contractorId: string }) {
  const db = useDB();
  const route = useRoute();
  const [editing, setEditing] = useState(false);
  const contractor = db.contractors.find((c) => c.id === contractorId);
  if (!contractor) {
    return (
      <>
        <PageHeader back={BACK} title="Contractor" />
        <EmptyState icon={<FiAlertCircle />} title="Contractor not found" message="It may have been deleted on another device." />
      </>
    );
  }

  const period = (PERIODS as string[]).includes(route.query.get("period") ?? "") ? (route.query.get("period") as Period) : "all";
  const tab = TABS.some((t) => t.value === route.query.get("tab")) ? (route.query.get("tab") as Tab) : "items";
  const summary = contractorSummary(db, contractor.id, presetRange(period));

  return (
    <>
      <PageHeader back={BACK} title={contractor.name} />
      <div className={styles.contact}>
        {contractor.phone && <Button size="sm" icon={<FiPhone />} onClick={() => (window.location.href = telLink(contractor.phone))}>{formatPhone(contractor.phone)}</Button>}
        {contractor.phone && <Button size="sm" icon={<FiMessageCircle />} onClick={() => window.open(whatsappLink(contractor.phone), "_blank", "noopener")}>WhatsApp</Button>}
        <Button size="sm" icon={<FiEdit2 />} onClick={() => setEditing(true)}>Edit</Button>
      </div>

      <Segmented label="Period" className={styles.block} value={period} onChange={(p) => setQuery(route, { period: p === "all" ? null : p })} options={PERIODS.map((p) => ({ value: p, label: PERIOD_LABELS[p] }))} />
      <div className={styles.block}>
        <StatGrid columns={2} stats={[
          { label: "Total sales", value: formatMoney(summary.total) },
          { label: "Orders", value: summary.orders.length },
          { label: "Sites", value: summary.sites.length },
          { label: "Customers", value: summary.customerIds.length },
        ]} />
      </div>
      <Button block icon={<FiFileText />} className={styles.block} onClick={() => navigate(href("reports", { tab: "export", type: "contractor", contractor: contractor.id, period }))}>
        Contractor report PDF
      </Button>

      <Segmented label="Breakdown" className={styles.block} value={tab} onChange={(t) => setQuery(route, { tab: t === "items" ? null : t })} options={TABS} />
      <Breakdown tab={tab} summary={summary} contractorId={contractor.id} />

      <ContractorFormSheet open={editing} onClose={() => setEditing(false)} contractor={contractor} />
    </>
  );
}

function Breakdown({ tab, summary, contractorId }: { tab: Tab; summary: ContractorSummary; contractorId: string }) {
  const db = useDB();
  const sheets = useOrderSheets();
  const index = getLedgerIndex(db);
  const empty = <EmptyState icon={<FiInbox />} title="Nothing in this period" message="Completed orders through this contractor show up here." />;

  switch (tab) {
    case "items":
      return summary.items.length ? (
        <ListGroup>
          {summary.items.map((i) => <ListRow key={i.key} title={i.name} subtitle={`${i.category} · ${formatQty(i.qty)} ${i.unit}`} right={formatMoney(i.amount)} />)}
        </ListGroup>
      ) : empty;
    case "sites":
      return summary.sites.length ? (
        <ListGroup>
          {summary.sites.map((s) => <ListRow key={s.site} title={s.site} subtitle={plural(s.orders, "order")} right={formatMoney(s.amount)} />)}
        </ListGroup>
      ) : empty;
    case "customers": {
      if (!summary.customerIds.length) return empty;
      const salesOf = (customerId: string) => round2(summary.orders.filter((o) => o.customerId === customerId).reduce((s, o) => s + orderTotal(o), 0));
      return (
        <ListGroup>
          {summary.customerIds.map((id) => {
            const customer = index.customersById.get(id);
            return (
              <ListRow
                key={id}
                title={customer?.name ?? "Unknown"}
                subtitle={customer?.contractorId === contractorId ? "Default contractor" : undefined}
                right={formatMoney(salesOf(id))}
                href={href(`customers/${id}`)}
              />
            );
          })}
        </ListGroup>
      );
    }
    case "orders":
      return summary.orders.length ? (
        <ListGroup>
          {summary.orders.map((o) => (
            <ListRow
              key={o.id}
              title={index.customersById.get(o.customerId)?.name ?? "Unknown"}
              subtitle={`${formatDate(o.date)} · ${o.site ? o.site + " · " : ""}${itemsSummary(o)}`}
              right={formatMoney(orderTotal(o))}
              onClick={() => sheets.showOrder(o.id)}
              chevron
            />
          ))}
        </ListGroup>
      ) : empty;
  }
}
