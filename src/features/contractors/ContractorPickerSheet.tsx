import { useMemo, useState } from "react";
import { FiSlash } from "react-icons/fi";
import { useDB } from "../../data/store";
import { matchesNameOrPhone } from "../../data/search";
import { formatPhone } from "../../lib/format";
import { ListRow } from "../../ui/layout";
import { PickerSheet } from "../../ui/PickerSheet";
import { ContractorFormSheet } from "./ContractorFormSheet";

interface ContractorPickerSheetProps {
  open: boolean;
  onClose: () => void;
  onPick: (contractorId: string | null) => void;
}

export function ContractorPickerSheet({ open, onClose, onPick }: ContractorPickerSheetProps) {
  const db = useDB();
  const [creating, setCreating] = useState<string | null>(null);
  const contractors = useMemo(() => [...db.contractors].sort((a, b) => a.name.localeCompare(b.name)), [db.contractors]);

  const pick = (id: string | null) => {
    onPick(id);
    onClose();
  };

  return (
    <>
      <PickerSheet
        open={open}
        onClose={onClose}
        title="Choose contractor"
        items={contractors}
        getKey={(c) => c.id}
        getTitle={(c) => c.name}
        getSubtitle={(c) => (c.phone ? formatPhone(c.phone) : undefined)}
        matches={matchesNameOrPhone}
        onPick={(c) => pick(c.id)}
        searchPlaceholder="Search contractors"
        emptyText="No contractors found"
        topRows={<ListRow leading={<FiSlash />} title="No contractor" onClick={() => pick(null)} />}
        createAction={{ label: "Add new contractor", onCreate: (q) => setCreating(q) }}
      />
      <ContractorFormSheet open={creating !== null} onClose={() => setCreating(null)} initialName={creating ?? ""} onSaved={(id) => pick(id)} />
    </>
  );
}
