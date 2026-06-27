import React, { useState } from 'react';
import { Header, Footer } from '../../components/user/site-chrome';
import { motion } from 'framer-motion';
import { FileText, Shield, Scale, HelpCircle } from 'lucide-react';

export default function TermsPage() {
  const [activeTab, setActiveTab] = useState('terms'); // 'terms' | 'privacy'

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111111] font-sans">
      <Header />

      <section className="mx-auto max-w-4xl px-6 pt-36 pb-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-full px-4.5 py-1.5 mb-6 text-xs font-bold uppercase tracking-wider text-gray-600"
          >
            <Scale size={12} /> Legal Information
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl font-black tracking-tight leading-none mb-6"
          >
            Terms & Privacy
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 text-sm sm:text-base leading-relaxed"
          >
            Please read our Terms of Service and Privacy Policy carefully to understand your rights, responsibilities, and how we handle your personal data.
          </motion.p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-10">
          <div className="bg-white border border-gray-200 p-1.5 rounded-2xl flex gap-1.5 shadow-sm">
            <button
              onClick={() => setActiveTab('terms')}
              className={`py-2 px-6 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'terms'
                  ? 'bg-[#111111] text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <FileText size={14} /> Terms of Service
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`py-2 px-6 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'privacy'
                  ? 'bg-[#111111] text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Shield size={14} /> Privacy Policy
            </button>
          </div>
        </div>

        {/* Content Box */}
        <div className="bg-white border border-gray-200 rounded-3xl p-8 sm:p-12 shadow-sm">
          {activeTab === 'terms' ? (
            <div className="space-y-8">
              <div>
                <h2 className="font-display text-2xl font-black mb-3">Terms of Service</h2>
                <p className="text-xs text-gray-400">Last updated: June 27, 2026</p>
              </div>

              <div className="space-y-6 text-sm text-gray-600 leading-relaxed">
                <section className="space-y-2">
                  <h3 className="font-bold text-gray-900 text-base">1. Acceptance of Terms</h3>
                  <p>
                    By accessing or using the website between.indevs.in ("Between"), you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-gray-900 text-base">2. Description of Service</h3>
                  <p>
                    Between is an AI-powered recruitment platform designed to assist job seekers in optimizing their resumes and applying for jobs, and recruiters/companies in managing applicant pools and evaluating talent.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-gray-900 text-base">3. User Accounts</h3>
                  <p>
                    To access certain features, you must create an account. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your credentials.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-gray-900 text-base">4. Subscriptions and Payments</h3>
                  <p>
                    We offer paid subscriptions (e.g. Premium plans) for both job seekers and recruiters. Payments are processed securely via Razorpay. Subscriptions are billed in advance on a recurring monthly basis. You can cancel your subscription at any time, which will prevent further renewals.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-gray-900 text-base">5. Intellectual Property</h3>
                  <p>
                    All content, design, code, logos, and features of Between are the intellectual property of Between Technologies Private Limited. You may not reproduce, copy, distribute, or modify any portion of our platform without prior written authorization.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-gray-900 text-base">6. Governing Law</h3>
                  <p>
                    These terms are governed by and construed in accordance with the laws of India. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the courts located in Gandhinagar, Gujarat, India.
                  </p>
                </section>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                <h2 className="font-display text-2xl font-black mb-3">Privacy Policy</h2>
                <p className="text-xs text-gray-400">Last updated: June 27, 2026</p>
              </div>

              <div className="space-y-6 text-sm text-gray-600 leading-relaxed">
                <section className="space-y-2">
                  <h3 className="font-bold text-gray-900 text-base">1. Information We Collect</h3>
                  <p>
                    We collect personal information necessary to deliver our services, including:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Account details (name, email address, password, contact number).</li>
                    <li>Profile data (resumes, work history, skills, portfolio links, profile pictures).</li>
                    <li>Payment information (processed securely through Razorpay; we do not store full card numbers).</li>
                    <li>Recruitment metrics (API usage logs, session histories, scan metadata).</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-gray-900 text-base">2. How We Use Information</h3>
                  <p>
                    Your data is used to match job seekers with vacancies, score resumes using AI models, secure accounts against fraud, and process subscription payments. We do not sell your personal data to third parties.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-gray-900 text-base">3. Data Sharing</h3>
                  <p>
                    When a job seeker applies for a position, their resume, contact info, and match scores are shared with the respective recruiter. We may also share data with third-party service providers (like payment processors and hosting services) under strict confidentiality agreements.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-gray-900 text-base">4. Security Measures</h3>
                  <p>
                    We implement industry-standard security protocols, including SSL encryption and secure API key tokenization, to protect your data from unauthorized access, modification, or disclosure.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-gray-900 text-base">5. Your Data Rights</h3>
                  <p>
                    You have the right to access, edit, download, or delete your personal account data at any time through your profile settings page. For data deletion requests, you may also email support@between.indevs.in.
                  </p>
                </section>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
