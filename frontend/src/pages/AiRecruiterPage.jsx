import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, MessageSquareText, ChevronDown, Layers } from 'lucide-react';
import { sessionsAPI } from '../lib/api';
import ChatPanel from '../components/ChatPanel';

export default function AiRecruiterPage() {
  const [selectedSession, setSelectedSession] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions-list'],
    queryFn: () => sessionsAPI.list(),
  });

  const sessionList = Array.isArray(sessions) ? sessions : (sessions?.sessions || []);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#111111]">AI Recruiter</h1>
        <p className="text-gray-500 font-medium mt-1">Chat with AI to query, filter, and analyze candidates in any recruitment session.</p>
      </div>

      {/* Session Selector */}
      <div className="mb-6">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Select Session</label>
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(v => !v)}
            className="w-full max-w-md flex items-center justify-between gap-3 px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-[#111111] hover:border-gray-300 transition-colors shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Layers size={16} className="text-gray-400" />
              <span>{selectedSession ? (selectedSession.title || selectedSession.job_title || 'Untitled Session') : 'Choose a session...'}</span>
            </div>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 right-0 max-w-md mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg z-50 max-h-64 overflow-y-auto py-1">
              {isLoading ? (
                <div className="px-4 py-3 text-sm text-gray-400">Loading sessions...</div>
              ) : sessionList.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-400">No sessions found. Create one first.</div>
              ) : (
                sessionList.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedSession(s); setDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-3 ${selectedSession?.id === s.id ? 'bg-gray-50 font-bold text-[#111111]' : 'text-gray-700'}`}
                  >
                    <Layers size={14} className="text-gray-400 shrink-0" />
                    <div className="truncate">
                      <span className="block truncate">{s.title || s.job_title || 'Untitled'}</span>
                      {s.job_title && s.title !== s.job_title && (
                        <span className="text-[11px] text-gray-400 block truncate">{s.job_title}</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedSession ? (
        <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm" style={{ height: 'calc(100vh - 320px)', minHeight: '400px' }}>
          <div className="h-full flex">
            <div className="flex-1 h-full">
              <ChatPanel sessionId={selectedSession.id} fullWidth={true} />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-3xl p-16 text-center shadow-sm">
          <div className="w-20 h-20 rounded-3xl bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-6">
            <Bot size={36} className="text-gray-300" />
          </div>
          <h3 className="font-black text-xl text-[#111111] mb-2">Select a Session</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
            Choose a recruitment session above to start chatting with AI about your candidates. Ask questions like "best candidates for backend role" or "score above 80%".
          </p>
        </div>
      )}
    </div>
  );
}
