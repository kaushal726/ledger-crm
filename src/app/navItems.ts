import type { IconType } from "react-icons";
import { FiBarChart2, FiBriefcase, FiClipboard, FiMoreHorizontal, FiUsers } from "react-icons/fi";

export type TabId = "orders" | "customers" | "contractors" | "reports" | "more";

export const NAV_ITEMS: { id: TabId; label: string; icon: IconType; pinLocked?: boolean }[] = [
  { id: "orders", label: "Orders", icon: FiClipboard },
  { id: "customers", label: "Customers", icon: FiUsers },
  { id: "contractors", label: "Contractors", icon: FiBriefcase },
  { id: "reports", label: "Reports", icon: FiBarChart2, pinLocked: true },
  { id: "more", label: "More", icon: FiMoreHorizontal },
];
