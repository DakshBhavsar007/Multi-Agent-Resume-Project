import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import HeroHeader from '../components/HeroHeader'
import LogoCloud from '../components/LogoCloud'
import HowItWorks from '../components/HowItWorks'
import FeaturesList from '../components/FeaturesList'
import DetailedShowcase from '../components/DetailedShowcase'
import Pricing from '../components/Pricing'
import Testimonials from '../components/Testimonials'
import FinalCTA from '../components/FinalCTA'
import Footer from '../components/Footer'

import { useNavigate, useLocation } from 'react-router-dom';
import useDocumentTitle from '../hooks/useDocumentTitle';

import SolarSystem from '../components/SolarSystem';

export default function LandingPage() {
  useDocumentTitle(
    "AI Resume Parsing & Intelligent Recruiter Screening",
    "Vishleshan is a next-generation resume intelligence platform that automates candidate matching, ATS scoring, and background verification."
  );

  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = !!localStorage.getItem("vish_jwt");

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        const timer = setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [location]);

  const handleAuth = () => {
    if (localStorage.getItem("vish_jwt")) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div style={{ padding: '0', backgroundColor: 'var(--bg)', color: 'var(--text)', minHeight: '100vh', transition: 'background-color 0.3s, color 0.3s' }}>
      <Navbar onSignIn={handleAuth} isLoggedIn={isLoggedIn} />
      <main>
        <HeroHeader onStart={handleAuth} isLoggedIn={isLoggedIn} />
        <LogoCloud />
        <HowItWorks />

        {/* 3D Multi-Agent Ecosystem Solar System */}
        <section className="py-20 max-w-7xl mx-auto px-6 overflow-hidden">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="px-3.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
              Multi-Agent Intelligence Core
            </span>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-charcoal dark:text-white mt-3 tracking-tight">
              Powered by 7 specialized AI agents
            </h2>
            <p className="text-gray-500 dark:text-zinc-400 mt-2 text-sm max-w-lg mx-auto">
              Explore how specialized agents revolve around the core matching engine to extract skills, detect fraud, and rank candidates in real time.
            </p>
          </div>
          <SolarSystem />
        </section>

        <FeaturesList />
        <DetailedShowcase />
        <Pricing onStart={handleAuth} isLoggedIn={isLoggedIn} />
        <Testimonials />
        <FinalCTA onStart={handleAuth} isLoggedIn={isLoggedIn} />
      </main>
      <Footer />
    </div>
  );
}
