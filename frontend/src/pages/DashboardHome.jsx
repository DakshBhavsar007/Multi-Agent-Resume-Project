import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layers, Users, Target, Activity, Brain } from 'lucide-react';
import { sessionsAPI, authAPI } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';

export default function DashboardHome() {
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
  // Calculate total candidates from sessions
  const totalCandidates = sessions.reduce((acc, s) => acc + (s.total_candidates || 0), 0);
  
  const activeSessions = sessions.filter(s => s.status === "active").length;
  const completedSessions = sessions.filter(s => s.status === "completed").length;
  
  // Last 14 days chart data (sessions created)
  const chartData = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const dStart = new Date(d);
    dStart.setHours(0,0,0,0);
    const dEnd = new Date(d);
    dEnd.setHours(23,59,59,999);
    
    const sessionsToday = sessions.filter(s => {
      if (!s.created_at) return false;
      const sDate = new Date(s.created_at);
      return sDate >= dStart && sDate <= dEnd;
    }).length;

    chartData.push({
      date: dateStr,
      sessions: sessionsToday
    });
  }

  if (sessionsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-20 shimmer rounded-xl w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-32 shimmer rounded-xl"></div>
          <div className="h-32 shimmer rounded-xl"></div>
          <div className="h-32 shimmer rounded-xl"></div>
          <div className="h-32 shimmer rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!sessionsLoading && sessions.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Dashboard</h1>
          <p className="text-muted mt-1">{getGreeting()}, {company?.name}</p>
        </div>
        
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-gray-100 min-h-[400px]">
          <Brain size={48} className="text-gray-300 mb-6" />
          <h2 className="text-xl font-bold text-charcoal mb-2">No sessions yet</h2>
          <p className="text-muted mb-8 text-center max-w-sm">Create your first recruitment session to get started with AI-powered candidate analysis.</p>
          <Link to="/dashboard/sessions/new" className="bg-accent hover:bg-accent-dark text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow">
            Create Session
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Dashboard</h1>
        <p className="text-muted mt-1">{getGreeting()}, {company?.name}</p>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-50 rounded-lg text-accent">
              <Layers size={20} />
            </div>
            <span className="text-sm text-gray-500 font-medium">Total Sessions</span>
          </div>
          <div className="text-[28px] font-bold text-charcoal">{totalSessions}</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-50 rounded-lg text-accent">
              <Users size={20} />
            </div>
            <span className="text-sm text-gray-500 font-medium">Total Candidates</span>
          </div>
          <div className="text-[28px] font-bold text-charcoal">{totalCandidates}</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-50 rounded-lg text-accent">
              <Activity size={20} />
            </div>
            <span className="text-sm text-gray-500 font-medium">Active Sessions</span>
          </div>
          <div className="text-[28px] font-bold text-[#22C55E]">{activeSessions}</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-50 rounded-lg text-accent">
              <Target size={20} />
            </div>
            <span className="text-sm text-gray-500 font-medium">Completed Sessions</span>
          </div>
          <div className="text-[28px] font-bold text-charcoal">{completedSessions}</div>
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Chart */}
        <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <h3 className="text-lg font-semibold text-charcoal mb-6">Sessions Created — Last 14 Days</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid stroke="#F3F4F6" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dx={-10} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#2A2A2A', fontWeight: 600 }}
                />
                <Line type="monotone" dataKey="sessions" stroke="#C8871A" strokeWidth={2} dot={{ fill: '#C8871A', r: 4 }} activeDot={{ r: 6, fill: '#C8871A' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col">
          <h3 className="text-lg font-semibold text-charcoal mb-4">Recent Sessions</h3>
          <div className="flex-1 space-y-4">
            {sessions.slice(0, 5).map((session, i) => (
              <div key={session.id || i} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                <div>
                  <p className="font-bold text-[14px] text-charcoal">{session.name || `Session ${i + 1}`}</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">{session.job_title || 'Software Engineer'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-orange-50 text-accent font-semibold px-2.5 py-1 rounded-[6px] text-xs">
                    {session.total_candidates || 0} cands
                  </span>
                  <span className={`w-2 h-2 rounded-full ${session.status === 'archived' ? 'bg-gray-400' : 'bg-green-500'}`}></span>
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-muted text-sm text-center py-8">No recent sessions</p>
            )}
          </div>
          <Link to="/dashboard/sessions" className="text-accent font-medium text-sm text-center mt-4 pt-4 border-t border-gray-100 hover:text-accent-dark transition-colors inline-block">
            View All Sessions &rarr;
          </Link>
        </div>

      </div>
    </div>
  );
}
