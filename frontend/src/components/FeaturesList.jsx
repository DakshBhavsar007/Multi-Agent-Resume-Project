"use client";
import React from 'react';
import ExpandableBentoGrid from './ExpandableBentoGrid';
import { Sparkles, Target, ShieldCheck, Code2, FileCheck2, BarChart3 } from 'lucide-react';
import './FeaturesList.css';

const FeaturesList = () => {
  const bentoItems = [
    { 
      id: "ai-resume-parsing",
      title: "AI Resume Parsing", 
      subtitle: "Multi-agent skill & profile extraction",
      description: "Multi-agent extraction of skills, experience, and projects with deep LLM-powered analysis.", 
      icon: <Sparkles size={24} />,
      color: "#2563eb", 
      tag: "CORE AI", 
      link: "/jobs/register",
      content: (
        <div className="space-y-3">
          <p className="font-semibold text-charcoal dark:text-white">Multi-Agent Resume Intelligence</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Our specialized AI agent parses PDF, DOCX, and TXT files, extracting skills, work experience, and profile details for instant onboarding.
          </p>
        </div>
      )
    },
    { 
      id: "rank-match",
      title: "Rank & Match", 
      subtitle: "Weighted requirement scoring",
      description: "Semantic scoring maps candidate skills against job requirements with configurable weights.", 
      icon: <Target size={24} />,
      color: "#10b981", 
      tag: "MATCHING", 
      link: "/jobs/search",
      content: (
        <div className="space-y-3">
          <p className="font-semibold text-charcoal dark:text-white">Smart Match Algorithm</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Recruiters can customize weighting matrices for required skills, education, and experience level.
          </p>
        </div>
      )
    },
    { 
      id: "fraud-detection",
      title: "Fraud Detection", 
      subtitle: "Plagiarism & fake resume scanner",
      description: "AI-powered scanning detects plagiarism, fake resumes, ATS keyword stuffing, and phishing job posts.", 
      icon: <ShieldCheck size={24} />,
      color: "#ef4444", 
      tag: "SAFE", 
      link: "/jobs/dashboard",
      content: (
        <div className="space-y-3">
          <p className="font-semibold text-charcoal dark:text-white">Active Security Shield</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Scans job postings and resumes for keyword stuffing, fake credentials, and unauthorized domain listings.
          </p>
        </div>
      )
    },
    { 
      id: "developer-api",
      title: "Developer API", 
      subtitle: "Tiered API keys & webhooks",
      description: "Full REST API with tiered subscriptions, rate limiting, and interactive documentation.", 
      icon: <Code2 size={24} />,
      color: "#8b5cf6", 
      tag: "API & DEV", 
      link: "/developer/portal",
      content: (
        <div className="space-y-3">
          <p className="font-semibold text-charcoal dark:text-white">Developer Integrations</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Access our REST APIs to embed AI resume parsing and matching into your own applications.
          </p>
        </div>
      )
    },
    { 
      id: "resume-builder",
      title: "Resume Builder & Seeker Portal", 
      subtitle: "7 modern ATS templates",
      description: "Dedicated seeker accounts with a dynamic 7-template Resume Builder, 1/2 column layouts, and profile auto-sync.", 
      icon: <FileCheck2 size={24} />,
      color: "#f59e0b", 
      tag: "PRO", 
      link: "/jobs/resume-builder",
      content: (
        <div className="space-y-3">
          <p className="font-semibold text-charcoal dark:text-white">ATS Resume Editor</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Choose from 7 executive templates with real-time ATS scoring, font styling, and 1-click PDF download.
          </p>
        </div>
      )
    },
    { 
      id: "smart-analytics",
      title: "Smart Search & Analytics", 
      subtitle: "Real-time hiring data & salaries",
      description: "Autocomplete job search with state mapping, hiring velocity dashboards, and pipeline analytics.", 
      icon: <BarChart3 size={24} />,
      color: "#06b6d4", 
      tag: "DATA", 
      link: "/jobs/trends",
      content: (
        <div className="space-y-3">
          <p className="font-semibold text-charcoal dark:text-white">Market Intelligence</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Track compensation trends, high-demand skills, and hiring velocity across major engineering hubs.
          </p>
        </div>
      )
    }
  ];

  return (
    <section className="features-section py-12" id="features">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Capabilities</div>
          <h2 className="mt-1.5 text-2xl md:text-3xl font-extrabold tracking-tight text-charcoal dark:text-white">Built for the future of hiring</h2>
          <p className="mt-2 text-xs md:text-sm text-gray-500 dark:text-gray-400">Click any card below to open interactive capability details</p>
        </div>
        <ExpandableBentoGrid items={bentoItems} />
      </div>
    </section>
  );
};

export default FeaturesList;
