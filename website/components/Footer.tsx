const FOOTER_LINKS = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Testimonials', href: '#testimonials' },
    { label: 'Roadmap', href: '#' },
  ],
  Resources: [
    { label: 'Documentation', href: '#' },
    { label: 'API Reference', href: '#' },
    { label: 'Help Center', href: '#' },
    { label: 'Blog', href: '#' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Contact', href: '#contact' },
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-charcoal text-stone-400 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-12 border-b border-stone-700">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/memberflow-icon.svg" alt="MemberFlow" className="w-8 h-8" />
              <span className="text-lg font-display font-bold text-white">
                Member<span className="text-primary-light">Flow</span>
              </span>
            </div>
            <p className="text-sm text-stone-500 leading-relaxed">
              Modern membership management for community organizations.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-white mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm hover:text-primary-light transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-stone-500">
            &copy; {new Date().getFullYear()} MemberFlow. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {/* Placeholder social icons */}
            {['GitHub', 'Twitter', 'LinkedIn'].map((social) => (
              <a key={social} href="#" className="text-sm text-stone-500 hover:text-primary-light transition-colors">
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
