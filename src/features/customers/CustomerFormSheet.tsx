import { useState } from "react";
import { customerHasActivity, deleteCustomer, saveCustomer } from "../../data/actions";
import { useDB } from "../../data/store";
import type { Customer } from "../../data/types";
import { parseAmount } from "../../lib/format";
import { Button } from "../../ui/Button";
import { useConfirm } from "../../ui/Confirm";
import { TextField } from "../../ui/Field";
import { FormGroup, FormLabel, PickRow } from "../../ui/FormRows";
import { Sheet } from "../../ui/Sheet";
import { useToast } from "../../ui/Toast";
import { ContractorPickerSheet } from "../contractors/ContractorPickerSheet";

interface CustomerFormSheetProps {
  open: boolean;
  onClose: () => void;
  customer?: Customer;
  initialName?: string;
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
}

const PHONE_DIGITS = 10;

export function CustomerFormSheet(props: CustomerFormSheetProps) {
  return props.open ? <CustomerForm {...props} /> : null;
}

function CustomerForm({ open, onClose, customer, initialName = "", onSaved, onDeleted }: CustomerFormSheetProps) {
  const db = useDB();
  const toast = useToast();
  const confirm = useConfirm();
  const [name, setName] = useState(customer?.name ?? initialName);
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [contractorId, setContractorId] = useState<string | null>(customer?.contractorId ?? null);
  const [opening, setOpening] = useState(customer?.openingBalance ? String(customer.openingBalance) : "");
  const [pickingContractor, setPickingContractor] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const contractor = contractorId ? db.contractors.find((c) => c.id === contractorId) : undefined;

  const submit = () => {
    const digits = phone.replace(/\D/g, "");
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Enter a name";
    if (phone.trim() && digits.length < PHONE_DIGITS) next.phone = "Enter a 10-digit phone number";
    else if (digits && db.customers.some((c) => c.id !== customer?.id && c.phone.replace(/\D/g, "") === digits)) next.phone = "Another customer already has this phone number";
    setErrors(next);
    if (Object.keys(next).length) return;

    const id = saveCustomer({ name: name.trim(), phone: phone.trim(), address: address.trim(), contractorId, openingBalance: parseAmount(opening) }, customer?.id ?? null);
    toast(customer ? "Customer updated" : "Customer added");
    onClose();
    onSaved?.(id);
  };

  const remove = async () => {
    if (!customer) return;
    if (!(await confirm({ title: "Delete customer?", message: "This can't be undone.", confirmLabel: "Delete", danger: true }))) return;
    deleteCustomer(customer.id);
    toast("Customer deleted");
    onClose();
    onDeleted?.();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="full"
      title={customer ? "Edit customer" : "New customer"}
      footer={<Button variant="primary" block onClick={submit}>{customer ? "Save changes" : "Add customer"}</Button>}
    >
      <TextField label="Name" value={name} onChange={(v) => { setName(v); setErrors((e) => ({ ...e, name: undefined })); }} error={errors.name} autoComplete="off" autoFocus={!customer} />
      <TextField label="Phone" optional value={phone} onChange={(v) => { setPhone(v); setErrors((e) => ({ ...e, phone: undefined })); }} error={errors.phone} type="tel" inputMode="tel" autoComplete="off" />
      <TextField label="Address" optional value={address} onChange={setAddress} autoComplete="off" />

      <FormLabel>Default contractor</FormLabel>
      <FormGroup>
        <PickRow label="Contractor" value={contractor?.name} placeholder="None" detail="Filled in on new orders" onClick={() => setPickingContractor(true)} />
      </FormGroup>

      <TextField
        label="Opening balance"
        optional
        prefix="₹"
        value={opening}
        onChange={(v) => setOpening(v.replace(/[^\d.-]/g, ""))}
        inputMode="decimal"
        hint="Amount already due before using this app (purana baaki). Use a minus sign for an advance."
      />

      {customer && !customerHasActivity(db, customer.id) && (
        <Button variant="danger" block onClick={remove}>Delete customer</Button>
      )}

      <ContractorPickerSheet open={pickingContractor} onClose={() => setPickingContractor(false)} onPick={setContractorId} />
    </Sheet>
  );
}
