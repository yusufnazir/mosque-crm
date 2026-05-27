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
