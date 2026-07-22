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
  Sun,
  MessageSquare,
  Send,
  ShieldCheck,
  X
} from 'lucide-react';
import { useAdminAuthStore } from '../../stores/adminAuthStore';
import { API_HOST } from '../../lib/api';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const adminAuth = useAdminAuthStore();
  
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
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  // Sync theme with document.documentElement.classList
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Toggle Dark / Light Mode
  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const getAdminToken = () => {
    return adminAuth.adminToken || localStorage.getItem('admin_jwt') || '';
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = getAdminToken();
      const response = await fetch(`${API_HOST}/api/v1/admin/dashboard`, {
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
        if (response.status === 401 || response.status === 403) {
          adminAuth.clearAdminAuth();
          navigate('/admin/login');
        }
      }
    } catch (err) {
      toast.error('Connection error: Failed to reach admin backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchDashboardData();
  }, [navigate]);

  const handleBanToggle = async (userType, userId, currentBanStatus) => {
    const action = currentBanStatus ? 'unban' : 'ban';
    try {
      const token = getAdminToken();
      const response = await fetch(`${API_HOST}/api/v1/admin/users/ban`, {
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
      const token = getAdminToken();
      const response = await fetch(`${API_HOST}/api/v1/admin/tickets/resolve`, {
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

  const handleAdminReply = async (ticketId, messageText) => {
    if (!messageText.trim()) return;
    setReplying(true);
    try {
      const token = getAdminToken();
      const response = await fetch(`${API_HOST}/api/v1/admin/tickets/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ticket_id: ticketId, message: messageText.trim() })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Admin reply sent to user!');
        setAdminReplyText('');
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket(prev => ({
            ...prev,
            messages: data.data.messages || prev.messages
          }));
        }
        setTickets(tickets.map(t => t.id === ticketId ? { ...t, messages: data.data.messages || t.messages } : t));
      } else {
        toast.error(data.error || 'Failed to send reply');
      }
    } catch (err) {
      toast.error('Network error while sending reply');
    } finally {
      setReplying(false);
    }
  };

  const handleAdminUnbanFromTicket = async (ticketId) => {
    try {
      const token = getAdminToken();
      const response = await fetch(`${API_HOST}/api/v1/admin/tickets/unban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ticket_id: ticketId })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('User account unbanned & ticket marked resolved!');
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket(prev => ({
            ...prev,
            status: 'resolved',
            is_user_banned: false,
            messages: data.data.messages || prev.messages
          }));
        }
        setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: 'resolved', is_user_banned: false, messages: data.data.messages || t.messages } : t));
        fetchDashboardData();
      } else {
        toast.error(data.error || 'Failed to unban user');
      }
    } catch (err) {
      toast.error('Network error while unbanning user');
    }
  };

  const handleLogout = () => {
    adminAuth.clearAdminAuth();
    toast.success('Logged out from admin panel');
    navigate('/admin/login');
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 font-sans flex flex-col transition-colors duration-200">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-[#0d0d11]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 dark:bg-zinc-100 flex items-center justify-center shadow-md">
            <span className="text-white dark:text-zinc-900 font-extrabold text-lg">B</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Between AI Control Deck</h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">System Administrator</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-400 dark:hover:text-white transition shadow-sm"
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          <div className="h-5 w-[1px] bg-slate-200 dark:bg-zinc-800" />
          
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboardData}
              className="px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-900/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 font-semibold text-xs transition flex items-center gap-1.5 shadow-sm"
              title="Refresh Database"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh DB</span>
            </button>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">Admin Account</p>
              <p className="text-xs text-slate-500 dark:text-zinc-500">admin@between.com</p>
            </div>
            <button 
              onClick={handleLogout} 
              className="p-2 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 dark:bg-red-950/40 dark:border-red-900/60 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 dark:hover:text-white transition"
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
          <div className="bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-zinc-800/80 rounded-xl p-5 flex items-center justify-between shadow-sm dark:shadow-lg transition-colors">
            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium tracking-wider uppercase">Job Seekers</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{stats.total_seekers}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-900 flex items-center justify-center border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-zinc-800/80 rounded-xl p-5 flex items-center justify-between shadow-sm dark:shadow-lg transition-colors">
            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium tracking-wider uppercase">Recruiters</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{stats.total_recruiters}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-900 flex items-center justify-center border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400">
              <Briefcase className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-zinc-800/80 rounded-xl p-5 flex items-center justify-between shadow-sm dark:shadow-lg transition-colors">
            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium tracking-wider uppercase">Active Sessions</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{stats.total_sessions}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-900 flex items-center justify-center border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-zinc-800/80 rounded-xl p-5 flex items-center justify-between shadow-sm dark:shadow-lg transition-colors">
            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium tracking-wider uppercase">Open Tickets</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{stats.open_tickets}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-900 flex items-center justify-center border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400">
              <Mail className="w-6 h-6" />
            </div>
          </div>
        </section>

        {/* Tabs and Controls */}
        <section className="bg-white dark:bg-[#121217] border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm dark:shadow-xl flex flex-col gap-6 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-zinc-800/60 pb-6">
            <div className="flex gap-2 p-1 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 self-start">
              <button 
                onClick={() => { setActiveTab('seekers'); setSearchQuery(''); }}
                className={`px-4 py-2 rounded-lg text-sm transition ${activeTab === 'seekers' ? 'bg-white text-slate-900 dark:bg-zinc-100 dark:text-zinc-950 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium'}`}
              >
                Job Seekers
              </button>
              <button 
                onClick={() => { setActiveTab('recruiters'); setSearchQuery(''); }}
                className={`px-4 py-2 rounded-lg text-sm transition ${activeTab === 'recruiters' ? 'bg-white text-slate-900 dark:bg-zinc-100 dark:text-zinc-950 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium'}`}
              >
                Recruiters
              </button>
              <button 
                onClick={() => { setActiveTab('tickets'); setSearchQuery(''); }}
                className={`px-4 py-2 rounded-lg text-sm transition ${activeTab === 'tickets' ? 'bg-white text-slate-900 dark:bg-zinc-100 dark:text-zinc-950 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium'}`}
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
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                <Search className="w-4 h-4" />
              </span>
              <input 
                type="text" 
                placeholder={`Search ${activeTab}...`} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-700 transition"
              />
            </div>
          </div>

          {/* Table / List View */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-8 h-8 rounded-full border-2 border-t-slate-600 dark:border-t-zinc-400 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
              <p className="text-slate-500 dark:text-zinc-500 text-sm font-medium">Fetching database records...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl">
              <Info className="w-10 h-10 text-slate-400 dark:text-zinc-600 mx-auto mb-3" />
              <h4 className="text-slate-600 dark:text-zinc-400 font-semibold text-sm">No records found</h4>
              <p className="text-slate-400 dark:text-zinc-600 text-xs mt-1">Try tweaking your search filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-zinc-800/80 text-slate-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider bg-slate-50/50 dark:bg-transparent">
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
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/40 text-sm">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/30 transition duration-150">
                      {activeTab === 'tickets' ? (
                        <>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-slate-900 dark:text-zinc-200">{item.name}</div>
                            <div className="text-xs text-slate-500 dark:text-zinc-500">{item.email}</div>
                          </td>
                          <td className="py-4 px-4 text-slate-700 dark:text-zinc-300 font-medium">{item.subject}</td>
                          <td className="py-4 px-4 max-w-xs truncate text-slate-500 dark:text-zinc-400" title={item.message}>
                            {item.message}
                          </td>
                          <td className="py-4 px-4">
                            {item.status === 'open' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-400">
                                <AlertTriangle className="w-3 h-3" /> Open
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-400">
                                <CheckCircle className="w-3 h-3" /> Resolved
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedTicket(item)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1 shadow-sm"
                            >
                              <MessageSquare size={13} /> Chat / Reply
                            </button>

                            {item.is_user_banned && (
                              <button
                                onClick={() => handleAdminUnbanFromTicket(item.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
                              >
                                Unban User
                              </button>
                            )}

                            {item.status === 'open' && (
                              <button 
                                onClick={() => handleResolveTicket(item.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                              >
                                Resolve
                              </button>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-slate-900 dark:text-zinc-200">{item.name}</div>
                            <div className="text-xs text-slate-500 dark:text-zinc-500 font-mono">ID: {item.id.slice(0,8)}</div>
                          </td>
                          <td className="py-4 px-4 text-slate-700 dark:text-zinc-300 font-mono">{item.email}</td>
                          <td className="py-4 px-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                              item.tier === 'premium' || item.tier === 'business' || item.tier === 'enterprise' 
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900' 
                                : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                            }`}>
                              {item.tier}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            {item.is_banned ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/60 dark:border-red-900 dark:text-red-400 text-xs font-semibold">
                                <ShieldAlert className="w-3 h-3" /> Banned
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-900 dark:text-emerald-400 text-xs font-semibold">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button 
                              onClick={() => handleBanToggle(activeTab === 'seekers' ? 'seeker' : 'recruiter', item.id, item.is_banned)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                                item.is_banned 
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-400 dark:hover:bg-emerald-900/60' 
                                  : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-900/60'
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

      {/* ADMIN TICKET LIVE CHAT & UNBAN MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl h-[650px] flex flex-col justify-between shadow-2xl overflow-hidden text-slate-100">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white">{selectedTicket.subject}</h3>
                  {selectedTicket.is_user_banned ? (
                    <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold px-2 py-0.5 rounded">
                      User Banned
                    </span>
                  ) : (
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded">
                      Active User
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  User: <strong className="text-slate-200">{selectedTicket.name}</strong> ({selectedTicket.email}) · Ticket #{selectedTicket.id.slice(0, 8)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    await fetchDashboardData();
                    const updated = tickets.find(t => t.id === selectedTicket.id);
                    if (updated) setSelectedTicket(updated);
                    toast.success("Chat thread refreshed!");
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1 transition border border-slate-700"
                  title="Refresh Chat"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh Chat
                </button>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages Thread Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/40 text-xs">
              {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                selectedTicket.messages.map((m, idx) => {
                  const isAdmin = m.sender === "admin";
                  const isSystem = m.sender === "system";

                  if (isSystem) {
                    return (
                      <div key={idx} className="flex justify-center my-2">
                        <div className="bg-emerald-950/80 border border-emerald-600/40 text-emerald-300 text-[11px] font-semibold px-3 py-1.5 rounded-full shadow flex items-center gap-2">
                          <ShieldCheck size={14} className="text-emerald-400" />
                          <span>{m.text}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                        <span className="font-bold text-slate-300 flex items-center gap-1">
                          {isAdmin ? (
                            <>
                              <ShieldCheck size={12} className="text-blue-400" /> Admin Support
                            </>
                          ) : (
                            m.sender_name || "User"
                          )}
                        </span>
                        <span>·</span>
                        <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        className={`max-w-[80%] p-3 rounded-xl text-xs leading-relaxed ${
                          isAdmin
                            ? "bg-blue-600 text-white rounded-br-none shadow-md"
                            : "bg-slate-800 border border-slate-700 text-slate-100 rounded-bl-none shadow-md"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.text}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-300">
                  <p className="font-semibold">{selectedTicket.message}</p>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions & Reply Box */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 space-y-3">
              {selectedTicket.is_user_banned && (
                <div className="flex items-center justify-between bg-red-950/40 border border-red-900/60 p-3 rounded-xl">
                  <div className="text-xs">
                    <span className="font-bold text-red-300 block">User is currently BANNED</span>
                    <span className="text-[11px] text-red-400">Clicking unban will restore account access and mark ticket resolved.</span>
                  </div>
                  <button
                    onClick={() => handleAdminUnbanFromTicket(selectedTicket.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-1 shrink-0"
                  >
                    <ShieldCheck size={14} /> Unban User Account
                  </button>
                </div>
              )}

              {selectedTicket.status === "resolved" ? (
                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl text-center text-xs text-slate-400 flex items-center justify-center gap-2 shadow-inner">
                  <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                  <span>This ticket is marked as <strong className="text-emerald-400">Resolved</strong>. Chat is closed for both Admin and User (Read-Only).</span>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAdminReply(selectedTicket.id, adminReplyText);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={adminReplyText}
                    onChange={(e) => setAdminReplyText(e.target.value)}
                    placeholder="Type an official admin response to user..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                  <button
                    type="submit"
                    disabled={replying || !adminReplyText.trim()}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 shrink-0"
                  >
                    <Send size={14} /> Send Reply
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-zinc-900 py-6 text-center text-xs text-slate-400 dark:text-zinc-600 font-mono mt-auto bg-white/50 dark:bg-transparent">
        &copy; 2026 Between AI. Dedicated System Console. All activities logged.
      </footer>
    </div>
  );
}
