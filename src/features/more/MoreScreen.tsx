import { useState } from "react";
import { FiArchive, FiCloud, FiHardDrive, FiHeart, FiHome, FiLock, FiPackage, FiSmartphone } from "react-icons/fi";
import { APP_NAME } from "../../app/brand";
import { businessOf } from "../../data/business";
import { useDB } from "../../data/store";
import { useUnlocked } from "../../app/pinLock";
import { href } from "../../app/router";
import { isStandalone, useInstallPrompt } from "../../app/installPrompt";
import { describeSyncStatus, useSyncStatus } from "../../sync/useSyncStatus";
import { ListGroup, ListRow, PageHeader, SectionTitle } from "../../ui/layout";
import { Segmented } from "../../ui/Segmented";
import { setThemeChoice, useThemeChoice, type ThemeChoice } from "../../app/theme";
import { plural } from "../../lib/format";
import { Sheet } from "../../ui/Sheet";
import { formatBytes, useStorageUsage } from "./useStorageUsage";
import styles from "./more.module.css";

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function MoreScreen() {
  const db = useDB();
  const sync = useSyncStatus();
  const install = useInstallPrompt();
  const lockIcon = useUnlocked() ? undefined : <FiLock aria-label="Locked" className={styles.lock} />;
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const bytes = useStorageUsage(db);
  const theme = useThemeChoice();
  const counts = [plural(db.orders.length, "order"), plural(db.payments.length, "payment"), plural(db.customers.length, "customer")].join(" · ");

  return (
    <div className={styles.screen}>
      <PageHeader title="More" />
      <ListGroup>
        <ListRow leading={<FiHome />} title="Business profile" subtitle={businessOf(db).name || "Add your business name for PDFs"} href={href("more/business")} />
        <ListRow leading={<FiPackage />} title="Items & prices" subtitle={`${db.items.length} items`} href={href("more/items")} />
        <ListRow leading={<FiCloud />} title="Google Sheet sync" subtitle={describeSyncStatus(sync)} right={lockIcon} href={href("more/sync")} />
        <ListRow leading={<FiArchive />} title="Backup & restore" subtitle="Export or restore all data" right={lockIcon} href={href("more/backup")} />
      </ListGroup>

      <SectionTitle>This phone</SectionTitle>
      <Segmented label="Appearance" className={styles.theme} value={theme} onChange={setThemeChoice} options={THEMES} />
      <ListGroup>
        <ListRow leading={<FiHardDrive />} title={bytes === null ? "Stored on this phone" : `${formatBytes(bytes)} stored on this phone`} subtitle={counts} />
        {!isStandalone() && (
          <ListRow leading={<FiSmartphone />} title="Install on this phone" subtitle="Opens like an app, works offline" onClick={install ?? (() => setShowInstallHelp(true))} chevron />
        )}
      </ListGroup>

      <footer className={styles.footer}>
        <p className={styles.credit}>
          Crafted with <FiHeart aria-label="love" className={styles.heart} /> by Kaushal
        </p>
        <p className={styles.version}>{APP_NAME} · version {__APP_VERSION__}</p>
      </footer>

      <Sheet open={showInstallHelp} onClose={() => setShowInstallHelp(false)} title="Install the app">
        <ol className={styles.steps}>
          <li><b>iPhone (Safari):</b> tap the Share button, then “Add to Home Screen”.</li>
          <li><b>Android (Chrome):</b> open the ⋮ menu, then “Install app” or “Add to Home screen”.</li>
        </ol>
      </Sheet>
    </div>
  );
}
