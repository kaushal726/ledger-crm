import { useState } from "react";
import { deletePayment, savePayment } from "../../data/actions";
import { itemsSummary } from "../../data/ledger";
import { PAYMENT_METHODS } from "../../data/paymentMethods";
import { useDB } from "../../data/store";
import type { Payment, PaymentMethod } from "../../data/types";
import { formatDate, todayISO } from "../../lib/dates";
import { formatMoney, parseAmount } from "../../lib/format";
import { Button } from "../../ui/Button";
import { useConfirm } from "../../ui/Confirm";
import { TextAreaField, TextField } from "../../ui/Field";
import { FormLabel } from "../../ui/FormRows";
import { Segmented } from "../../ui/Segmented";
import { Sheet } from "../../ui/Sheet";
import { useToast } from "../../ui/Toast";
import styles from "./payments.module.css";

export interface PaymentPrefill {
  customerId: string;
  orderId?: string | null;
  amount?: number;
}

interface PaymentFormSheetProps {
  open: boolean;
  onClose: () => void;
  payment?: Payment;
  prefill?: PaymentPrefill;
}

export function PaymentFormSheet(props: PaymentFormSheetProps) {
  return props.open && (props.payment || props.prefill) ? <PaymentForm {...props} /> : null;
}

function PaymentForm({ open, onClose, payment, prefill }: PaymentFormSheetProps) {
  const db = useDB();
  const toast = useToast();
  const confirm = useConfirm();
  const customerId = payment?.customerId ?? prefill!.customerId;
  const orderId = payment?.orderId ?? prefill?.orderId ?? null;
  const [amount, setAmount] = useState(payment ? String(payment.amount) : prefill?.amount && prefill.amount > 0 ? String(prefill.amount) : "");
  const [method, setMethod] = useState<PaymentMethod>(payment?.method ?? "cash");
  const [date, setDate] = useState(payment?.date ?? todayISO());
  const [note, setNote] = useState(payment?.note ?? "");
  const [error, setError] = useState("");

  const customer = db.customers.find((c) => c.id === customerId);
  const order = orderId ? db.orders.find((o) => o.id === orderId) : undefined;

  const submit = () => {
    const value = parseAmount(amount);
    if (value <= 0) return setError("Enter an amount");
    if (!date) return setError("Choose a date");
    savePayment({ customerId, orderId, date, amount: value, method, note: note.trim() }, payment?.id ?? null);
    toast(payment ? "Payment updated" : `${formatMoney(value)} received`);
    onClose();
  };

  const remove = async () => {
    if (!payment) return;
    if (!(await confirm({ title: "Delete payment?", message: "The customer's balance goes back up by this amount.", confirmLabel: "Delete", danger: true }))) return;
    deletePayment(payment.id);
    toast("Payment deleted");
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={payment ? "Edit payment" : "Receive payment"}
      subtitle={customer?.name}
      footer={<Button variant="primary" block onClick={submit}>{payment ? "Save changes" : "Save payment"}</Button>}
    >
      {order && <p className={styles.against}>Against order of {formatDate(order.date)} · {itemsSummary(order)}</p>}
      <TextField label="Amount" prefix="₹" value={amount} onChange={(v) => { setAmount(v.replace(/[^\d.]/g, "")); setError(""); }} error={error} inputMode="decimal" autoFocus={!payment} />
      <FormLabel>Method</FormLabel>
      <Segmented label="Payment method" options={PAYMENT_METHODS} value={method} onChange={setMethod} className={styles.methods} />
      <TextField label="Date" type="date" value={date} onChange={setDate} max={todayISO()} />
      <TextAreaField label="Note" optional value={note} onChange={setNote} placeholder="e.g. cheque no., part payment…" />
      {payment && <Button variant="danger" block onClick={remove}>Delete payment</Button>}
    </Sheet>
  );
}
