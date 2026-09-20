import { useId, useMemo, useState } from "react";
import { deleteItem, saveItem } from "../../data/actions";
import { sameText } from "../../data/listOps";
import { useDB } from "../../data/store";
import type { Item } from "../../data/types";
import { parseAmount } from "../../lib/format";
import { Button } from "../../ui/Button";
import { useConfirm } from "../../ui/Confirm";
import { TextField } from "../../ui/Field";
import { QuickAmounts } from "../../ui/QuickAmounts";
import { Sheet } from "../../ui/Sheet";
import { useToast } from "../../ui/Toast";

interface ItemFormSheetProps {
  open: boolean;
  onClose: () => void;
  item?: Item;
  initialName?: string;
  onSaved?: (item: Item) => void;
}

export function ItemFormSheet(props: ItemFormSheetProps) {
  return props.open ? <ItemForm {...props} /> : null;
}

function ItemForm({ open, onClose, item, initialName = "", onSaved }: ItemFormSheetProps) {
  const db = useDB();
  const toast = useToast();
  const confirm = useConfirm();
  const categoriesId = useId();
  const [category, setCategory] = useState(item?.category ?? "");
  const [name, setName] = useState(item?.name ?? initialName);
  const [unit, setUnit] = useState(item?.unit ?? "");
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [error, setError] = useState("");
  const categories = useMemo(() => [...new Set(db.items.map((i) => i.category).filter(Boolean))].sort(), [db.items]);

  const submit = () => {
    if (!name.trim()) return setError("Enter an item name");
    if (db.items.some((i) => i.id !== item?.id && sameText(i.name, name))) return setError("An item with this name already exists");
    const saved = saveItem({ category: category.trim(), name: name.trim(), unit: unit.trim(), price: parseAmount(price) }, item?.id ?? null);
    toast(item ? "Item updated" : "Item added");
    onClose();
    onSaved?.(saved);
  };

  const remove = async () => {
    if (!item) return;
    const ok = await confirm({ title: "Remove item?", message: "Past orders keep their own copy of this item.", confirmLabel: "Remove", danger: true });
    if (!ok) return;
    deleteItem(item.id);
    toast("Item removed");
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={item ? "Edit item" : "New item"}
      footer={<Button variant="primary" block onClick={submit}>{item ? "Save changes" : "Add item"}</Button>}
    >
      <TextField label="Item name" value={name} onChange={(v) => { setName(v); setError(""); }} error={error} autoComplete="off" autoFocus={!item && !initialName} />
      <TextField label="Category" optional value={category} onChange={setCategory} list={categoriesId} autoComplete="off" placeholder="Groups similar items" />
      <datalist id={categoriesId}>{categories.map((c) => <option key={c} value={c} />)}</datalist>
      <TextField label="Unit" optional value={unit} onChange={setUnit} autoComplete="off" placeholder="pc, kg, box…" />
      <TextField label="Default price" prefix="₹" value={price} onChange={(v) => setPrice(v.replace(/[^\d.]/g, ""))} inputMode="decimal" autoFocus={!item && Boolean(initialName)} />
      <QuickAmounts value={price} onChange={setPrice} />
      {item && <Button variant="danger" block onClick={remove}>Remove item</Button>}
    </Sheet>
  );
}
