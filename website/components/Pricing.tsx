import { unstable_noStore as noStore } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { fetchPlans, fetchFeatureDefinitions, SubscriptionPlan, PlanEntitlement, FeatureDefinition } from '../lib/pricingApi';

function formatPrice(
  plan: SubscriptionPlan,
  labels: { free: string; custom: string; perMonth: string },
): { price: string; period: string } {
  if (plan.monthlyPrice === null || plan.monthlyPrice === 0) {
    return { price: labels.free, period: '' };
  }
  if (plan.monthlyPrice < 0) {
    return { price: labels.custom, period: '' };
  }
  return { price: `$${plan.monthlyPrice}`, period: labels.perMonth };
}

function getEntitlement(plan: SubscriptionPlan, key: string): PlanEntitlement | undefined {
  return plan.entitlements.find((e) => e.featureKey === key);
}

function formatLimitValue(e: PlanEntitlement | undefined, unlimitedLabel: string): string {
  if (!e) return '—';
  if (e.limitValue === null || e.limitValue === -1) return unlimitedLabel;
  return String(e.limitValue);
}

function CheckIcon({ highlight }: { highlight: boolean }) {
  return (
    <svg
      className={`w-5 h-5 mx-auto ${highlight ? 'text-gold' : 'text-primary'}`}
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-5 h-5 mx-auto text-stone-300" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

type RowType = 'always' | 'limit' | 'boolean' | 'pro-only';
interface TableRow {
  label: string;
  key?: string;
  type: RowType;
}

function TableCellValue({
  plan,
  row,
  unlimitedLabel,
}: {
  plan: SubscriptionPlan;
  row: TableRow;
  unlimitedLabel: string;
}) {
  const isGrowth = plan.code === 'GROWTH';
  switch (row.type) {
    case 'always':
      return <CheckIcon highlight={isGrowth} />;
    case 'pro-only':
      return plan.code === 'PRO' ? <CheckIcon highlight={false} /> : <XIcon />;
    case 'limit': {
      const e = getEntitlement(plan, row.key!);
      return (
        <span className={`text-sm font-medium ${isGrowth ? 'text-primary font-bold' : 'text-charcoal'}`}>
          {formatLimitValue(e, unlimitedLabel)}
        </span>
      );
    }
    case 'boolean': {
      const e = getEntitlement(plan, row.key!);
      if (!e) return <XIcon />;
      return e.enabled ? <CheckIcon highlight={isGrowth} /> : <XIcon />;
    }
  }
}

function PricingCard({
  plan,
  ctaLabel,
  priceLabels,
  mostPopular,
}: {
  plan: SubscriptionPlan;
  ctaLabel: string;
  priceLabels: { free: string; custom: string; perMonth: string };
  mostPopular: string;
}) {
  const { price, period } = formatPrice(plan, priceLabels);
  const isHighlight = plan.code === 'GROWTH';

  return (
    <div
      className={`relative rounded-2xl p-6 transition-all hover:-translate-y-1 flex flex-col ${
        isHighlight
          ? 'bg-primary text-white shadow-2xl shadow-primary/30 scale-105'
          : 'bg-white border border-stone-200 hover:shadow-lg'
      }`}
    >
      {isHighlight && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gold text-white text-xs font-bold uppercase tracking-wider rounded-full whitespace-nowrap">
          {mostPopular}
        </div>
      )}

      <h3 className={`text-lg font-semibold ${isHighlight ? 'text-white' : 'text-charcoal'}`}>{plan.name}</h3>
      <p className={`mt-1 text-sm ${isHighlight ? 'text-gold' : 'text-charcoal-light'}`}>{plan.description}</p>

      <div className="mt-6 flex items-baseline gap-1">
        <span className={`text-4xl font-display font-bold ${isHighlight ? 'text-white' : 'text-charcoal'}`}>{price}</span>
        {period && <span className={`text-sm ${isHighlight ? 'text-gold' : 'text-charcoal-light'}`}>{period}</span>}
      </div>

      <div className="mt-auto pt-8">
        <a
          href="#contact"
          className={`block text-center px-5 py-3 rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-primary-dark focus:ring-offset-2 ${
            isHighlight
              ? 'bg-white text-primary hover:bg-gold hover:text-white'
              : 'bg-primary text-white hover:bg-primary-light'
          }`}
        >
          {ctaLabel}
        </a>
      </div>
    </div>
  );
}

function ComparisonTable({
  plans,
  featureDefs,
  featuresColumnLabel,
  unlimitedLabel,
}: {
  plans: SubscriptionPlan[];
  featureDefs: FeatureDefinition[];
  featuresColumnLabel: string;
  unlimitedLabel: string;
}) {
  if (plans.length === 0) return null;

  const alwaysOnRows: TableRow[] = featureDefs
    .filter((d) => d.featureType === 'ALWAYS_ON')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((d) => ({ label: d.displayLabel, type: 'always' as const }));

  const proOnlyRows: TableRow[] = featureDefs
    .filter((d) => d.featureType === 'PRO_ONLY')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((d) => ({ label: d.displayLabel, type: 'pro-only' as const }));

  const allPlanKeys = new Set(plans.flatMap((p) => p.entitlements.map((e) => e.featureKey)));
  const dynamicRows: TableRow[] = featureDefs
    .filter((d) => (d.featureType === 'LIMIT' || d.featureType === 'BOOLEAN') && allPlanKeys.has(d.featureKey))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((d) => ({
      label: d.displayLabel,
      key: d.featureKey,
      type: d.featureType === 'LIMIT' ? ('limit' as const) : ('boolean' as const),
    }));

  const tableRows: TableRow[] = [...alwaysOnRows, ...dynamicRows, ...proOnlyRows];

  return (
    <div className="mt-20 overflow-x-auto">
      <table className="w-full min-w-[600px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="py-4 pr-6 text-left font-semibold text-charcoal w-2/5">{featuresColumnLabel}</th>
            {plans.map((plan) => (
              <th
                key={plan.code}
                className={`py-4 px-4 text-center font-semibold ${
                  plan.code === 'GROWTH' ? 'text-primary bg-primary/5 rounded-t-lg' : 'text-charcoal'
                }`}
              >
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row, i) => (
            <tr key={row.label} className={`border-t border-stone-100 ${i % 2 !== 0 ? 'bg-stone-50/50' : ''}`}>
              <td className="py-3 pr-6 font-medium text-charcoal">{row.label}</td>
              {plans.map((plan) => (
                <td key={plan.code} className={`py-3 px-4 text-center ${plan.code === 'GROWTH' ? 'bg-primary/5' : ''}`}>
                  <TableCellValue plan={plan} row={row} unlimitedLabel={unlimitedLabel} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function Pricing() {
  noStore();
  const t = await getTranslations('Pricing');
  const priceLabels = { free: t('free'), custom: t('custom'), perMonth: t('perMonth') };

  const planCta: Record<string, string> = {
    FREE: t('ctaFree'),
    STARTER: t('ctaStarter'),
    GROWTH: t('ctaGrowth'),
    PRO: t('ctaPro'),
  };

  let plans: SubscriptionPlan[] = [];
  let featureDefs: FeatureDefinition[] = [];
  try {
    [plans, featureDefs] = await Promise.all([fetchPlans(), fetchFeatureDefinitions()]);
    plans.sort((a, b) => (a.monthlyPrice ?? 0) - (b.monthlyPrice ?? 0));
  } catch {
    plans = [];
    featureDefs = [];
  }

  return (
    <section id="pricing" className="py-24 lg:py-32 bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">{t('eyebrow')}</p>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-charcoal">{t('title')}</h2>
          <p className="mt-4 text-lg text-charcoal-light">{t('subtitle')}</p>
        </div>

        {plans.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {plans.map((plan) => (
                <PricingCard
                  key={plan.code}
                  plan={plan}
                  ctaLabel={planCta[plan.code] ?? t('ctaDefault')}
                  priceLabels={priceLabels}
                  mostPopular={t('mostPopular')}
                />
              ))}
            </div>

            <ComparisonTable
              plans={plans}
              featureDefs={featureDefs}
              featuresColumnLabel={t('featuresColumn')}
              unlimitedLabel={t('unlimited')}
            />
          </>
        ) : (
          <p className="text-center text-charcoal-light">{t('unavailable')}</p>
        )}
      </div>
    </section>
  );
}
