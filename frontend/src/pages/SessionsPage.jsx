import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Building, Search, Plus, MoreVertical, Archive, Trash2, FolderOpen, ArrowUpDown } from 'lucide-react';
import { sessionsAPI } from '../lib/api';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function SessionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q !== null && q !== undefined) {
      setSearchTerm(q);
    }
  }, [location.search]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortFilter, setSortFilter] = useState("Newest");
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [draftConfirmSession, setDraftConfirmSession] = useState(null);
  const menuRef = useRef(null);

  const handleToggleStatus = async (session, targetStatus) => {
    setActiveMenuId(null);
    if (targetStatus === "draft" && (session.total_candidates || session.candidate_count || 0) > 0) {
      setDraftConfirmSession(session);
      return;
    }
    await executeStatusChange(session.id, targetStatus);
  };

  const executeStatusChange = async (sessionId, targetStatus) => {
    try {
      await sessionsAPI.update(sessionId, { status: targetStatus });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success(`Session status updated to ${targetStatus}`);
    } catch (err) {
      toast.error(err.message || "Failed to update session status");
    } finally {
      setDraftConfirmSession(null);
    }
  };

  // Click outside to close dropdown menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionsAPI.list()
  });

  const getFilteredSessions = () => {
    if (!sessions) return [];
    let result = [...sessions];

    if (searchTerm) {
      result = result.filter(s => 
        (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
        (s.job_title || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== "All") {
      result = result.filter(s => (s.status || "Active").toLowerCase() === statusFilter.toLowerCase());
    }

    if (sortFilter === "Newest") {
      result.sort((a, b) => new Date(b.created_at || new Date()) - new Date(a.created_at || new Date()));
    } else if (sortFilter === "Most Candidates") {
      result.sort((a, b) => (b.total_candidates || 0) - (a.total_candidates || 0));
    }

    return result;
  };

  const filteredSessions = getFilteredSessions();

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return { dot: 'bg-blue-500', text: 'text-blue-600 bg-blue-50/50 border-blue-100', label: 'Completed' };
      case 'draft':
        return { dot: 'bg-gray-400', text: 'text-gray-500 bg-gray-50 border-gray-100', label: 'Draft' };
      default:
        return { dot: 'bg-[#22C55E]', text: 'text-[#22C55E] bg-[#22C55E]/5 border-[#22C55E]/10', label: 'Active' };
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-24 relative">
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-3xl font-black text-charcoal tracking-tight">Recruitment sessions</h1>
        <p className="text-gray-500 font-medium mt-1">Manage all your hiring rounds in one place.</p>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:max-w-xs shrink-0 z-20">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search sessions" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none transition-colors bg-white shadow-sm font-medium"
          />
          {showSuggestions && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto py-1">
              {(() => {
                const filteredList = Array.from(new Set(
                  (sessions || [])
                    .filter(s => 
                      !searchTerm || 
                      (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                      (s.job_title || "").toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .flatMap(s => [s.job_title, s.name])
                    .filter(Boolean)
                )).slice(0, 5);
                return filteredList.length > 0 ? (
                  filteredList.map((sug, idx) => (
                    <button
                      key={idx}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearchTerm(sug);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-gray-50 text-charcoal truncate"
                    >
                      {sug}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-2 text-xs text-muted-foreground">No suggestions found</div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Tab Segments & Sort */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex p-1 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-gray-200/80 dark:border-zinc-800/80 rounded-xl shadow-sm">
            {['All', 'Active', 'Completed', 'Draft'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  statusFilter === tab 
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' 
                    : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative">
            <select
              value={sortFilter}
              onChange={(e) => setSortFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 border border-gray-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-xl text-xs font-bold text-gray-700 dark:text-zinc-300 focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer"
            >
              <option value="Newest">Newest</option>
              <option value="Most Candidates">Most Candidates</option>
            </select>
            <ArrowUpDown size={12} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* SESSIONS GRID */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between h-48">
              <div className="flex items-center gap-3">
                <LoadingSkeleton width="40px" height="40px" borderRadius="12px" className="shrink-0" />
                <div className="space-y-2 flex-1">
                  <LoadingSkeleton width="70%" height="14px" />
                  <LoadingSkeleton width="45%" height="10px" />
                </div>
              </div>
              <LoadingSkeleton width="60px" height="16px" borderRadius="9999px" className="mt-3" />
              <div className="grid grid-cols-3 gap-2 mt-4">
                <LoadingSkeleton width="100%" height="32px" borderRadius="10px" />
                <LoadingSkeleton width="100%" height="32px" borderRadius="10px" />
                <LoadingSkeleton width="100%" height="32px" borderRadius="10px" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredSessions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSessions.map((session) => {
            const style = getStatusStyle(session.status);
            return (
              <div 
                key={session.id} 
                className="bg-white border border-gray-100 hover:border-gray-200 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between h-48 cursor-pointer relative group"
                onClick={() => navigate(`/dashboard/sessions/${session.id}`)}
              >
                {/* CARD HEADER */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-accent flex items-center justify-center shrink-0">
                      <Building size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-charcoal leading-snug group-hover:text-accent transition-colors truncate max-w-[150px]">
                        {session.job_title || 'Untitled Role'}
                      </h3>
                      <p className="text-[11px] text-gray-400 font-medium truncate max-w-[150px] mt-0.5">
                        {session.name || 'Q4 hiring • 3 rounds'}
                      </p>
                    </div>
                  </div>

                  {/* Actions Dropdown */}
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => setActiveMenuId(activeMenuId === session.id ? null : session.id)}
                      className="p-1 text-gray-400 hover:text-charcoal hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {activeMenuId === session.id && (
                      <div 
                        ref={menuRef}
                        className="absolute right-0 mt-1.5 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden py-1"
                      >
                        <button 
                          onClick={() => {
                            setActiveMenuId(null);
                            navigate(`/dashboard/sessions/${session.id}`);
                          }}
                          className="w-full px-4 py-2 text-left text-xs font-semibold text-charcoal hover:bg-gray-50 flex items-center gap-2"
                        >
                          <FolderOpen size={13} className="text-gray-400" />
                          Open Session
                        </button>
                        {session.status === "active" ? (
                          <button 
                            onClick={() => handleToggleStatus(session, "draft")}
                            className="w-full px-4 py-2 text-left text-xs font-semibold text-amber-600 hover:bg-amber-50 flex items-center gap-2"
                          >
                            <Archive size={13} className="text-amber-500" />
                            Move to Draft
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleToggleStatus(session, "active")}
                            className="w-full px-4 py-2 text-left text-xs font-semibold text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"
                          >
                            <FolderOpen size={13} className="text-emerald-500" />
                            Publish Active
                          </button>
                        )}
                        <button 
                          onClick={async () => {
                            setActiveMenuId(null);
                            if (window.confirm(`Archive session "${session.job_title || session.name}"?`)) {
                              try {
                                await sessionsAPI.delete(session.id, { delete_candidates: false });
                                queryClient.invalidateQueries({ queryKey: ['sessions'] });
                                toast.success('Session archived');
                              } catch(e) { toast.error(e.message); }
                            }
                          }}
                          className="w-full px-4 py-2 text-left text-xs font-semibold text-charcoal hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Archive size={13} className="text-gray-400" />
                          Archive
                        </button>
                        <button 
                          onClick={async () => {
                            setActiveMenuId(null);
                            if (window.confirm(`Permanently delete session "${session.job_title || session.name}"? This will delete all candidates.`)) {
                              try {
                                await sessionsAPI.delete(session.id, { delete_candidates: true, hard_delete: true });
                                queryClient.invalidateQueries({ queryKey: ['sessions'] });
                                toast.success('Session deleted');
                              } catch(e) { toast.error(e.message); }
                            }
                          }}
                          className="w-full px-4 py-2 text-left text-xs font-semibold text-red-500 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 size={13} className="text-red-400" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* STATUS BADGE */}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${style.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
                    {style.label}
                  </span>
                </div>

                {/* STATS FOOTER */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100 text-center">
                  <div>
                    <div className="text-base font-bold text-charcoal">{session.total_candidates || 0}</div>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Applied</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-[#22C55E]">{session.hired || 0}</div>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Hired</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-[#EF4444]">{session.rejected || 0}</div>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Rejected</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 min-h-[350px]">
          <Building size={48} className="text-gray-300 mb-4" />
          <h2 className="text-lg font-bold text-charcoal mb-1">No sessions yet</h2>
          <p className="text-sm font-medium text-gray-400 mb-6 text-center max-w-sm">
            Create your first recruitment drive to start parsing resumes intelligently.
          </p>
          <button 
            onClick={() => navigate('/dashboard/sessions/new')}
            className="bg-accent hover:bg-[#1D4ED8] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow"
          >
            Create Session
          </button>
        </div>
      )}

      {/* DRAFT CONVERT CONFIRMATION MODAL */}
      {draftConfirmSession && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 bg-amber-50 rounded-xl">
                <Archive size={22} />
              </div>
              <h3 className="text-lg font-bold text-charcoal">Convert Session to Draft?</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              This session <strong>"{draftConfirmSession.job_title || draftConfirmSession.name}"</strong> currently has <strong>{draftConfirmSession.total_candidates || draftConfirmSession.candidate_count || 0} active candidate(s)</strong>.
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
              Moving to Draft will unpublish the job listing and temporarily pause candidate assessment links until republished.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDraftConfirmSession(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 hover:bg-gray-50 text-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => executeStatusChange(draftConfirmSession.id, "draft")}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow transition"
              >
                Confirm & Move to Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACTION BUTTON */}
      <button 
        onClick={() => navigate('/dashboard/sessions/new')}
        className="fixed bottom-8 right-8 z-50 bg-accent hover:bg-[#1D4ED8] text-white shadow-xl hover:shadow-2xl transition-all rounded-full px-5 py-3 flex items-center gap-2 font-bold active:scale-95 text-sm"
      >
        <Plus size={18} />
        <span>Create</span>
      </button>
    </div>
  );
}
