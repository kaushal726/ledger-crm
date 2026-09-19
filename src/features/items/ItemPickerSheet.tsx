import { useMemo, useState } from "react";
import { useDB } from "../../data/store";
import type { Item } from "../../data/types";
import { formatMoney } from "../../lib/format";
import { PickerSheet } from "../../ui/PickerSheet";
import { ItemFormSheet } from "./ItemFormSheet";

interface ItemPickerSheetProps {
  open: boolean;
  onClose: () => void;
  onPick: (item: Item) => void;
}

const matches = (i: Item, q: string) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q);

export function ItemPickerSheet({ open, onClose, onPick }: ItemPickerSheetProps) {
  const db = useDB();
  const [creating, setCreating] = useState<string | null>(null);
  const items = useMemo(() => [...db.items].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)), [db.items]);

  const pick = (item: Item) => {
    onPick(item);
    onClose();
  };

  return (
    <>
      <PickerSheet
        open={open}
        onClose={onClose}
        title="Add item"
        items={items}
        getKey={(i) => i.id}
        getTitle={(i) => i.name}
        getSubtitle={(i) => i.category}
        getRight={(i) => `${formatMoney(i.price)}${i.unit ? " / " + i.unit : ""}`}
        matches={matches}
        onPick={pick}
        searchPlaceholder="Search items"
        emptyText="No items found"
        createAction={{ label: "Add new item", onCreate: (q) => setCreating(q) }}
      />
      <ItemFormSheet open={creating !== null} onClose={() => setCreating(null)} initialName={creating ?? ""} onSaved={pick} />
    </>
  );
}
