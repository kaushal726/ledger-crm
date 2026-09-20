/* Money in or out that isn't an order: cash from someone other than a customer, and money
 * paid out (staff, expenses). Money in from a customer is saved as a normal payment, so it
 * still lands in that customer's ledger.
 */
import { useState } from "react";
import { deleteCash, savePayment, saveCash } from "../../data/actions";
import { PAYMENT_METHODS } from "../../data/paymentMethods";
import { getDB, useDB } from "../../data/store";
import type { CashDirection, CashEntry, PaymentMethod } from "../../data/types";
import { todayISO } from "../../lib/dates";
import { formatMoney, parseAmount } from "../../lib/format";
import { Button } from "../../ui/Button";
import { useConfirm } from "../../ui/Confirm";
import { TextAreaField, TextField } from "../../ui/Field";
import { FormGroup, FormLabel, PickRow } from "../../ui/FormRows";
import { QuickAmounts } from "../../ui/QuickAmounts";
import { Segmented } from "../../ui/Segmented";
import { Sheet } from "../../ui/Sheet";
import { useToast } from "../../ui/Toast";
import { CustomerPickerSheet } from "../customers/CustomerPickerSheet";
import styles from "./cash.module.css";

export interface CashPrefill {
  direction: CashDirection;
  date?: string;
}

interface CashFormSheetProps {
  open: boolean;
  onClose: () => void;
  entry?: CashEntry;
  prefill?: CashPrefill;
}

type Source = "customer" | "other";

const SOURCES: { value: Source; label: string }[] = [
  { value: "customer", label: "Customer" },
  { value: "other", label: "Someone else" },
];

export function CashFormSheet(props: CashFormSheetProps) {
  return props.open && (props.entry || props.prefill) ? <CashForm {...props} /> : null;
}

function CashForm({ open, onClose, entry, prefill }: CashFormSheetProps) {
  const db = useDB();
  const toast = useToast();
  const confirm = useConfirm();
  const direction: CashDirection = entry?.direction ?? prefill!.direction;
  const isIn = direction === "in";

  const [source, setSource] = useState<Source>("other");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [party, setParty] = useState(entry?.party ?? "");
  const [amount, setAmount] = useState(entry ? String(entry.amount) : "");
  const [method, setMethod] = useState<PaymentMethod>(entry?.method ?? "cash");
  const [date, setDate] = useState(entry?.date ?? prefill?.date ?? todayISO());
  const [note, setNote] = useState(entry?.note ?? "");
  const [error, setError] = useState("");

  // Only a new "money in" can go to a customer's ledger; a saved cash entry stays cash.
  const toCustomer = isIn && !entry && source === "customer";
  const customer = customerId ? db.customers.find((c) => c.id === customerId) : undefined;

  const submit = () => {
    const value = parseAmount(amount);
    if (value <= 0) return setError("Enter an amount");
    if (!date) return setError("Choose a date");
    if (toCustomer) {
      if (!customerId) return setError("Choose a customer");
      savePayment({ customerId, orderId: null, date, amount: value, method, note: note.trim() }, null);
      toast(`${formatMoney(value)} received from ${getDB().customers.find((c) => c.id === customerId)?.name ?? "customer"}`);
    } else {
      saveCash({ direction, date, amount: value, method, party: party.trim(), note: note.trim() }, entry?.id ?? null);
      toast(entry ? "Entry updated" : isIn ? `${formatMoney(value)} added` : `${formatMoney(value)} paid out`);
    }
    onClose();
  };

  const remove = async () => {
    if (!entry) return;
    const message = entry.direction === "in" ? "The day's collection goes down by this amount." : "The day's payments out go down by this amount.";
    if (!(await confirm({ title: "Delete this entry?", message, confirmLabel: "Delete", danger: true }))) return;
    deleteCash(entry.id);
    toast("Entry deleted");
    onClose();
  };

  const title = entry ? (isIn ? "Edit money in" : "Edit money out") : isIn ? "Payment in" : "Payment out";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={<Button variant="primary" block onClick={submit}>{entry ? "Save changes" : "Save"}</Button>}
    >
      {isIn && !entry && (
        <>
          <FormLabel>Received from</FormLabel>
          <Segmented label="Received from" options={SOURCES} value={source} onChange={setSource} className={styles.block} />
        </>
      )}

      {toCustomer ? (
        <FormGroup>
          <PickRow label="Customer" value={customer?.name} placeholder="Not chosen" onClick={() => setPicking(true)} />
        </FormGroup>
      ) : (
        <TextField
          label={isIn ? "Received from" : "Paid to"}
          optional={isIn}
          value={party}
          onChange={setParty}
          placeholder={isIn ? "e.g. scrap sale" : "e.g. Ramu (staff)"}
        />
      )}

      <TextField label="Amount" prefix="₹" value={amount} onChange={(v) => { setAmount(v.replace(/[^\d.]/g, "")); setError(""); }} error={error} inputMode="decimal" autoFocus={!entry} />
      <QuickAmounts value={amount} onChange={(v) => { setAmount(v); setError(""); }} />
      <FormLabel>Method</FormLabel>
      <Segmented label="Payment method" options={PAYMENT_METHODS} value={method} onChange={setMethod} className={styles.block} />
      <TextField label="Date" type="date" value={date} onChange={setDate} max={todayISO()} />
      <TextAreaField label="Note" optional value={note} onChange={setNote} placeholder={isIn ? "What is this for?" : "e.g. salary advance"} />

      {entry && <Button variant="danger" block onClick={remove}>Delete entry</Button>}
      <CustomerPickerSheet open={picking} onClose={() => setPicking(false)} onPick={(id) => { setCustomerId(id); setError(""); }} />
    </Sheet>
  );
}
