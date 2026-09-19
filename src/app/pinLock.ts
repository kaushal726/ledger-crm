/* PIN lock for sensitive sections (reports, Sheet sync, backup) on shared shop phones.
 * A deterrent, not real security: the check runs in the browser. Only a salted SHA-256 of
 * the PIN is kept here, so the PIN isn't readable in the (public) repo. Unlocking lasts for
 * the browser session (sessionStorage), so closing the app locks it again.
 *
 * To change the PIN: node -e 'console.log(require("crypto").createHash("sha256").update("ledger-crm-pin:<NEW PIN>").digest("hex"))'
 * and paste the output into PIN_SHA256.
 */
import { useSyncExternalStore } from "react";

export const PIN_LENGTH = 4;
const PIN_SALT = "ledger-crm-pin:";
const PIN_SHA256 = "c778e8428fe6803a5c7b515ab4be2dd53d701f15d6a0576cdbd6acbbac3ab0d7";
const SESSION_KEY = "ledger_crm_unlocked_v1";

let unlockedInMemory = false; // fallback when sessionStorage is blocked
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((l) => l());
}

function readSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function writeSession(unlocked: boolean): void {
  try {
    if (unlocked) sessionStorage.setItem(SESSION_KEY, "1");
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage blocked: the in-memory flag still covers this page load.
  }
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function isUnlocked(): boolean {
  return unlockedInMemory || readSession();
}

export async function isCorrectPin(pin: string): Promise<boolean> {
  return (await sha256Hex(PIN_SALT + pin)) === PIN_SHA256;
}

/** Resolves true and unlocks for this session when the PIN is right. */
export async function unlockWithPin(pin: string): Promise<boolean> {
  if (!(await isCorrectPin(pin))) return false;
  unlockedInMemory = true;
  writeSession(true);
  notify();
  return true;
}

export function lock(): void {
  unlockedInMemory = false;
  writeSession(false);
  notify();
}

export function useUnlocked(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    isUnlocked,
  );
}
