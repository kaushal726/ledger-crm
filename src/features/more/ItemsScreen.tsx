import { useState } from "react";
import { FiPackage, FiPlus } from "react-icons/fi";
import { useDB } from "../../data/store";
import type { Item } from "../../data/types";
import { href } from "../../app/router";
import { formatMoney } from "../../lib/format";
import { Button } from "../../ui/Button";
import { EmptyState } from "../../ui/feedback";
import { SearchInput } from "../../ui/inputs";
import { Fab, ListGroup, ListRow, PageHeader, SectionTitle } from "../../ui/layout";
import { ItemFormSheet } from "../items/ItemFormSheet";
import styles from "./more.module.css";

const BACK = { label: "More", href: href("more") };

export function ItemsScreen() {
  const db = useDB();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const q = query.trim().toLowerCase();
  const items = db.items
    .filter((i) => !q || i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  const categories = [...new Set(items.map((i) => i.category))];
  const addButton = <Button variant="primary" icon={<FiPlus />} onClick={() => setEditing("new")}>Add item</Button>;

  return (
    <>
      <PageHeader back={BACK} title="Items & prices" actions={<span className="desktop-only">{addButton}</span>} />
      <div className={styles.block}>
        <SearchInput value={query} onChange={setQuery} placeholder="Search items" />
      </div>
      {items.length ? (
        categories.map((category) => (
          <section key={category}>
            <SectionTitle>{category}</SectionTitle>
            <ListGroup>
              {items.filter((i) => i.category === category).map((i) => (
                <ListRow key={i.id} title={i.name} subtitle={i.unit ? `per ${i.unit}` : undefined} right={formatMoney(i.price)} onClick={() => setEditing(i)} chevron />
              ))}
            </ListGroup>
          </section>
        ))
      ) : db.items.length ? (
        <EmptyState icon={<FiPackage />} title="No matching items" message="Try a different name or category." />
      ) : (
        <EmptyState icon={<FiPackage />} title="No items yet" message="Items you add here are suggested with their price when taking orders." action={addButton} />
      )}
      <Fab label="Add item" icon={<FiPlus />} onClick={() => setEditing("new")} />
      <ItemFormSheet key={editing === "new" ? "new" : editing?.id} open={editing !== null} onClose={() => setEditing(null)} item={editing === "new" ? undefined : editing ?? undefined} />
    </>
  );
}
