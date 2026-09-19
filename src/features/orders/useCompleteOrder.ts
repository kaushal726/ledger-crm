import { useCallback } from "react";
import { setOrderStatus } from "../../data/actions";
import { useToast } from "../../ui/Toast";

/** Marks an order completed, with an Undo in the toast. */
export function useCompleteOrder(): (orderId: string) => void {
  const toast = useToast();
  return useCallback((orderId: string) => {
    setOrderStatus(orderId, "completed");
    toast("Order completed", { action: { label: "Undo", onClick: () => setOrderStatus(orderId, "pending") } });
  }, [toast]);
}
