import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  Users, 
  Briefcase, 
  Mail, 
  ShieldAlert, 
  LogOut, 
  Search, 
  CheckCircle, 
  AlertTriangle,
  Info,
  Layers,
  Moon,
  Sun
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const recruiterAuth = useAuthStore();
  
  const [activeTab, setActiveTab] = useState('seekers');
  const [stats, setStats] = useState({
    total_seekers: 0,
    total_recruiters: 0,
    total_sessions: 0,
    open_tickets: 0
  });
  const [seekers, setSeekers] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [tickets, setTickets] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  // Toggle Dark Mode
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('vish_jwt');
      const response = await fetch('/api/v1/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const resData = await response.json();
      if (resData.success) {
        setStats(resData.data.stats);
        setSeekers(resData.data.seekers);
        setRecruiters(resData.data.recruiters);
        setTickets(resData.data.tickets);
      } else {
        toast.error(resData.error || 'Failed to load dashboard data');
        // If unauthorized, redirect
        if (response.status === 401 || response.status === 403) {
          navigate('/login');
        }
      }
    } catch (err) {
      toast.error('Connection error: Failed to reach admin backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if token contains admin claims
    const token = localStorage.getItem('vish_jwt');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchDashboardData();
  }, [navigate]);

  const handleBanToggle = async (userType, userId, currentBanStatus) => {
    const action = currentBanStatus ? 'unban' : 'ban';
    try {
      const token = localStorage.getItem('vish_jwt');
      const response = await fetch('/api/v1/admin/users/ban', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: userType,
          id: userId,
          action: action
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Successfully ${action}ned user!`);
        // Update local list
        if (userType === 'seeker') {
          setSeekers(seekers.map(s => s.id === userId ? { ...s, is_banned: !currentBanStatus } : s));
          setStats(prev => ({
            ...prev,
            total_seekers: prev.total_seekers
          }));
        } else {
          setRecruiters(recruiters.map(r => r.id === userId ? { ...r, is_banned: !currentBanStatus } : r));
        }
      } else {
        toast.error(data.error || 'Failed to toggle ban status');
      }
    } catch (err) {
      toast.error('Network error during user moderation');
    }
  };

  const handleResolveTicket = async (ticketId) => {
    try {
      const token = localStorage.getItem('vish_jwt');
      const response = await fetch('/api/v1/admin/tickets/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: ticketId })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Ticket marked as resolved');
        setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: 'resolved' } : t));
        setStats(prev => ({
          ...prev,
          open_tickets: Math.max(0, prev.open_tickets - 1)
        }));
      } else {
        toast.error(data.error || 'Failed to resolve ticket');
      }
    } catch (err) {
      toast.error('Network error during ticket resolution');
    }
  };

  const handleLogout = () => {
    recruiterAuth.clearAuth();
    toast.success('Logged out from admin panel');
    navigate('/login');
  };

  // Filter items based on search query
  const getFilteredItems = () => {
    const query = searchQuery.toLowerCase();
    if (activeTab === 'seekers') {
      return seekers.filter(s => s.name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query));
    }
    if (activeTab === 'recruiters') {
      return recruiters.filter(r => r.name.toLowerCase().includes(query) || r.email.toLowerCase().includes(query));
    }
    return tickets.filter(t => t.name.toLowerCase().includes(query) || t.subject.toLowerCase().includes(query) || t.email.toLowerCase().includes(query));
  };

  const filteredItems = getFilteredItems();

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans flex flex-col transition-colors duration-200 dark:bg-[#09090b] dark:text-zinc-100 light:bg-white light:text-zinc-900">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-[#0d0d11]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center shadow-md">
            <span className="text-zinc-900 font-extrabold text-lg">B</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Between AI Control Deck</h1>
            <p className="text-xs text-zinc-400 font-mono">System Administrator</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          <div className="h-5 w-[1px] bg-zinc-800" />
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-zinc-200">Admin Account</p>
              <p className="text-xs text-zinc-500">admin@between.com</p>
            </div>
            <button 
              onClick={handleLogout} 
              className="p-2 rounded-lg bg-red-950/40 border border-red-900/60 hover:bg-red-900/60 text-red-400 hover:text-white transition"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content wrapper */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto flex flex-col gap-8">
        
        {/* Stats Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#121217] border border-zinc-800/80 rounded-xl p-5 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-xs text-zinc-500 font-medium tracking-wider uppercase">Job Seekers</p>
              <h3 className="text-2xl font-bold mt-1 text-white">{stats.total_seekers}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800">
              <Users className="w-6 h-6 text-zinc-400" />
            </div>
          </div>

          <div className="bg-[#121217] border border-zinc-800/80 rounded-xl p-5 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-xs text-zinc-500 font-medium tracking-wider uppercase">Recruiters</p>
              <h3 className="text-2xl font-bold mt-1 text-white">{stats.total_recruiters}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800">
              <Briefcase className="w-6 h-6 text-zinc-400" />
            </div>
          </div>

          <div className="bg-[#121217] border border-zinc-800/80 rounded-xl p-5 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-xs text-zinc-500 font-medium tracking-wider uppercase">Active Sessions</p>
              <h3 className="text-2xl font-bold mt-1 text-white">{stats.total_sessions}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800">
              <Layers className="w-6 h-6 text-zinc-400" />
            </div>
          </div>

          <div className="bg-[#121217] border border-zinc-800/80 rounded-xl p-5 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-xs text-zinc-500 font-medium tracking-wider uppercase">Open Tickets</p>
              <h3 className="text-2xl font-bold mt-1 text-white">{stats.open_tickets}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800">
              <Mail className="w-6 h-6 text-zinc-400" />
            </div>
          </div>
        </section>

        {/* Tabs and Controls */}
        <section className="bg-[#121217] border border-zinc-800/80 rounded-2xl p-6 shadow-xl flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/60 pb-6">
            <div className="flex gap-2 p-1 rounded-xl bg-zinc-900 border border-zinc-800 self-start">
              <button 
                onClick={() => { setActiveTab('seekers'); setSearchQuery(''); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'seekers' ? 'bg-zinc-100 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                Job Seekers
              </button>
              <button 
                onClick={() => { setActiveTab('recruiters'); setSearchQuery(''); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'recruiters' ? 'bg-zinc-100 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                Recruiters
              </button>
              <button 
                onClick={() => { setActiveTab('tickets'); setSearchQuery(''); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'tickets' ? 'bg-zinc-100 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                Support Tickets
                {stats.open_tickets > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {stats.open_tickets}
                  </span>
                )}
              </button>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <Search className="w-4 h-4" />
              </span>
              <input 
                type="text" 
                placeholder={`Search ${activeTab}...`} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition"
              />
            </div>
          </div>

          {/* Table / List View */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-8 h-8 rounded-full border-2 border-t-zinc-400 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
              <p className="text-zinc-500 text-sm font-medium">Fetching database records...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-zinc-800 rounded-xl">
              <Info className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <h4 className="text-zinc-400 font-semibold text-sm">No records found</h4>
              <p className="text-zinc-600 text-xs mt-1">Try tweaking your search filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800/80 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                    {activeTab === 'tickets' ? (
                      <>
                        <th className="py-4 px-4">Ticket details</th>
                        <th className="py-4 px-4">Subject</th>
                        <th className="py-4 px-4">Message</th>
                        <th className="py-4 px-4">Status</th>
                        <th className="py-4 px-4 text-right">Action</th>
                      </>
                    ) : (
                      <>
                        <th className="py-4 px-4">User Details</th>
                        <th className="py-4 px-4">Email Address</th>
                        <th className="py-4 px-4">Pricing Tier</th>
                        <th className="py-4 px-4">Moderation Status</th>
                        <th className="py-4 px-4 text-right">Actions</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40 text-sm">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-900/30 transition duration-150">
                      {activeTab === 'tickets' ? (
                        <>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-zinc-200">{item.name}</div>
                            <div className="text-xs text-zinc-500">{item.email}</div>
                          </td>
                          <td className="py-4 px-4 text-zinc-300 font-medium">{item.subject}</td>
                          <td className="py-4 px-4 max-w-xs truncate text-zinc-400" title={item.message}>
                            {item.message}
                          </td>
                          <td className="py-4 px-4">
                            {item.status === 'open' ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold bg-amber-950/40 border border-amber-900/60 text-amber-400">
                                <AlertTriangle className="w-3 h-3" /> Open
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold bg-emerald-950/40 border border-emerald-900/60 text-emerald-400">
                                <CheckCircle className="w-3 h-3" /> Resolved
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right">
                            {item.status === 'open' && (
                              <button 
                                onClick={() => handleResolveTicket(item.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-100 hover:bg-white text-zinc-950 transition"
                              >
                                Mark Resolved
                              </button>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-zinc-200">{item.name}</div>
                            <div className="text-xs text-zinc-500 font-mono">ID: {item.id.slice(0,8)}</div>
                          </td>
                          <td className="py-4 px-4 text-zinc-300 font-mono">{item.email}</td>
                          <td className="py-4 px-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${item.tier === 'premium' || item.tier === 'business' || item.tier === 'enterprise' ? 'bg-indigo-950 text-indigo-300 border border-indigo-900' : 'bg-zinc-800 text-zinc-400'}`}>
                              {item.tier}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            {item.is_banned ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/60 border border-red-900 text-red-400 text-xs font-semibold">
                                <ShieldAlert className="w-3 h-3" /> Banned
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-900 text-emerald-400 text-xs font-semibold">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button 
                              onClick={() => handleBanToggle(activeTab === 'seekers' ? 'seeker' : 'recruiter', item.id, item.is_banned)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                                item.is_banned 
                                  ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-400 hover:bg-emerald-900/60' 
                                  : 'bg-red-950/40 border-red-900/60 text-red-400 hover:bg-red-900/60'
                              }`}
                            >
                              {item.is_banned ? 'Unban User' : 'Ban User'}
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-600 font-mono mt-auto">
        &copy; 2026 Between AI. Dedicated System Console. All activities logged.
      </footer>
    </div>
  );
}
