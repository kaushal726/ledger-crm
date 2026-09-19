import { LockButton, PinGate } from "../../app/PinGate";
import { setQuery, useRoute } from "../../app/router";
import { PageHeader } from "../../ui/layout";
import { Segmented } from "../../ui/Segmented";
import { AnalyticsView } from "./AnalyticsView";
import { ExportView } from "./ExportView";
import styles from "./reports.module.css";

type Tab = "analytics" | "export";

export function ReportsScreen() {
  const route = useRoute();
  const tab: Tab = route.query.get("tab") === "export" ? "export" : "analytics";
  return (
    <>
      <PageHeader title="Reports" actions={<LockButton />} />
      <PinGate>
        <Segmented
          label="Report view"
          className={styles.tabs}
          value={tab}
          onChange={(t) => setQuery(route, { tab: t === "analytics" ? null : t })}
          options={[{ value: "analytics", label: "Analytics" }, { value: "export", label: "Export PDF" }]}
        />
        {tab === "analytics" ? <AnalyticsView /> : <ExportView key={route.query.toString()} />}
      </PinGate>
    </>
  );
}
