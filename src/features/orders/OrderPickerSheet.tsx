import { useMemo } from "react";
import { getLedgerIndex, itemsSummary, orderTotal } from "../../data/ledger";
import { useDB } from "../../data/store";
import type { Order } from "../../data/types";
import { formatDate } from "../../lib/dates";
import { formatMoney } from "../../lib/format";
import { PickerSheet } from "../../ui/PickerSheet";

interface OrderPickerSheetProps {
  open: boolean;
  onClose: () => void;
  onPick: (orderId: string) => void;
}

export function OrderPickerSheet({ open, onClose, onPick }: OrderPickerSheetProps) {
  const db = useDB();
  const index = getLedgerIndex(db);
  const customerName = (o: Order) => index.customersById.get(o.customerId)?.name ?? "";
  const orders = useMemo(
    () => db.orders.filter((o) => o.status !== "cancelled").sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [db.orders],
  );

  return (
    <PickerSheet
      open={open}
      onClose={onClose}
      title="Choose order"
      items={orders}
      getKey={(o) => o.id}
      getTitle={customerName}
      getSubtitle={(o) => `${formatDate(o.date)} · ${itemsSummary(o)}`}
      getRight={(o) => formatMoney(orderTotal(o))}
      matches={(o, q) => customerName(o).toLowerCase().includes(q) || itemsSummary(o).toLowerCase().includes(q)}
      onPick={(o) => { onPick(o.id); onClose(); }}
      searchPlaceholder="Search by customer or item"
      emptyText="No orders found"
    />
  );
}
