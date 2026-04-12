"use client";
import React from 'react'
import Navbar from './components/Navbar'
import HeroHeader from './components/HeroHeader'
import LogoCloud from './components/LogoCloud'
import HowItWorks from './components/HowItWorks'
import FeaturesList from './components/FeaturesList'
import DetailedShowcase from './components/DetailedShowcase'
import Pricing from './components/Pricing'
import Testimonials from './components/Testimonials'
import FinalCTA from './components/FinalCTA'
import Footer from './components/Footer'

import { useRouter } from 'next/navigation';

function App() {
  const router = useRouter();

  const handleAuth = () => {
    router.push('/login');
  };

  return (
    <div style={{ padding: '0', backgroundColor: 'white', minHeight: '100vh' }}>
      <Navbar onSignIn={handleAuth} />
      <main>
        <HeroHeader onStart={handleAuth} />
        <LogoCloud />
        <HowItWorks />
        <FeaturesList />
        <DetailedShowcase />
        <Pricing onStart={handleAuth} />
        <Testimonials />
        <FinalCTA onStart={handleAuth} />
      </main>
      <Footer />
    </div>
  )
}

export default App
