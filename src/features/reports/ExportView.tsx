import { useState } from "react";
import { FiDownload, FiShare2 } from "react-icons/fi";
import { businessOf } from "../../data/business";
import { PERIOD_LABELS, presetRange, type PeriodPreset } from "../../data/periods";
import type { DateRange } from "../../data/stats";
import { getDB, useDB } from "../../data/store";
import { href, useRoute } from "../../app/router";
import { formatRange, todayISO } from "../../lib/dates";
import { canShareFiles, downloadBlob, shareFile } from "../../lib/files";
import { Button, IconButton } from "../../ui/Button";
import { FormGroup, FormLabel, PickRow } from "../../ui/FormRows";
import { Toggle } from "../../ui/inputs";
import { OptionSheet } from "../../ui/OptionSheet";
import { useToast } from "../../ui/Toast";
import { ContractorPickerSheet } from "../contractors/ContractorPickerSheet";
import { CustomerPickerSheet } from "../customers/CustomerPickerSheet";
import { OrderPickerSheet } from "../orders/OrderPickerSheet";
import { exportPreview } from "./exportPreview";
import { CustomRange } from "./CustomRange";
import { REPORTS, defaultOptions, isReportType, reportDefinition, type ExportRequest, type ReportType } from "./reportTypes";
import styles from "./reports.module.css";

type Picker = "customer" | "order" | "contractor" | "report" | "period" | null;
const PERIOD_PARAMS: PeriodPreset[] = ["today", "week", "month", "lastMonth", "all"];
const PERIOD_OPTIONS: PeriodPreset[] = [...PERIOD_PARAMS, "custom"];

export function ExportView() {
  const db = useDB();
  const route = useRoute();
  const toast = useToast();
  const q = route.query;
  const [type, setType] = useState<ReportType>(isReportType(q.get("type")) ? (q.get("type") as ReportType) : "statement");
  const [customerId, setCustomerId] = useState<string | null>(q.get("customer"));
  const [orderId, setOrderId] = useState<string | null>(q.get("order"));
  const [contractorId, setContractorId] = useState<string | null>(q.get("contractor"));
  const [period, setPeriod] = useState<PeriodPreset>(() => {
    const fromLink = q.get("period") as PeriodPreset;
    return PERIOD_PARAMS.includes(fromLink) ? fromLink : reportDefinition(type).defaultPeriod;
  });
  const [custom, setCustom] = useState<DateRange>({ from: todayISO(), to: todayISO() });
  const [options, setOptions] = useState(() => defaultOptions(type));
  const [picker, setPicker] = useState<Picker>(null);
  const [busy, setBusy] = useState(false);

  const def = reportDefinition(type);
  const range = def.usesPeriod ? (period === "custom" ? custom : presetRange(period)) : { from: "", to: "" };
  const request: ExportRequest = { type, customerId, orderId, contractorId, range, options };
  const preview = exportPreview(db, request);
  const index = { customer: db.customers.find((c) => c.id === customerId), order: db.orders.find((o) => o.id === orderId), contractor: db.contractors.find((c) => c.id === contractorId) };
  const shareable = canShareFiles();

  const changeType = (next: ReportType) => {
    setType(next);
    setPeriod(reportDefinition(next).defaultPeriod);
    setOptions(defaultOptions(next));
  };

  const run = async (share: boolean) => {
    setBusy(true);
    try {
      const { generateReport } = await import("./pdf/generate");
      const report = await generateReport(getDB(), request);
      if (share) {
        if (await shareFile(report.blob, report.fileName, report.title)) toast("PDF shared");
      } else {
        downloadBlob(report.blob, report.fileName);
        toast("PDF downloaded");
      }
    } catch (err) {
      console.error("PDF export failed", err);
      toast("Couldn't create the PDF. Please try again.", { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {!businessOf(db).name && (
        <p className={styles.notice}>
          Add your business name in <a href={href("more/business")}>Business profile</a> so it appears at the top of your PDFs.
        </p>
      )}
      <FormGroup>
        <PickRow label="Report" value={def.label} detail={def.detail} placeholder="Choose" actionLabel="Change" onClick={() => setPicker("report")} />
        {def.needs === "customer" && <PickRow label="Customer" value={index.customer?.name} placeholder="Not chosen" onClick={() => setPicker("customer")} />}
        {def.needs === "order" && <PickRow label="Order" value={index.order ? db.customers.find((c) => c.id === index.order!.customerId)?.name : undefined} detail={index.order?.date} placeholder="Not chosen" onClick={() => setPicker("order")} />}
        {def.needs === "contractor" && <PickRow label="Contractor" value={index.contractor?.name} placeholder="Not chosen" onClick={() => setPicker("contractor")} />}
        {def.usesPeriod && (
          <PickRow
            label="Period"
            value={PERIOD_LABELS[period]}
            detail={period === "custom" ? formatRange(custom) : undefined}
            placeholder="Choose"
            actionLabel="Change"
            onClick={() => setPicker("period")}
          />
        )}
      </FormGroup>
      {def.usesPeriod && period === "custom" && <CustomRange range={custom} onChange={setCustom} />}

      <FormLabel>Include</FormLabel>
      <FormGroup>
        {def.options.map((o) => (
          <div key={o.key} className={styles.optionRow}>
            <span>{o.label}</span>
            <Toggle label={o.label} checked={Boolean(options[o.key])} onChange={(on) => setOptions((prev) => ({ ...prev, [o.key]: on }))} />
          </div>
        ))}
      </FormGroup>

      <div className={styles.exportBar}>
        <div className={styles.exportInfo}>
          <b>{preview.title}</b>
          <small>{preview.detail}</small>
        </div>
        {shareable ? (
          <>
            <IconButton label="Download PDF" icon={<FiDownload />} disabled={!preview.ready || busy} onClick={() => run(false)} />
            <Button variant="primary" icon={<FiShare2 />} disabled={!preview.ready || busy} onClick={() => run(true)}>{busy ? "Creating…" : "Share"}</Button>
          </>
        ) : (
          <Button variant="primary" icon={<FiDownload />} disabled={!preview.ready || busy} onClick={() => run(false)}>{busy ? "Creating…" : "Download"}</Button>
        )}
      </div>

      <OptionSheet
        open={picker === "report"}
        onClose={() => setPicker(null)}
        title="Report"
        label="Report type"
        value={type}
        onChange={(next) => changeType(next as ReportType)}
        options={REPORTS.map((r) => ({ value: r.type, label: r.label, detail: r.detail }))}
      />
      <OptionSheet
        open={picker === "period"}
        onClose={() => setPicker(null)}
        title="Period"
        label="Period"
        value={period}
        onChange={(next) => setPeriod(next as PeriodPreset)}
        options={PERIOD_OPTIONS.map((p) => ({ value: p, label: PERIOD_LABELS[p] }))}
      />
      <CustomerPickerSheet open={picker === "customer"} onClose={() => setPicker(null)} onPick={setCustomerId} />
      <OrderPickerSheet open={picker === "order"} onClose={() => setPicker(null)} onPick={setOrderId} />
      <ContractorPickerSheet open={picker === "contractor"} onClose={() => setPicker(null)} onPick={setContractorId} />
    </>
  );
}
