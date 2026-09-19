/* A4 report layout on top of jsPDF: header, info block, summary boxes, tables, page footers.
 * Uses the bundled Inter font, which (unlike jsPDF's built-in fonts) has the ₹ sign.
 */
import { jsPDF } from "jspdf";
import { autoTable, type CellInput, type RowInput, type Styles } from "jspdf-autotable";
import { APP_NAME } from "../../../app/brand";
import type { BusinessSettings } from "../../../data/types";
import boldFontUrl from "./fonts/Inter-Bold.ttf?url";
import regularFontUrl from "./fonts/Inter-Regular.ttf?url";

type RGB = [number, number, number];

const FONT = "Inter";
const MARGIN = 40;
const FOOTER_SPACE = 44;
const COLORS: Record<"ink" | "muted" | "line" | "headFill" | "primary" | "due" | "paid", RGB> = {
  ink: [17, 24, 39],
  muted: [107, 114, 128],
  line: [229, 231, 235],
  headFill: [246, 247, 249],
  primary: [35, 53, 68],
  due: [180, 35, 24],
  paid: [6, 118, 71],
};

export interface SummaryBox {
  label: string;
  value: string;
  tone?: "due" | "paid";
}

async function fetchBase64(url: string): Promise<string> {
  const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(binary);
}

let fontsPromise: Promise<[string, string]> | null = null;
const loadFonts = () => (fontsPromise ??= Promise.all([fetchBase64(regularFontUrl), fetchBase64(boldFontUrl)]));

export class ReportDoc {
  private y = MARGIN;

  private constructor(private readonly doc: jsPDF) {}

  static async create(): Promise<ReportDoc> {
    const [regular, bold] = await loadFonts();
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.addFileToVFS("Inter-Regular.ttf", regular);
    doc.addFont("Inter-Regular.ttf", FONT, "normal");
    doc.addFileToVFS("Inter-Bold.ttf", bold);
    doc.addFont("Inter-Bold.ttf", FONT, "bold");
    doc.setFont(FONT, "normal");
    return new ReportDoc(doc);
  }

  private get pageWidth(): number { return this.doc.internal.pageSize.getWidth(); }
  private get pageHeight(): number { return this.doc.internal.pageSize.getHeight(); }
  private get contentWidth(): number { return this.pageWidth - MARGIN * 2; }

  private text(value: string, x: number, y: number, size: number, opts: { bold?: boolean; color?: RGB; align?: "left" | "right" } = {}): void {
    this.doc.setFont(FONT, opts.bold ? "bold" : "normal").setFontSize(size).setTextColor(...(opts.color ?? COLORS.ink));
    this.doc.text(value, x, y, { align: opts.align ?? "left", baseline: "top" });
  }

  private ensureSpace(height: number): void {
    if (this.y + height > this.pageHeight - FOOTER_SPACE) {
      this.doc.addPage();
      this.y = MARGIN;
    }
  }

  header(business: BusinessSettings, title: string, details: string[]): this {
    const right = this.pageWidth - MARGIN;
    this.text(business.name || APP_NAME, MARGIN, this.y, 15, { bold: true });
    [business.address, business.phone].filter(Boolean).forEach((line, i) => this.text(line, MARGIN, this.y + 22 + i * 12, 8.5, { color: COLORS.muted }));
    this.text(title, right, this.y, 15, { bold: true, align: "right", color: COLORS.primary });
    details.forEach((line, i) => this.text(line, right, this.y + 22 + i * 12, 8.5, { color: COLORS.muted, align: "right" }));
    const lines = Math.max([business.address, business.phone].filter(Boolean).length, details.length);
    this.y += 30 + lines * 12;
    this.doc.setDrawColor(...COLORS.line).setLineWidth(0.8).line(MARGIN, this.y, right, this.y);
    this.y += 16;
    return this;
  }

  info(label: string, lines: string[]): this {
    const shown = lines.filter(Boolean);
    this.ensureSpace(16 + shown.length * 13);
    this.text(label.toUpperCase(), MARGIN, this.y, 7.5, { bold: true, color: COLORS.muted });
    shown.forEach((line, i) => this.text(line, MARGIN, this.y + 12 + i * 13, i === 0 ? 11 : 9, { bold: i === 0, color: i === 0 ? COLORS.ink : COLORS.muted }));
    this.y += 20 + shown.length * 13;
    return this;
  }

  summary(boxes: SummaryBox[]): this {
    const gap = 8;
    const height = 44;
    const width = (this.contentWidth - gap * (boxes.length - 1)) / boxes.length;
    this.ensureSpace(height + 16);
    boxes.forEach((box, i) => {
      const x = MARGIN + i * (width + gap);
      this.doc.setDrawColor(...COLORS.line).setLineWidth(0.8).roundedRect(x, this.y, width, height, 5, 5);
      this.text(box.label, x + 10, this.y + 9, 7.5, { color: COLORS.muted });
      this.text(box.value, x + 10, this.y + 22, 11.5, { bold: true, color: box.tone ? COLORS[box.tone] : COLORS.ink });
    });
    this.y += height + 18;
    return this;
  }

  section(title: string): this {
    this.ensureSpace(40);
    this.text(title, MARGIN, this.y, 10, { bold: true });
    this.y += 16;
    return this;
  }

  table(head: string[], body: RowInput[], opts: { foot?: CellInput[]; columnStyles?: Record<number, Partial<Styles>> } = {}): this {
    autoTable(this.doc, {
      startY: this.y,
      head: [head],
      body,
      foot: opts.foot ? [opts.foot] : undefined,
      showFoot: "lastPage",
      theme: "plain",
      margin: { left: MARGIN, right: MARGIN, bottom: FOOTER_SPACE },
      styles: { font: FONT, fontSize: 8.8, textColor: COLORS.ink, cellPadding: { top: 5, bottom: 5, left: 5, right: 5 }, lineColor: COLORS.line, lineWidth: { bottom: 0.5 }, valign: "top" },
      headStyles: { fontStyle: "bold", fontSize: 7.8, textColor: COLORS.muted, fillColor: COLORS.headFill },
      footStyles: { fontStyle: "bold", fillColor: [255, 255, 255], lineWidth: { top: 0.8 } },
      columnStyles: opts.columnStyles,
      // Column alignment only applies to body cells; line head/foot up with them.
      didParseCell: (data) => {
        const halign = opts.columnStyles?.[data.column.index]?.halign;
        if (halign && data.section !== "body") data.cell.styles.halign = halign;
      },
    });
    this.y = ((this.doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? this.y) + 18;
    return this;
  }

  paragraph(label: string, value: string): this {
    const lines = this.doc.setFontSize(9).splitTextToSize(value, this.contentWidth) as string[];
    this.ensureSpace(18 + lines.length * 12);
    this.text(label.toUpperCase(), MARGIN, this.y, 7.5, { bold: true, color: COLORS.muted });
    lines.forEach((line, i) => this.text(line, MARGIN, this.y + 12 + i * 12, 9));
    this.y += 20 + lines.length * 12;
    return this;
  }

  finish(footerText: string): Blob {
    const pages = this.doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      this.doc.setPage(p);
      const y = this.pageHeight - 28;
      this.text(footerText, MARGIN, y, 7.5, { color: COLORS.muted });
      this.text(`Page ${p} of ${pages}`, this.pageWidth - MARGIN, y, 7.5, { color: COLORS.muted, align: "right" });
    }
    return this.doc.output("blob");
  }
}

/** Right-aligned money columns. */
export const RIGHT: Partial<Styles> = { halign: "right" };
