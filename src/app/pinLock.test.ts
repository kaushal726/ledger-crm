/// <reference types="node" />
// The real PIN never goes in the repo. Run `LEDGER_PIN=<pin> npm test` to also check the unlock path.
import { describe, expect, it } from "vitest";
import { isCorrectPin, isUnlocked, lock, unlockWithPin } from "./pinLock";

const realPin = process.env.LEDGER_PIN;

describe("PIN lock", () => {
  it("rejects wrong PINs and stays locked", async () => {
    lock();
    expect(await isCorrectPin("")).toBe(false);
    expect(await unlockWithPin("0000")).toBe(false);
    expect(isUnlocked()).toBe(false);
  });

  it.runIf(Boolean(realPin))("unlocks with the configured PIN and locks again", async () => {
    lock();
    expect(await unlockWithPin(realPin!)).toBe(true);
    expect(isUnlocked()).toBe(true);
    lock();
    expect(isUnlocked()).toBe(false);
  });
});
