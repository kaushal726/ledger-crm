import { formatMoney, parseAmount, round2 } from "../../lib/format";
import type { OrderDraft } from "./orderDraft";

/** One line under the total explaining where the money stands, e.g. "₹3,500 goes to due". */
export function PaymentHint({ draft, total }: { draft: OrderDraft; total: number }) {
  const paid = draft.payMethod ? parseAmount(draft.payAmount) : 0;
  const rest = round2(total - paid);
  let text = "Total";
  if (paid > 0 && rest <= 0) text = "Fully paid";
  else if (paid > 0) text = draft.status === "completed" ? `${formatMoney(rest)} goes to due` : `${formatMoney(paid)} advance`;
  else if (draft.status === "completed" && total > 0) text = "Full amount goes to due";
  return <small>{text}</small>;
}
