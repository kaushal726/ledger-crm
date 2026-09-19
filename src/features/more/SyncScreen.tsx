import { useState } from "react";
import { FiCopy, FiRefreshCw } from "react-icons/fi";
import { LockButton, PinGate } from "../../app/PinGate";
import { href } from "../../app/router";
import { connect, disconnect, syncNow } from "../../sync/engine";
import { getApiUrl, isValidApiUrl } from "../../sync/config";
import { describeSyncStatus, useSyncStatus } from "../../sync/useSyncStatus";
import { Button } from "../../ui/Button";
import { useConfirm } from "../../ui/Confirm";
import { TextField } from "../../ui/Field";
import { PageHeader, Panel, SectionTitle } from "../../ui/layout";
import { useToast } from "../../ui/Toast";
import styles from "./more.module.css";

const BACK = { label: "More", href: href("more") };

function setupLink(apiUrl: string): string {
  return `${location.origin}${location.pathname}${href("connect", { url: apiUrl })}`;
}

export function SyncScreen() {
  const status = useSyncStatus();
  const toast = useToast();
  const confirm = useConfirm();
  const connectedUrl = getApiUrl();
  const [url, setUrl] = useState(connectedUrl);
  const [error, setError] = useState("");

  const submit = () => {
    if (!isValidApiUrl(url)) return setError("Paste the Web app URL from Apps Script. It ends in /exec");
    connect(url.trim());
    toast("Connected, syncing with Google Sheet");
  };

  const copyLink = async () => {
    const link = setupLink(connectedUrl);
    try {
      await navigator.clipboard.writeText(link);
      toast("Setup link copied. Share it only with your team");
    } catch {
      window.prompt("Copy this setup link:", link);
    }
  };

  const unlink = async () => {
    const ok = await confirm({ title: "Disconnect this device?", message: "Data on this device stays, but changes stop syncing with the Sheet.", confirmLabel: "Disconnect", danger: true });
    if (!ok) return;
    disconnect();
    setUrl("");
    toast("Disconnected from Google Sheet");
  };

  return (
    <>
      <PageHeader back={BACK} title="Google Sheet sync" actions={<LockButton />} />
      <PinGate>
        <Panel padded className={styles.block}>
          <div className={styles.statusRow}>
            <span className={styles.statusDot} data-state={status.state} />
            <b>{describeSyncStatus(status)}</b>
          </div>
          <p className={styles.help}>
            {connectedUrl
              ? "Changes are saved on this phone first and sent to the Sheet in the background. The app checks for changes from others every minute while open."
              : "Connect this device to the shared Google Sheet so everyone sees the same orders, customers and payments."}
          </p>
          {connectedUrl && (
            <div className={styles.buttonRow}>
              <Button icon={<FiRefreshCw />} onClick={() => void syncNow()} disabled={status.state === "syncing"}>Sync now</Button>
              <Button icon={<FiCopy />} onClick={copyLink}>Copy setup link</Button>
            </div>
          )}
        </Panel>

        <SectionTitle>{connectedUrl ? "Connection" : "Connect"}</SectionTitle>
        <TextField
          label="Apps Script Web app URL"
          value={url}
          onChange={(v) => { setUrl(v); setError(""); }}
          error={error}
          placeholder="https://script.google.com/macros/s/…/exec"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          hint="Or open a setup link shared from a connected device."
        />
        <div className={styles.buttonRow}>
          <Button variant="primary" onClick={submit} disabled={url.trim() === connectedUrl && Boolean(connectedUrl)}>{connectedUrl ? "Update" : "Connect"}</Button>
          {connectedUrl && <Button variant="danger" onClick={unlink}>Disconnect</Button>}
        </div>
      </PinGate>
    </>
  );
}
