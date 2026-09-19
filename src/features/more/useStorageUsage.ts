import { useEffect, useState } from "react";

type EstimateWithDetails = StorageEstimate & { usageDetails?: { indexedDB?: number } };

/** Bytes this app keeps on the device (IndexedDB where the browser reports it), or null if unknown. */
export function useStorageUsage(refreshKey: unknown): number | null {
  const [bytes, setBytes] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    navigator.storage?.estimate?.()
      .then((e: EstimateWithDetails) => { if (!cancelled) setBytes(e.usageDetails?.indexedDB ?? e.usage ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [refreshKey]);
  return bytes;
}

export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
