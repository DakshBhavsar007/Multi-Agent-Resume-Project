import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, AreaChart, Area, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Briefcase, DollarSign, Globe, Award, Sparkles } from 'lucide-react';
import { Header, Footer } from '../components/user/site-chrome';
import ResumeUploadModal from '../components/ResumeUploadModal';
import { publicAPI } from '../lib/api';
import LoadingSkeleton from '../components/LoadingSkeleton';

const defaultSalaryTimeline = [
  { year: '2023', salary: 112 },
  { year: '2024', salary: 124 },
  { year: '2025', salary: 138 },
  { year: '2026 (Est)', salary: 154 }
];

const defaultRegionDistribution = [
  { name: 'Bengaluru', value: 450, color: '#2563EB' },
  { name: 'San Francisco', value: 380, color: '#0F56B3' },
  { name: 'Zurich', value: 180, color: '#22C55E' },
  { name: 'London', value: 240, color: '#8b5cf6' }
];

export default function JobsTrendsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    setLoading(true);
    publicAPI.getMarketTrends()
      .then(data => {
        setTrends(data.trends);
      })
      .catch(err => {
        console.error("Failed to load trends:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Header */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-[#2563eb] dark:text-blue-400 uppercase tracking-wider">Market Intelligence</span>
          <h1 className="text-3xl font-extrabold text-foreground">Market Trends & Insights</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Analyze wage trajectories, regional volumes, and domain demands processed across the Between ingestion engine.
          </p>
        </div>

        {/* High-level widgets grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-2 min-h-[120px] flex flex-col justify-between">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Average Tech Base</div>
            {loading ? (
              <>
                <LoadingSkeleton width="120px" height="28px" />
                <LoadingSkeleton width="100px" height="14px" />
              </>
            ) : (
              <>
                <div className="text-3xl font-black text-foreground">${trends?.average_tech_base?.toLocaleString()}</div>
                <div className="text-xs text-green-500 font-semibold flex items-center">&uarr; +{trends?.average_tech_base_change}% vs last year</div>
              </>
            )}
          </div>
          
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-2 min-h-[120px] flex flex-col justify-between">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Hiring Velocity Index</div>
            {loading ? (
              <>
                <LoadingSkeleton width="120px" height="28px" />
                <LoadingSkeleton width="100px" height="14px" />
              </>
            ) : (
              <>
                <div className="text-3xl font-black text-foreground">{trends?.hiring_velocity} / 10</div>
                <div className="text-xs text-green-500 font-semibold flex items-center">&uarr; {trends?.hiring_velocity_days} days faster closures</div>
              </>
            )}
          </div>

          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-2 min-h-[120px] flex flex-col justify-between">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Top Remote Hub</div>
            {loading ? (
              <>
                <LoadingSkeleton width="120px" height="28px" />
                <LoadingSkeleton width="100px" height="14px" />
              </>
            ) : (
              <>
                <div className="text-3xl font-black text-[#2563eb] dark:text-blue-400">{trends?.top_remote_hub}</div>
                <div className="text-xs text-muted-foreground font-medium">{trends?.top_remote_hub_percentage}% of all remote uploads</div>
              </>
            )}
          </div>

          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-2 min-h-[120px] flex flex-col justify-between">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active JDs Tracked</div>
            {loading ? (
              <>
                <LoadingSkeleton width="120px" height="28px" />
                <LoadingSkeleton width="100px" height="14px" />
              </>
            ) : (
              <>
                <div className="text-3xl font-black text-[#0F56B3]">{trends?.active_jds_tracked?.toLocaleString()}</div>
                <div className="text-xs text-[#5c5c5c] font-medium">Updated 5 minutes ago</div>
              </>
            )}
          </div>
        </div>

        {/* Visual Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Chart 1: Salary Growthtimeline */}
          <div className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-4">
            <div className="space-y-1">
              <h3 className="font-extrabold text-base text-foreground">Annual Wage Trajectory</h3>
              <p className="text-xs text-muted-foreground">Median base salaries for senior software engineers (in thousands).</p>
            </div>
            
            <div className="w-full h-64">
              {loading ? (
                <div className="w-full h-full flex flex-col justify-between">
                  <div className="flex items-end justify-between h-48 px-4 pb-2 border-b border-gray-100">
                    <LoadingSkeleton width="20px" height="30%" />
                    <LoadingSkeleton width="20px" height="50%" />
                    <LoadingSkeleton width="20px" height="70%" />
                    <LoadingSkeleton width="20px" height="90%" />
                  </div>
                  <div className="flex justify-between px-4 mt-2">
                    <LoadingSkeleton width="30px" height="12px" />
                    <LoadingSkeleton width="30px" height="12px" />
                    <LoadingSkeleton width="30px" height="12px" />
                    <LoadingSkeleton width="60px" height="12px" />
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minHeight={256} minWidth={100}>
                  <AreaChart data={trends?.salary_timeline || defaultSalaryTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salaryGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f4ef" />
                    <XAxis dataKey="year" stroke="#9CA3AF" fontSize={11} />
                    <YAxis stroke="#9CA3AF" fontSize={11} />
                    <Tooltip contentStyle={{ borderRadius: 8 }} />
                    <Area type="monotone" dataKey="salary" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#salaryGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 2: Regional hiring volume distribution */}
          <div className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-4">
            <div className="space-y-1">
              <h3 className="font-extrabold text-base text-foreground">Regional Posting Share</h3>
              <p className="text-xs text-muted-foreground">Distribution of active requisitions across geographic networks.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6">
              {loading ? (
                <>
                  <div className="md:col-span-6 h-56 flex items-center justify-center">
                    <LoadingSkeleton width="160px" height="160px" borderRadius="50%" />
                  </div>
                  <div className="md:col-span-6 space-y-3">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="flex justify-between items-center">
                        <LoadingSkeleton width="80px" height="14px" />
                        <LoadingSkeleton width="50px" height="14px" />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="md:col-span-6 h-56">
                    <ResponsiveContainer width="100%" height="100%" minHeight={224} minWidth={100}>
                      <PieChart>
                        <Pie
                          data={trends?.region_distribution || defaultRegionDistribution}
                          cx="50%" cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {(trends?.region_distribution || defaultRegionDistribution).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 10 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="md:col-span-6 space-y-3">
                    {(trends?.region_distribution || defaultRegionDistribution).map((region, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: region.color }} />
                          <span className="text-muted-foreground">{region.name}</span>
                        </div>
                        <span className="text-foreground">{region.value} openings</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Top Growing Skills matching bottom of inspiratio_ui2.jpeg */}
        <section className="space-y-4">
          <h3 className="font-extrabold text-lg text-foreground">High-Growth Domains</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(trends?.high_growth_domains || [
              { name: "Prompt Engineering", growth: "+48%", pay: "$185k", description: "Highest request growth this quarter (+48%)." },
              { name: "Design Systems", growth: "+14%", pay: "$140k", description: "Steady enterprise adoption indices (+14%)." },
              { name: "Rust / Go Backend", growth: "+22%", pay: "$165k", description: "High throughput performance demand (+22%)." }
            ]).map((domain, idx) => {
              // Map icons and colors dynamically
              const Icon = idx === 0 ? Sparkles : idx === 1 ? Award : TrendingUp;
              const colorHex = idx === 0 ? "#22C55E" : idx === 1 ? "#0F56B3" : "#2563EB";
              const bgClass = idx === 0 ? "bg-[#22C55E]/10 text-[#22C55E] dark:text-[#22C55E]" : idx === 1 ? "bg-[#0F56B3]/10 text-[#0F56B3] dark:text-blue-400" : "bg-[#2563EB]/10 text-[#2563EB] dark:text-blue-400";
              const textCol = idx === 0 ? colorHex : undefined;
              
              return (
                <div key={idx} className="bg-card border border-border p-6 rounded-2xl shadow-sm flex items-start space-x-4">
                  <div className={`${bgClass} p-3 rounded-xl shrink-0`}>
                    <Icon size={20} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-foreground">{domain.name}</h4>
                    <p className="text-xs text-muted-foreground">{domain.description}</p>
                    <div className="text-xs font-bold pt-1" style={{ color: textCol || "var(--accent)" }}>Avg Pay: {domain.pay}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <Footer />

      <ResumeUploadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
