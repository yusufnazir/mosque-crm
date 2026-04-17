import { fetchPlans, fetchFeatureDefinitions, SubscriptionPlan, PlanEntitlement, FeatureDefinition } from '../lib/pricingApi';

// Per PRICING.md: CTA label per plan code
const PLAN_CTA: Record<string, string> = {
  FREE: 'Get Started Free',
  STARTER: 'Start Growing',
  GROWTH: 'Upgrade to Growth',
  PRO: 'Go Pro',
};

function formatPrice(plan: SubscriptionPlan): { price: string; period: string } {
  if (plan.monthlyPrice === null || plan.monthlyPrice === 0) {
    return { price: 'Free', period: '' };
  }
  if (plan.monthlyPrice < 0) {
    return { price: 'Custom', period: '' };
  }
  return { price: `$${plan.monthlyPrice}`, period: '/month' };
}

function getEntitlement(plan: SubscriptionPlan, key: string): PlanEntitlement | undefined {
  return plan.entitlements.find((e) => e.featureKey === key);
}

function formatLimitValue(e: PlanEntitlement | undefined): string {
  if (!e) return '—';
  if (e.limitValue === null || e.limitValue === -1) return 'Unlimited';
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
    <svg
      className="w-5 h-5 mx-auto text-stone-300"
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

type RowType = 'always' | 'limit' | 'boolean' | 'pro-only';
interface TableRow { label: string; key?: string; type: RowType; }

function TableCellValue({ plan, row }: { plan: SubscriptionPlan; row: TableRow }) {
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
          {formatLimitValue(e)}
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

function PricingCard({ plan }: { plan: SubscriptionPlan }) {
  const { price, period } = formatPrice(plan);
  const isHighlight = plan.code === 'GROWTH';
  const cta = PLAN_CTA[plan.code] ?? 'Get Started';

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
          Most Popular
        </div>
      )}

      <h3 className={`text-lg font-semibold ${isHighlight ? 'text-white' : 'text-charcoal'}`}>
        {plan.name}
      </h3>
      <p className={`mt-1 text-sm ${isHighlight ? 'text-gold' : 'text-charcoal-light'}`}>
        {plan.description}
      </p>

      <div className="mt-6 flex items-baseline gap-1">
        <span className={`text-4xl font-display font-bold ${isHighlight ? 'text-white' : 'text-charcoal'}`}>
          {price}
        </span>
        {period && (
          <span className={`text-sm ${isHighlight ? 'text-gold' : 'text-charcoal-light'}`}>
            {period}
          </span>
        )}
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
          {cta}
        </a>
      </div>
    </div>
  );
}

function ComparisonTable({ plans, featureDefs }: { plans: SubscriptionPlan[]; featureDefs: FeatureDefinition[] }) {
  if (plans.length === 0) return null;

  // Build rows from the DB catalogue, grouped by featureType in sort_order sequence.
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
      type: d.featureType === 'LIMIT' ? 'limit' as const : 'boolean' as const,
    }));

  const tableRows: TableRow[] = [...alwaysOnRows, ...dynamicRows, ...proOnlyRows];

  return (
    <div className="mt-20 overflow-x-auto">
      <table className="w-full min-w-[600px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="py-4 pr-6 text-left font-semibold text-charcoal w-2/5">Features</th>
            {plans.map((plan) => (
              <th
                key={plan.code}
                className={`py-4 px-4 text-center font-semibold ${
                  plan.code === 'GROWTH'
                    ? 'text-primary bg-primary/5 rounded-t-lg'
                    : 'text-charcoal'
                }`}
              >
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row, i) => (
            <tr
              key={row.label}
              className={`border-t border-stone-100 ${i % 2 !== 0 ? 'bg-stone-50/50' : ''}`}
            >
              <td className="py-3 pr-6 font-medium text-charcoal">{row.label}</td>
              {plans.map((plan) => (
                <td
                  key={plan.code}
                  className={`py-3 px-4 text-center ${plan.code === 'GROWTH' ? 'bg-primary/5' : ''}`}
                >
                  <TableCellValue plan={plan} row={row} />
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
  let plans: SubscriptionPlan[] = [];
  let featureDefs: FeatureDefinition[] = [];
  try {
    [plans, featureDefs] = await Promise.all([fetchPlans(), fetchFeatureDefinitions()]);
    // Sort by monthly price ascending: FREE (0) → STARTER → GROWTH → PRO
    plans.sort((a, b) => (a.monthlyPrice ?? 0) - (b.monthlyPrice ?? 0));
  } catch {
    // If backend is unavailable, render section gracefully
    plans = [];
    featureDefs = [];
  }

  return (
    <section id="pricing" className="py-24 lg:py-32 bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-charcoal">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-charcoal-light">
            Start free and scale as your community grows. No hidden fees.
          </p>
        </div>

        {plans.length > 0 ? (
          <>
            {/* Pricing cards — 4 columns on large screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {plans.map((plan) => (
                <PricingCard key={plan.code} plan={plan} />
              ))}
            </div>

            {/* Full feature comparison table */}
            <ComparisonTable plans={plans} featureDefs={featureDefs} />
          </>
        ) : (
          <p className="text-center text-charcoal-light">Pricing information is currently unavailable.</p>
        )}
      </div>
    </section>
  );
}
