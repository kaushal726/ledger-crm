import { FiCalendar, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { addDays, formatDate, formatDayLabel } from "../../lib/dates";
import { IconButton } from "../../ui/Button";
import styles from "./orders.module.css";

export function DateSwitcher({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  const label = formatDayLabel(date);
  const isNamedDay = ["Today", "Yesterday", "Tomorrow"].includes(label);
  return (
    <div className={styles.dateSwitch}>
      <IconButton label="Previous day" icon={<FiChevronLeft />} bare onClick={() => onChange(addDays(date, -1))} />
      <label className={styles.dateLabel}>
        <FiCalendar aria-hidden size={16} />
        {label}
        {isNamedDay && <span>· {formatDate(date, { weekday: "short", day: "numeric", month: "short" })}</span>}
        <input type="date" value={date} onChange={(e) => e.target.value && onChange(e.target.value)} aria-label="Pick a date" />
      </label>
      <IconButton label="Next day" icon={<FiChevronRight />} bare onClick={() => onChange(addDays(date, 1))} />
    </div>
  );
}
