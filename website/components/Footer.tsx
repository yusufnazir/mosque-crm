import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { externalLinkProps } from '@/lib/externalLinkProps';

export default async function Footer() {
  const t = await getTranslations('Footer');
  const year = new Date().getFullYear();

  const columns: { titleKey: 'product' | 'resources' | 'company'; links: { labelKey: string; href: string }[] }[] = [
    {
      titleKey: 'product',
      links: [
        { labelKey: 'features', href: '#features' },
        { labelKey: 'pricing', href: '#pricing' },
        { labelKey: 'testimonials', href: '#outcomes' },
        { labelKey: 'roadmap', href: '#' },
      ],
    },
    {
      titleKey: 'resources',
      links: [
        { labelKey: 'documentation', href: '#' },
        { labelKey: 'apiReference', href: '#' },
        { labelKey: 'helpCenter', href: '#' },
        { labelKey: 'blog', href: '#' },
      ],
    },
    {
      titleKey: 'company',
      links: [
        { labelKey: 'about', href: '#' },
        { labelKey: 'contact', href: '#contact' },
        { labelKey: 'privacy', href: '#' },
        { labelKey: 'terms', href: '#' },
      ],
    },
  ];

  const socials: { labelKey: 'github' | 'twitter' | 'linkedin'; href: string }[] = [
    { labelKey: 'github', href: '#' },
    { labelKey: 'twitter', href: '#' },
    { labelKey: 'linkedin', href: '#' },
  ];

  return (
    <footer className="bg-charcoal text-stone-400 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-12 border-b border-stone-700">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <img src="/memberflow-icon.svg" alt="MemberFlow" className="w-8 h-8" />
              <span className="text-lg font-display font-bold text-white">
                Member<span className="text-primary-light">Flow</span>
              </span>
            </Link>
            <p className="text-sm text-stone-500 leading-relaxed">{t('tagline')}</p>
          </div>

          {columns.map((col) => (
            <div key={col.titleKey}>
              <h4 className="text-sm font-semibold text-white mb-4">{t(col.titleKey)}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.labelKey}>
                    <a
                      href={link.href}
                      {...externalLinkProps(link.href)}
                      className="text-sm hover:text-primary-light transition-colors"
                    >
                      {t(link.labelKey)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-stone-500">{t('copyright', { year })}</p>
          <div className="flex items-center gap-6">
            {socials.map((s) => (
              <a key={s.labelKey} href={s.href} className="text-sm text-stone-500 hover:text-primary-light transition-colors">
                {t(s.labelKey)}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
