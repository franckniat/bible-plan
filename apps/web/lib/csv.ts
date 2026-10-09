/** Characters that make spreadsheet apps evaluate a cell as a formula. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  let text = value instanceof Date ? value.toISOString() : String(value)
  // Neutralize CSV injection: "=HYPERLINK(...)" must stay plain text.
  if (FORMULA_PREFIX.test(text)) text = `'${text}`
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** RFC 4180 CSV (CRLF line endings), safe to open in spreadsheet apps. */
export function toCsv(
  headers: readonly string[],
  rows: readonly (readonly unknown[])[]
): string {
  return [headers, ...rows]
    .map((row) => row.map(escapeCell).join(","))
    .join("\r\n")
}
