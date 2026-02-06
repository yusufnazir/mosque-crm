"use client";
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { familyApi } from '@/lib/familyApi';
import { memberApi, feeApi } from '@/lib/api';
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
export interface MonthlyFeeStat { month: number; expected: number; realized: number; }

export default function DashboardCharts() {
  const { t } = useTranslation();
  const [familySizeData, setFamilySizeData] = useState<FamilySizeDatum[]>([]);
  const [ageData, setAgeData] = useState<AgeDatum[]>([]);
  const [genderData, setGenderData] = useState<GenderDatum[]>([]);
  const [ageGenderData, setAgeGenderData] = useState<AgeGenderBucket[]>([]);
  const [monthlyFeeStats, setMonthlyFeeStats] = useState<MonthlyFeeStat[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      let familySizeRes: FamilySizeDatum[] = [];
      let ageRes: AgeDatum[] = [];
      let genderRes: GenderDatum[] = [];
      let ageGenderRes: AgeGenderBucket[] = [];
      let monthlyStats: MonthlyFeeStat[] = [];
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
      try {
        monthlyStats = await feeApi.getMonthlyStats() as MonthlyFeeStat[];
      } catch (e) {
        console.error('Fee API error', e);
      }
      setFamilySizeData(familySizeRes);
      setAgeData(ageRes);
      setGenderData(genderRes);
      setAgeGenderData(ageGenderRes);
      setMonthlyFeeStats(monthlyStats);
      setLoading(false);
    }
    fetchData();
  }, []);
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
  const months = React.useMemo(() => {
    return [
      'jan', 'feb', 'mar', 'apr', 'may', 'jun',
      'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
    ].map((key) => t(`dashboard.month.${key}`));
  }, [t]);

  const monthlyFeeChart = React.useMemo(() => {
    const expected = Array(12).fill(0);
    const realized = Array(12).fill(0);
    monthlyFeeStats.forEach((d) => {
      if (d.month >= 1 && d.month <= 12) {
        expected[d.month - 1] = d.expected;
        realized[d.month - 1] = d.realized;
      }
    });
    return {
      labels: months,
      datasets: [
        {
          label: t('dashboard.expected_income'),
          data: expected,
          backgroundColor: '#D4AF37',
        },
        {
          label: t('dashboard.realized_income'),
          data: realized,
          backgroundColor: '#047857',
        },
      ],
    };
  }, [monthlyFeeStats, months, t]);

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

  // For monthlyFeeChart, use Bar or Line as needed
  // import { Bar as BarChart, Line } from 'react-chartjs-2';
  // Here, we'll use Bar for all for simplicity
  // If you want to use Line, import it and swap below
  // If you want to use Doughnut for gender, import and swap below
  // import { Doughnut } from 'react-chartjs-2';

  // For this patch, assume Bar and Pie are imported
  // If not, add at the top:
  // import { Bar, Pie } from 'react-chartjs-2';

  return (
    <>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
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
            <div style={{ height: 320, maxWidth: 320, margin: '0 auto' }}>
              <Pie data={genderChart} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.monthly_fee_chart')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Bar data={monthlyFeeChart} options={{
              responsive: true,
              plugins: { legend: { display: true } },
              scales: { y: { beginAtZero: true } },
            }} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
