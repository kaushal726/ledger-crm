import { useState } from "react";
import { FiArchive, FiCloud, FiHome, FiLock, FiPackage, FiSmartphone } from "react-icons/fi";
import { APP_NAME } from "../../app/brand";
import { businessOf } from "../../data/business";
import { useDB } from "../../data/store";
import { useUnlocked } from "../../app/pinLock";
import { href } from "../../app/router";
import { isStandalone, useInstallPrompt } from "../../app/installPrompt";
import { describeSyncStatus, useSyncStatus } from "../../sync/useSyncStatus";
import { ListGroup, ListRow, PageHeader, SectionTitle } from "../../ui/layout";
import { Sheet } from "../../ui/Sheet";
import styles from "./more.module.css";

export function MoreScreen() {
  const db = useDB();
  const sync = useSyncStatus();
  const install = useInstallPrompt();
  const lockIcon = useUnlocked() ? undefined : <FiLock aria-label="Locked" className={styles.lock} />;
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  return (
    <>
      <PageHeader title="More" />
      <ListGroup>
        <ListRow leading={<FiHome />} title="Business profile" subtitle={businessOf(db).name || "Add your business name for PDFs"} href={href("more/business")} />
        <ListRow leading={<FiPackage />} title="Items & prices" subtitle={`${db.items.length} items`} href={href("more/items")} />
        <ListRow leading={<FiCloud />} title="Google Sheet sync" subtitle={describeSyncStatus(sync)} right={lockIcon} href={href("more/sync")} />
        <ListRow leading={<FiArchive />} title="Backup & restore" subtitle="Export or restore all data" right={lockIcon} href={href("more/backup")} />
      </ListGroup>

      {!isStandalone() && (
        <>
          <SectionTitle>App</SectionTitle>
          <ListGroup>
            <ListRow leading={<FiSmartphone />} title="Install on this phone" subtitle="Opens like an app, works offline" onClick={install ?? (() => setShowInstallHelp(true))} chevron />
          </ListGroup>
        </>
      )}

      <p className={styles.version}>{APP_NAME} · version {__APP_VERSION__}</p>

      <Sheet open={showInstallHelp} onClose={() => setShowInstallHelp(false)} title="Install the app">
        <ol className={styles.steps}>
          <li><b>iPhone (Safari):</b> tap the Share button, then “Add to Home Screen”.</li>
          <li><b>Android (Chrome):</b> open the ⋮ menu, then “Install app” or “Add to Home screen”.</li>
        </ol>
      </Sheet>
    </>
  );
}
