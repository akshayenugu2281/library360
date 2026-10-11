/** Export a user-visible table without trusting cell text as spreadsheet formulas. */
export function downloadCsv(filename: string, rows: Array<Record<string, string | number | boolean | null | undefined>>): void {
  if (rows.length === 0) return;
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const safeCell = (value: string | number | boolean | null | undefined): string => {
    let text = value == null ? "" : String(value);
    // Prefix potentially executable spreadsheet cells (formula injection) with an apostrophe.
    if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const csv = [columns.map(safeCell).join(","), ...rows.map((row) => columns.map((column) => safeCell(row[column])).join(","))].join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
