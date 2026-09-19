/* Entry point for PDF exports — loaded on demand, so jsPDF and the fonts aren't part of app start-up. */
import { APP_NAME } from "../../../app/brand";
import type { DB } from "../../../data/types";
import type { ExportRequest, ReportType } from "../reportTypes";
import { buildBill, buildStatement, type BuiltReport } from "./customerReports";
import { ReportDoc } from "./ReportDoc";
import { buildContractor, buildItemSales, buildSales } from "./salesReports";

export interface GeneratedReport extends BuiltReport {
  blob: Blob;
}

const BUILDERS: Record<ReportType, (pdf: ReportDoc, db: DB, req: ExportRequest) => BuiltReport> = {
  statement: buildStatement,
  bill: buildBill,
  daily: buildSales,
  contractor: buildContractor,
  items: buildItemSales,
};

export async function generateReport(db: DB, request: ExportRequest): Promise<GeneratedReport> {
  const pdf = await ReportDoc.create();
  const built = BUILDERS[request.type](pdf, db, request);
  const blob = pdf.finish(`Generated with ${APP_NAME}`);
  return { ...built, blob };
}
