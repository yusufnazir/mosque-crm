const CUSTOMER_CAPABILITIES = [
  {
    title: 'Centralize member records',
    description:
      'Keep profiles, households, roles, and notes in one searchable place so teams spend less time on admin and more time serving people.',
    highlight: 'One source of truth for member data',
    tag: 'Member Management',
    color: 'bg-emerald-deep',
  },
  {
    title: 'Track contributions and finances',
    description:
      'Record donations, issue receipts, and monitor trends with clear dashboards that help leadership plan confidently.',
    highlight: 'Clear reporting for every contribution',
    tag: 'Finance',
    color: 'bg-gold',
  },
  {
    title: 'Run events with less stress',
    description:
      'Plan events, manage registrations, and follow distribution workflows in real time so execution stays organized from start to finish.',
    highlight: 'Coordinate events with full visibility',
    tag: 'Operations',
    color: 'bg-sky-500',
  },
  {
    title: 'Control access with permissions',
    description:
      'Assign roles, protect sensitive data, and give each team member the exact access they need across locations and departments.',
    highlight: 'Secure access for every role',
    tag: 'Security',
    color: 'bg-violet-500',
  },
];

export default function Testimonials() {
  return (
    <section id="outcomes" className="py-24 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Outcomes</p>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-charcoal">
            What customers can do with MemberFlow
          </h2>
          <p className="mt-4 text-lg text-charcoal-light">
            Practical ways organizations use MemberFlow to save time, stay organized, and scale operations.
          </p>
        </div>

        {/* Capability grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {CUSTOMER_CAPABILITIES.map((item) => (
            <div
              key={item.title}
              className="p-8 rounded-2xl bg-cream border border-stone-200 hover:border-emerald-deep/20 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-charcoal-light">{item.tag}</span>
                <div className={`w-3 h-3 rounded-full ${item.color}`} aria-hidden="true" />
              </div>

              <h3 className="text-xl font-display font-bold text-charcoal mb-3">{item.title}</h3>
              <p className="text-base text-charcoal leading-relaxed">{item.description}</p>

              <p className="mt-6 text-sm font-semibold text-primary">{item.highlight}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
