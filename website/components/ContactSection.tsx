"use client";

import { useState, type FormEvent } from "react";

const subjects = [
  { value: "demo", label: "Request a demo" },
  { value: "pricing", label: "Enterprise pricing" },
  { value: "support", label: "Technical support" },
  { value: "other", label: "Other" },
];

type ContactSectionProps = {
  web3formsAccessKey?: string;
};

export default function ContactSection({ web3formsAccessKey = '' }: ContactSectionProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    data.append("access_key", web3formsAccessKey);

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: data,
      });
      const json = await res.json();
      if (json.success) {
        setSubmitted(true);
      } else {
        setError("Something went wrong. Please try again or email us directly.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 p-12 text-center">
        <svg className="h-12 w-12 text-primary mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
        <h3 className="mt-2 text-lg font-semibold text-charcoal">Message received!</h3>
        <p className="mt-2 text-sm text-charcoal-light">
          Thank you for reaching out. Our team will get back to you within 1 business day.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-6 text-sm font-medium text-primary hover:text-primary-light underline underline-offset-2"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <section id="contact" className="py-24 lg:py-32 bg-cream">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Get in Touch</p>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-charcoal">Contact Us</h2>
          <p className="mt-4 text-lg text-charcoal-light">Have a question, need a demo, or want to discuss Enterprise pricing? We&apos;d love to hear from you.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-10 items-start">
          {/* Contact Info */}
          <div className="md:col-span-1 bg-cream rounded-2xl p-8 border border-stone-200 hover:border-primary/30 transition-all flex flex-col gap-8">
            <div>
              <h3 className="text-lg font-semibold text-charcoal mb-4">Contact Information</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <div className="text-xs text-stone-500 uppercase tracking-wider">Email</div>
                  <div className="text-base text-charcoal font-medium">info@mosquecrm.com</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </div>
                <div>
                  <div className="text-xs text-stone-500 uppercase tracking-wider">Phone</div>
                  <div className="text-base text-charcoal font-medium">+5978499444</div>
                </div>
              </div>
            </div>
          </div>
          {/* Contact Form */}
          <form onSubmit={handleSubmit} className="md:col-span-2 space-y-6 bg-white rounded-2xl shadow-lg p-8 border border-stone-100">
            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.054 0 1.918-.816 1.995-1.85l.007-.15V6c0-1.054-.816-1.918-1.85-1.995L19 4H5c-1.054 0-1.918.816-1.995 1.85L3 6v12c0 1.054.816 1.918 1.85 1.995L5 20z" /></svg>
                {error}
              </div>
            )}
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-charcoal">Full Name <span className="text-red-500">*</span></label>
                <input id="name" name="name" type="text" required className="mt-1 block w-full rounded-md border border-stone-200 bg-cream px-3 py-2 text-charcoal placeholder-stone-500 shadow-sm focus:border-primary focus:ring-primary" placeholder="Jane Smith" />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-charcoal">Work Email <span className="text-red-500">*</span></label>
                <input id="email" name="email" type="email" required className="mt-1 block w-full rounded-md border border-stone-200 bg-cream px-3 py-2 text-charcoal placeholder-stone-500 shadow-sm focus:border-primary focus:ring-primary" placeholder="jane@company.com" />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="company" className="block text-sm font-medium text-charcoal">Company</label>
                <input id="company" name="company" type="text" className="mt-1 block w-full rounded-md border border-stone-200 bg-cream px-3 py-2 text-charcoal placeholder-stone-500 shadow-sm focus:border-primary focus:ring-primary" placeholder="Acme Logistics" />
              </div>
            </div>
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-charcoal">Subject <span className="text-red-500">*</span></label>
              <select id="subject" name="subject" required className="mt-1 block w-full rounded-md border border-stone-200 bg-cream px-3 py-2 text-charcoal shadow-sm focus:border-primary focus:ring-primary">
                <option value="">Select a topic...</option>
                {subjects.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-charcoal">Message <span className="text-red-500">*</span></label>
              <textarea id="message" name="message" required rows={5} className="mt-1 block w-full rounded-md border border-stone-200 bg-cream px-3 py-2 text-charcoal placeholder-stone-500 shadow-sm focus:border-primary focus:ring-primary" placeholder="Tell us how we can help..." />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-base font-semibold text-white bg-primary hover:bg-primary-light transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 12l9 9 11-11" /></svg>
              )}
              {loading ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
