import { useUpdateAvailable } from "./pwa";
import styles from "./shell.module.css";

export function UpdatePrompt() {
  const apply = useUpdateAvailable();
  if (!apply) return null;
  return (
    <div className={styles.update} role="status">
      <span>A new version is ready</span>
      <button type="button" className={styles.updateButton} onClick={apply}>Reload</button>
    </div>
  );
}
