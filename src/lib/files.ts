export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function canShareFiles(): boolean {
  const probe = new File([""], "probe.pdf", { type: "application/pdf" });
  return typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] });
}

/** Opens the system share sheet (WhatsApp, Drive…). Resolves false if the user cancelled. */
export async function shareFile(blob: Blob, fileName: string, title: string): Promise<boolean> {
  const file = new File([blob], fileName, { type: blob.type });
  try {
    await navigator.share({ files: [file], title });
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return false;
    throw err;
  }
}

export function toCSV(rows: (string | number)[][]): string {
  return rows.map((r) => r.map((cell) => {
    const v = String(cell ?? "");
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(",")).join("\r\n");
}
