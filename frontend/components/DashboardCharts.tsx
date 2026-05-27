"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { familyApi } from '@/lib/familyApi';
import { memberApi, reportApi, paymentStatsApi, isPlanRestriction, isSubscriptionInactive } from '@/lib/api';
import type { ContributionTotalReport, PaymentMonthlySummaryDTO } from '@/lib/api';
import { expenseApi } from '@/lib/expenseApi';
import type { ExpenseDTO, ExpenseMonthlySummaryDTO } from '@/lib/expenseApi';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement, 
  LineElement, 
  ArcElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
  );


import type { AgeGenderBucket } from '@/lib/api';

export interface FamilySizeDatum { size: number; count: number; }
export interface AgeDatum { bucket: string; count: number; }
export interface GenderDatum { gender: string; count: number; }

function asMonthlySummaryArray<T>(value: unknown): T[] {
  if (isPlanRestriction(value) || isSubscriptionInactive(value) || !Array.isArray(value)) {
    return [];
  }
  return value as T[];
}

export default function DashboardCharts() {
  const { t, language } = useTranslation();
  const [familySizeData, setFamilySizeData] = useState<FamilySizeDatum[]>([]);
  const [ageData, setAgeData] = useState<AgeDatum[]>([]);
  const [genderData, setGenderData] = useState<GenderDatum[]>([]);
  const [ageGenderData, setAgeGenderData] = useState<AgeGenderBucket[]>([]);
  const [loading, setLoading] = useState(true);

  // Income chart state
  const [incomeReport, setIncomeReport] = useState<ContributionTotalReport | null>(null);
  const [incomeYears, setIncomeYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [incomeLoading, setIncomeLoading] = useState(false);

  // Expense chart state
  const [expenseMonthlySummary, setExpenseMonthlySummary] = useState<ExpenseMonthlySummaryDTO[]>([]);
  const [incomeMonthlySummary, setIncomeMonthlySummary] = useState<PaymentMonthlySummaryDTO[]>([]);
  const [expenseTagData, setExpenseTagData] = useState<ExpenseDTO[]>([]);
  const [selectedExpenseCurrency, setSelectedExpenseCurrency] = useState<string>('');
  const [expenseChartLoading, setExpenseChartLoading] = useState(false);

  const safeIncomeMonthlySummary = useMemo(
    () => asMonthlySummaryArray<PaymentMonthlySummaryDTO>(incomeMonthlySummary),
    [incomeMonthlySummary],
  );
  const safeExpenseMonthlySummary = useMemo(
    () => asMonthlySummaryArray<ExpenseMonthlySummaryDTO>(expenseMonthlySummary),
    [expenseMonthlySummary],
  );

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      let familySizeRes: FamilySizeDatum[] = [];
      let ageRes: AgeDatum[] = [];
      let genderRes: GenderDatum[] = [];
      let ageGenderRes: AgeGenderBucket[] = [];
      try {
        const res = await familyApi.getFamilySizeDistribution();
        if (!isPlanRestriction(res) && Array.isArray(res)) familySizeRes = res as FamilySizeDatum[];
      } catch (e) {
        console.error('Family size API error', e);
      }
      try {
        const res = await memberApi.getAgeDistribution();
        if (!isPlanRestriction(res) && Array.isArray(res)) ageRes = res as AgeDatum[];
      } catch (e) {
        console.error('Age API error', e);
      }
      try {
        const res = await memberApi.getGenderDistribution();
        if (!isPlanRestriction(res) && Array.isArray(res)) genderRes = res as GenderDatum[];
      } catch (e) {
        console.error('Gender API error', e);
      }
      try {
        const res = await memberApi.getAgeGenderDistribution();
        if (!isPlanRestriction(res) && Array.isArray(res)) ageGenderRes = res as AgeGenderBucket[];
      } catch (e) {
        console.error('Age-Gender API error', e);
      }
      setFamilySizeData(familySizeRes);
      setAgeData(ageRes);
      setGenderData(genderRes);
      setAgeGenderData(ageGenderRes);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Fetch income data and available years
  useEffect(() => {
    async function fetchYears() {
      try {
        const res = await paymentStatsApi.getPaymentYears();
        if (!isPlanRestriction(res) && !isSubscriptionInactive(res) && Array.isArray(res)) {
          setIncomeYears(res);
          if (res.length > 0 && !res.includes(selectedYear)) {
            setSelectedYear(res[0]);
          }
        }
      } catch (e) {
        console.error('Payment years API error', e);
      }
    }
    fetchYears();
  }, []);

  useEffect(() => {
    async function fetchIncome() {
      setIncomeLoading(true);
      try {
        const data = await reportApi.getContributionTotals(selectedYear, language);
        if (!isPlanRestriction(data)) {
          setIncomeReport(data);
        } else {
          setIncomeReport(null);
        }
      } catch (e) {
        console.error('Income by type API error', e);
        setIncomeReport(null);
      } finally {
        setIncomeLoading(false);
      }
    }
    fetchIncome();
  }, [selectedYear, language]);

  // Fetch expense monthly summary, income monthly summary, and tag data when year changes
  useEffect(() => {
    async function fetchExpenseData() {
      setExpenseChartLoading(true);
      try {
        const [expSummary, incSummary] = await Promise.all([
          expenseApi.getMonthlySummary(selectedYear),
          paymentStatsApi.getMonthlySummary(selectedYear),
        ]);
        const safeExpSummary = asMonthlySummaryArray<ExpenseMonthlySummaryDTO>(expSummary);
        const safeIncSummary = asMonthlySummaryArray<PaymentMonthlySummaryDTO>(incSummary);
        setExpenseMonthlySummary(safeExpSummary);
        setIncomeMonthlySummary(safeIncSummary);

        // Fetch raw expenses for the year for tag breakdown
        const yearStart = `${selectedYear}-01-01`;
        const yearEnd = `${selectedYear}-12-31`;
        const rawExpenses = await expenseApi.list({ dateFrom: yearStart, dateTo: yearEnd, includeDeleted: false });
        setExpenseTagData(Array.isArray(rawExpenses) ? rawExpenses : []);

        // Auto-select currency: prefer currency with most income, then expense
        const allCurrencies = Array.from(new Set([
          ...safeIncSummary.map(r => r.currencyCode),
          ...safeExpSummary.map(r => r.currencyCode),
        ]));
        if (allCurrencies.length > 0) {
          // Pick currency with highest total income
          const incByCur: Record<string, number> = {};
          for (const r of safeIncSummary) incByCur[r.currencyCode] = (incByCur[r.currencyCode] || 0) + r.total;
          const best = allCurrencies.reduce((a, b) => (incByCur[b] || 0) > (incByCur[a] || 0) ? b : a, allCurrencies[0]);
          setSelectedExpenseCurrency(prev => allCurrencies.includes(prev) ? prev : best);
        }
      } catch (e) {
        console.error('Expense chart data error', e);
      } finally {
        setExpenseChartLoading(false);
      }
    }
    fetchExpenseData();
  }, [selectedYear]);
  // Grouped bar chart: Members' ages by gender
  // Prepare buckets and genders
  const ageBuckets = React.useMemo(() => {
    // Use all buckets in order of appearance in data, or fallback to standard order
    const standard = ['0-12', '13-17', '18-35', '36-59', '60+', 'Unknown'];
    const found = Array.from(new Set(ageGenderData.map((d) => d.bucket)));
    return standard.filter((b) => found.includes(b)).concat(found.filter((b) => !standard.includes(b)));
  }, [ageGenderData]);
  // Normalize ageGenderData: map null/empty gender to 'Unknown'
  const genders = React.useMemo(() => {
    const found = Array.from(new Set(ageGenderData.map((d) => d.gender || 'Unknown')));
    return ['M', 'F', 'Unknown'].filter((g) => found.includes(g));
  }, [ageGenderData]);

  const ageGenderChart = {
    labels: ageBuckets.map((bucket) => t('age.' + bucket)),
    datasets: genders.map((gender) => {
      let color = '#047857'; // Default: men (emerald)
      if (gender === 'F') color = '#D4AF37'; // Women: deep gold
      else if (gender === 'Unknown') color = '#78716c'; // Unknown: visible gray
      return {
        label: t('gender.' + gender),
        data: ageBuckets.map((bucket) => {
          const found = ageGenderData.find((d) => d.bucket === bucket && (d.gender || 'Unknown') === gender);
          return found ? found.count : 0;
        }),
        backgroundColor: color,
      };
    }),
  };



  // Ensure 0 children bucket is always present
  const familySizeBuckets = React.useMemo(() => {
    const sizes = familySizeData.map((d) => d.size);
    const data = [...familySizeData];
    if (!sizes.includes(0)) {
      data.unshift({ size: 0, count: 0 });
    }
    // Sort by size ascending
    return data.sort((a, b) => a.size - b.size);
  }, [familySizeData]);

  const familySizeChart = {
    labels: familySizeBuckets.map((d) => `${d.size} ${t('dashboard.children')}`),
    datasets: [
      {
        label: t('dashboard.families'),
        data: familySizeBuckets.map((d) => d.count),
        backgroundColor: '#047857',
      },
    ],
  };




  // All hooks must be above any early return

  // ── Expense chart data — all useMemo hooks before any early return ──────────
  const currencyColorPalette = [
    '#047857', '#D4AF37', '#0284c7', '#dc2626', '#7c3aed',
    '#ea580c', '#0891b2', '#be185d', '#4d7c0f', '#6366f1',
  ];

  const yearMonths = useMemo(
    () => Array.from({ length: 12 }, (_, i) => `${selectedYear}-${String(i + 1).padStart(2, '0')}`),
    [selectedYear]
  );

  const monthLabels = useMemo(
    () => ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].map(k => t(`dashboard.month.${k}`)),
    [t]
  );

  const expenseCurrencies = useMemo(
    () => Array.from(new Set(safeExpenseMonthlySummary.map(r => r.currencyCode))),
    [safeExpenseMonthlySummary]
  );

  const monthlyExpenseChart = useMemo(() => ({
    labels: monthLabels,
    datasets: expenseCurrencies.map((currency, i) => ({
      label: currency,
      data: yearMonths.map(month => {
        const found = safeExpenseMonthlySummary.find(r => r.month === month && r.currencyCode === currency);
        return found ? found.total : 0;
      }),
      backgroundColor: currencyColorPalette[i % currencyColorPalette.length],
    })),
  }), [safeExpenseMonthlySummary, expenseCurrencies, yearMonths, monthLabels]);

  const tagDonutData = useMemo(() => {
    const filtered = expenseTagData.filter(e => !selectedExpenseCurrency || e.currencyCode === selectedExpenseCurrency);
    const tagTotals: Record<string, number> = {};
    for (const exp of filtered) {
      if (!exp.tags || exp.tags.length === 0) {
        const key = t('dashboard.untagged');
        tagTotals[key] = (tagTotals[key] || 0) + Number(exp.amount);
      } else {
        for (const tag of exp.tags) {
          tagTotals[tag.name] = (tagTotals[tag.name] || 0) + Number(exp.amount);
        }
      }
    }
    const tagNames = Object.keys(tagTotals);
    const donutColors = currencyColorPalette;
    return {
      labels: tagNames,
      datasets: [{
        data: tagNames.map(n => tagTotals[n]),
        backgroundColor: tagNames.map((_, i) => donutColors[i % donutColors.length]),
        borderWidth: 2,
        borderColor: '#fff',
      }],
    };
  }, [expenseTagData, selectedExpenseCurrency, t]);

  const allIvECurrencies = useMemo(() => Array.from(new Set([
    ...safeIncomeMonthlySummary.map(r => r.currencyCode),
    ...safeExpenseMonthlySummary.map(r => r.currencyCode),
  ])), [safeIncomeMonthlySummary, safeExpenseMonthlySummary]);

  const incomeVsExpenseChart = useMemo(() => {
    const cur = selectedExpenseCurrency;
    const incomeData = yearMonths.map(month => {
      const found = safeIncomeMonthlySummary.find(r => r.month === month && r.currencyCode === cur);
      return found ? found.total : 0;
    });
    const expenseData = yearMonths.map(month => {
      const found = safeExpenseMonthlySummary.find(r => r.month === month && r.currencyCode === cur);
      return found ? found.total : 0;
    });
    return {
      labels: monthLabels,
      datasets: [
        { label: t('dashboard.income'), data: incomeData, backgroundColor: '#047857' },
        { label: t('dashboard.expense'), data: expenseData, backgroundColor: '#D4AF37' },
      ],
    };
  }, [safeIncomeMonthlySummary, safeExpenseMonthlySummary, selectedExpenseCurrency, yearMonths, monthLabels, t]);

  const netBalance = useMemo(() => {
    const cur = selectedExpenseCurrency;
    const totalIncome = safeIncomeMonthlySummary.filter(r => r.currencyCode === cur).reduce((s, r) => s + r.total, 0);
    const totalExpense = safeExpenseMonthlySummary.filter(r => r.currencyCode === cur).reduce((s, r) => s + r.total, 0);
    return totalIncome - totalExpense;
  }, [safeIncomeMonthlySummary, safeExpenseMonthlySummary, selectedExpenseCurrency]);

  if (loading) {
    return <div className="mt-8">{t('dashboard.loading_charts') || 'Loading charts...'}</div>;
  }

  const ageChart = {
    labels: ageData.map((d) => t('age.' + d.bucket)),
    datasets: [
      {
        label: t('dashboard.members'),
        data: ageData.map((d) => d.count),
        backgroundColor: '#D4AF37',
      },
    ],
  };

  const genderChartColors = genderData.map((d) => {
    const code = d.gender;
    if (code === 'M') return '#047857';
    if (code === 'F') return '#D4AF37';
    return '#78716c';
  });

  const genderChart = {
    labels: genderData.map((d) => {
      const code = d.gender || 'Unknown';
      return t(`gender.${code}`);
    }),
    datasets: [
      {
        label: t('dashboard.members'),
        data: genderData.map((d) => d.count),
        backgroundColor: genderChartColors,
      },
    ],
  };

  // Income chart data — stacked bars, one dataset per currency
  const currencyColors: Record<string, string> = {};
  const incomeLabels = incomeReport?.rows?.map(r => r.contributionTypeName) ?? [];
  const incomeCurrencies = incomeReport?.currencies ?? [];
  incomeCurrencies.forEach((cur, i) => {
    currencyColors[cur] = currencyColorPalette[i % currencyColorPalette.length];
  });

  const incomeChart = {
    labels: incomeLabels,
    datasets: incomeCurrencies.map((currency) => ({
      label: currency,
      data: (incomeReport?.rows ?? []).map(row => {
        const match = row.totals.find(t => t.currencyCode === currency);
        return match ? match.amount : 0;
      }),
      backgroundColor: currencyColors[currency],
    })),
  };

  const tooltipCurrencyCallback = (currency: string) => (ctx: { parsed: { y: number | null } }) => {
    const val = ctx.parsed.y;
    return val != null ? ` ${currency} ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
  };

  return (
    <>
      {/* ── Member Analytics ──────────────────────────────────────── */}
      <div className="mt-8 mb-4 flex items-center gap-3">
        <h2 className="text-base font-semibold text-charcoal whitespace-nowrap">{t('dashboard.member_analytics')}</h2>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      {/* Age by Gender — full width */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.age_gender_distribution_chart')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Bar data={ageGenderChart} options={{
            responsive: true,
            plugins: { legend: { display: true } },
            scales: { y: { beginAtZero: true } },
          }} />
        </CardContent>
      </Card>

      {/* Family Size + Gender — 2-col */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.family_size_chart')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Bar data={familySizeChart} options={{ responsive: true, plugins: { legend: { display: false } } }} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.gender_distribution_chart')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: 280, maxWidth: 280, margin: '0 auto' }}>
              <Pie data={genderChart} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Financial Summary ─────────────────────────────────────── */}
      <div className="mt-8 mb-4 flex items-center gap-3">
        <h2 className="text-base font-semibold text-charcoal whitespace-nowrap">{t('dashboard.financial_summary')}</h2>
        <div className="h-px flex-1 bg-gray-200" />
      </div>
      <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle>{t('dashboard.income_by_type_chart')}</CardTitle>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
              >
                {incomeYears.length > 0 ? (
                  incomeYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))
                ) : (
                  <option value={selectedYear}>{selectedYear}</option>
                )}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {incomeLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                {t('dashboard.loading_charts')}
              </div>
            ) : incomeLabels.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                {t('dashboard.no_income_data')}
              </div>
            ) : (
              <div style={{ maxHeight: '300px' }}>
              <Bar data={incomeChart} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: incomeCurrencies.length > 1 },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => {
                        const val = ctx.parsed.y;
                        const currency = ctx.dataset.label ?? '';
                        return val != null ? ` ${currency} ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
                      },
                    },
                  },
                },
                scales: {
                  x: { stacked: true },
                  y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => Number(value).toLocaleString(),
                    },
                  },
                },
              }} />
              </div>
            )}
          </CardContent>
        </Card>

      {/* Monthly Expenses chart — full width */}
      <div className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.monthly_expenses_chart')}</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseChartLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-400">{t('dashboard.loading_charts')}</div>
            ) : expenseCurrencies.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-gray-400">{t('dashboard.no_expense_data')}</div>
            ) : (
              <div style={{ maxHeight: '300px' }}>
                <Bar
                  data={monthlyExpenseChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: expenseCurrencies.length > 1 },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => {
                            const val = ctx.parsed.y;
                            const currency = ctx.dataset.label ?? '';
                            return val != null ? ` ${currency} ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
                          },
                        },
                      },
                    },
                    scales: {
                      x: { stacked: true },
                      y: { stacked: true, beginAtZero: true, ticks: { callback: (v) => Number(v).toLocaleString() } },
                    },
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense by Tag + Income vs Expense — 2-column grid */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Expense by Tag donut */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle>{t('dashboard.expense_by_tag_chart')}</CardTitle>
              {allIvECurrencies.length > 1 && (
                <select
                  value={selectedExpenseCurrency}
                  onChange={(e) => setSelectedExpenseCurrency(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                >
                  {allIvECurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {expenseChartLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-400">{t('dashboard.loading_charts')}</div>
            ) : tagDonutData.labels.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-gray-400">{t('dashboard.no_expense_tag_data')}</div>
            ) : (
              <div style={{ height: 300, maxWidth: 300, margin: '0 auto' }}>
                <Doughnut
                  data={tagDonutData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'bottom' },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => {
                            const val = Number(ctx.parsed);
                            return val != null ? ` ${selectedExpenseCurrency} ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Income vs Expense grouped bar */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle>{t('dashboard.income_vs_expense_chart')}</CardTitle>
                {selectedExpenseCurrency && !expenseChartLoading && (
                  <p className={`text-sm font-medium mt-1 ${netBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {t('dashboard.net_balance')}: {selectedExpenseCurrency} {netBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
              {allIvECurrencies.length > 1 && (
                <select
                  value={selectedExpenseCurrency}
                  onChange={(e) => setSelectedExpenseCurrency(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                >
                  {allIvECurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {expenseChartLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-400">{t('dashboard.loading_charts')}</div>
            ) : allIvECurrencies.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-gray-400">{t('dashboard.no_expense_data')}</div>
            ) : (
              <div style={{ maxHeight: '280px' }}>
                <Bar
                  data={incomeVsExpenseChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: true },
                      tooltip: {
                        callbacks: {
                          label: tooltipCurrencyCallback(selectedExpenseCurrency),
                        },
                      },
                    },
                    scales: {
                      x: { stacked: false },
                      y: { stacked: false, beginAtZero: true, ticks: { callback: (v) => Number(v).toLocaleString() } },
                    },
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
