import React, { useState } from 'react';
import { Header, Footer } from '../../components/user/site-chrome';
import { motion } from 'framer-motion';
import { MapPin, Mail, Phone, Clock, FileText, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      toast.success("Message sent successfully! We'll get back to you within 24 hours.");
      setForm({ name: '', email: '', message: '' });
      setSubmitting(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111111] font-sans">
      <Header />

      <section className="mx-auto max-w-5xl px-6 pt-36 pb-16">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-full px-4.5 py-1.5 mb-6 text-xs font-bold uppercase tracking-wider text-gray-600"
          >
            <Clock size={12} /> Contact Us
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl font-black tracking-tight leading-none mb-6"
          >
            We are here to help.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 text-base leading-relaxed"
          >
            Have a question about our platforms, pricing, or need technical assistance? Drop us a message or reach out directly.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-5 gap-10">
          {/* Info Side */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 rounded-3xl p-6.5 space-y-6">
              <div>
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Entity Details</h3>
                <p className="text-sm font-bold text-gray-900">Between Technologies Private Limited</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-gray-900 block mb-1">Registered Address</span>
                    <span className="text-gray-500 leading-relaxed block">
                      4th Floor, Innovation Hub, Block A, DA-IICT Campus, Gandhinagar, Gujarat, India - 382007
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-5 w-5 text-gray-400 shrink-0" />
                  <div>
                    <span className="font-bold text-gray-900 block mb-0.5">Support Email</span>
                    <a href="mailto:support@between.indevs.in" className="text-gray-500 hover:text-gray-900 underline transition">
                      support@between.indevs.in
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-5 w-5 text-gray-400 shrink-0" />
                  <div>
                    <span className="font-bold text-gray-900 block mb-0.5">Contact Number</span>
                    <span className="text-gray-500">+91 88495 38117</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 flex gap-3 text-xs leading-relaxed text-gray-500">
              <Clock className="h-4.5 w-4.5 text-gray-400 shrink-0 mt-0.5" />
              <p>
                Our standard support desk hours are Monday to Friday, 9:00 AM to 6:00 PM IST. We strive to reply to all queries within 1 business day.
              </p>
            </div>
          </div>

          {/* Form Side */}
          <div className="lg:col-span-3 bg-white border border-gray-200 rounded-3xl p-6.5 sm:p-8">
            <h3 className="font-display text-xl font-bold mb-6 text-gray-900">Send us a Message</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Your Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="John Doe"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full p-3 bg-white border border-gray-200 focus:border-accent rounded-xl text-sm font-bold text-gray-900 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full p-3 bg-white border border-gray-200 focus:border-accent rounded-xl text-sm font-bold text-gray-900 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Message</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="How can we help you?"
                  value={form.message}
                  onChange={e => setForm({...form, message: e.target.value})}
                  className="w-full p-3 bg-white border border-gray-200 focus:border-accent rounded-xl text-sm font-bold text-gray-900 focus:outline-none transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#111111] hover:bg-gray-800 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                {submitting ? 'Sending...' : <><Send size={14} /> Send Message</>}
              </button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
