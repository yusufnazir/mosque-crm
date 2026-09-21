/** Escapes a single CSV field (RFC 4180: wrap in quotes and double embedded quotes). */
export function escapeCsvField(value: string, delimiter: string): string {
  const text = value ?? '';
  if (text.includes('"') || text.includes('\n') || text.includes('\r') || text.includes(delimiter)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Builds a CRLF-joined CSV document from headers + rows. */
export function buildCsv(headers: string[], rows: string[][], delimiter = ','): string {
  return [headers, ...rows]
    .map(row => row.map(cell => escapeCsvField(cell == null ? '' : String(cell), delimiter)).join(delimiter))
    .join('\r\n');
}

/**
 * Downloads a CSV file the browser can open directly in Excel/Sheets.
 * <p>
 * A UTF-8 BOM is prepended so accented characters survive a double-click open, and the
 * delimiter defaults to a comma. Callers in comma-decimal locales (nl) should pass `;`
 * because Excel uses the OS list separator to split columns.
 */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: string[][],
  options?: { delimiter?: string }
) {
  const csv = buildCsv(headers, rows, options?.delimiter ?? ',');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadExcel(filename: string, sheetName: string, headers: string[], rows: string[][]) {
  import('xlsx').then(XLSX => {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const colWidths = headers.map((h, i) => {
      const maxLen = Math.max(h.length, ...rows.map(r => (r[i] || '').length));
      return { wch: Math.min(maxLen + 2, 40) };
    });
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
    XLSX.writeFile(wb, filename);
  });
}

export function downloadPdf(filename: string, title: string, headers: string[], rows: string[][]) {
  Promise.all([import('jspdf'), import('jspdf-autotable')]).then(([jspdfMod]) => {
    const doc = new jspdfMod.jsPDF({ orientation: rows[0]?.length > 4 ? 'landscape' : 'portrait' });
    doc.setFontSize(14);
    doc.text(title, 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(new Date().toLocaleString(), 14, 24);
    (doc as unknown as { autoTable: (opts: object) => void }).autoTable({
      head: [headers],
      body: rows,
      startY: 30,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [4, 120, 87], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 249] },
      margin: { top: 30 },
    });
    doc.save(filename);
  });
}
