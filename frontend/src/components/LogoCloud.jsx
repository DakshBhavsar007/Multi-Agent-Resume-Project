"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, ShieldCheck, Sparkles, Award } from 'lucide-react';
import { publicAPI } from '../lib/api';
import './LogoCloud.css';

const CompanyLogo = ({ name, logoPath }) => (
  <div className="logo-item-wrapper flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100/50 dark:bg-zinc-800/40 border border-gray-200/40 dark:border-zinc-700/40">
    {logoPath ? (
      <img src={logoPath} alt={name} className="w-5 h-5 rounded object-cover" />
    ) : (
      <Building2 className="w-4 h-4 text-blue-500" />
    )}
    <span className="logo-name tracking-wider">{name}</span>
  </div>
);

const DEFAULT_COMPANIES = [
  { name: "AAAA", logoPath: "" },
  { name: "AM MANSURI", logoPath: "" },
  { name: "ACME LABS", logoPath: "" },
  { name: "AHMAD SURTI", logoPath: "" },
  { name: "APEX LOGISTICS", logoPath: "" },
  { name: "NORTHWIND CLOUD", logoPath: "" },
  { name: "LUMEN RESEARCH", logoPath: "" },
  { name: "BRIGHT HORIZON", logoPath: "" }
];

const MarqueeRow = ({ items, direction = "left" }) => {
  if (!items || items.length === 0) return null;
  const marqueeClass = direction === "left" ? "marquee-content-left" : "marquee-content-right";
  return (
    <div className="marquee-container">
      <div className={marqueeClass}>
        {[...items, ...items, ...items, ...items].map((item, i) => (
          <CompanyLogo key={`${item.name}-${i}`} name={item.name} logoPath={item.logo_path || item.logoPath} />
        ))}
      </div>
    </div>
  );
};

const LogoCloud = () => {
  const [companiesList, setCompaniesList] = useState(DEFAULT_COMPANIES);

  useEffect(() => {
    publicAPI.getCompanies({ per_page: 50 })
      .then((res) => {
        let fetched = [];
        if (Array.isArray(res)) fetched = res;
        else if (res?.data?.companies && Array.isArray(res.data.companies)) fetched = res.data.companies;
        else if (res?.companies && Array.isArray(res.companies)) fetched = res.companies;
        else if (res?.data && Array.isArray(res.data)) fetched = res.data;

        if (fetched.length > 0) {
          const mapped = fetched.map(c => ({
            name: (c.name || c.company_name || "Company").toUpperCase(),
            logo_path: c.logo_path || c.logoPath || ""
          }));
          setCompaniesList(mapped);
        }
      })
      .catch((err) => console.error("Error loading logo cloud companies:", err));
  }, []);

  const half = Math.ceil(companiesList.length / 2);
  const row1 = companiesList.slice(0, Math.max(half, 3));
  const row2 = companiesList.slice(Math.max(half, 3));

  return (
    <section className="logo-cloud-section py-8">
      <div className="logo-cloud-container">
        <motion.p 
          className="logo-cloud-title font-semibold text-xs uppercase tracking-widest text-muted-foreground mb-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Preferred by recruiters and hiring teams at verified startups & enterprises
        </motion.p>
        
        <MarqueeRow items={row1.length > 0 ? row1 : DEFAULT_COMPANIES} direction="left" speed={35} />
        
        <div className="marquee-spacer my-3" />
        
        <MarqueeRow items={row2.length > 0 ? row2 : DEFAULT_COMPANIES} direction="right" speed={45} />
      </div>
    </section>
  );
};

export default LogoCloud;
