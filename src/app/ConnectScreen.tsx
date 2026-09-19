/* Handles a setup link (#/connect?url=…) shared from another device. */
import { useEffect, useRef } from "react";
import { FiLink } from "react-icons/fi";
import { connect } from "../sync/engine";
import { getApiUrl, isValidApiUrl } from "../sync/config";
import { useConfirm } from "../ui/Confirm";
import { EmptyState } from "../ui/feedback";
import { useToast } from "../ui/Toast";
import { href, navigate } from "./router";

export function ConnectScreen({ apiUrl }: { apiUrl: string }) {
  const confirm = useConfirm();
  const toast = useToast();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const done = () => navigate(href("orders"), { replace: true });
    if (!isValidApiUrl(apiUrl)) {
      toast("That setup link is not valid", { tone: "error" });
      return done();
    }
    if (apiUrl === getApiUrl()) return done();
    void confirm({
      title: "Connect to the shared Google Sheet?",
      message: "This device will sync orders, customers and payments with everyone using this Sheet.",
      confirmLabel: "Connect",
    }).then((ok) => {
      if (ok) {
        connect(apiUrl);
        toast("Connected, syncing with Google Sheet");
      }
      done();
    });
  }, [apiUrl, confirm, toast]);

  return <EmptyState icon={<FiLink />} title="Connecting this device" message="Confirm to start syncing with the shared Google Sheet." />;
}
