import { useMemo, useState } from "react";
import { EMPTY_ACCOUNT, getLedgerIndex } from "../../data/ledger";
import { useDB } from "../../data/store";
import { matchesNameOrPhone } from "../../data/search";
import { formatPhone } from "../../lib/format";
import { PickerSheet } from "../../ui/PickerSheet";
import { BalanceText } from "./BalanceText";
import { CustomerFormSheet } from "./CustomerFormSheet";

interface CustomerPickerSheetProps {
  open: boolean;
  onClose: () => void;
  onPick: (customerId: string) => void;
}

export function CustomerPickerSheet({ open, onClose, onPick }: CustomerPickerSheetProps) {
  const db = useDB();
  const index = getLedgerIndex(db);
  const [creating, setCreating] = useState<string | null>(null);
  const customers = useMemo(() => [...db.customers].sort((a, b) => a.name.localeCompare(b.name)), [db.customers]);

  const pick = (id: string) => {
    onPick(id);
    onClose();
  };

  return (
    <>
      <PickerSheet
        open={open}
        onClose={onClose}
        title="Choose customer"
        items={customers}
        getKey={(c) => c.id}
        getTitle={(c) => c.name}
        getSubtitle={(c) => (c.phone ? formatPhone(c.phone) : undefined)}
        getRight={(c) => <BalanceText balance={(index.accounts.get(c.id) ?? EMPTY_ACCOUNT).balance} compact />}
        matches={matchesNameOrPhone}
        onPick={(c) => pick(c.id)}
        searchPlaceholder="Search name or phone"
        emptyText="No customers found"
        createAction={{ label: "Add new customer", onCreate: (q) => setCreating(q) }}
      />
      <CustomerFormSheet open={creating !== null} onClose={() => setCreating(null)} initialName={/\d/.test(creating ?? "") ? "" : creating ?? ""} onSaved={pick} />
    </>
  );
}
