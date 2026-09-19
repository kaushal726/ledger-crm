import { useState } from "react";
import { contractorHasActivity, deleteContractor, saveContractor } from "../../data/actions";
import { sameText } from "../../data/listOps";
import { useDB } from "../../data/store";
import type { Contractor } from "../../data/types";
import { Button } from "../../ui/Button";
import { useConfirm } from "../../ui/Confirm";
import { TextField } from "../../ui/Field";
import { Sheet } from "../../ui/Sheet";
import { useToast } from "../../ui/Toast";

interface ContractorFormSheetProps {
  open: boolean;
  onClose: () => void;
  contractor?: Contractor;
  initialName?: string;
  onSaved?: (id: string) => void;
}

export function ContractorFormSheet(props: ContractorFormSheetProps) {
  return props.open ? <ContractorForm {...props} /> : null;
}

function ContractorForm({ open, onClose, contractor, initialName = "", onSaved }: ContractorFormSheetProps) {
  const db = useDB();
  const toast = useToast();
  const confirm = useConfirm();
  const [name, setName] = useState(contractor?.name ?? initialName);
  const [phone, setPhone] = useState(contractor?.phone ?? "");
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim()) return setError("Enter a name");
    if (db.contractors.some((c) => c.id !== contractor?.id && sameText(c.name, name))) return setError("A contractor with this name already exists");
    const id = saveContractor({ name: name.trim(), phone: phone.trim() }, contractor?.id ?? null);
    toast(contractor ? "Contractor updated" : "Contractor added");
    onClose();
    onSaved?.(id);
  };

  const remove = async () => {
    if (!contractor) return;
    if (!(await confirm({ title: "Delete contractor?", message: "This can't be undone.", confirmLabel: "Delete", danger: true }))) return;
    deleteContractor(contractor.id);
    toast("Contractor deleted");
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={contractor ? "Edit contractor" : "New contractor"}
      footer={<Button variant="primary" block onClick={submit}>{contractor ? "Save changes" : "Add contractor"}</Button>}
    >
      <TextField label="Name" value={name} onChange={(v) => { setName(v); setError(""); }} error={error} autoComplete="off" autoFocus={!contractor} />
      <TextField label="Phone" optional value={phone} onChange={setPhone} type="tel" inputMode="tel" autoComplete="off" />
      {contractor && !contractorHasActivity(db, contractor.id) && (
        <Button variant="danger" block onClick={remove}>Delete contractor</Button>
      )}
    </Sheet>
  );
}
