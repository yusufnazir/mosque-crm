'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import {
  reportApi,
  paymentStatsApi,
  PaymentSummaryReport,
  ContributionTotalReport,
  ContributionTypeColumn,
  CurrencyAmount,
} from '@/lib/api';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function ReportsPage() {
  const { t, language } = useTranslation();
  const { can } = useAuth();

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
        setSelectedYear(years[0]);
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
