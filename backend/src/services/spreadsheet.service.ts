import * as XLSX from "xlsx";

export type SpreadsheetRow = Record<string, unknown>;

export function parseWorkbook(buffer: Buffer): SpreadsheetRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [];
  }

  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    return [];
  }

  return XLSX.utils.sheet_to_json<SpreadsheetRow>(sheet, { defval: null });
}
