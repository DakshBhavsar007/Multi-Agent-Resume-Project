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
        <div className="h-20 bg-gray-100/50 animate-pulse rounded-xl w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="h-32 bg-gray-100/50 animate-pulse rounded-2xl"></div>
          <div className="h-32 bg-gray-100/50 animate-pulse rounded-2xl"></div>
          <div className="h-32 bg-gray-100/50 animate-pulse rounded-2xl"></div>
          <div className="h-32 bg-gray-100/50 animate-pulse rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-charcoal tracking-tight">Dashboard</h1>
          <p className="text-gray-500 font-medium mt-1">
            {getGreeting()}, {company?.name || 'Daksh'}. Here's your recruitment overview.
          </p>
        </div>
        <button 
          onClick={() => navigate('/dashboard/sessions/new')}
          className="flex items-center gap-2 bg-accent hover:bg-[#1D4ED8] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95 text-sm"
        >
          <Plus size={16} /> New session
        </button>
      </div>

      {/* STAT CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Sessions */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-accent flex items-center justify-center">
              <Layers size={20} />
            </div>
            <span className="text-[11px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
              +3 this week
            </span>
          </div>
          <div className="text-4xl font-extrabold text-charcoal tracking-tight leading-none mb-1">
            {totalSessions}
          </div>
          <span className="text-xs font-semibold text-gray-500">Total sessions</span>
        </div>

        {/* Card 2: Total Candidates */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
              <Users size={20} />
            </div>
            <span className="text-[11px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
              +18 today
            </span>
          </div>
          <div className="text-4xl font-extrabold text-charcoal tracking-tight leading-none mb-1">
            {totalCandidates}
          </div>
          <span className="text-xs font-semibold text-gray-500">Total candidates</span>
        </div>

        {/* Card 3: Active Sessions */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
              <Activity size={20} />
            </div>
            <span className="text-[11px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
              2 ending soon
            </span>
          </div>
          <div className="text-4xl font-extrabold text-charcoal tracking-tight leading-none mb-1">
            {activeSessions}
          </div>
          <span className="text-xs font-semibold text-gray-500">Active sessions</span>
        </div>

        {/* Card 4: Completed */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-[11px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
              75% hire rate
            </span>
          </div>
          <div className="text-4xl font-extrabold text-charcoal tracking-tight leading-none mb-1">
            {completedSessions}
          </div>
          <span className="text-xs font-semibold text-gray-500">Completed</span>
        </div>
      </div>

      {/* QUICK ACTIONS ROW */}
      <div className="space-y-4">
        <h3 className="text-md font-bold text-charcoal uppercase tracking-widest pl-1">Quick actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Action 1: Smart Analyzer */}
          <Link to="/dashboard/smart-analyzer" className="block group">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-all flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-accent flex items-center justify-center shrink-0 group-hover:bg-accent group-hover:text-white transition-colors">
                <Sparkles size={18} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-charcoal">Smart Analyzer</h4>
                <p className="text-xs text-gray-500 mt-0.5">Rank resumes against a job description with AI.</p>
              </div>
            </div>
          </Link>

          {/* Action 2: Fraud Detection */}
          <Link to="/dashboard/protection" className="block group">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-all flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-accent flex items-center justify-center shrink-0 group-hover:bg-accent group-hover:text-white transition-colors">
                <Shield size={18} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-charcoal">Fraud Detection</h4>
                <p className="text-xs text-gray-500 mt-0.5">Scan resumes and job posts for AI-generated content.</p>
              </div>
            </div>
          </Link>

          {/* Action 3: Sessions */}
          <Link to="/dashboard/sessions" className="block group">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-all flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-accent flex items-center justify-center shrink-0 group-hover:bg-accent group-hover:text-white transition-colors">
                <Layers size={18} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-charcoal">Sessions</h4>
                <p className="text-xs text-gray-500 mt-0.5">Manage hiring rounds and candidate pipelines.</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* RECENT ACTIVITY */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-md font-bold text-charcoal uppercase tracking-widest">Recent activity</h3>
          <Link to="/dashboard/sessions" className="text-xs font-bold text-accent hover:underline flex items-center gap-1">
            View all
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden divide-y divide-gray-100">
          {sessions.slice(0, 5).map((session, i) => (
            <div 
              key={session.id || i}
              onClick={() => navigate(`/dashboard/sessions/${session.id}`)}
              className="flex items-center justify-between p-4 hover:bg-gray-50/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-accent flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-charcoal">{session.job_title || 'Untitled Role'}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {session.total_candidates || 0} candidates • {session.rounds?.length || 3} rounds
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 font-medium">
                  Updated {session.created_at ? 'recently' : 'yesterday'}
                </span>
                <ArrowUpRight size={16} className="text-gray-300" />
              </div>
            </div>
          ))}

          {sessions.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm font-medium">
              No recent sessions found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
