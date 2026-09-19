/* In-memory stand-in for the parts of SpreadsheetApp that apps-script/Code.gs uses.
 * Mirrors two Sheets behaviours worth catching locally: a leading apostrophe is a text
 * marker (not part of the value), and writing a formula-looking string is a bug.
 */
type Cell = string | number | boolean;

const DEFAULT_MAX_ROWS = 1000;
const DEFAULT_MAX_COLUMNS = 26;

export class FakeRange {
  constructor(readonly sheet: FakeSheet, readonly row: number, readonly column: number, readonly numRows: number, readonly numColumns: number) {
    if (row < 1 || column < 1 || row + numRows - 1 > sheet.maxRows || column + numColumns - 1 > sheet.maxColumns) {
      throw new Error(`Range out of bounds: ${sheet.name}!R${row}C${column} ${numRows}x${numColumns}`);
    }
  }
  getValues(): Cell[][] {
    return Array.from({ length: this.numRows }, (_, r) => Array.from({ length: this.numColumns }, (_, c) =>
      this.sheet.cells[this.row - 1 + r]?.[this.column - 1 + c] ?? ""));
  }
  setValues(values: Cell[][]): this {
    if (values.length !== this.numRows || values.some((line) => line.length !== this.numColumns)) throw new Error("setValues: size mismatch");
    values.forEach((line, r) => line.forEach((v, c) => {
      if (typeof v === "string" && v.startsWith("=")) throw new Error("Formula written to sheet: " + v);
      const rowCells = (this.sheet.cells[this.row - 1 + r] ??= []);
      rowCells[this.column - 1 + c] = typeof v === "string" && v.startsWith("'") ? v.slice(1) : v;
    }));
    return this;
  }
  setValue(v: Cell): this { return this.setValues([[v]]); }
  setNumberFormat(): this { return this; }
  setNumberFormats(): this { return this; }
  setFontWeight(): this { return this; }
  getRow(): number { return this.row; }
  getLastRow(): number { return this.row + this.numRows - 1; }
  getSheet(): FakeSheet { return this.sheet; }
}

export class FakeSheet {
  cells: Cell[][] = [];
  maxRows = DEFAULT_MAX_ROWS;
  maxColumns = DEFAULT_MAX_COLUMNS;
  constructor(readonly name: string, readonly parent: FakeSpreadsheet) {}
  getName(): string { return this.name; }
  getParent(): FakeSpreadsheet { return this.parent; }
  getLastRow(): number {
    for (let r = this.cells.length - 1; r >= 0; r--) if ((this.cells[r] ?? []).some((v) => v !== "" && v !== undefined)) return r + 1;
    return 0;
  }
  getLastColumn(): number {
    return this.cells.reduce((max, line) => {
      for (let c = (line ?? []).length - 1; c >= 0; c--) if (line[c] !== "" && line[c] !== undefined) return Math.max(max, c + 1);
      return max;
    }, 0);
  }
  getMaxRows(): number { return this.maxRows; }
  getMaxColumns(): number { return this.maxColumns; }
  insertRowsAfter(_after: number, count: number): void { this.maxRows += count; }
  insertColumnsAfter(_after: number, count: number): void { this.maxColumns += count; }
  getRange(row: number, column: number, numRows = 1, numColumns = 1): FakeRange { return new FakeRange(this, row, column, numRows, numColumns); }
  setFrozenRows(): void {}
}

export class FakeSpreadsheet {
  readonly sheets = new Map<string, FakeSheet>();
  getSheetByName(name: string): FakeSheet | null { return this.sheets.get(name) ?? null; }
  insertSheet(name: string): FakeSheet {
    const sheet = new FakeSheet(name, this);
    this.sheets.set(name, sheet);
    return sheet;
  }
  getSpreadsheetTimeZone(): string { return "Asia/Kolkata"; }
  dump(): Record<string, Cell[][]> {
    return Object.fromEntries([...this.sheets].map(([name, s]) => [name, s.cells.slice(0, s.getLastRow())]));
  }
}
