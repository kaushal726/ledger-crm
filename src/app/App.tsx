import { useEffect } from "react";
import { onStorageError, useStoreReady } from "../data/store";
import { ContractorDetailScreen } from "../features/contractors/ContractorDetailScreen";
import { ContractorsScreen } from "../features/contractors/ContractorsScreen";
import { CustomerDetailScreen } from "../features/customers/CustomerDetailScreen";
import { CustomersScreen } from "../features/customers/CustomersScreen";
import { MoreRoutes } from "../features/more/MoreRoutes";
import { OrderSheetsProvider } from "../features/orders/OrderSheets";
import { OrdersScreen } from "../features/orders/OrdersScreen";
import { ReportsScreen } from "../features/reports/ReportsScreen";
import { Skeleton } from "../ui/feedback";
import { useToast } from "../ui/Toast";
import { ConnectScreen } from "./ConnectScreen";
import { NAV_ITEMS, type TabId } from "./navItems";
import { SideNav, TabBar } from "./Navigation";
import { useRoute, type Route } from "./router";
import { useScrollToTopOnNavigate } from "./scroll";
import { UpdatePrompt } from "./UpdatePrompt";
import styles from "./shell.module.css";

function Screen({ route }: { route: Route }) {
  const [section, id] = route.path;
  switch (section) {
    case "customers":
      return id ? <CustomerDetailScreen key={id} customerId={id} /> : <CustomersScreen />;
    case "contractors":
      return id ? <ContractorDetailScreen key={id} contractorId={id} /> : <ContractorsScreen />;
    case "reports":
      return <ReportsScreen />;
    case "more":
      return <MoreRoutes page={id} />;
    case "connect":
      return <ConnectScreen apiUrl={route.query.get("url") ?? ""} />;
    default:
      return <OrdersScreen />;
  }
}

function BootSkeleton() {
  return (
    <div className={styles.boot} aria-busy="true" aria-label="Loading">
      <Skeleton height={34} width="45%" />
      <Skeleton height={52} />
      <Skeleton height={72} />
      <Skeleton height={120} />
      <Skeleton height={120} />
    </div>
  );
}

export function App() {
  const ready = useStoreReady();
  const route = useRoute();
  const toast = useToast();
  const tab: TabId = NAV_ITEMS.find((n) => n.id === route.path[0])?.id ?? "orders";
  useScrollToTopOnNavigate(route.path.join("/"));

  useEffect(() => onStorageError(() => toast("Couldn't save on this device. Free up some space and try again.", { tone: "error" })), [toast]);

  return (
    <OrderSheetsProvider>
      <SideNav active={tab} />
      <main className={styles.main}>
        <div className={styles.content}>{ready ? <Screen route={route} /> : <BootSkeleton />}</div>
      </main>
      <TabBar active={tab} />
      <UpdatePrompt />
    </OrderSheetsProvider>
  );
}
