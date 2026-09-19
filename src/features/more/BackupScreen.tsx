import { useRef } from "react";
import { FiDownload, FiUpload } from "react-icons/fi";
import { eraseAllData, replaceAllData } from "../../data/actions";
import { createBackup, InvalidBackupError, parseBackup } from "../../data/backup";
import { buildCsv, type CsvKind } from "../../data/csvExports";
import { getDB } from "../../data/store";
import { LockButton, PinGate } from "../../app/PinGate";
import { href } from "../../app/router";
import { todayISO } from "../../lib/dates";
import { downloadBlob } from "../../lib/files";
import { Button } from "../../ui/Button";
import { useConfirm } from "../../ui/Confirm";
import { PageHeader, Panel, SectionTitle } from "../../ui/layout";
import { useToast } from "../../ui/Toast";
import styles from "./more.module.css";

const BACK = { label: "More", href: href("more") };
const CSV_EXPORTS: { kind: CsvKind; label: string }[] = [
  { kind: "orders", label: "Orders" },
  { kind: "payments", label: "Payments" },
  { kind: "customers", label: "Customers" },
  { kind: "contractors", label: "Contractors" },
];
const EVERYONE_NOTE = "If this device is connected to the Google Sheet, this changes the data for everyone using it.";

export function BackupScreen() {
  const toast = useToast();
  const confirm = useConfirm();
  const fileInput = useRef<HTMLInputElement>(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(createBackup(getDB()), null, 2)], { type: "application/json" });
    downloadBlob(blob, `ledger-backup-${todayISO()}.json`);
    toast("Backup downloaded");
  };

  const exportCsv = (kind: CsvKind) => {
    downloadBlob(new Blob([buildCsv(getDB(), kind)], { type: "text/csv;charset=utf-8" }), `${kind}-${todayISO()}.csv`);
  };

  const restore = async (file: File) => {
    try {
      const data = parseBackup(await file.text());
      const ok = await confirm({ title: "Replace all data with this backup?", message: EVERYONE_NOTE, confirmLabel: "Restore", danger: true });
      if (!ok) return;
      replaceAllData(data);
      toast("Backup restored");
    } catch (err) {
      toast(err instanceof InvalidBackupError ? err.message : "Could not read that file", { tone: "error" });
    }
  };

  const erase = async () => {
    const ok = await confirm({ title: "Erase all data?", message: `All orders, customers, contractors, payments and items will be removed. ${EVERYONE_NOTE} The Sheet keeps the rows, marked as deleted.`, confirmLabel: "Erase everything", danger: true });
    if (!ok) return;
    eraseAllData();
    toast("All data erased");
  };

  return (
    <>
      <PageHeader back={BACK} title="Backup & restore" actions={<LockButton />} />
      <PinGate>
        <Panel padded className={styles.block}>
          <p className={styles.help}>Download a full backup before big changes. A backup from the old version of this app can be restored here too.</p>
          <div className={styles.buttonRow}>
            <Button variant="primary" icon={<FiDownload />} onClick={exportJson}>Download backup</Button>
            <Button icon={<FiUpload />} onClick={() => fileInput.current?.click()}>Restore backup</Button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void restore(file);
            }}
          />
        </Panel>

        <SectionTitle>Spreadsheet exports (CSV)</SectionTitle>
        <div className={styles.csvGrid}>
          {CSV_EXPORTS.map((c) => <Button key={c.kind} icon={<FiDownload />} onClick={() => exportCsv(c.kind)}>{c.label}</Button>)}
        </div>

        <SectionTitle>Danger zone</SectionTitle>
        <Panel padded className={styles.danger}>
          <p className={styles.help}>Removes everything and starts fresh. Download a backup first.</p>
          <Button variant="danger" block onClick={erase}>Erase all data</Button>
        </Panel>
      </PinGate>
    </>
  );
}
