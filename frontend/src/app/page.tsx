'use client';

import { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../sections/Hero';
import TrustBar from '../sections/TrustBar';
import Features from '../sections/Features';
import HowItWorks from '../sections/HowItWorks';
import CTASection from '../sections/CTASection';
import Footer from '../components/Footer';

export default function HomePage() {
  useEffect(() => {
    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    };

    const observerOptions: IntersectionObserverInit = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const revealElements = document.querySelectorAll('.reveal');

    revealElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-ink text-[#F0F0F5] flex flex-col font-sans selection:bg-mint-soft selection:text-mint">
      {/* Top Navbar */}
      <Navbar />

      {/* Hero Section */}
      <div className="reveal">
        <Hero />
      </div>

      {/* Trust Stats Bar */}
      <div className="reveal">
        <TrustBar />
      </div>

      {/* Protocol Features */}
      <div className="reveal">
        <Features />
      </div>

      {/* How It Works Timeline */}
      <div className="reveal">
        <HowItWorks />
      </div>

      {/* Call To Action */}
      <div className="reveal">
        <CTASection />
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
