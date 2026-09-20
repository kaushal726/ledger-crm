import { useState } from "react";
import { FiAlertCircle, FiBriefcase, FiEdit2, FiFileText, FiMapPin, FiMessageCircle, FiPhone, FiPlus } from "react-icons/fi";
import { businessOf } from "../../data/business";
import { EMPTY_ACCOUNT, customerLedger, getLedgerIndex } from "../../data/ledger";
import { useDB } from "../../data/store";
import { href, navigate } from "../../app/router";
import { telLink, whatsappLink } from "../../lib/contact";
import { cx } from "../../lib/cx";
import { formatMoney, formatPhone } from "../../lib/format";
import { Button, IconButton } from "../../ui/Button";
import { EmptyState } from "../../ui/feedback";
import { DetailLayout, PageHeader, PageMeta, Panel, SectionTitle } from "../../ui/layout";
import { useOrderSheets } from "../orders/OrderSheets";
import { CustomerFormSheet } from "./CustomerFormSheet";
import { LedgerList } from "./LedgerList";
import styles from "./customers.module.css";

const LEDGER_PAGE = 60;
const BACK = { label: "Customers", href: href("customers") };

export function CustomerDetailScreen({ customerId }: { customerId: string }) {
  const db = useDB();
  const sheets = useOrderSheets();
  const [editing, setEditing] = useState(false);
  const [limit, setLimit] = useState(LEDGER_PAGE);
  const index = getLedgerIndex(db);
  const customer = index.customersById.get(customerId);

  if (!customer) {
    return (
      <>
        <PageHeader back={BACK} title="Customer" />
        <EmptyState icon={<FiAlertCircle />} title="Customer not found" message="It may have been deleted on another device." />
      </>
    );
  }

  const account = index.accounts.get(customer.id) ?? EMPTY_ACCOUNT;
  const business = businessOf(db);
  const contractor = customer.contractorId ? index.contractorsById.get(customer.contractorId) : undefined;
  const entries = customerLedger(db, customer.id).reverse();
  const reminder = account.balance > 0
    ? `Namaste ${customer.name}, your pending balance${business.name ? ` with ${business.name}` : ""} is ${formatMoney(account.balance)}. Thank you.`
    : undefined;
  const balanceLabel = account.balance > 0 ? "Balance due" : account.balance < 0 ? "Advance with you" : "All settled";

  return (
    <>
      <PageHeader
        back={BACK}
        title={customer.name}
        actions={
          <>
            {customer.phone && <IconButton label="Call" icon={<FiPhone />} onClick={() => (window.location.href = telLink(customer.phone))} />}
            {customer.phone && <IconButton label="WhatsApp" icon={<FiMessageCircle />} onClick={() => window.open(whatsappLink(customer.phone, reminder), "_blank", "noopener")} />}
            <IconButton label="Edit customer" icon={<FiEdit2 />} onClick={() => setEditing(true)} />
          </>
        }
      />
      <PageMeta>
        {customer.phone && <span className="num">{formatPhone(customer.phone)}</span>}
        {customer.address && <span><FiMapPin aria-hidden />{customer.address}</span>}
        {contractor && <span><FiBriefcase aria-hidden />{contractor.name}</span>}
      </PageMeta>

      <DetailLayout
        aside={
          <>
            <Panel className={cx(styles.balance, account.balance > 0 ? styles.balanceDue : account.balance < 0 ? styles.balanceAdvance : styles.balanceSettled)}>
              <div className={styles.balanceLabel}>{balanceLabel}</div>
              <div className={cx(styles.balanceValue, "num", account.balance > 0 && styles.due, account.balance < 0 && styles.advance)}>
                {formatMoney(Math.abs(account.balance))}
              </div>
              <div className={cx(styles.balanceSplit, "num")}>
                <span>Total sales <b>{formatMoney(account.sales)}</b></span>
                <span>Received <b>{formatMoney(account.received)}</b></span>
                {account.opening !== 0 && <span>Opening <b>{formatMoney(account.opening)}</b></span>}
              </div>
            </Panel>

            <div className={styles.actions}>
              <Button variant="primary" onClick={() => sheets.receivePayment({ customerId: customer.id, amount: account.balance > 0 ? account.balance : undefined })}>Receive payment</Button>
              <Button icon={<FiPlus />} onClick={() => sheets.newOrder({ customerId: customer.id })}>New order</Button>
              <Button icon={<FiFileText />} onClick={() => navigate(href("reports", { tab: "export", type: "statement", customer: customer.id }))}>Statement PDF</Button>
            </div>
          </>
        }
      >
        <SectionTitle right={<span>Balance</span>}>Ledger</SectionTitle>
        {entries.length ? (
          <>
            <LedgerList entries={entries.slice(0, limit)} onOpenOrder={sheets.showOrder} onOpenPayment={sheets.editPayment} />
            {entries.length > limit && <Button block className={styles.more} onClick={() => setLimit((l) => l + LEDGER_PAGE)}>Show older entries</Button>}
          </>
        ) : (
          <EmptyState icon={<FiFileText />} title="No entries yet" message="Completed orders and payments for this customer show up here." />
        )}
      </DetailLayout>

      <CustomerFormSheet open={editing} onClose={() => setEditing(false)} customer={customer} onDeleted={() => navigate(BACK.href, { replace: true })} />
    </>
  );
}
