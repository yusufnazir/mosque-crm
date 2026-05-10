import { getTranslations } from 'next-intl/server';

const CARD_KEYS = ['card1', 'card2', 'card3', 'card4'] as const;
const CARD_COLORS = ['bg-emerald-deep', 'bg-gold', 'bg-sky-500', 'bg-violet-500'] as const;

export default async function Testimonials() {
  const t = await getTranslations('Testimonials');

  return (
    <section id="outcomes" className="py-24 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">{t('eyebrow')}</p>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-charcoal">{t('title')}</h2>
          <p className="mt-4 text-lg text-charcoal-light">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {CARD_KEYS.map((key, index) => (
            <div
              key={key}
              className="p-8 rounded-2xl bg-cream border border-stone-200 hover:border-emerald-deep/20 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-charcoal-light">{t(`${key}.tag`)}</span>
                <div className={`w-3 h-3 rounded-full ${CARD_COLORS[index]}`} aria-hidden="true" />
              </div>

              <h3 className="text-xl font-display font-bold text-charcoal mb-3">{t(`${key}.title`)}</h3>
              <p className="text-base text-charcoal leading-relaxed">{t(`${key}.description`)}</p>

              <p className="mt-6 text-sm font-semibold text-primary">{t(`${key}.highlight`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
