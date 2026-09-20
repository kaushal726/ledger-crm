/* What each PDF report needs and which parts can be switched on or off.
 * Kept free of PDF code so the export screen loads fast; jsPDF loads only on export.
 */
import type { PeriodPreset } from "../../data/periods";
import type { DateRange } from "../../data/stats";

export type ReportType = "statement" | "bill" | "daily" | "contractor" | "items";

export interface ReportOption {
  key: string;
  label: string;
  defaultOn: boolean;
}

export interface ReportDefinition {
  type: ReportType;
  label: string;
  /** One line about what the PDF contains, shown while picking. */
  detail: string;
  needs: "customer" | "order" | "contractor" | null;
  usesPeriod: boolean;
  defaultPeriod: Exclude<PeriodPreset, "custom">;
  options: ReportOption[];
}

export interface ExportRequest {
  type: ReportType;
  customerId: string | null;
  orderId: string | null;
  contractorId: string | null;
  range: DateRange;
  options: Record<string, boolean>;
}

export const REPORTS: ReportDefinition[] = [
  {
    type: "statement", label: "Customer statement", detail: "Every order and payment for one customer, with the running balance.", needs: "customer", usesPeriod: true, defaultPeriod: "all",
    options: [
      { key: "items", label: "Item details", defaultOn: true },
      { key: "siteContractor", label: "Contractor & site", defaultOn: false },
      { key: "notes", label: "Notes", defaultOn: false },
    ],
  },
  {
    type: "bill", label: "Order bill", detail: "One order as a printable bill for the customer.", needs: "order", usesPeriod: false, defaultPeriod: "all",
    options: [
      { key: "payments", label: "Payments & balance", defaultOn: true },
      { key: "siteContractor", label: "Contractor & site", defaultOn: true },
      { key: "notes", label: "Notes", defaultOn: true },
    ],
  },
  {
    type: "daily", label: "Sales report", detail: "Sales, collections and dues over a period.", needs: null, usesPeriod: true, defaultPeriod: "today",
    options: [
      { key: "items", label: "Item details", defaultOn: true },
      { key: "payments", label: "Payments received", defaultOn: true },
      { key: "pending", label: "Include pending orders", defaultOn: false },
      { key: "cancelled", label: "Include cancelled orders", defaultOn: false },
    ],
  },
  {
    type: "contractor", label: "Contractor", detail: "What one contractor brought in — items, sites and customers.", needs: "contractor", usesPeriod: true, defaultPeriod: "month",
    options: [
      { key: "items", label: "Item-wise summary", defaultOn: true },
      { key: "sites", label: "Site-wise summary", defaultOn: true },
      { key: "orders", label: "Order list", defaultOn: true },
    ],
  },
  {
    type: "items", label: "Item sales", detail: "Item-wise quantity and value over a period.", needs: null, usesPeriod: true, defaultPeriod: "month",
    options: [{ key: "categories", label: "Category summary", defaultOn: true }],
  },
];

export function reportDefinition(type: ReportType): ReportDefinition {
  return REPORTS.find((r) => r.type === type) ?? REPORTS[0];
}

export function isReportType(value: string | null): value is ReportType {
  return REPORTS.some((r) => r.type === value);
}

export function defaultOptions(type: ReportType): Record<string, boolean> {
  return Object.fromEntries(reportDefinition(type).options.map((o) => [o.key, o.defaultOn]));
}
