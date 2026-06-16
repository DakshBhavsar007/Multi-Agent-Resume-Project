import React from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Layers, Search, Plus, Building } from 'lucide-react';
import { sessionsAPI } from '../lib/api';

export default function SessionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortFilter, setSortFilter] = useState("Newest");

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-charcoal">Recruitment Sessions</h1>
        <Link to="/dashboard/sessions/new">
          <button className="bg-accent hover:bg-[#A06B10] text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2">
            <Plus size={18} />
            New Session
          </button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 my-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search sessions..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border-[1.5px] border-gray-200 rounded-lg text-sm focus:border-accent focus:outline-none transition-colors"
          />
        </div>
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border-[1.5px] border-gray-200 rounded-lg px-4 py-2 text-sm text-charcoal bg-white focus:outline-none focus:border-accent"
        >
          <option>All</option>
          <option>Active</option>
          <option>Completed</option>
          <option>Archived</option>
        </select>
        <select 
          value={sortFilter}
          onChange={(e) => setSortFilter(e.target.value)}
          className="border-[1.5px] border-gray-200 rounded-lg px-4 py-2 text-sm text-charcoal bg-white focus:outline-none focus:border-accent"
        >
          <option>Newest</option>
          <option>Most Candidates</option>
        </select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-[200px] shimmer rounded-xl hover:shadow-md transition"></div>
          ))}
        </div>
      ) : filteredSessions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSessions.map((session) => (
            <div key={session.id} className="bg-white outline outline-1 outline-transparent border border-gray-200 rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-md transition flex flex-col justify-between h-full">
              <div>
                <h3 className="text-lg font-bold text-charcoal mb-0.5 flex items-center gap-2">
                  <Building size={18} className="text-[#C8871A] shrink-0" /> {session.job_title || 'Untitled Role'}
                </h3>
                <p className="text-xs text-gray-400 mb-4 ml-7">{session.name || 'Draft Name'}</p>
                
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-charcoal font-medium">Rounds:</span>
                  <span className="text-gray-400 font-mono text-[10px] tracking-wider relative top-0.5">
                    {session.rounds?.map(() => '●').join('') || '●●●'}
                  </span>
                  <span className="text-sm text-muted ml-0.5 line-clamp-1 flex-1">
                    {session.rounds?.map(r => r.name).join(' > ') || 'Screening > Tech > HR'}
                  </span>
                </div>

                <div className="flex gap-3 mb-6">
                  <div className="border border-gray-100 bg-gray-50/50 rounded-lg p-2.5 text-center flex-1">
                    <div className="font-bold text-[22px] text-charcoal leading-none">{session.total_candidates || 0}</div>
                    <div className="text-[10px] font-semibold text-gray-500 uppercase mt-1">Total</div>
                  </div>
                  <div className="border border-green-50 bg-green-50/20 rounded-lg p-2.5 text-center flex-1">
                    <div className="font-bold text-[22px] text-[#22C55E] leading-none">{session.hired || 0}</div>
                    <div className="text-[10px] font-semibold text-gray-500 uppercase mt-1">Hired</div>
                  </div>
                  <div className="border border-red-50 bg-red-50/20 rounded-lg p-2.5 text-center flex-1">
                    <div className="font-bold text-[22px] text-[#EF4444] leading-none">{session.rejected || 0}</div>
                    <div className="text-[10px] font-semibold text-gray-500 uppercase mt-1">Rejected</div>
                  </div>
                </div>
              </div>

              <div className="mt-auto">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-gray-500">
                    Created: {session.created_at ? new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                  </span>
                  <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                    <div className={`w-1.5 h-1.5 rounded-full ${session.status === 'archived' ? 'bg-gray-400' : 'bg-green-500'}`}></div>
                    <span className="text-[11px] font-bold text-charcoal capitalize">{session.status || 'Active'}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => navigate(`/dashboard/sessions/${session.id}`)}
                    className="flex-[2] bg-accent hover:bg-[#A06B10] text-white py-2 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Open Session
                  </button>
                  <button 
                    onClick={async () => {
                      if (window.confirm(`Archive session "${session.job_title || session.name}"?`)) {
                        try {
                          await sessionsAPI.delete(session.id, { delete_candidates: false });
                          queryClient.invalidateQueries({ queryKey: ['sessions'] });
                          toast.success('Session archived');
                        } catch(e) { toast.error(e.message); }
                      }
                    }}
                    className="flex-1 border border-gray-200 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600 text-charcoal py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Archive
                  </button>
                  <button 
                    onClick={async () => {
                      if (window.confirm(`Permanently delete session "${session.job_title || session.name}"? This will delete all candidates and cannot be undone.`)) {
                        try {
                          await sessionsAPI.delete(session.id, { delete_candidates: true, hard_delete: true });
                          queryClient.invalidateQueries({ queryKey: ['sessions'] });
                          toast.success('Session deleted');
                        } catch(e) { toast.error(e.message); }
                      }
                    }}
                    className="flex-1 border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-charcoal py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-gray-100 min-h-[400px]">
          <div className="text-accent mb-4">
            <Layers size={64} />
          </div>
          <h2 className="text-xl font-bold text-charcoal mb-2">No sessions yet</h2>
          <p className="text-muted mb-8 text-center max-w-sm">Create your first recruitment drive to start parsing resumes intelligently.</p>
          <Link to="/dashboard/sessions/new" className="bg-accent hover:bg-[#A06B10] text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow flex items-center gap-2">
            <Plus size={18} />
            Create Session
          </Link>
        </div>
      )}
    </div>
  );
}
