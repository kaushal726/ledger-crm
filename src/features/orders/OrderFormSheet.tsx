import { useId, useMemo, useState } from "react";
import { saveOrder } from "../../data/actions";
import { EMPTY_ACCOUNT, getLedgerIndex } from "../../data/ledger";
import { PAYMENT_METHODS } from "../../data/paymentMethods";
import { getDB, useDB } from "../../data/store";
import type { Order, PaymentMethod } from "../../data/types";
import { formatMoney, formatPhone } from "../../lib/format";
import { Button } from "../../ui/Button";
import { TextAreaField, TextField } from "../../ui/Field";
import { FormError, FormGroup, FormLabel, InputRow, PickRow } from "../../ui/FormRows";
import { Segmented } from "../../ui/Segmented";
import { Sheet } from "../../ui/Sheet";
import { useToast } from "../../ui/Toast";
import { ContractorPickerSheet } from "../contractors/ContractorPickerSheet";
import { CustomerPickerSheet } from "../customers/CustomerPickerSheet";
import { ItemPickerSheet } from "../items/ItemPickerSheet";
import { LineItemsEditor } from "./LineItemsEditor";
import { draftFromOrder, draftToInput, draftTotal, hasErrors, lineFromItem, newDraft, validateDraft, type DraftErrors, type DraftLine, type OrderDraft, type OrderPrefill } from "./orderDraft";
import { PaymentHint } from "./PaymentHint";
import styles from "./orders.module.css";

type Picker = "customer" | "contractor" | "item" | null;
type PayChoice = PaymentMethod | "none";

const STATUS_OPTIONS = [{ value: "pending" as const, label: "Pending" }, { value: "completed" as const, label: "Completed" }];
const PAY_OPTIONS: { value: PayChoice; label: string }[] = [{ value: "none", label: "None" }, ...PAYMENT_METHODS];

interface OrderFormSheetProps {
  open: boolean;
  onClose: () => void;
  order?: Order;
  prefill?: OrderPrefill;
}

export function OrderFormSheet(props: OrderFormSheetProps) {
  return props.open ? <OrderForm {...props} /> : null;
}

function OrderForm({ open, onClose, order, prefill }: OrderFormSheetProps) {
  const db = useDB();
  const toast = useToast();
  const sitesId = useId();
  const [draft, setDraft] = useState<OrderDraft>(() => (order ? draftFromOrder(order) : newDraft(db, prefill)));
  const [contractorTouched, setContractorTouched] = useState(Boolean(order));
  const [picker, setPicker] = useState<Picker>(null);
  const [errors, setErrors] = useState<DraftErrors>({});

  const index = getLedgerIndex(db);
  const customer = draft.customerId ? index.customersById.get(draft.customerId) : undefined;
  const contractor = draft.contractorId ? index.contractorsById.get(draft.contractorId) : undefined;
  const balance = customer ? (index.accounts.get(customer.id) ?? EMPTY_ACCOUNT).balance : 0;
  const total = draftTotal(draft);
  const pastSites = useMemo(
    () => [...new Set((index.ordersByCustomer.get(draft.customerId ?? "") ?? []).map((o) => o.site).filter(Boolean))],
    [index, draft.customerId],
  );

  const update = (patch: Partial<OrderDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const updateLine = (key: string, patch: Partial<DraftLine>) => update({ lines: draft.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) });

  const pickCustomer = (id: string) => {
    const next = getDB().customers.find((c) => c.id === id); // fresh: may have just been created
    update({ customerId: id, ...(contractorTouched ? {} : { contractorId: next?.contractorId ?? null }) });
    setErrors((e) => ({ ...e, customer: undefined }));
  };

  const choosePay = (choice: PayChoice) => {
    const method = choice === "none" ? null : choice;
    update({ payMethod: method, payAmount: method && !draft.payAmount ? String(total || "") : method ? draft.payAmount : "" });
  };

  const submit = () => {
    const found = validateDraft(draft);
    setErrors(found);
    if (hasErrors(found)) return toast("Please fill the highlighted fields", { tone: "error" });
    saveOrder(draftToInput(draft), order?.id ?? null);
    toast(order ? "Order updated" : "Order saved");
    onClose();
  };

  const balanceDetail = [customer?.phone && formatPhone(customer.phone), balance > 0 ? `Due ${formatMoney(balance)}` : balance < 0 ? `Advance ${formatMoney(-balance)}` : ""].filter(Boolean).join(" · ");

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="full"
      title={order ? "Edit order" : "New order"}
      footer={
        <>
          <div className={styles.footTotal}>
            <PaymentHint draft={draft} total={total} />
            <b className="num">{formatMoney(total)}</b>
          </div>
          <Button variant="primary" onClick={submit}>{order ? "Save changes" : "Save order"}</Button>
        </>
      }
    >
      <FormGroup invalid={Boolean(errors.customer)}>
        <PickRow label="Customer" value={customer?.name} detail={balanceDetail} placeholder="Not chosen" onClick={() => setPicker("customer")} />
        <PickRow label="Contractor" value={contractor?.name} detail={!contractorTouched && contractor ? "Customer's default" : undefined} placeholder="None" onClick={() => setPicker("contractor")} />
        <InputRow label="Site" value={draft.site} onChange={(site) => update({ site })} placeholder="Site name (optional)" list={sitesId} autoComplete="off" />
        <InputRow label="Date" type="date" value={draft.date} onChange={(date) => update({ date })} />
      </FormGroup>
      <datalist id={sitesId}>{pastSites.map((s) => <option key={s} value={s} />)}</datalist>
      <FormError>{errors.customer}</FormError>

      <FormLabel>Status</FormLabel>
      <Segmented label="Order status" options={STATUS_OPTIONS} value={draft.status} onChange={(status) => update({ status })} className={styles.formBlock} />

      <FormLabel>Items</FormLabel>
      <LineItemsEditor
        lines={draft.lines}
        badLines={errors.badLines}
        invalid={Boolean(errors.lines)}
        onChange={updateLine}
        onRemove={(key) => update({ lines: draft.lines.filter((l) => l.key !== key) })}
        onAdd={() => setPicker("item")}
      />
      <FormError>{errors.lines}</FormError>

      {!order && (
        <>
          <FormLabel>Payment received now</FormLabel>
          <Segmented label="Payment method" options={PAY_OPTIONS} value={draft.payMethod ?? "none"} onChange={choosePay} className={styles.formBlock} />
          {draft.payMethod && (
            <TextField label="Amount received" prefix="₹" value={draft.payAmount} onChange={(v) => update({ payAmount: v.replace(/[^\d.]/g, "") })} inputMode="decimal" />
          )}
        </>
      )}

      <TextAreaField label="Note" optional value={draft.note} onChange={(note) => update({ note })} placeholder="Anything to remember about this order" />

      <CustomerPickerSheet open={picker === "customer"} onClose={() => setPicker(null)} onPick={pickCustomer} />
      <ContractorPickerSheet open={picker === "contractor"} onClose={() => setPicker(null)} onPick={(id) => { update({ contractorId: id }); setContractorTouched(true); }} />
      <ItemPickerSheet
        open={picker === "item"}
        onClose={() => setPicker(null)}
        onPick={(item) => { update({ lines: [...draft.lines, lineFromItem(item)] }); setErrors((e) => ({ ...e, lines: undefined })); }}
      />
    </Sheet>
  );
}
