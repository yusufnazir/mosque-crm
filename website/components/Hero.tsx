export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden geometric-pattern">
      {/* Decorative gradient blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-deep/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gold/10 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full text-primary text-sm font-medium mb-8 opacity-0 animate-fade-in-up">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Trusted by organizations worldwide
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-charcoal leading-tight tracking-tight opacity-0 animate-fade-in-up animation-delay-200">
            Manage your community
            <span className="block text-primary">with clarity &amp; ease</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-charcoal-light leading-relaxed max-w-2xl mx-auto opacity-0 animate-fade-in-up animation-delay-400">
            MemberFlow is the all-in-one platform for community organizations
            to manage members, families, contributions, events, and more.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-in-up animation-delay-600">
            <a
              href="#contact"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-white bg-primary rounded-xl hover:bg-primary-light shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary-dark focus:ring-offset-2"
            >
              Start Free Trial
            </a>
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-primary bg-white border border-primary rounded-xl hover:bg-primary hover:text-white transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary-dark focus:ring-offset-2"
            >
              See How It Works
            </a>
          </div>

          {/* Social proof */}
          <div className="mt-16 flex flex-col items-center gap-4">
            <div className="flex -space-x-2">
              {['bg-emerald-deep', 'bg-gold', 'bg-sky-500', 'bg-rose-500', 'bg-violet-500'].map((bg, i) => (
                <div key={i} className={`w-10 h-10 rounded-full ${bg} border-2 border-white flex items-center justify-center text-white text-xs font-bold`}>
                  {['MR', 'AK', 'SH', 'YN', 'HI'][i]}
                </div>
              ))}
            </div>
            <p className="text-sm text-charcoal-light">
              Organizations are already growing with MemberFlow
            </p>
          </div>
        </div>

        {/* Dashboard preview mockup */}
        <div className="mt-20 relative max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl shadow-stone-900/10 border border-stone-200 overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-stone-100 border-b border-stone-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 bg-white rounded-md text-xs text-stone-400 border border-stone-200">
                  app.memberflow.com/dashboard
                </div>
              </div>
            </div>
            {/* Dashboard mockup content */}
            <div className="p-6 sm:p-8 bg-gradient-to-br from-stone-50 to-white min-h-[300px] lg:min-h-[400px]">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total Members', value: '1,247', color: 'text-emerald-deep', bg: 'bg-emerald-subtle' },
                  { label: 'Active Families', value: '389', color: 'text-sky-600', bg: 'bg-sky-50' },
                  { label: 'This Month', value: '$12,480', color: 'text-gold', bg: 'bg-amber-50' },
                  { label: 'Events', value: '3', color: 'text-violet-600', bg: 'bg-violet-50' },
                ].map((stat) => (
                  <div key={stat.label} className={`${stat.bg} rounded-xl p-4`}>
                    <p className="text-xs text-stone-500 font-medium">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color} mt-1`}>{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 p-4">
                  <p className="text-sm font-semibold text-charcoal mb-3">Monthly Contributions</p>
                  <div className="flex items-end gap-2 h-32">
                    {[40, 55, 45, 70, 60, 85, 75, 90, 80, 95, 88, 92].map((h, i) => (
                      <div key={i} className="flex-1 bg-emerald-deep/20 rounded-t" style={{ height: `${h}%` }}>
                        <div className="w-full bg-emerald-deep rounded-t" style={{ height: `${Math.min(h + 10, 100)}%` }} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-stone-200 p-4">
                  <p className="text-sm font-semibold text-charcoal mb-3">Recent Members</p>
                  <div className="space-y-3">
                    {['James Wilson', 'Sarah Chen', 'David Martinez', 'Emily Novak'].map((name) => (
                      <div key={name} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-subtle flex items-center justify-center text-emerald-deep text-xs font-bold">
                          {name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-sm text-charcoal">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Shadow glow under mockup */}
          <div className="absolute -bottom-6 left-8 right-8 h-12 bg-emerald-deep/5 blur-2xl rounded-full" />
        </div>
      </div>
    </section>
  );
}
