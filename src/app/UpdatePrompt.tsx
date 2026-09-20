import { useState } from "react";
import { FiDownloadCloud } from "react-icons/fi";
import { cx } from "../lib/cx";
import { useUpdateAvailable } from "./pwa";
import styles from "./shell.module.css";

/** Offers the newer build, then shows it installing until the page reloads itself. */
export function UpdatePrompt() {
  const apply = useUpdateAvailable();
  const [updating, setUpdating] = useState(false);
  if (!apply) return null;

  const update = () => {
    setUpdating(true);
    apply();
  };

  return (
    <div className={cx(styles.update, updating && styles.updateBusy)} role="status" aria-live="polite">
      <span className={styles.updateIcon} aria-hidden><FiDownloadCloud /></span>
      <span className={styles.updateText}>
        <b>{updating ? "Updating the app…" : "A new version is ready"}</b>
        <small>{updating ? "This takes a second" : "Update to get the latest fixes"}</small>
      </span>
      <button type="button" className={styles.updateButton} onClick={update} disabled={updating}>
        {updating ? <span className={styles.updateSpinner} aria-hidden /> : "Update"}
      </button>
      {updating && <span className={styles.updateProgress} aria-hidden />}
    </div>
  );
}
