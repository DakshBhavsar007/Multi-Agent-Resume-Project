"use client";
import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  MessageSquare,
  Send,
  ShieldAlert,
  Search,
  ShieldCheck,
  ArrowLeft,
  LifeBuoy,
  RefreshCw,
  Mail,
  HelpCircle,
  CheckCircle,
  Lock
} from "lucide-react";
import { authAPI } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { useSeekerAuthStore } from "../stores/seekerAuthStore";
import { usePortalAuthStore } from "../stores/portalAuthStore";
import ThemeToggle from "../components/ThemeToggle";

export default function SupportPortalPage() {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const initialBanned = searchParams.get("banned") === "true";
  const initialTicketId = searchParams.get("ticket_id") || "";

  const storedEmail = typeof window !== "undefined" ? localStorage.getItem("between_support_email") || "" : "";
  const storedTicketId = typeof window !== "undefined" ? localStorage.getItem("between_support_ticket_id") || "" : "";

  const recruiterAuth = useAuthStore();
  const seekerAuth = useSeekerAuthStore();
  const developerAuth = usePortalAuthStore();

  const loggedInEmail =
    seekerAuth.seeker?.email ||
    recruiterAuth.user?.email ||
    developerAuth.developer?.email ||
    initialEmail ||
    storedEmail;

  const [activeTab, setActiveTab] = useState(initialTicketId || storedTicketId ? "chat" : "submit");

  // Form State
  const [name, setName] = useState(
    seekerAuth.seeker?.full_name || recruiterAuth.user?.name || ""
  );
  const [email, setEmail] = useState(loggedInEmail);
  const [subject, setSubject] = useState(
    initialBanned ? "Banned Account Appeal" : "General Support Inquiry"
  );
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Chat / Tracking State
  const [searchEmail, setSearchEmail] = useState(loggedInEmail);
  const [searchTicketId, setSearchTicketId] = useState(initialTicketId || storedTicketId);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isUserBanned, setIsUserBanned] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (selectedTicket) {
      scrollToBottom();
    }
  }, [selectedTicket?.messages]);

  // Initial lookup if ticket_id or email provided or saved in localStorage
  useEffect(() => {
    const targetEmail = loggedInEmail || initialEmail || storedEmail;
    const targetTicketId = initialTicketId || storedTicketId;
    if (targetEmail || targetTicketId) {
      handleLookup(targetEmail, targetTicketId);
    }
  }, []);

  // Poll active ticket messages every 4 seconds for live admin replies
  useEffect(() => {
    let interval = null;
    if (activeTab === "chat" && selectedTicket?.id) {
      interval = setInterval(() => {
        handleLookup(selectedTicket.email, selectedTicket.id, true);
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, selectedTicket?.id]);

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const res = await authAPI.createSupportTicket({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim()
      });

      // Save email and ticket ID to localStorage so ticket persists across navigation
      localStorage.setItem("between_support_email", email.trim());
      if (res?.id) {
        localStorage.setItem("between_support_ticket_id", res.id);
      }

      toast.success("Support ticket submitted! Connecting to live chat...");
      setMessage("");
      
      // Auto switch to tracking/chat tab
      setSearchEmail(email.trim());
      if (res?.id) {
        setSearchTicketId(res.id);
        await handleLookup(email.trim(), res.id);
      } else {
        await handleLookup(email.trim());
      }
      setActiveTab("chat");
    } catch (err) {
      toast.error(err.message || "Failed to submit support ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookup = async (targetEmail = searchEmail, targetTicketId = searchTicketId, silent = false) => {
    const emailToSearch = (targetEmail || searchEmail || localStorage.getItem("between_support_email") || "").trim();
    const ticketIdToSearch = (targetTicketId || searchTicketId || localStorage.getItem("between_support_ticket_id") || "").trim();

    if (!emailToSearch && !ticketIdToSearch) {
      if (!silent) setLoadingTickets(false);
      return;
    }

    if (!silent) setLoadingTickets(true);
    try {
      const res = await authAPI.lookupSupportTickets({
        email: emailToSearch,
        ticket_id: ticketIdToSearch
      });

      const ticketList = res?.tickets || [];
      setTickets(ticketList);
      setIsUserBanned(res?.is_user_banned || false);

      if (emailToSearch) {
        localStorage.setItem("between_support_email", emailToSearch);
      }

      if (ticketIdToSearch && ticketList.length > 0) {
        const found = ticketList.find(t => t.id === ticketIdToSearch) || ticketList[0];
        setSelectedTicket(found);
        if (found?.id) localStorage.setItem("between_support_ticket_id", found.id);
      } else if (ticketList.length > 0) {
        if (!selectedTicket || !ticketList.find(t => t.id === selectedTicket.id)) {
          setSelectedTicket(ticketList[0]);
          if (ticketList[0]?.id) localStorage.setItem("between_support_ticket_id", ticketList[0].id);
        } else {
          // Update existing selected ticket with fresh messages
          const updated = ticketList.find(t => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }
      }
    } catch (err) {
      if (!silent) console.error(err);
    } finally {
      if (!silent) setLoadingTickets(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket?.id) return;

    if (selectedTicket.status === "resolved") {
      toast.error("This ticket is resolved and closed for new replies.");
      return;
    }

    setReplying(true);
    try {
      const res = await authAPI.replySupportTicket(selectedTicket.id, {
        message: replyText.trim(),
        sender_name: name || selectedTicket.name || "User"
      });

      setSelectedTicket(prev => ({
        ...prev,
        messages: res.messages || prev.messages,
        status: res.status || prev.status
      }));

      setReplyText("");
      toast.success("Reply sent to Admin!");
    } catch (err) {
      toast.error(err.message || "Failed to send reply");
    } finally {
      setReplying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans flex flex-col justify-between selection:bg-blue-500 selection:text-white transition-colors duration-200">
      
      {/* HEADER BAR */}
      <header className="border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:scale-105 transition">
              B
            </div>
            <span className="font-display font-bold text-xl text-slate-900 dark:text-white tracking-tight">Between</span>
            <span className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold px-2 py-0.5 rounded border border-blue-500/20 ml-1">
              Support & Appeals
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/jobs"
              className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-semibold transition flex items-center gap-1"
            >
              <ArrowLeft size={14} /> Back to Site
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-6xl w-full mx-auto px-4 py-8 flex-1">
        
        {/* BANNER */}
        <div className="bg-gradient-to-r from-blue-100/60 via-slate-100 to-indigo-100/60 dark:from-blue-950/40 dark:via-slate-900 dark:to-indigo-950/40 border border-blue-200/60 dark:border-blue-800/30 rounded-2xl p-6 mb-8 shadow-md dark:shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-1">
                <LifeBuoy size={16} /> 24/7 Help & Account Appeals Portal
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                How can we help you today?
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl mt-1 leading-relaxed">
                Submit support tickets, appeal account suspensions, or chat directly with Admin Support. Accessible to all users, guests, and banned accounts without requiring a login session.
              </p>
            </div>

            {isUserBanned && (
              <div className="bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/80 px-4 py-3 rounded-xl flex items-center gap-3 shrink-0">
                <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400 animate-pulse" />
                <div>
                  <span className="block text-xs font-bold text-red-700 dark:text-red-300">Account Deactivated</span>
                  <span className="text-[11px] text-red-600 dark:text-red-400">Appeal active — Chat with Admin below</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TABS HEADER */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 gap-2">
          <button
            onClick={() => setActiveTab("submit")}
            className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition ${
              activeTab === "submit"
                ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <HelpCircle size={16} /> Submit New Ticket / Appeal
          </button>
          <button
            onClick={() => {
              setActiveTab("chat");
              if (tickets.length === 0 && searchEmail) handleLookup(searchEmail);
            }}
            className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition ${
              activeTab === "chat"
                ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <MessageSquare size={16} /> Live Ticket Chat & History ({tickets.length})
          </button>
        </div>

        {/* TAB 1: SUBMIT NEW TICKET */}
        {activeTab === "submit" && (
          <div className="max-w-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md dark:shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Create Support Inquiry / Ban Appeal
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Fill out the form below. Once submitted, a live chat thread will immediately open for direct communication with Admin.
            </p>

            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Subject / Category *</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition"
                >
                  <option value="Banned Account Appeal">Banned Account Appeal</option>
                  <option value="Technical Support & Bug Report">Technical Support & Bug Report</option>
                  <option value="Billing & Refund Request">Billing & Refund Request</option>
                  <option value="General Support Inquiry">General Support Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Message / Appeal Details *</label>
                <textarea
                  rows={5}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please describe your issue or explain why your banned account should be unbanned..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Submitting Ticket...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Submit Ticket & Open Live Chat
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: LIVE CHAT & TRACKING */}
        {activeTab === "chat" && (
          <div className="grid grid-cols-12 gap-6">
            
            {/* LEFT TICKET SELECTOR & SEARCH */}
            <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-md dark:shadow-xl flex flex-col justify-between h-[600px]">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Lookup Support Tickets</h3>
                
                <div className="space-y-2 mb-4">
                  <div className="relative">
                    <input
                      type="email"
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      placeholder="Search by Email Address"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition"
                    />
                    <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                  </div>
                  <button
                    onClick={() => handleLookup()}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingTickets ? "animate-spin" : ""}`} /> Search Tickets
                  </button>
                </div>

                <div className="space-y-2 overflow-y-auto max-h-[420px] pr-1">
                  {tickets.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      <MessageSquare className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">No support tickets found.</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Submit a ticket above or enter your registered email.</p>
                    </div>
                  ) : (
                    tickets.map((t) => {
                      const isSelected = selectedTicket?.id === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTicket(t)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-600/10 border-blue-500 text-slate-900 dark:text-white"
                              : "bg-slate-50/50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold truncate max-w-[170px]">{t.subject}</span>
                            {t.status === "open" ? (
                              <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded">
                                Open
                              </span>
                            ) : (
                              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded">
                                Resolved
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-500 block">Ticket ID: #{t.id.slice(0, 8)}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-400 block mt-1">
                            {t.messages?.length || 1} messages · Updated {new Date(t.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT LIVE CHAT THREAD WINDOW */}
            <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-md dark:shadow-xl flex flex-col justify-between h-[600px] relative overflow-hidden">
              {selectedTicket ? (
                <>
                  {/* Chat Header */}
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">{selectedTicket.subject}</h3>
                        {selectedTicket.status === "open" ? (
                          <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded">
                            Active Chat
                          </span>
                        ) : (
                          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded">
                            Resolved
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Submitted by <strong className="text-slate-800 dark:text-slate-200">{selectedTicket.name}</strong> ({selectedTicket.email})
                      </span>
                    </div>

                    <button
                      onClick={() => handleLookup(selectedTicket.email, selectedTicket.id)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 transition border border-slate-200 dark:border-slate-700"
                      title="Refresh Chat"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingTickets ? "animate-spin" : ""}`} />
                    </button>
                  </div>

                  {/* Messages Trajectory Stream */}
                  <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 font-sans text-xs bg-slate-50/50 dark:bg-slate-950/40 rounded-xl p-3 my-2">
                    {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                      selectedTicket.messages.map((m, idx) => {
                        const isUser = m.sender === "user";
                        const isSystem = m.sender === "system";

                        if (isSystem) {
                          return (
                            <div key={idx} className="flex justify-center my-3">
                              <div className="bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-600/40 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold px-4 py-2 rounded-full shadow flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>{m.text}</span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={idx}
                            className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                          >
                            <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-500 dark:text-slate-400">
                              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                {isUser ? (
                                  m.sender_name || "You"
                                ) : (
                                  <>
                                    <ShieldCheck size={12} className="text-blue-600 dark:text-blue-400" /> Admin Support
                                  </>
                                )}
                              </span>
                              <span>·</span>
                              <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            <div
                              className={`max-w-[82%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                                isUser
                                  ? "bg-blue-600 text-white rounded-br-none shadow-md"
                                  : "bg-slate-200/90 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-none shadow-md"
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{m.text}</p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-300">
                        <p className="font-semibold">{selectedTicket.message}</p>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Reply Input Box or Resolved Banner */}
                  {selectedTicket.status === "resolved" ? (
                    <div className="border-t border-slate-200 dark:border-slate-800 pt-3 p-3 bg-slate-100 dark:bg-slate-950/80 rounded-xl text-center text-xs text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2 shadow-inner">
                      <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                      <span>This support ticket has been marked as <strong className="text-emerald-600 dark:text-emerald-400">Resolved</strong>. Chat is closed for both Admin and User (Read-Only).</span>
                    </div>
                  ) : (
                    <form onSubmit={handleSendReply} className="border-t border-slate-200 dark:border-slate-800 pt-3 flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type a message to Admin Support..."
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition"
                      />
                      <button
                        type="submit"
                        disabled={replying || !replyText.trim()}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 shrink-0"
                      >
                        <Send size={14} /> Send
                      </button>
                    </form>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                  <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">No Ticket Selected</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-500 max-w-sm mt-1">
                    Select an active support ticket from the list or enter your email address to view message history and chat with Admin.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/40 py-6 text-center text-xs text-slate-500">
        © 2026 Between Support & Ticket Appeals Center · Open 24/7
      </footer>
    </div>
  );
}
