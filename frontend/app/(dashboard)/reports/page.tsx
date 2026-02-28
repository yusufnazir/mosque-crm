'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import {
  reportApi,
  paymentStatsApi,
  memberApi,
  PaymentSummaryReport,
  ContributionTotalReport,
  ContributionTypeColumn,
  CurrencyAmount,
} from '@/lib/api';
import { memberPaymentApi, MemberPayment } from '@/lib/contributionApi';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function ReportsPage() {
  const { t, language } = useTranslation();
  const { can, user, activeMosqueName } = useAuth();

  // Report selection
  const [selectedReport, setSelectedReport] = useState<string>('payment-summary');

  // Year filter
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Report data
  const [report, setReport] = useState<PaymentSummaryReport | null>(null);
  const [contribReport, setContribReport] = useState<ContributionTotalReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sharingMemberReport, setSharingMemberReport] = useState(false);

  // Member Payment History state
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [selectedMemberDetails, setSelectedMemberDetails] = useState<any | null>(null);
  const [memberPayments, setMemberPayments] = useState<MemberPayment[]>([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [selectedHistoryYear, setSelectedHistoryYear] = useState<number | null>(null);
  const [historyYears, setHistoryYears] = useState<number[]>([]);

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Load available years on mount
  useEffect(() => {
    paymentStatsApi.getPaymentYears().then((years) => {
      if (years && years.length > 0) {
        setAvailableYears(years);
        // Default to current year if available, otherwise use first available year
        const currentYear = new Date().getFullYear();
        const defaultYear = years.includes(currentYear) ? currentYear : years[0];
        setSelectedYear(defaultYear);
      }
    }).catch(console.error);
  }, []);

  // Fetch paginated report data
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reportApi.getPaymentSummary(selectedYear, language, page, pageSize);
      setReport(data);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, language, page, pageSize]);

  // Fetch contribution totals report
  const fetchContributionTotals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reportApi.getContributionTotals(selectedYear, language);
      setContribReport(data);
    } catch (error) {
      console.error('Failed to fetch contribution totals:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, language]);

  useEffect(() => {
    if (selectedYear > 0 && selectedReport === 'payment-summary') {
      fetchReport();
    }
  }, [fetchReport, selectedYear, selectedReport]);

  useEffect(() => {
    if (selectedYear > 0 && selectedReport === 'contribution-totals') {
      fetchContributionTotals();
    }
  }, [fetchContributionTotals, selectedYear, selectedReport]);

  // Reset to first page when year changes
  useEffect(() => {
    setPage(0);
  }, [selectedYear]);

  // Load members when member-payment-history report is selected
  useEffect(() => {
    if (selectedReport === 'member-payment-history') {
      setLoading(true);
      memberApi.getAll()
        .then((data) => {
          const source = Array.isArray(data) ? data : [];
          const memberList = source
            .filter((m: any) => m.id && m.firstName)
            .sort((a: any, b: any) => {
              const aName = `${a.lastName || ''} ${a.firstName}`.trim();
              const bName = `${b.lastName || ''} ${b.firstName}`.trim();
              return aName.localeCompare(bName);
            });
          setMembers(memberList);
        })
        .catch((err) => console.error('Failed to load members:', err))
        .finally(() => setLoading(false));
    }
  }, [selectedReport]);

  // Load payments for selected member
  useEffect(() => {
    if (selectedReport === 'member-payment-history' && selectedMemberId) {
      setLoading(true);
      memberPaymentApi.getByPerson(selectedMemberId)
        .then((data: MemberPayment[]) => {
          setMemberPayments(data || []);
          // Extract unique years from payments
          const years = Array.from(
            new Set(
              (data || [])
                .map(p => new Date(p.paymentDate).getFullYear())
                .filter(y => !isNaN(y))
            )
          ).sort((a, b) => b - a);
          setHistoryYears(years);
          if (years.length > 0 && !selectedHistoryYear) {
            setSelectedHistoryYear(years[0]);
          }
        })
        .catch((err) => console.error('Failed to load member payments:', err))
        .finally(() => setLoading(false));
    }
  }, [selectedReport, selectedMemberId, selectedHistoryYear]);

  // Fetch member details when member is selected
  useEffect(() => {
    if (selectedMemberId) {
      memberApi.getById(String(selectedMemberId))
        .then((data: any) => {
          setSelectedMemberDetails(data);
        })
        .catch((err) => console.error('Failed to load member details:', err));
    }
  }, [selectedMemberId]);

  // Page navigation helpers
  const goToPage = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) setPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  const startItem = totalElements === 0 ? 0 : page * pageSize + 1;
  const endItem = Math.min((page + 1) * pageSize, totalElements);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(0, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages - 1, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(0, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

  // ── Column helpers ───────────────────────────────────────────────

  /** Collect all unique currency codes present in the report, sorted. */
  const getUniqueCurrencies = (data: PaymentSummaryReport): string[] => {
    const codes = new Set<string>();
    for (const row of data.rows) {
      for (const amounts of Object.values(row.amounts)) {
        for (const a of amounts) codes.add(a.currencyCode);
      }
      for (const a of row.totals) codes.add(a.currencyCode);
    }
    return Array.from(codes).sort();
  };

  /** Find the amount for a specific currency in a CurrencyAmount list. */
  const amountForCurrency = (amounts: CurrencyAmount[], code: string): string => {
    const found = amounts?.find(a => a.currencyCode === code);
    return found ? found.amount.toFixed(2) : '';
  };

  /** Build flat header array: Name cols + (type × currency) + (total × currency). */
  const buildExportHeaders = (types: ContributionTypeColumn[], currencies: string[]): string[] => {
    const headers = [t('reports.col_lastname'), t('reports.col_firstname')];
    for (const ct of types) {
      for (const cur of currencies) {
        headers.push(`${ct.name} (${cur})`);
      }
    }
    for (const cur of currencies) {
      headers.push(`${t('reports.col_total')} (${cur})`);
    }
    return headers;
  };

  /** Build flat data rows matching the header structure. */
  const buildExportRows = (data: PaymentSummaryReport, currencies: string[]): string[][] => {
    return data.rows.map((row) => {
      const cells: string[] = [capitalize(row.lastName || ''), capitalize(row.firstName || '')];
      for (const ct of data.contributionTypes) {
        for (const cur of currencies) {
          cells.push(amountForCurrency(row.amounts[ct.id] || [], cur));
        }
      }
      for (const cur of currencies) {
        cells.push(amountForCurrency(row.totals, cur));
      }
      return cells;
    });
  };

  const handleExportExcel = async () => {
    if (!report) return;
    setExporting(true);
    try {
      // Fetch ALL rows for export (no pagination)
      const allData = await reportApi.getPaymentSummaryAll(selectedYear, language);
      const XLSX = await import('xlsx');
      const currencies = getUniqueCurrencies(allData);
      const headers = buildExportHeaders(allData.contributionTypes, currencies);
      const dataRows = buildExportRows(allData, currencies);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

      // Auto-size columns
      ws['!cols'] = headers.map((h, i) => ({
        wch: Math.max(h.length, ...dataRows.map(r => (r[i] || '').length)) + 2,
      }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('reports.payment_summary'));
      XLSX.writeFile(wb, `payment-summary-${allData.year}.xlsx`);
    } catch (error) {
      console.error('Excel export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!report) return;
    setExporting(true);
    try {
      // Fetch ALL rows for export (no pagination)
      const allData = await reportApi.getPaymentSummaryAll(selectedYear, language);
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Title
      doc.setFontSize(16);
      doc.setTextColor(4, 120, 87); // emerald-700
      doc.text(`${t('reports.payment_summary')} — ${allData.year}`, 14, 18);

      // Table
      const currencies = getUniqueCurrencies(allData);
      const headers = buildExportHeaders(allData.contributionTypes, currencies);
      const dataRows = buildExportRows(allData, currencies);

      autoTable(doc, {
        startY: 25,
        head: [headers],
        body: dataRows,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: {
          fillColor: [4, 120, 87],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: { fillColor: [245, 245, 244] },
        margin: { left: 14, right: 14 },
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `${t('reports.generated_on')} ${new Date().toLocaleDateString()} — ${t('pagination.showing_range', { start: '1', end: String(allData.rows.length), total: String(allData.rows.length) })}`,
          14,
          doc.internal.pageSize.height - 10
        );
        doc.text(
          `${i} / ${pageCount}`,
          doc.internal.pageSize.width - 25,
          doc.internal.pageSize.height - 10
        );
      }

      doc.save(`payment-summary-${allData.year}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  // ── Contribution Totals export handlers ─────────────────────────

  const handleContribExportExcel = async () => {
    if (!contribReport) return;
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const headers = [t('reports.col_code'), t('reports.col_contribution_type'), ...contribReport.currencies.map(c => c)];
      const dataRows = contribReport.rows.map((row) => {
        const cells: string[] = [row.contributionTypeCode, row.contributionTypeName];
        for (const cur of contribReport.currencies) {
          const found = row.totals.find(tot => tot.currencyCode === cur);
          cells.push(found ? found.amount.toFixed(2) : '');
        }
        return cells;
      });
      // Grand total row
      const grandRow: string[] = ['', t('reports.grand_total')];
      for (const cur of contribReport.currencies) {
        const found = contribReport.grandTotals.find(tot => tot.currencyCode === cur);
        grandRow.push(found ? found.amount.toFixed(2) : '');
      }
      dataRows.push(grandRow);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
      ws['!cols'] = headers.map((h, i) => ({
        wch: Math.max(h.length, ...dataRows.map(r => (r[i] || '').length)) + 2,
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('reports.contribution_totals'));
      XLSX.writeFile(wb, `contribution-totals-${contribReport.year}.xlsx`);
    } catch (error) {
      console.error('Excel export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleContribExportPdf = async () => {
    if (!contribReport) return;
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      doc.setFontSize(16);
      doc.setTextColor(4, 120, 87);
      doc.text(`${t('reports.contribution_totals')} — ${contribReport.year}`, 14, 18);

      const headers = [t('reports.col_code'), t('reports.col_contribution_type'), ...contribReport.currencies.map(c => c)];
      const dataRows = contribReport.rows.map((row) => {
        const cells: string[] = [row.contributionTypeCode, row.contributionTypeName];
        for (const cur of contribReport.currencies) {
          const found = row.totals.find(tot => tot.currencyCode === cur);
          cells.push(found ? found.amount.toFixed(2) : '');
        }
        return cells;
      });
      // Grand total row
      const grandRow: string[] = ['', t('reports.grand_total')];
      for (const cur of contribReport.currencies) {
        const found = contribReport.grandTotals.find(tot => tot.currencyCode === cur);
        grandRow.push(found ? found.amount.toFixed(2) : '');
      }
      dataRows.push(grandRow);

      autoTable(doc, {
        startY: 25,
        head: [headers],
        body: dataRows,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [4, 120, 87], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 244] },
        // Bold grand total row
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.row.index === dataRows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [236, 253, 245];
            data.cell.styles.textColor = [4, 120, 87];
          }
        },
        margin: { left: 14, right: 14 },
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `${t('reports.generated_on')} ${new Date().toLocaleDateString()}`,
          14,
          doc.internal.pageSize.height - 10
        );
        doc.text(
          `${i} / ${pageCount}`,
          doc.internal.pageSize.width - 25,
          doc.internal.pageSize.height - 10
        );
      }

      doc.save(`contribution-totals-${contribReport.year}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  // ── Member Payment History export handler ────────────────────────

  const handleMemberPaymentShare = async () => {
    if (!selectedMemberId || !selectedMemberDetails || memberPayments.length === 0) return;

    // Check if Web Share API is available
    if (!navigator.share) {
      // Fallback to download
      handleMemberPaymentExportPdf();
      return;
    }

    try {
      setSharingMemberReport(true);

      // Generate the PDF as a blob
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Filter payments by selected year if applicable
      const filteredPayments = selectedHistoryYear
        ? memberPayments.filter((p) => new Date(p.paymentDate).getFullYear() === selectedHistoryYear)
        : memberPayments;

      // Header with title and organization
      doc.setFontSize(18);
      doc.setTextColor(4, 120, 87);
      doc.text(t('reports.member_payment_history'), 14, 18);
      
      // Organization name
      if (activeMosqueName) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(activeMosqueName, 14, 25);
      }

      // Member details section
      let yPosition = activeMosqueName ? 33 : 28;
      doc.setFontSize(11);
      doc.setTextColor(28, 25, 23);
      doc.setFont('helvetica', 'bold');
      doc.text(`${t('reports.member_profile')}`, 14, yPosition);
      yPosition += 7;

      const memberName = `${selectedMemberDetails.firstName || ''} ${selectedMemberDetails.lastName || ''}`.trim();
      
      // Member details in two columns
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      const leftColumn = [
        { label: `${t('common.name')}:`, value: memberName },
        { label: `${t('reports.email')}:`, value: selectedMemberDetails.email || '-' },
        { label: `${t('reports.date_of_birth')}:`, value: selectedMemberDetails.dateOfBirth ? new Date(selectedMemberDetails.dateOfBirth).toLocaleDateString() : '-' },
      ];
      
      const rightColumn = [
        { label: `${t('reports.member_id')}:`, value: String(selectedMemberId) },
        { label: `${t('reports.phone')}:`, value: selectedMemberDetails.phone || '-' },
        { label: `${t('account.member_since')}:`, value: selectedMemberDetails.memberSince ? new Date(selectedMemberDetails.memberSince).toLocaleDateString() : '-' },
      ];

      const leftX = 14;
      const rightX = 110;
      const labelWidth = 35;
      
      for (let i = 0; i < Math.max(leftColumn.length, rightColumn.length); i++) {
        // Left column
        if (i < leftColumn.length) {
          doc.setTextColor(100, 100, 100);
          doc.text(leftColumn[i].label, leftX, yPosition);
          doc.setTextColor(28, 25, 23);
          doc.text(leftColumn[i].value || '-', leftX + labelWidth, yPosition);
        }
        
        // Right column
        if (i < rightColumn.length) {
          doc.setTextColor(100, 100, 100);
          doc.text(rightColumn[i].label, rightX, yPosition);
          doc.setTextColor(28, 25, 23);
          doc.text(rightColumn[i].value || '-', rightX + labelWidth, yPosition);
        }
        
        yPosition += 5;
      }

      yPosition += 3;

      // Payments section
      if (filteredPayments.length > 0) {
        const headers = [
          t('reports.date'),
          t('reports.type'),
          t('reports.amount'),
          t('reports.currency'),
          t('reports.period_from'),
          t('reports.period_to'),
          t('reports.reference'),
        ];

        const rows = filteredPayments.map(p => [
          new Date(p.paymentDate).toLocaleDateString(),
          p.contributionTypeName || p.contributionTypeCode || 'Unknown',
          p.amount.toFixed(2),
          p.currencyCode || 'N/A',
          p.periodFrom ? new Date(p.periodFrom).toLocaleDateString() : '-',
          p.periodTo ? new Date(p.periodTo).toLocaleDateString() : '-',
          p.reference || '-',
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [headers],
          body: rows,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: {
            fillColor: [4, 120, 87],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
          },
          alternateRowStyles: { fillColor: [245, 245, 244] },
          margin: { left: 14, right: 14 },
          didParseCell: (data: any) => {
            if (data.column.index === 2) {
              data.cell.styles.halign = 'right';
            }
          },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 8;

        // Summary - grouped by currency
        const currencyTotals = filteredPayments.reduce((acc: any, p: MemberPayment) => {
          const currKey = p.currencyCode || 'Unknown';
          if (!acc[currKey]) {
            acc[currKey] = { total: 0, symbol: p.currencySymbol || '', code: currKey };
          }
          acc[currKey].total += p.amount || 0;
          return acc;
        }, {});

        const totalsRows = Object.entries(currencyTotals).map(([currKey, data]: [string, any]) => [
          data.code,
          `${data.symbol}${data.total.toFixed(2)}`
        ]);

        const estimatedHeight = 15 + (totalsRows.length * 8);
        if (yPosition + estimatedHeight > 270) {
          doc.addPage();
          yPosition = 20;
        }

        autoTable(doc, {
          startY: yPosition,
          head: [[t('reports.col_total'), '']],
          body: totalsRows,
          theme: 'plain',
          styles: { 
            fontSize: 10, 
            cellPadding: 3,
            lineColor: [4, 120, 87],
            lineWidth: 0.5,
          },
          headStyles: {
            fillColor: [236, 253, 245],
            textColor: [4, 120, 87],
            fontStyle: 'bold',
            halign: 'left',
          },
          bodyStyles: {
            fillColor: [255, 255, 255],
            textColor: [28, 25, 23],
          },
          columnStyles: {
            0: { cellWidth: 30, fontStyle: 'bold' },
            1: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
          },
          margin: { left: 14, right: 14 },
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `${t('reports.generated_on')} ${new Date().toLocaleDateString()}`,
          14,
          285
        );
        doc.text(
          `${i} / ${pageCount}`,
          doc.internal.pageSize.getWidth() - 20,
          285
        );
      }

      // Convert to blob
      const pdfBlob = doc.output('blob');
      const fileName = `Member_Payment_History_${selectedMemberId}_${selectedHistoryYear || 'All'}.pdf`;
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      // Check if we can share files
      const shareData: ShareData = {
        title: t('reports.member_payment_history'),
        text: `${t('reports.member_payment_history')} - ${memberName}`,
      };

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        shareData.files = [pdfFile];
      }

      // Share
      await navigator.share(shareData);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
        // Fallback to download on actual error
        handleMemberPaymentExportPdf();
      }
    } finally {
      setSharingMemberReport(false);
    }
  };

  const handleMemberPaymentExportPdf = async () => {
    if (!selectedMemberId || !selectedMemberDetails || memberPayments.length === 0) return;
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Header with title and organization
      doc.setFontSize(18);
      doc.setTextColor(4, 120, 87);
      doc.text(t('reports.member_payment_history'), 14, 18);
      
      // Organization name
      if (activeMosqueName) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(activeMosqueName, 14, 25);
      }

      // Member details section
      let yPosition = activeMosqueName ? 33 : 28;
      doc.setFontSize(11);
      doc.setTextColor(28, 25, 23);
      doc.setFont('helvetica', 'bold');
      doc.text(`${t('reports.member_profile')}`, 14, yPosition);
      yPosition += 7;

      const memberName = `${selectedMemberDetails.firstName || ''} ${selectedMemberDetails.lastName || ''}`.trim();
      
      // Member details in two columns
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      const leftColumn = [
        { label: `${t('common.name')}:`, value: memberName },
        { label: `${t('reports.email')}:`, value: selectedMemberDetails.email || '-' },
        { label: `${t('reports.date_of_birth')}:`, value: selectedMemberDetails.dateOfBirth ? new Date(selectedMemberDetails.dateOfBirth).toLocaleDateString() : '-' },
      ];
      
      const rightColumn = [
        { label: `${t('reports.member_id')}:`, value: String(selectedMemberId) },
        { label: `${t('reports.phone')}:`, value: selectedMemberDetails.phone || '-' },
        { label: `${t('account.member_since')}:`, value: selectedMemberDetails.memberSince ? new Date(selectedMemberDetails.memberSince).toLocaleDateString() : '-' },
      ];

      const leftX = 14;
      const rightX = 110;
      const labelWidth = 35;
      
      for (let i = 0; i < Math.max(leftColumn.length, rightColumn.length); i++) {
        // Left column
        if (i < leftColumn.length) {
          doc.setTextColor(100, 100, 100);
          doc.text(leftColumn[i].label, leftX, yPosition);
          doc.setTextColor(28, 25, 23);
          doc.text(leftColumn[i].value || '-', leftX + labelWidth, yPosition);
        }
        
        // Right column
        if (i < rightColumn.length) {
          doc.setTextColor(100, 100, 100);
          doc.text(rightColumn[i].label, rightX, yPosition);
          doc.setTextColor(28, 25, 23);
          doc.text(rightColumn[i].value || '-', rightX + labelWidth, yPosition);
        }
        
        yPosition += 5;
      }

      yPosition += 3;

      // Payments section
      const filteredPayments = selectedHistoryYear
        ? memberPayments.filter(p => new Date(p.paymentDate).getFullYear() === selectedHistoryYear)
        : memberPayments;

      if (filteredPayments.length > 0) {
        doc.setFontSize(11);
        doc.setTextColor(4, 120, 87);
        doc.text(
          `${t('reports.all_payments')} (${selectedHistoryYear || t('reports.all')})`,
          14,
          yPosition
        );
        yPosition += 8;

        // Prepare table data
        const headers = [
          t('reports.payment_date'),
          t('reports.contribution_type'),
          t('reports.amount'),
          t('reports.currency'),
          t('reports.period_from'),
          t('reports.period_to'),
          t('reports.reference'),
        ];

        const rows = filteredPayments.map(p => [
          new Date(p.paymentDate).toLocaleDateString(),
          p.contributionTypeName || p.contributionTypeCode || 'Unknown',
          p.amount.toFixed(2),
          p.currencyCode || 'N/A',
          p.periodFrom ? new Date(p.periodFrom).toLocaleDateString() : '-',
          p.periodTo ? new Date(p.periodTo).toLocaleDateString() : '-',
          p.reference || '-',
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [headers],
          body: rows,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: {
            fillColor: [4, 120, 87],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
          },
          alternateRowStyles: { fillColor: [245, 245, 244] },
          margin: { left: 14, right: 14 },
          didParseCell: (data: any) => {
            // Right-align amounts
            if (data.column.index === 2) {
              data.cell.styles.halign = 'right';
            }
          },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 8;

        // Summary - grouped by currency
        const currencyTotals = filteredPayments.reduce((acc: any, p: MemberPayment) => {
          const currKey = p.currencyCode || 'Unknown';
          if (!acc[currKey]) {
            acc[currKey] = { total: 0, symbol: p.currencySymbol || '', code: currKey };
          }
          acc[currKey].total += p.amount || 0;
          return acc;
        }, {});

        // Create totals table
        const totalsRows = Object.entries(currencyTotals).map(([currKey, data]: [string, any]) => [
          data.code,
          `${data.symbol}${data.total.toFixed(2)}`
        ]);

        // Check if there's enough space for totals table, if not add a new page
        const estimatedHeight = 15 + (totalsRows.length * 8); // header + rows
        if (yPosition + estimatedHeight > 270) { // 270mm is safe bottom margin
          doc.addPage();
          yPosition = 20;
        }

        autoTable(doc, {
          startY: yPosition,
          head: [[t('reports.col_total'), '']],
          body: totalsRows,
          theme: 'plain',
          styles: { 
            fontSize: 10, 
            cellPadding: 3,
            lineColor: [4, 120, 87],
            lineWidth: 0.5,
          },
          headStyles: {
            fillColor: [236, 253, 245], // emerald-50
            textColor: [4, 120, 87],
            fontStyle: 'bold',
            halign: 'left',
          },
          bodyStyles: {
            fillColor: [255, 255, 255],
            textColor: [28, 25, 23],
          },
          columnStyles: {
            0: { cellWidth: 30, fontStyle: 'bold' },
            1: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
          },
          margin: { left: 14, right: 14 },
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `${t('reports.generated_on')} ${new Date().toLocaleDateString()}`,
          14,
          doc.internal.pageSize.height - 10
        );
        doc.text(
          `${i} / ${pageCount}`,
          doc.internal.pageSize.width - 20,
          doc.internal.pageSize.height - 10
        );
      }

      const fileName = `payment-history-${memberName.replace(/\s+/g, '-')}-${selectedHistoryYear || 'all'}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  // ── Report catalog ──────────────────────────────────────────────

  const reportCatalog = [
    {
      id: 'payment-summary',
      name: t('reports.payment_summary'),
      description: t('reports.payment_summary_desc'),
      icon: (
        <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'contribution-totals',
      name: t('reports.contribution_totals'),
      description: t('reports.contribution_totals_desc'),
      icon: (
        <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      ),
    },
    {
      id: 'member-payment-history',
      name: t('reports.member_payment_history'),
      description: t('reports.member_payment_history_desc'),
      icon: (
        <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8">
      {/* Page header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-charcoal mb-1 md:mb-2">{t('reports.title')}</h1>
        <p className="text-gray-600 text-sm md:text-base">{t('reports.subtitle')}</p>
      </div>

      {/* Report catalog cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {reportCatalog.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedReport(r.id)}
            className={`text-left p-5 rounded-xl border-2 transition-all ${
              selectedReport === r.id
                ? 'border-emerald-600 bg-emerald-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 p-2 rounded-lg bg-emerald-50">{r.icon}</div>
              <div>
                <h3 className="font-semibold text-charcoal">{r.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{r.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Selected report section */}
      {selectedReport === 'payment-summary' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-lg sm:text-xl">{t('reports.payment_summary')} — {selectedYear}</CardTitle>
                {/* Year filter */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-600">{t('reports.year')}:</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-sm"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Export buttons */}
              {can('report.export') && report && totalElements > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={handleExportExcel}
                    disabled={exporting}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Excel
                  </button>
                  <button
                    onClick={handleExportPdf}
                    disabled={exporting}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    PDF
                  </button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 relative">
            {/* Loading overlay for page transitions */}
            {loading && report && report.rows.length > 0 && (
              <div className="absolute inset-0 bg-white/50 z-20 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            )}
            {loading && (!report || report.rows.length === 0) ? (
              <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : !report || totalElements === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {t('reports.no_data')}
              </div>
            ) : (
              <>
                {/* Summary stats */}
                <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-b border-gray-200">
                  <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-6">
                    <div>
                      <span className="text-xs sm:text-sm text-gray-500">{t('reports.total_members')}</span>
                      <p className="text-base sm:text-lg font-semibold text-charcoal">{totalElements}</p>
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm text-gray-500">{t('reports.contribution_types')}</span>
                      <p className="text-base sm:text-lg font-semibold text-charcoal">{report.contributionTypes.length}</p>
                    </div>
                  </div>
                </div>

                {/* Mobile: Card layout */}
                <div className="md:hidden divide-y divide-gray-200">
                  {report.rows.map((row) => {
                    const currencies = getUniqueCurrencies(report);
                    return (
                      <div key={row.personId} className="px-4 py-3">
                        {/* Person name */}
                        <div className="font-semibold text-charcoal text-sm mb-2">
                          {capitalize(row.lastName || '')} {capitalize(row.firstName || '')}
                        </div>

                        {/* Contribution breakdown */}
                        <div className="space-y-2">
                          {report.contributionTypes.map((ct) => {
                            const amounts = row.amounts[ct.id] || [];
                            if (amounts.length === 0) return null;
                            const hasValues = currencies.some(cur => amountForCurrency(amounts, cur) !== '');
                            if (!hasValues) return null;
                            return (
                              <div key={ct.id} className="bg-gray-50 rounded-lg px-3 py-2">
                                <div className="text-xs font-medium text-gray-500 uppercase mb-1">{ct.name}</div>
                                {currencies.map((cur) => {
                                  const val = amountForCurrency(amounts, cur);
                                  if (!val) return null;
                                  return (
                                    <div key={`${ct.id}-${cur}`} className="flex justify-between text-sm">
                                      <span className="text-gray-600">{cur}</span>
                                      <span className="font-medium tabular-nums">{val}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}

                          {/* Totals */}
                          <div className="bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100">
                            <div className="text-xs font-medium text-emerald-700 uppercase mb-1">{t('reports.col_total')}</div>
                            {currencies.map((cur) => {
                              const val = amountForCurrency(row.totals, cur);
                              if (!val) return null;
                              return (
                                <div key={`total-${cur}`} className="flex justify-between text-sm">
                                  <span className="text-emerald-600">{cur}</span>
                                  <span className="font-semibold text-emerald-700 tabular-nums">{val}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop: Table */}
                <div className="hidden md:block overflow-x-auto">
                  {(() => {
                    const currencies = getUniqueCurrencies(report);
                    return (
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">
                              {t('reports.col_lastname')}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              {t('reports.col_firstname')}
                            </th>
                            {report.contributionTypes.map((ct) =>
                              currencies.map((cur) => (
                                <th key={`${ct.id}-${cur}`} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                                  {ct.name} ({cur})
                                </th>
                              ))
                            )}
                            {currencies.map((cur) => (
                              <th key={`total-${cur}`} className="px-4 py-3 text-right text-xs font-medium text-emerald-700 uppercase whitespace-nowrap bg-emerald-50/50">
                                {t('reports.col_total')} ({cur})
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {report.rows.map((row) => (
                            <tr key={row.personId} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-charcoal sticky left-0 bg-white z-10">
                                {capitalize(row.lastName || '')}
                              </td>
                              <td className="px-4 py-3 text-sm text-charcoal">
                                {capitalize(row.firstName || '')}
                              </td>
                              {report.contributionTypes.map((ct) =>
                                currencies.map((cur) => (
                                  <td key={`${ct.id}-${cur}`} className="px-4 py-3 text-sm text-right text-gray-700 whitespace-nowrap">
                                    {amountForCurrency(row.amounts[ct.id] || [], cur)}
                                  </td>
                                ))
                              )}
                              {currencies.map((cur) => (
                                <td key={`total-${cur}`} className="px-4 py-3 text-sm text-right font-semibold text-emerald-700 whitespace-nowrap bg-emerald-50/30">
                                  {amountForCurrency(row.totals, cur)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Contribution Totals report ──────────────────────────── */}
      {selectedReport === 'contribution-totals' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-lg sm:text-xl">{t('reports.contribution_totals')} — {selectedYear}</CardTitle>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-600">{t('reports.year')}:</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-sm"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Export buttons */}
              {can('report.export') && contribReport && contribReport.rows.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={handleContribExportExcel}
                    disabled={exporting}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Excel
                  </button>
                  <button
                    onClick={handleContribExportPdf}
                    disabled={exporting}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    PDF
                  </button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 relative">
            {loading && contribReport && contribReport.rows.length > 0 && (
              <div className="absolute inset-0 bg-white/50 z-20 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            )}
            {loading && (!contribReport || contribReport.rows.length === 0) ? (
              <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : !contribReport || contribReport.rows.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {t('reports.no_data')}
              </div>
            ) : (
              <>
                {/* Summary stats */}
                <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-b border-gray-200">
                  <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-6">
                    <div>
                      <span className="text-xs sm:text-sm text-gray-500">{t('reports.total_contribution_types')}</span>
                      <p className="text-base sm:text-lg font-semibold text-charcoal">{contribReport.rows.length}</p>
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm text-gray-500">{t('reports.total_currencies')}</span>
                      <p className="text-base sm:text-lg font-semibold text-charcoal">{contribReport.currencies.length}</p>
                    </div>
                  </div>
                </div>

                {/* Mobile: Card layout */}
                <div className="md:hidden divide-y divide-gray-200">
                  {contribReport.rows.map((row) => (
                    <div key={row.contributionTypeId} className="px-4 py-3">
                      <div className="font-semibold text-charcoal text-sm mb-1">{row.contributionTypeName}</div>
                      <div className="text-xs text-gray-400 mb-2">{row.contributionTypeCode}</div>
                      <div className="space-y-1">
                        {contribReport.currencies.map((cur) => {
                          const found = row.totals.find(tot => tot.currencyCode === cur);
                          if (!found || found.amount === 0) return null;
                          return (
                            <div key={cur} className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-1.5">
                              <span className="text-gray-600">{cur}</span>
                              <span className="font-medium tabular-nums">{found.amount.toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {/* Grand total card */}
                  <div className="px-4 py-3">
                    <div className="bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100">
                      <div className="text-xs font-medium text-emerald-700 uppercase mb-1">{t('reports.grand_total')}</div>
                      {contribReport.currencies.map((cur) => {
                        const found = contribReport.grandTotals.find(tot => tot.currencyCode === cur);
                        if (!found || found.amount === 0) return null;
                        return (
                          <div key={`gt-${cur}`} className="flex justify-between text-sm">
                            <span className="text-emerald-600">{cur}</span>
                            <span className="font-semibold text-emerald-700 tabular-nums">{found.amount.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Desktop: Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.col_code')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.col_contribution_type')}</th>
                        {contribReport.currencies.map((cur) => (
                          <th key={cur} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                            {cur}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {contribReport.rows.map((row) => (
                        <tr key={row.contributionTypeId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-mono text-gray-500">{row.contributionTypeCode}</td>
                          <td className="px-4 py-3 text-sm font-medium text-charcoal">{row.contributionTypeName}</td>
                          {contribReport.currencies.map((cur) => {
                            const found = row.totals.find(tot => tot.currencyCode === cur);
                            return (
                              <td key={cur} className="px-4 py-3 text-sm text-right text-gray-700 whitespace-nowrap tabular-nums">
                                {found && found.amount > 0 ? found.amount.toFixed(2) : ''}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      {/* Grand total row */}
                      <tr className="bg-emerald-50/60 border-t-2 border-emerald-200">
                        <td className="px-4 py-3 text-sm font-semibold text-emerald-700" colSpan={2}>{t('reports.grand_total')}</td>
                        {contribReport.currencies.map((cur) => {
                          const found = contribReport.grandTotals.find(tot => tot.currencyCode === cur);
                          return (
                            <td key={`gt-${cur}`} className="px-4 py-3 text-sm text-right font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                              {found && found.amount > 0 ? found.amount.toFixed(2) : ''}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Member Payment History Report */}
      {selectedReport === 'member-payment-history' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle className="text-lg sm:text-xl">{t('reports.member_payment_history')}</CardTitle>
              
              {/* Member selector and Year filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder={t('reports.select_member')}
                    value={memberSearchTerm}
                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                  />
                </div>
                
                {/* Year filter - always visible */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-600 whitespace-nowrap">{t('reports.select_year_history')}:</label>
                  <select
                    value={selectedHistoryYear || ''}
                    onChange={(e) => setSelectedHistoryYear(e.target.value ? Number(e.target.value) : null)}
                    disabled={!selectedMemberId || historyYears.length === 0}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">{t('common.all')}</option>
                    {historyYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Filtered members list */}
              {memberSearchTerm && !selectedMemberId && (
                <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto bg-white">
                  {members
                    .filter((m) => {
                      const fullName = `${m.lastName || ''} ${m.firstName}`.toLowerCase();
                      return fullName.includes(memberSearchTerm.toLowerCase());
                    })
                    .slice(0, 15)
                    .map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedMemberId(m.id);
                          setMemberSearchTerm('');
                          setSelectedHistoryYear(null);
                          setMemberPayments([]);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-emerald-50 border-b border-gray-100 text-sm transition-colors"
                      >
                        {m.lastName} {m.firstName}
                      </button>
                    ))}
                </div>
              )}

              {/* Selected member info and export */}
              {selectedMemberId && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-emerald-50 p-4 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-charcoal">
                      {members.find((m) => m.id === selectedMemberId)?.firstName}{' '}
                      {members.find((m) => m.id === selectedMemberId)?.lastName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {memberPayments.length > 0 && (
                      <>
                        <button
                          onClick={handleMemberPaymentShare}
                          disabled={sharingMemberReport}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"
                          title={t('receipt.share')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                          <span className="hidden sm:inline">{sharingMemberReport ? '...' : t('receipt.share')}</span>
                        </button>
                        <button
                          onClick={handleMemberPaymentExportPdf}
                          disabled={exporting}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {t('reports.export_pdf')}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setSelectedMemberId(null);
                        setMemberSearchTerm('');
                        setMemberPayments([]);
                        setSelectedHistoryYear(null);
                      }}
                      className="text-xs font-medium text-emerald-700 hover:text-emerald-900 transition-colors"
                    >
                      ✕ Change
                    </button>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {loading && (
              <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            )}

            {!selectedMemberId && !loading && (
              <div className="p-8 text-center text-gray-500">
                {t('reports.select_member')}
              </div>
            )}

            {selectedMemberId && !loading && memberPayments.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                {t('reports.no_data')}
              </div>
            )}

            {selectedMemberId && !loading && memberPayments.length > 0 && (
              <div className="space-y-6">
                {/* Member Profile Details */}
                {selectedMemberDetails && (
                  <div className="bg-gradient-to-r from-emerald-50 to-white p-4 sm:p-6 rounded-lg border border-emerald-200">
                    <h3 className="text-lg font-semibold text-charcoal mb-4">{t('reports.member_profile')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">{t('common.name')}</p>
                        <p className="text-sm font-medium text-charcoal">
                          {selectedMemberDetails.firstName} {selectedMemberDetails.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">{t('reports.member_id')}</p>
                        <p className="text-sm font-medium text-charcoal">{selectedMemberId}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">{t('reports.email')}</p>
                        <p className="text-sm font-medium text-charcoal">{selectedMemberDetails.email || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">{t('reports.phone')}</p>
                        <p className="text-sm font-medium text-charcoal">{selectedMemberDetails.phone || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">{t('reports.date_of_birth')}</p>
                        <p className="text-sm font-medium text-charcoal">
                          {selectedMemberDetails.dateOfBirth
                            ? new Date(selectedMemberDetails.dateOfBirth).toLocaleDateString()
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">{t('account.member_since')}</p>
                        <p className="text-sm font-medium text-charcoal">
                          {selectedMemberDetails.memberSince
                            ? new Date(selectedMemberDetails.memberSince).toLocaleDateString()
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Detailed Payments Table */}
                {(() => {
                  const filteredPayments = selectedHistoryYear
                    ? memberPayments.filter(p => new Date(p.paymentDate).getFullYear() === selectedHistoryYear)
                    : memberPayments;

                  if (filteredPayments.length === 0) {
                    return (
                      <div className="p-6 text-center text-gray-500 border border-gray-200 rounded-lg">
                        {t('reports.no_data')}
                      </div>
                    );
                  }

                  // Group totals by currency
                  const currencyTotals = filteredPayments.reduce((acc: any, p: MemberPayment) => {
                    const currKey = p.currencyCode || 'Unknown';
                    if (!acc[currKey]) {
                      acc[currKey] = { total: 0, symbol: p.currencySymbol || currKey };
                    }
                    acc[currKey].total += p.amount || 0;
                    return acc;
                  }, {});

                  return (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-200">
                        <h3 className="font-semibold text-charcoal">
                          {t('reports.detailed_payments')} ({selectedHistoryYear || t('common.all')})
                        </h3>
                      </div>

                      {/* Desktop table */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t('reports.payment_date')}</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t('reports.contribution_type')}</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">{t('reports.amount')}</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t('reports.currency')}</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t('reports.period_from')}</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t('reports.period_to')}</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t('reports.reference')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {filteredPayments.map((payment, idx) => (
                              <tr key={payment.id || idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                  {new Date(payment.paymentDate).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-charcoal">
                                  {payment.contributionTypeName || payment.contributionTypeCode || 'Unknown'}
                                </td>
                                <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-700">
                                  {payment.amount.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">
                                  {payment.currencyCode || 'N/A'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                  {payment.periodFrom ? new Date(payment.periodFrom).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                  {payment.periodTo ? new Date(payment.periodTo).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">
                                  {payment.reference ? payment.reference.substring(0, 20) : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile cards */}
                      <div className="md:hidden divide-y divide-gray-200">
                        {filteredPayments.map((payment, idx) => (
                          <div key={payment.id || idx} className="p-4 space-y-2 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">{t('reports.payment_date')}</p>
                                <p className="text-sm font-medium text-charcoal">
                                  {new Date(payment.paymentDate).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500 uppercase font-semibold">{t('reports.amount')}</p>
                                <p className="text-lg font-semibold text-emerald-700">
                                  {payment.currencySymbol || payment.currencyCode} {payment.amount.toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <div className="flex justify-between">
                              <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">{t('reports.contribution_type')}</p>
                                <p className="text-sm font-medium text-charcoal">
                                  {payment.contributionTypeName || payment.contributionTypeCode || 'Unknown'}
                                </p>
                              </div>
                            </div>
                            {(payment.periodFrom || payment.periodTo) && (
                              <div className="flex justify-between pt-2 border-t border-gray-200">
                                <div>
                                  {payment.periodFrom && (
                                    <>
                                      <p className="text-xs text-gray-500 uppercase font-semibold">{t('reports.period_from')}</p>
                                      <p className="text-sm text-gray-700">
                                        {new Date(payment.periodFrom).toLocaleDateString()}
                                      </p>
                                    </>
                                  )}
                                </div>
                                <div>
                                  {payment.periodTo && (
                                    <>
                                      <p className="text-xs text-gray-500 uppercase font-semibold">{t('reports.period_to')}</p>
                                      <p className="text-sm text-gray-700">
                                        {new Date(payment.periodTo).toLocaleDateString()}
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Summary row */}
                      <div className="bg-emerald-50 px-4 py-4 border-t border-emerald-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-gray-600 uppercase font-semibold mb-2">{t('reports.col_total')}</p>
                          <div className="flex flex-wrap gap-3">
                            {Object.entries(currencyTotals).map(([currKey, data]: [string, any]) => (
                              <div key={currKey} className="bg-white px-3 py-2 rounded border border-emerald-200">
                                <p className="text-xs text-gray-500">{currKey}</p>
                                <p className="text-lg font-bold text-emerald-700">
                                  {data.symbol} {data.total.toFixed(2)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          <p>{filteredPayments.length} {t('reports.payment_records')}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Grouped summary section */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-charcoal mb-4">{t('reports.payments_by_type')}</h3>
                  {(() => {
                    const filteredPayments = selectedHistoryYear
                      ? memberPayments.filter(p => new Date(p.paymentDate).getFullYear() === selectedHistoryYear)
                      : memberPayments;

                    const groupedByType = filteredPayments.reduce((acc: any, p: MemberPayment) => {
                      const typeKey = p.contributionTypeName || p.contributionTypeCode || 'Unknown' ;
                      if (!acc[typeKey]) acc[typeKey] = [];
                      acc[typeKey].push(p);
                      return acc;
                    }, {});

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(groupedByType).map(([typeKey, typePayments]: [string, any[]]) => {
                          const groupedByCurrency = typePayments.reduce((acc: any, p: MemberPayment) => {
                            const currKey = p.currencyCode || 'Unknown';
                            if (!acc[currKey]) acc[currKey] = { amount: 0, symbol: p.currencySymbol || currKey };
                            acc[currKey].amount += p.amount || 0;
                            return acc;
                          }, {});

                          return (
                            <div key={typeKey} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                              <div className="flex items-center justify-between mb-3">
                                <p className="font-semibold text-charcoal text-sm">{typeKey}</p>
                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                                  {typePayments.length}
                                </span>
                              </div>
                              <div className="space-y-2">
                                {Object.entries(groupedByCurrency).map(([currKey, data]: [string, any]) => (
                                  <div key={currKey} className="flex justify-between items-end bg-gray-50 p-2 rounded">
                                    <span className="text-xs text-gray-600">{currKey}</span>
                                    <p className="font-semibold text-charcoal">
                                      {data.symbol} {data.amount.toFixed(2)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination controls */}
      {selectedReport === 'payment-summary' && totalPages > 1 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
          {/* Info & page size */}
          <div className="flex flex-col sm:flex-row items-center gap-2 text-sm text-gray-600">
            <span>
              {t('pagination.showing_range', { start: String(startItem), end: String(endItem), total: String(totalElements) })}
            </span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s} / {t('pagination.page')}</option>
              ))}
            </select>
          </div>

          {/* Page buttons */}
          <div className="flex items-center gap-1">
            {/* First page */}
            <button onClick={() => goToPage(0)} disabled={page === 0}
              className="px-2 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={t('pagination.first')}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            {/* Previous */}
            <button onClick={() => goToPage(page - 1)} disabled={page === 0}
              className="px-2 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={t('pagination.previous')}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Page numbers */}
            {pageNumbers.length > 0 && pageNumbers[0] > 0 && (
              <span className="px-2 py-1.5 text-sm text-gray-400">...</span>
            )}
            {pageNumbers.map((p) => (
              <button key={p} onClick={() => goToPage(p)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  p === page
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                }`}>
                {p + 1}
              </button>
            ))}
            {pageNumbers.length > 0 && pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
              <span className="px-2 py-1.5 text-sm text-gray-400">...</span>
            )}

            {/* Next */}
            <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages - 1}
              className="px-2 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={t('pagination.next')}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {/* Last page */}
            <button onClick={() => goToPage(totalPages - 1)} disabled={page >= totalPages - 1}
              className="px-2 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={t('pagination.last')}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Utilities ──────────────────────────────────────────────────────

function capitalize(name: string): string {
  if (!name) return '';
  return name
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
