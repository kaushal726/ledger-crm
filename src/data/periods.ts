import { addDays, monthRange, shiftMonth, todayISO, toISODate } from "../lib/dates";
import type { DateRange } from "./stats";

export type PeriodPreset = "today" | "week" | "month" | "lastMonth" | "all" | "custom";

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  lastMonth: "Last month",
  all: "All time",
  custom: "Custom",
};

export function presetRange(preset: Exclude<PeriodPreset, "custom">): DateRange {
  const today = todayISO();
  const thisMonth = today.slice(0, 7);
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "week": {
      const d = new Date();
      const mondayOffset = (d.getDay() + 6) % 7;
      return { from: addDays(toISODate(d), -mondayOffset), to: today };
    }
    case "month":
      return monthRange(thisMonth);
    case "lastMonth":
      return monthRange(shiftMonth(thisMonth, -1));
    case "all":
      return { from: "", to: "" };
  }
}
