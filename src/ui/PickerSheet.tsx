/* Searchable list in a sheet — used to pick a customer, contractor, item or order. */
import { useMemo, useState, type ReactNode } from "react";
import { FiPlus } from "react-icons/fi";
import { SearchInput } from "./inputs";
import { ListGroup, ListRow } from "./layout";
import { Sheet } from "./Sheet";
import styles from "./picker.module.css";

const VISIBLE_LIMIT = 80;

interface PickerSheetProps<T> {
  open: boolean;
  onClose: () => void;
  title: string;
  items: T[];
  getKey: (item: T) => string;
  getTitle: (item: T) => ReactNode;
  getSubtitle?: (item: T) => ReactNode;
  getRight?: (item: T) => ReactNode;
  matches: (item: T, query: string) => boolean;
  onPick: (item: T) => void;
  searchPlaceholder: string;
  emptyText: string;
  /** Extra rows above the results, e.g. "No contractor". */
  topRows?: ReactNode;
  /** e.g. "Add new customer" — receives the current search text. */
  createAction?: { label: string; onCreate: (query: string) => void };
}

export function PickerSheet<T>(props: PickerSheetProps<T>) {
  return props.open ? <PickerBody {...props} /> : null;
}

function PickerBody<T>({ open, onClose, title, items, getKey, getTitle, getSubtitle, getRight, matches, onPick, searchPlaceholder, emptyText, topRows, createAction }: PickerSheetProps<T>) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (q ? items.filter((item) => matches(item, q)) : items).slice(0, VISIBLE_LIMIT);
  }, [items, matches, query]);

  return (
    <Sheet open={open} onClose={onClose} title={title} size="full">
      <div className={styles.search}>
        <SearchInput value={query} onChange={setQuery} placeholder={searchPlaceholder} />
      </div>
      {createAction && (
        <button type="button" className={styles.create} onClick={() => createAction.onCreate(query.trim())}>
          <FiPlus aria-hidden />
          {createAction.label}
          {query.trim() && <span className={styles.createQuery}>“{query.trim()}”</span>}
        </button>
      )}
      {topRows && <ListGroup className={styles.group}>{topRows}</ListGroup>}
      {results.length ? (
        <ListGroup>
          {results.map((item) => (
            <ListRow
              key={getKey(item)}
              title={getTitle(item)}
              subtitle={getSubtitle?.(item)}
              right={getRight?.(item)}
              onClick={() => onPick(item)}
            />
          ))}
        </ListGroup>
      ) : (
        <p className={styles.empty}>{emptyText}</p>
      )}
    </Sheet>
  );
}
