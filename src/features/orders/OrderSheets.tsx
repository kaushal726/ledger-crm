/* App-wide order & payment sheets, so any screen can open "order details", "new order"
 * or "receive payment" without owning that UI itself.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useDB } from "../../data/store";
import { useToast } from "../../ui/Toast";
import { CashFormSheet, type CashPrefill } from "../cash/CashFormSheet";
import { PaymentFormSheet, type PaymentPrefill } from "../payments/PaymentFormSheet";
import { OrderDetailSheet } from "./OrderDetailSheet";
import { OrderFormSheet } from "./OrderFormSheet";
import type { OrderPrefill } from "./orderDraft";

export interface OrderSheetsApi {
  newOrder(prefill?: OrderPrefill): void;
  editOrder(orderId: string): void;
  showOrder(orderId: string): void;
  receivePayment(prefill: PaymentPrefill): void;
  editPayment(paymentId: string): void;
  addCash(prefill: CashPrefill): void;
  editCash(cashId: string): void;
}

const OrderSheetsContext = createContext<OrderSheetsApi | null>(null);

interface FormState<P> {
  key: number;
  editingId: string | null;
  prefill?: P;
}

export function OrderSheetsProvider({ children }: { children: ReactNode }) {
  const db = useDB();
  const toast = useToast();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [orderForm, setOrderForm] = useState<FormState<OrderPrefill> | null>(null);
  const [paymentForm, setPaymentForm] = useState<FormState<PaymentPrefill> | null>(null);
  const [cashForm, setCashForm] = useState<FormState<CashPrefill> | null>(null);

  const api = useMemo<OrderSheetsApi>(() => ({
    newOrder: (prefill) => setOrderForm({ key: Date.now(), editingId: null, prefill }),
    editOrder: (orderId) => setOrderForm({ key: Date.now(), editingId: orderId }),
    showOrder: (orderId) => setDetailId(orderId),
    receivePayment: (prefill) => setPaymentForm({ key: Date.now(), editingId: null, prefill }),
    editPayment: (paymentId) => setPaymentForm({ key: Date.now(), editingId: paymentId }),
    addCash: (prefill) => setCashForm({ key: Date.now(), editingId: null, prefill }),
    editCash: (cashId) => setCashForm({ key: Date.now(), editingId: cashId }),
  }), []);

  const editingOrder = orderForm?.editingId ? db.orders.find((o) => o.id === orderForm.editingId) : undefined;
  const editingPayment = paymentForm?.editingId ? db.payments.find((p) => p.id === paymentForm.editingId) : undefined;
  const editingCash = cashForm?.editingId ? db.cash.find((c) => c.id === cashForm.editingId) : undefined;
  const lostRecord = Boolean(
    (orderForm?.editingId && !editingOrder) || (paymentForm?.editingId && !editingPayment) || (cashForm?.editingId && !editingCash),
  );

  // Another device deleted what's being edited here.
  useEffect(() => {
    if (!lostRecord) return;
    if (orderForm?.editingId && !editingOrder) setOrderForm(null);
    if (paymentForm?.editingId && !editingPayment) setPaymentForm(null);
    if (cashForm?.editingId && !editingCash) setCashForm(null);
    toast("This was deleted on another device");
  }, [lostRecord, orderForm, paymentForm, cashForm, editingOrder, editingPayment, editingCash, toast]);

  return (
    <OrderSheetsContext.Provider value={api}>
      {children}
      <OrderDetailSheet orderId={detailId} onClose={() => setDetailId(null)} />
      <OrderFormSheet key={orderForm?.key} open={orderForm !== null && !lostRecord} order={editingOrder} prefill={orderForm?.prefill} onClose={() => setOrderForm(null)} />
      <PaymentFormSheet key={paymentForm?.key} open={paymentForm !== null && !lostRecord} payment={editingPayment} prefill={paymentForm?.prefill} onClose={() => setPaymentForm(null)} />
      <CashFormSheet key={cashForm?.key} open={cashForm !== null && !lostRecord} entry={editingCash} prefill={cashForm?.prefill} onClose={() => setCashForm(null)} />
    </OrderSheetsContext.Provider>
  );
}

export function useOrderSheets(): OrderSheetsApi {
  const api = useContext(OrderSheetsContext);
  if (!api) throw new Error("useOrderSheets must be used inside OrderSheetsProvider");
  return api;
}
