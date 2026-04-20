import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Pricing from '@/components/Pricing';
import Testimonials from '@/components/Testimonials';
import CTA from '@/components/CTA';
import ContactSection from '@/components/ContactSection';
import Footer from '@/components/Footer';
import { getSiteUrls, getWeb3formsAccessKey } from '@/lib/siteUrls';

export default function Home() {
  const { signInUrl, getStartedUrl } = getSiteUrls();
  const web3formsAccessKey = getWeb3formsAccessKey();

  return (
    <>
      <Navbar signInUrl={signInUrl} getStartedUrl={getStartedUrl} />
      <main>
        <Hero />
        <Features />
        <Pricing />
        <Testimonials />
        <CTA getStartedUrl={getStartedUrl} />
        <ContactSection web3formsAccessKey={web3formsAccessKey} />
      </main>
      <Footer />
    </>
  );
}
