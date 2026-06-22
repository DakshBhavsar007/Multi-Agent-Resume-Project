import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Layers, 
  Users, 
  Activity, 
  CheckCircle2, 
  Sparkles, 
  Shield, 
  FileText, 
  ArrowUpRight, 
  Plus 
} from 'lucide-react';
import { sessionsAPI } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export default function DashboardHome() {
  const navigate = useNavigate();
  const { company } = useAuthStore();

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions-all'],
    queryFn: () => sessionsAPI.list()
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const sessions = sessionsData || [];
  const totalSessions = sessions.length;
  const totalCandidates = sessions.reduce((acc, s) => acc + (s.total_candidates || 0), 0);
  const activeSessions = sessions.filter(s => s.status === "active").length;
  const completedSessions = sessions.filter(s => s.status === "completed").length;

  if (sessionsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-muted animate-pulse rounded-xl w-64"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-2xl border border-gray-200"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[22px] sm:text-[28px] text-charcoal">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            {getGreeting()}, {company?.name || 'Daksh'}. Here's your recruitment overview.
          </p>
        </div>
        <button 
          onClick={() => navigate('/dashboard/sessions/new')}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-accent text-white font-display font-medium text-sm shadow-sm hover:shadow-md transition"
        >
          <Plus size={18} /> New session
        </button>
      </header>

      {/* Stat cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Layers} label="Total sessions" value={totalSessions} trend="+3 this week" tone="primary" />
        <StatCard icon={Users} label="Total candidates" value={totalCandidates} trend="+18 today" tone="success" />
        <StatCard icon={Activity} label="Active sessions" value={activeSessions} trend="2 ending soon" tone="warning" />
        <StatCard icon={CheckCircle2} label="Completed" value={completedSessions} trend="75% hire rate" tone="muted" />
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="font-display text-lg text-charcoal mb-3">Quick actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction
            to="/dashboard/smart-analyzer"
            icon={Sparkles}
            title="Smart Analyzer"
            desc="Rank resumes against a job description with AI."
          />
          <QuickAction
            to="/dashboard/protection"
            icon={Shield}
            title="Fraud Detection"
            desc="Scan resumes and job posts for AI-generated content."
          />
          <QuickAction
            to="/dashboard/sessions"
            icon={Layers}
            title="Sessions"
            desc="Manage hiring rounds and candidate pipelines."
          />
        </div>
      </section>

      {/* Recent activity */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg text-charcoal">Recent activity</h2>
          <Link to="/dashboard/sessions" className="text-[#111111] text-sm font-medium hover:underline">View all</Link>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {sessions.slice(0, 5).map((session, i, arr) => (
            <div
              key={session.id || i}
              onClick={() => navigate(`/dashboard/sessions/${session.id}`)}
              className={`flex items-center gap-4 px-5 py-4 hover:bg-muted transition cursor-pointer ${i < arr.length - 1 ? "border-b border-gray-200" : ""}`}
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 text-[#111111] flex items-center justify-center">
                <FileText size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-[15px] text-charcoal truncate">{session.job_title || 'Untitled Session'}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {session.total_candidates || 0} candidates · {session.rounds?.length || 3} rounds
                </div>
              </div>
              <div className="text-xs text-gray-500 hidden sm:block">
                {session.created_at ? 'Updated recently' : 'Updated yesterday'}
              </div>
              <ArrowUpRight size={18} className="text-gray-500" />
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-sm">
              No sessions found. Create a new session to get started.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, trend, tone }) {
  const toneMap = {
    primary: "bg-gray-100 text-[#111111]",
    success: "bg-green-50 text-green-600",
    warning: "bg-amber-50 text-amber-600",
    muted: "bg-gray-50 text-gray-500",
  };
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-sm transition">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${toneMap[tone]}`}>
          <Icon size={18} />
        </div>
        <span className="text-xs text-gray-500">{trend}</span>
      </div>
      <div className="mt-5">
        <div className="font-display text-[32px] leading-none text-charcoal">{value}</div>
        <div className="text-sm text-gray-500 mt-2">{label}</div>
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, title, desc }) {
  return (
    <Link
      to={to}
      className="group bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-sm hover:border-accent/30 transition flex items-start gap-4"
    >
      <div className="w-11 h-11 rounded-xl bg-gray-100 text-[#111111] flex items-center justify-center shrink-0">
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <div className="font-display text-base text-charcoal group-hover:text-[#111111] transition">{title}</div>
        <div className="text-sm text-gray-500 mt-1">{desc}</div>
      </div>
    </Link>
  );
}
