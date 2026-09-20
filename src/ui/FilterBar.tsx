/* Search plus the secondary filters, kept behind one button so a list screen
 * keeps a single filter row instead of a wall of chips.
 */
import { useState } from "react";
import { FiCheck, FiSliders } from "react-icons/fi";
import { cx } from "../lib/cx";
import { Button } from "./Button";
import { SearchInput } from "./inputs";
import { Sheet } from "./Sheet";
import styles from "./filterBar.module.css";

export interface FilterOption {
  value: string;
  label: string;
  /** How many rows this choice would leave, when the screen can say. */
  count?: number;
}

export interface FilterGroup {
  key: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  /** Value that means "no filter"; the first option unless given. */
  defaultValue?: string;
}

interface FilterBarProps {
  search: { value: string; onChange: (value: string) => void; placeholder: string };
  groups: FilterGroup[];
  className?: string;
}

const defaultOf = (group: FilterGroup) => group.defaultValue ?? group.options[0]?.value ?? "";
const isActive = (group: FilterGroup) => group.value !== defaultOf(group);

export function FilterBar({ search, groups, className }: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const activeCount = groups.filter(isActive).length;
  const reset = () => groups.forEach((g) => isActive(g) && g.onChange(defaultOf(g)));

  return (
    <div className={cx(styles.bar, className)}>
      <div className={styles.search}>
        <SearchInput value={search.value} onChange={search.onChange} placeholder={search.placeholder} />
      </div>
      <button
        type="button"
        className={cx(styles.trigger, activeCount > 0 && styles.triggerActive)}
        aria-label={`Filter and sort${activeCount ? ` (${activeCount} applied)` : ""}`}
        onClick={() => setOpen(true)}
      >
        <FiSliders aria-hidden />
        {activeCount > 0 && <span className={styles.badge}>{activeCount}</span>}
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Filter & sort"
        headerAction={activeCount > 0 ? <Button size="sm" onClick={reset}>Reset</Button> : undefined}
        footer={<Button variant="primary" block onClick={() => setOpen(false)}>Show results</Button>}
      >
        {groups.map((group) => (
          <div key={group.key} className={styles.group}>
            <div className={styles.groupLabel}>{group.label}</div>
            <div className={styles.options} role="listbox" aria-label={group.label}>
              {group.options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={o.value === group.value}
                  className={styles.option}
                  onClick={() => group.onChange(o.value)}
                >
                  <span className={styles.optionLabel}>{o.label}</span>
                  {o.count !== undefined && <span className={styles.count}>{o.count}</span>}
                  {o.value === group.value && <FiCheck aria-hidden />}
                </button>
              ))}
            </div>
          </div>
        ))}
      </Sheet>
    </div>
  );
}
