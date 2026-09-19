import { BackupScreen } from "./BackupScreen";
import { BusinessScreen } from "./BusinessScreen";
import { ItemsScreen } from "./ItemsScreen";
import { MoreScreen } from "./MoreScreen";
import { SyncScreen } from "./SyncScreen";

export function MoreRoutes({ page }: { page?: string }) {
  switch (page) {
    case "items":
      return <ItemsScreen />;
    case "sync":
      return <SyncScreen />;
    case "backup":
      return <BackupScreen />;
    case "business":
      return <BusinessScreen />;
    default:
      return <MoreScreen />;
  }
}
