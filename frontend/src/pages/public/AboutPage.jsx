import React from 'react';
import { Header, Footer } from '../../components/user/site-chrome';
import { motion } from 'framer-motion';
import { Target, Users, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111111] font-sans">
      <Header />
      
      {/* Hero Section */}
      <section className="mx-auto max-w-4xl px-6 pt-36 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-full px-4 py-1.5 mb-6 text-xs font-bold uppercase tracking-wider text-gray-600"
        >
          <Sparkles size={12} /> About Us
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-display text-4xl sm:text-6xl font-black tracking-tight leading-none mb-6"
        >
          A calmer, human-centric job search.
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed"
        >
          We are redesigning how recruitment works. No spam, no ghosting, no cold interfaces — just transparent matched opportunities powered by intelligent AI.
        </motion.p>
      </section>

      {/* Main content grid */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Target,
              title: "Our Mission",
              desc: "To eliminate the friction of job hunting by offering candidates instant match scores, transparency of hiring steps, and direct, spam-free applications."
            },
            {
              icon: Users,
              title: "Built For Teams",
              desc: "Helping recruiters screen and identify top talents through specialized AI matching, automated assessments, and robust fraud prevention filters."
            },
            {
              icon: ShieldAlert,
              title: "Transparency First",
              desc: "No hidden filters or secret algorithm downgrades. Every applicant receives clear feedback, ATS report scores, and key improvement insights."
            }
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="rounded-3xl border border-gray-200 bg-white p-7 space-y-4 hover:shadow-lg transition duration-300 overflow-hidden"
            >
              <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700">
                <item.icon size={20} strokeWidth={2} />
              </div>
              <h3 className="font-display text-lg font-bold text-gray-900">{item.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Detailed Story Section */}
        <div className="mt-16 bg-white border border-gray-200 rounded-3xl p-8 sm:p-12">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="font-display text-2xl sm:text-3xl font-black text-gray-900">Why Between?</h2>
            <p className="text-gray-500 leading-relaxed text-sm sm:text-base">
              The modern recruitment space is broken. Candidates send hundreds of applications into the void, while recruiters get overwhelmed by spam and fraudulent resumes. 
            </p>
            <p className="text-gray-500 leading-relaxed text-sm sm:text-base">
              Between acts as the peaceful interface — the bridge where candidates receive accurate AI ATS evaluations and safety check ratings on listings, and recruiters get genuine, highly-relevant candidate profiles.
            </p>
            <div className="pt-4">
              <Link to="/jobs/search" className="inline-flex items-center gap-2 py-3 px-6 bg-[#111111] hover:bg-gray-800 text-white font-bold rounded-xl text-sm transition-all shadow-md">
                Browse Active Jobs <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
