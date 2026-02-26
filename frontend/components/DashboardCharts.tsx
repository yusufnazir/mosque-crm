"use client";
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { familyApi } from '@/lib/familyApi';
import { memberApi, reportApi, paymentStatsApi } from '@/lib/api';
import type { ContributionTotalReport } from '@/lib/api';
import { Bar, Pie } from 'react-chartjs-2';
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


  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      let familySizeRes: FamilySizeDatum[] = [];
      let ageRes: AgeDatum[] = [];
      let genderRes: GenderDatum[] = [];
      let ageGenderRes: AgeGenderBucket[] = [];
      try {
        familySizeRes = await familyApi.getFamilySizeDistribution() as FamilySizeDatum[];
      } catch (e) {
        console.error('Family size API error', e);
      }
      try {
        ageRes = await memberApi.getAgeDistribution() as AgeDatum[];
      } catch (e) {
        console.error('Age API error', e);
      }
      try {
        genderRes = await memberApi.getGenderDistribution() as GenderDatum[];
      } catch (e) {
        console.error('Gender API error', e);
      }
      try {
        ageGenderRes = await memberApi.getAgeGenderDistribution();
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
        const years = await paymentStatsApi.getPaymentYears();
        setIncomeYears(years);
        if (years.length > 0 && !years.includes(selectedYear)) {
          setSelectedYear(years[0]);
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
        setIncomeReport(data);
      } catch (e) {
        console.error('Income by type API error', e);
        setIncomeReport(null);
      } finally {
        setIncomeLoading(false);
      }
    }
    fetchIncome();
  }, [selectedYear, language]);
  // Grouped bar chart: Members' ages by gender
  // Prepare buckets and genders
  const ageBuckets = React.useMemo(() => {
    // Use all buckets in order of appearance in data, or fallback to standard order
    const standard = ['0-12', '13-18', '19-35', '36-60', '60+', 'Unknown'];
    const found = Array.from(new Set(ageGenderData.map((d) => d.bucket)));
    return standard.filter((b) => found.includes(b)).concat(found.filter((b) => !standard.includes(b)));
  }, [ageGenderData]);
  const genders = React.useMemo(() => {
    // Use all genders in data, fallback to ['M', 'F', 'Unknown']
    const found = Array.from(new Set(ageGenderData.map((d) => d.gender)));
    return ['M', 'F', 'Unknown'].filter((g) => found.includes(g)).concat(found.filter((g) => !['M','F','Unknown'].includes(g)));
  }, [ageGenderData]);

  const ageGenderChart = {
    labels: ageBuckets.map((bucket) => t('age.' + bucket)),
    datasets: genders.map((gender) => {
      let color = '#047857'; // Default: men (emerald)
      if (gender === 'F') color = '#D4AF37'; // Women: deep gold
      else if (gender === 'V') color = '#D4AF37'; // Dutch 'V' for vrouw
      else if (gender === 'Unknown' || gender === null || gender === undefined || gender === '') color = '#78716c'; // Unknown: visible gray
      return {
        label: t('gender.' + (gender === null || gender === undefined || gender === '' ? 'Unknown' : (gender === 'V' ? 'F' : gender))),
        data: ageBuckets.map((bucket) => {
          const found = ageGenderData.find((d) => d.bucket === bucket && d.gender === gender);
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
    let code = d.gender;
    if (code === 'M') return '#047857'; // Men: emerald
    if (code === 'F' || code === 'V') return '#D4AF37'; // Women: deep gold
    if (code === 'Unknown' || code === null || code === undefined || code === '') return '#78716c'; // Unknown: visible gray
    return '#78716c'; // fallback
  });

  const genderChart = {
    labels: genderData.map((d) => {
      let code = d.gender;
      if (code === null || code === undefined || code === "") code = "Unknown";
      if (code === "V") code = "F";
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

  // For charts, use Bar or Line as needed
  // import { Bar as BarChart, Line } from 'react-chartjs-2';
  // Here, we'll use Bar for all for simplicity
  // If you want to use Line, import it and swap below
  // If you want to use Doughnut for gender, import and swap below
  // import { Doughnut } from 'react-chartjs-2';

  // For this patch, assume Bar and Pie are imported
  // If not, add at the top:
  // import { Bar, Pie } from 'react-chartjs-2';

  // Income chart data — stacked bars, one dataset per currency
  const currencyColors: Record<string, string> = {};
  const currencyColorPalette = [
    '#047857', '#D4AF37', '#0284c7', '#dc2626', '#7c3aed',
    '#ea580c', '#0891b2', '#be185d', '#4d7c0f', '#6366f1',
  ];

  const incomeLabels = incomeReport?.rows.map(r => r.contributionTypeName) ?? [];
  const incomeCurrencies = incomeReport?.currencies ?? [];

  // Assign a color to each currency
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

  return (
    <>
      {/* Income by Contribution Type chart — full width */}
      <div className="mt-6 md:mt-8">
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
      </div>

      <div className="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
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
            <CardTitle>{t('dashboard.age_distribution_chart')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Bar data={ageChart} options={{ responsive: true, plugins: { legend: { display: false } } }} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.gender_distribution_chart')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: 280, maxWidth: 280, margin: '0 auto' }} className="md:!h-[320px] md:!max-w-[320px]">
              <Pie data={genderChart} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
