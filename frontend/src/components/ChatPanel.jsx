"use client";

import { useState, useEffect, useRef } from 'react';
import { Trash2, ChevronRight, MessageSquareText, Bot } from 'lucide-react';
import { useChatStore } from '../stores/chatStore';
import { useCandidateStore } from '../stores/candidateStore';
import { chatAPI } from '../lib/api';
import { AIInputWithLoading } from './ui/ai-input-with-loading';

export default function ChatPanel({ sessionId, fullWidth = false }) {
  const { isOpen, toggleChat, history, addMessage, setHistory, clearHistory } = useChatStore();
  const { setHighlightedIdsWithTimeout } = useCandidateStore();
  
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!sessionId) return;
    chatAPI.getHistory(sessionId)
      .then(h => {
        if(h && Array.isArray(h)) {
          setHistory(h.map(m => ({
            role: m.role,
            content: m.content,
            referenced: m.referenced_candidate_ids || []
          })));
        }
      })
      .catch(err => console.error("Could not load chat history:", err));
  }, [sessionId, setHistory]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, loading, isOpen]);

  const handleSend = async (msgText) => {
    if (!msgText || !msgText.trim() || loading) return;
    
    const msg = msgText.trim();
    addMessage({ role: "user", content: msg, referenced: [] });
    setLoading(true);
    
    try {
      const payloadHistory = history.slice(-10).map(h => ({ role: h.role, content: h.content }));
      const data = await chatAPI.send(sessionId, {
        message: msg,
        history: payloadHistory
      });
      
      const referenced = data.referenced_candidates || [];
      addMessage({ role: "assistant", content: data.reply, referenced });
      
      if (referenced.length > 0) {
        setHighlightedIdsWithTimeout(referenced, 5000);
      }
    } catch (e) {
      addMessage({ role: "assistant", content: "Sorry, I had trouble processing that. Try again.", referenced: [] });
    } finally {
      setLoading(false);
    }
  };

  const formatMessageText = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      let formattedLine = line;
      // Bold rendering
      formattedLine = formattedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Lists rendering
      if (formattedLine.trim().startsWith('- ')) {
        formattedLine = `<li class="ml-4 list-disc">${formattedLine.slice(2)}</li>`;
      }
      return <span key={i} dangerouslySetInnerHTML={{ __html: formattedLine }} className={formattedLine.includes('<li') ? 'block' : 'block min-h-[0.5em]'} />;
    });
  };

  const clearChat = async () => {
    if(window.confirm("Clear chat history?")) {
      try {
        await chatAPI.clear(sessionId);
        clearHistory();
      } catch(e) {
        clearHistory();
      }
    }
  };

  if (!isOpen && !fullWidth) {
    return (
      <div 
        onClick={toggleChat}
        className="w-12 h-full bg-white border-l border-gray-200 shadow-[-4px_0_12px_rgba(0,0,0,0.02)] flex flex-col items-center py-6 cursor-pointer hover:bg-gray-50 flex-shrink-0 transition-colors group"
      >
        <div className="w-8 h-8 rounded-full bg-gray-100 text-[#111111] flex items-center justify-center mb-6 group-hover:bg-[#111111] group-hover:text-white transition-colors">
          <MessageSquareText size={16} />
        </div>
        <div className="flex-1 relative w-full flex justify-center">
          <div className="absolute top-1/3 -rotate-90 text-[13px] font-black tracking-[0.3em] uppercase text-gray-400 whitespace-nowrap">
            Ask AI
          </div>
        </div>
        <div className="w-1 h-12 bg-[#111111] rounded-full mt-auto opacity-50"></div>
      </div>
    );
  }

  return (
    <div className={`${fullWidth ? 'w-full' : 'w-[320px] border-l border-gray-200 shadow-[-4px_0_12px_rgba(0,0,0,0.06)]'} h-full bg-white flex flex-col flex-shrink-0 transition-all duration-300`}>
      
      {/* HEADER */}
      <div className="p-4 bg-[#111111] flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-2 text-white">
          <Bot size={18} className="shrink-0" />
          <span className="font-bold tracking-wide text-[15px]">AI Recruiter</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clearChat} className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-md transition-colors" title="Clear History">
            <Trash2 size={16} />
          </button>
          {!fullWidth && (
            <button onClick={toggleChat} className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-md transition-colors" title="Collapse">
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot size={48} className="text-gray-300 mb-4" />
            <h3 className="font-black text-[#111111] mb-2 text-lg">Ask me about candidates</h3>
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {history.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[90%] text-[14px] leading-relaxed font-medium ${
                  msg.role === 'user' 
                    ? 'bg-[#111111] text-white p-2.5 px-3.5 rounded-[12px] rounded-tr-none max-w-[80%] ml-auto' 
                    : 'bg-white border border-gray-200 text-[#2A2A2A] p-2.5 px-3.5 rounded-[12px] rounded-tl-none shadow-[0_2px_4px_rgba(0,0,0,0.02)]'
                }`}>
                  {formatMessageText(msg.content)}
                </div>
                {msg.role === 'assistant' && msg.referenced?.length > 0 && (
                  <button 
                    onClick={() => setHighlightedIdsWithTimeout(msg.referenced, 5000)}
                    className="mt-1.5 ml-2 text-[12px] font-bold text-[#111111] hover:underline flex items-center gap-1"
                  >
                    &uarr; Highlighting {msg.referenced.length} candidates
                  </button>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="flex items-start">
                <div className="bg-white border border-gray-100 p-3 px-4 rounded-[12px] rounded-tl-none shadow-sm flex items-center gap-1.5 h-[40px]">
                  <div className="w-[6px] h-[6px] rounded-full bg-[#111111]" style={{animation: "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite", animationDelay: "0ms"}}></div>
                  <div className="w-[6px] h-[6px] rounded-full bg-[#111111]" style={{animation: "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite", animationDelay: "150ms"}}></div>
                  <div className="w-[6px] h-[6px] rounded-full bg-[#111111]" style={{animation: "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite", animationDelay: "300ms"}}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="p-2 bg-white border-t border-gray-200 shrink-0">
        <AIInputWithLoading 
          onSubmit={handleSend}
          placeholder="Ask about candidates..."
          minHeight={40}
          maxHeight={120}
          loadingDuration={500}
        />
      </div>
    </div>
  );
}
