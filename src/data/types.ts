export const COLLECTIONS = ["customers", "contractors", "items", "orders", "payments", "cash", "settings"] as const;
export type Collection = (typeof COLLECTIONS)[number];

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  /** Default contractor for new orders; each order can still pick another one. */
  contractorId: string | null;
  /** Amount the customer already owed before using the app (negative = advance). */
  openingBalance: number;
  createdAt: number;
  updatedAt: number;
}

export interface Contractor {
  id: string;
  name: string;
  phone: string;
  createdAt: number;
  updatedAt: number;
}

export interface Item {
  id: string;
  category: string;
  name: string;
  unit: string;
  price: number;
  updatedAt: number;
}

export interface LineItem {
  category: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
}

export type OrderStatus = "pending" | "completed" | "cancelled";

/** A discount is either a flat rupee amount or a percent of the line-item total. */
export type DiscountType = "amount" | "percent";

export interface Order {
  id: string;
  /** ISO date, YYYY-MM-DD */
  date: string;
  customerId: string;
  contractorId: string | null;
  site: string;
  note: string;
  status: OrderStatus;
  lineItems: LineItem[];
  /** Taken off the line-item total; read as a percent when discountType is "percent". */
  discount: number;
  discountType: DiscountType;
  createdAt: number;
  updatedAt: number;
}

export type PaymentMethod = "cash" | "upi" | "bank";

export interface Payment {
  id: string;
  customerId: string;
  /** Set when the payment was taken against a specific order. */
  orderId: string | null;
  date: string;
  amount: number;
  method: PaymentMethod;
  note: string;
  createdAt: number;
  updatedAt: number;
}

/** Money in or out that isn't a customer's ledger entry: other income, and money paid out. */
export type CashDirection = "in" | "out";

export interface CashEntry {
  id: string;
  date: string;
  direction: CashDirection;
  amount: number;
  method: PaymentMethod;
  /** Who it came from or went to, e.g. a staff name. */
  party: string;
  note: string;
  createdAt: number;
  updatedAt: number;
}

export const BUSINESS_SETTINGS_ID = "business";

export interface BusinessSettings {
  id: typeof BUSINESS_SETTINGS_ID;
  name: string;
  phone: string;
  address: string;
  updatedAt: number;
}

export interface DB {
  customers: Customer[];
  contractors: Contractor[];
  items: Item[];
  orders: Order[];
  payments: Payment[];
  cash: CashEntry[];
  settings: BusinessSettings[];
}

export type RecordOf<C extends Collection> = DB[C][number];
export type AnyRecord = RecordOf<Collection>;
