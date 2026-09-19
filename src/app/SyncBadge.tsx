import { describeSyncStatus, useSyncStatus } from "../sync/useSyncStatus";
import { href } from "./router";
import styles from "./shell.module.css";

export function SyncBadge() {
  const status = useSyncStatus();
  return (
    <a className={styles.syncBadge} data-state={status.state} href={href("more/sync")} title="Google Sheet sync">
      {describeSyncStatus(status)}
    </a>
  );
}
