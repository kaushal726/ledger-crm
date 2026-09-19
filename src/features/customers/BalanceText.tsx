import { formatMoney } from "../../lib/format";
import { Chip } from "../../ui/feedback";

/** Customer balance as a chip: red "due", green "advance", grey "settled". */
export function BalanceText({ balance, compact }: { balance: number; compact?: boolean }) {
  if (balance > 0) return <Chip tone="due">{formatMoney(balance)}{compact ? "" : " due"}</Chip>;
  if (balance < 0) return <Chip tone="paid">{formatMoney(-balance)} adv</Chip>;
  return <Chip>Settled</Chip>;
}
