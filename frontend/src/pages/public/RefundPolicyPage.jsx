import React from 'react';
import { Header, Footer } from '../../components/user/site-chrome';
import { motion } from 'framer-motion';
import { RefreshCw, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111111] font-sans">
      <Header />

      <section className="mx-auto max-w-4xl px-6 pt-24 pb-16">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-full px-4.5 py-1.5 mb-6 text-xs font-bold uppercase tracking-wider text-gray-600"
          >
            <RefreshCw size={12} /> Billing Policy
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl font-black tracking-tight leading-none mb-6"
          >
            Refund & Cancellation
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 text-sm sm:text-base leading-relaxed"
          >
            Transparent cancellation policies and instructions on obtaining refunds for paid subscription tiers.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            {
              icon: RefreshCw,
              title: "Cancel Anytime",
              desc: "Subscriptions can be easily cancelled online via your profile settings page with a single click."
            },
            {
              icon: ShieldCheck,
              title: "Active Till End",
              desc: "Upon cancelling, premium perks remain active until the end of your currently paid billing cycle."
            },
            {
              icon: AlertTriangle,
              title: "No Hidden Costs",
              desc: "No setup fees, no cancellation fees. You only pay for the periods you actively subscribe to."
            }
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="rounded-3xl border border-gray-200 bg-white p-6 space-y-4 shadow-sm"
            >
              <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700">
                <item.icon size={20} strokeWidth={2} />
              </div>
              <h3 className="font-display text-base font-bold text-gray-900">{item.title}</h3>
              <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-3xl p-8 sm:p-12 space-y-8 shadow-sm">
          <div className="space-y-6 text-sm text-gray-600 leading-relaxed">
            <section className="space-y-2">
              <h2 className="font-display text-xl font-bold text-gray-900">Subscription Cancellation</h2>
              <p>
                You can cancel your subscription (Job Seeker Premium or Recruiter Plan) at any time. To cancel:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>For Recruiters: Go to <strong>Settings &gt; Billing &amp; Plan</strong> and click <strong>Cancel Plan</strong>.</li>
                <li>For Job Seekers: Go to <strong>Billing</strong> and click <strong>Cancel Subscription</strong> (or contact support).</li>
              </ul>
              <p className="pt-2">
                Following cancellation, no further charges will be made. Your premium subscription will remain active until the end of the current billing cycle, at which point your account will be downgraded to the Free tier.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-xl font-bold text-gray-900">Refund Policy</h2>
              <p>
                Since we offer free trials/Starter plans to allow users to fully test our platform before subscribing, we generally **do not offer refunds** for partially used periods.
              </p>
              <p>
                However, in cases of technical billing issues, duplicate charges, or gateway errors on Razorpay:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Please contact us at **support@between.indevs.in** within 7 days of the transaction.</li>
                <li>Provide the payment ID (e.g. `pay_...`) and transaction receipt.</li>
                <li>Our billing team will review the transaction. If verified as a duplicate charge or technical gateway error, the refund will be processed back to the original payment source within 5-7 business days.</li>
              </ul>
            </section>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
