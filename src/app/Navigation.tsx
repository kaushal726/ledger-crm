import { FiLock } from "react-icons/fi";
import { useDB } from "../data/store";
import { cx } from "../lib/cx";
import { businessOf } from "../data/business";
import { NAV_ITEMS, type TabId } from "./navItems";
import { useUnlocked } from "./pinLock";
import pinStyles from "./pinGate.module.css";
import { href } from "./router";
import { SyncBadge } from "./SyncBadge";
import styles from "./shell.module.css";

function NavIcon({ icon: Icon, pinLocked }: { icon: (typeof NAV_ITEMS)[number]["icon"]; pinLocked?: boolean }) {
  const unlocked = useUnlocked();
  return (
    <span className={styles.navIcon}>
      <Icon aria-hidden />
      {pinLocked && !unlocked && <FiLock className={pinStyles.navLock} aria-label="Locked" />}
    </span>
  );
}

export function TabBar({ active }: { active: TabId }) {
  return (
    <nav className={cx(styles.tabbar, "mobile-only")} aria-label="Main">
      {NAV_ITEMS.map(({ id, label, icon, pinLocked }) => (
        <a key={id} href={href(id)} className={styles.tab} aria-current={id === active ? "page" : undefined}>
          <NavIcon icon={icon} pinLocked={pinLocked} />
          {label}
        </a>
      ))}
    </nav>
  );
}

export function SideNav({ active }: { active: TabId }) {
  const business = businessOf(useDB());
  return (
    <nav className={cx(styles.sidenav, "desktop-only")} aria-label="Main">
      <div className={styles.brand}>
        <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" width={32} height={32} />
        <span>{business.name}</span>
      </div>
      {NAV_ITEMS.map(({ id, label, icon, pinLocked }) => (
        <a key={id} href={href(id)} className={styles.sideItem} aria-current={id === active ? "page" : undefined}>
          <NavIcon icon={icon} pinLocked={pinLocked} />
          {label}
        </a>
      ))}
      <div className={styles.sideFoot}><SyncBadge /></div>
    </nav>
  );
}
