import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { roundsAPI } from "../lib/api";
import { toast } from "react-hot-toast";

export default function ApplicantResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAttempt, setSelectedAttempt] = useState(null);

  useEffect(() => {
    if (!id) return;
    roundsAPI.getApplicantResults(id)
      .then((res) => {
        const flatAttempts = [];
        if (Array.isArray(res)) {
          res.forEach(c => {
            if (c.attempts && Array.isArray(c.attempts)) {
              c.attempts.forEach(a => {
                flatAttempts.push({
                  id: a.access_token,
                  candidate_name: c.name,
                  candidate_email: c.email,
                  round_type: a.round_type,
                  round_name: a.round_name,
                  status: a.status,
                  evaluation_score: a.mcq_score !== undefined && a.mcq_score !== null ? a.mcq_score : (a.coding_score !== undefined && a.coding_score !== null ? a.coding_score : (a.interview_score !== undefined && a.interview_score !== null ? a.interview_score : null)),
                  completed_at: a.submitted_at,
                  tab_switch_count: a.proctoring_flags?.filter(f => f.type === 'tab_switch' || f.event_type === 'tab_switch').length || 0,
                  face_missing_count: a.proctoring_flags?.filter(f => f.type === 'face_missing' || f.event_type === 'face_missing').length || 0,
                  proctoring_screenshots: a.proctoring_flags?.filter(f => f.screenshot_url).map(f => f.screenshot_url) || [],
                  evaluation_comments: a.interview_summary || (a.round_type === 'mcq' ? 'Auto-evaluated multiple choice test.' : 'Proctored coding challenge test.'),
                  interview_transcript: a.interview_transcript || []
                });
              });
            }
          });
        }
        setAttempts(flatAttempts);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load candidate results.");
        setLoading(false);
      });
  }, [id]);

  const filteredAttempts = attempts.filter((att) => {
    const q = searchQuery.toLowerCase();
    return (
      att.candidate_name?.toLowerCase().includes(q) ||
      att.candidate_email?.toLowerCase().includes(q) ||
      att.round_name?.toLowerCase().includes(q)
    );
  });

  const getStatusBadgeClass = (status) => {
    if (status === "submitted" || status === "evaluated") {
      return "bg-green-50 text-green-700 border border-green-200";
    }
    if (status === "in_progress") {
      return "bg-blue-50 text-blue-700 border border-blue-200";
    }
    return "bg-gray-50 text-gray-700 border border-gray-200";
  };

  const getScoreColorClass = (score) => {
    if (score >= 80) return "text-green-600 font-bold";
    if (score >= 50) return "text-amber-600 font-bold";
    return "text-red-500 font-bold";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <span className="text-xs text-gray-500 font-medium">Loading evaluation reports...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-5">
        <div className="w-full max-w-sm rounded-xl border border-red-150 bg-white p-6 text-center shadow">
          <h3 className="font-semibold text-gray-900 text-base">Error Loading Reports</h3>
          <p className="text-xs text-gray-500 mt-2">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] dark:bg-slate-950 p-6 font-sans transition-colors duration-300">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100">Online Assessment Results</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Recruiter real-time monitoring and proctored reports</p>
          </div>
          <button
            onClick={() => navigate(`/dashboard/sessions/${id}`)}
            className="rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 shadow-sm transition-colors"
          >
            ← Back to Workspace
          </button>
        </div>

        {/* Dashboard Grid */}
        <div className="mt-8 grid grid-cols-12 gap-6">
          {/* Candidates List Panel */}
          <section className="col-span-12 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm lg:col-span-7">
            <div className="flex items-center justify-between gap-4">
              <input
                type="text"
                placeholder="Search candidates, rounds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800 px-3.5 py-2 text-xs text-gray-800 dark:text-slate-200 placeholder-gray-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 dark:border-slate-800">
              <table className="min-w-full divide-y divide-gray-150 dark:divide-slate-800 text-xs">
                <thead className="bg-gray-50 dark:bg-slate-800/50 font-semibold text-gray-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Candidate</th>
                    <th className="px-4 py-3 text-left">Round</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium text-gray-700 dark:text-slate-300">
                  {filteredAttempts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400 dark:text-slate-500">
                        No round attempts recorded yet.
                      </td>
                    </tr>
                  ) : (
                    filteredAttempts.map((att) => (
                      <tr
                        key={att.id}
                        onClick={() => setSelectedAttempt(att)}
                        className={`cursor-pointer transition hover:bg-blue-50/50 dark:hover:bg-slate-800/50 ${
                          selectedAttempt?.id === att.id ? "bg-blue-50/80 dark:bg-slate-800/80" : ""
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <span className="block font-semibold text-gray-900 dark:text-slate-100">{att.candidate_name}</span>
                          <span className="text-[10px] text-gray-400 font-normal">{att.candidate_email}</span>
                        </td>
                        <td className="px-4 py-3.5 capitalize">{att.round_type} Round</td>
                        <td className="px-4 py-3.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider ${getStatusBadgeClass(att.status)}`}>
                            {att.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold">
                          {att.evaluation_score !== null ? (
                            <span className={getScoreColorClass(att.evaluation_score)}>
                              {att.evaluation_score}%
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-slate-500 font-normal">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Details / Review Panel */}
          <section className="col-span-12 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm lg:col-span-5">
            {selectedAttempt ? (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-slate-100 text-base">Candidate Evaluation Report</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Reviewing metrics for {selectedAttempt.candidate_name}</p>
                </div>

                <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 p-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-400 dark:text-slate-500">Assessment:</span>
                    <span className="font-bold text-gray-800 dark:text-slate-200">{selectedAttempt.round_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-400 dark:text-slate-500">Score:</span>
                    <span className={`font-mono font-bold ${getScoreColorClass(selectedAttempt.evaluation_score || 0)}`}>
                      {selectedAttempt.evaluation_score !== null ? `${selectedAttempt.evaluation_score}%` : "Not graded"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-400 dark:text-slate-500">Completed at:</span>
                    <span className="font-medium text-gray-800 dark:text-slate-200">
                      {selectedAttempt.completed_at ? new Date(selectedAttempt.completed_at).toLocaleString() : "Pending"}
                    </span>
                  </div>
                </div>

                {/* Proctoring warnings */}
                <div>
                  <h4 className="font-bold text-xs text-gray-900 dark:text-slate-100 uppercase tracking-wider">Proctoring Flags</h4>
                  <div className="mt-2.5 rounded-xl border border-red-150 dark:border-red-900/30 bg-red-50/20 dark:bg-red-950/10 p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-slate-400">Tab Switch Count:</span>
                      <span className={`font-mono font-bold ${selectedAttempt.tab_switch_count > 0 ? "text-red-500" : "text-green-600"}`}>
                        {selectedAttempt.tab_switch_count} violations
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-slate-400">Face Visibility Warnings:</span>
                      <span className={`font-mono font-bold ${selectedAttempt.face_missing_count > 0 ? "text-red-500" : "text-green-600"}`}>
                        {selectedAttempt.face_missing_count} flags
                      </span>
                    </div>

                    {selectedAttempt.proctoring_screenshots && selectedAttempt.proctoring_screenshots.length > 0 && (
                      <div className="border-t border-red-100/50 dark:border-red-900/20 pt-3">
                        <span className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">Screenshot Evidence:</span>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {selectedAttempt.proctoring_screenshots.map((s, i) => (
                            <img
                              key={i}
                              src={s}
                              alt={`Proctor flag ${i + 1}`}
                              className="h-16 w-24 rounded border dark:border-slate-800 object-cover shrink-0 hover:scale-105 transition"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Question evaluations / comments */}
                {selectedAttempt.evaluation_comments && (
                  <div>
                    <h4 className="font-bold text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wider">AI Evaluation Summary</h4>
                    <p className="mt-2 text-xs text-gray-700 dark:text-slate-350 leading-relaxed bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-800 p-4 rounded-xl whitespace-pre-wrap font-medium font-sans">
                      {selectedAttempt.evaluation_comments}
                    </p>
                  </div>
                )}

                {/* Voice Interview Chat Transcript History */}
                {selectedAttempt.round_type === "interview" && selectedAttempt.interview_transcript && selectedAttempt.interview_transcript.length > 0 && (
                  <div className="space-y-3.5">
                    <h4 className="font-bold text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wider">Conversational Interview Transcript</h4>
                    <div className="mt-2.5 max-h-96 overflow-y-auto space-y-4 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 bg-gray-50/50 dark:bg-slate-800/30">
                      {selectedAttempt.interview_transcript.map((item, idx) => (
                        <div key={idx} className="space-y-2 text-xs border-b border-gray-150 dark:border-slate-850 pb-3 last:border-b-0 last:pb-0">
                          {/* AI Host Question */}
                          <div className="flex items-start gap-2">
                            <span className="shrink-0 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-sans">AI HOST</span>
                            <div className="text-gray-900 dark:text-slate-100 font-bold leading-normal">{item.q}</div>
                          </div>
                          {/* Candidate Answer Response */}
                          <div className="flex items-start gap-2 pl-4">
                            <span className="shrink-0 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-250 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-sans">CANDIDATE</span>
                            <div className="text-slate-800 dark:text-slate-350 italic leading-relaxed">"{item.answer_text}"</div>
                          </div>
                          {/* Scoring indicators */}
                          <div className="pl-14 flex items-center gap-4 text-[10px] font-semibold text-gray-500 dark:text-slate-400 flex-wrap">
                            <span>Accuracy: <strong className="text-gray-800 dark:text-slate-200 font-mono">{Math.round((item.accuracy_score || 0) * 100)}%</strong></span>
                            <span>Relevance: <strong className="text-gray-800 dark:text-slate-200 font-mono">{item.relevance_score || 0}/10</strong></span>
                            <span>Depth: <strong className="text-gray-800 dark:text-slate-200 font-mono">{item.depth_score || 0}/10</strong></span>
                          </div>
                          {/* AI feedback comment */}
                          {item.feedback && (
                            <div className="pl-14 text-slate-500 dark:text-slate-400 text-[10px] leading-normal font-medium">
                              <span className="font-bold text-slate-400 dark:text-slate-500">Feedback: </span>
                              {item.feedback}
                            </div>
                          )}
                          {/* Keywords */}
                          {((item.keywords_hit && item.keywords_hit.length > 0) || (item.keywords_missed && item.keywords_missed.length > 0)) && (
                            <div className="pl-14 flex flex-wrap gap-1.5 text-[9px] font-bold">
                              {item.keywords_hit?.map((k, i) => (
                                <span key={i} className="bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-450 border border-green-200/60 dark:border-green-900/40 px-2 py-0.5 rounded-full">✓ {k}</span>
                              ))}
                              {item.keywords_missed?.map((k, i) => (
                                <span key={i} className="bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-450 border border-red-200/60 dark:border-red-900/40 px-2 py-0.5 rounded-full">✗ {k}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center text-center text-gray-400 dark:text-slate-500">
                <svg className="h-10 w-10 text-gray-300 dark:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-3 text-xs">Select a candidate from the left list to review detailed test metrics.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
