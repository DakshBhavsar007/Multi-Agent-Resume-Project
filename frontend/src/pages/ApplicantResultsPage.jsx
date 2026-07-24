import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { roundsAPI } from "../lib/api";
import { toast } from "react-hot-toast";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

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
                  candidate_status: c.status,
                  round_type: a.round_type,
                  round_name: a.round_name,
                  status: a.status,
                  passing_score: a.passing_score !== undefined && a.passing_score !== null ? a.passing_score : 50,
                  evaluation_score: a.mcq_score !== undefined && a.mcq_score !== null ? a.mcq_score : (a.coding_score !== undefined && a.coding_score !== null ? a.coding_score : (a.interview_score !== undefined && a.interview_score !== null ? a.interview_score : null)),
                  completed_at: a.submitted_at,
                  tab_switch_count: a.proctoring_flags?.filter(f => f.type === 'tab_switch' || f.event_type === 'tab_switch').length || 0,
                  face_missing_count: a.proctoring_flags?.filter(f => f.type === 'face_missing' || f.event_type === 'face_missing').length || 0,
                  proctoring_screenshots: a.proctoring_flags?.filter(f => f.screenshot_path).map(f => f.screenshot_path) || [],
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

  const getScoreColorClass = (score) => {
    if (score >= 80) return "text-green-600 font-bold";
    if (score >= 50) return "text-amber-600 font-bold";
    return "text-red-500 font-bold";
  };

  const renderStatusBadge = (att) => {
    if (att.evaluation_score !== null && att.evaluation_score !== undefined) {
      const isPassed = att.evaluation_score >= att.passing_score;
      if (isPassed) {
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-600" /> PASSED
          </span>
        );
      } else {
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" /> FAILED
          </span>
        );
      }
    }
    if (att.status === "in_progress") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
          <Clock className="w-3 h-3 text-blue-600" /> IN PROGRESS
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gray-50 text-gray-700 border border-gray-200">
        <Clock className="w-3 h-3 text-gray-400" /> PENDING
      </span>
    );
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
    <div className="min-h-screen bg-[#F5F0E8] p-6 font-sans">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Online Assessment Results</h1>
            <p className="mt-1 text-sm text-gray-500">Recruiter real-time monitoring and proctored reports</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            ← Back to Workspace
          </button>
        </div>

        {/* Dashboard Grid */}
        <div className="mt-8 grid grid-cols-12 gap-6">
          {/* Candidates List Panel */}
          <section className="col-span-12 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-7">
            <div className="flex items-center justify-between gap-4">
              <input
                type="text"
                placeholder="Search candidates, rounds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-gray-100">
              <table className="min-w-full divide-y divide-gray-150 text-xs">
                <thead className="bg-gray-50 font-semibold text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Candidate</th>
                    <th className="px-4 py-3 text-left">Round</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 bg-white font-medium text-gray-700">
                  {filteredAttempts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400">
                        No round attempts recorded yet.
                      </td>
                    </tr>
                  ) : (
                    filteredAttempts.map((att) => (
                      <tr
                        key={att.id}
                        onClick={() => setSelectedAttempt(att)}
                        className={`cursor-pointer transition hover:bg-blue-50/50 ${
                          selectedAttempt?.id === att.id ? "bg-blue-50" : ""
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <span className="block font-semibold text-gray-900">{att.candidate_name}</span>
                          <span className="text-[10px] text-gray-400 font-normal">{att.candidate_email}</span>
                        </td>
                        <td className="px-4 py-3.5 capitalize">{att.round_name || `${att.round_type} Round`}</td>
                        <td className="px-4 py-3.5">
                          {renderStatusBadge(att)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold">
                          {att.evaluation_score !== null ? (
                            <span className={getScoreColorClass(att.evaluation_score)}>
                              {att.evaluation_score}%
                            </span>
                          ) : (
                            <span className="text-gray-400 font-normal">—</span>
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
          <section className="col-span-12 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-5">
            {selectedAttempt ? (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Candidate Evaluation Report</h3>
                  <p className="text-xs text-gray-500 mt-1">Reviewing metrics for {selectedAttempt.candidate_name}</p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-400">Assessment:</span>
                    <span className="font-bold text-gray-800">{selectedAttempt.round_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-400">Outcome:</span>
                    <div>{renderStatusBadge(selectedAttempt)}</div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-400">Score:</span>
                    <span className={`font-mono font-bold ${getScoreColorClass(selectedAttempt.evaluation_score || 0)}`}>
                      {selectedAttempt.evaluation_score !== null ? `${selectedAttempt.evaluation_score}%` : "Not graded"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-400">Passing Threshold:</span>
                    <span className="font-mono font-bold text-slate-700">{selectedAttempt.passing_score}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-400">Completed at:</span>
                    <span className="font-medium text-gray-800">
                      {selectedAttempt.completed_at ? new Date(selectedAttempt.completed_at).toLocaleString() : "Pending"}
                    </span>
                  </div>
                </div>

                {/* Proctoring warnings */}
                <div>
                  <h4 className="font-bold text-xs text-gray-900 uppercase tracking-wider">Proctoring Flags</h4>
                  <div className="mt-2.5 rounded-xl border border-red-100 bg-red-50/20 p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Tab Switch Count:</span>
                      <span className={`font-mono font-bold ${selectedAttempt.tab_switch_count > 0 ? "text-red-500" : "text-green-600"}`}>
                        {selectedAttempt.tab_switch_count} violations
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Face Visibility Warnings:</span>
                      <span className={`font-mono font-bold ${selectedAttempt.face_missing_count > 0 ? "text-red-500" : "text-green-600"}`}>
                        {selectedAttempt.face_missing_count} flags
                      </span>
                    </div>

                    {selectedAttempt.proctoring_screenshots && selectedAttempt.proctoring_screenshots.length > 0 && (
                      <div className="border-t border-red-100/50 pt-3">
                        <span className="block text-xs font-semibold text-gray-500 mb-2">Screenshot Evidence:</span>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {selectedAttempt.proctoring_screenshots.map((s, i) => (
                            <img
                              key={i}
                              src={s}
                              alt={`Proctor flag ${i + 1}`}
                              className="h-16 w-24 rounded border object-cover shrink-0 hover:scale-105 transition"
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
                    <h4 className="font-bold text-[10px] text-gray-400 uppercase tracking-wider">AI Evaluation Summary</h4>
                    <p className="mt-2 text-xs text-gray-700 leading-relaxed bg-gray-50 border border-gray-150 p-4 rounded-xl whitespace-pre-wrap font-medium">
                      {selectedAttempt.evaluation_comments}
                    </p>
                  </div>
                )}

                {/* Voice Interview Chat Transcript History */}
                {selectedAttempt.round_type === "interview" && selectedAttempt.interview_transcript && selectedAttempt.interview_transcript.length > 0 && (
                  <div className="space-y-3.5">
                    <h4 className="font-bold text-[10px] text-gray-400 uppercase tracking-wider">Conversational Interview Transcript</h4>
                    <div className="mt-2.5 max-h-96 overflow-y-auto space-y-4 border border-gray-200 rounded-2xl p-4 bg-gray-50/50">
                      {selectedAttempt.interview_transcript.map((item, idx) => (
                        <div key={idx} className="space-y-2 text-xs border-b border-gray-150 pb-3 last:border-b-0 last:pb-0">
                          {/* AI Host Question */}
                          <div className="flex items-start gap-2">
                            <span className="shrink-0 bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-sans">AI HOST</span>
                            <div className="text-gray-900 font-bold leading-normal">{item.q}</div>
                          </div>
                          {/* Candidate Answer Response */}
                          <div className="flex items-start gap-2 pl-4">
                            <span className="shrink-0 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-sans">CANDIDATE</span>
                            <div className="text-slate-800 italic leading-relaxed">"{item.answer_text}"</div>
                          </div>
                          {/* Scoring indicators */}
                          <div className="pl-14 flex items-center gap-4 text-[10px] font-semibold text-gray-500 flex-wrap">
                            <span>Accuracy: <strong className="text-gray-800 font-mono">{Math.round((item.accuracy_score || 0) * 100)}%</strong></span>
                            <span>Relevance: <strong className="text-gray-800 font-mono">{item.relevance_score || 0}/10</strong></span>
                            <span>Depth: <strong className="text-gray-800 font-mono">{item.depth_score || 0}/10</strong></span>
                          </div>
                          {/* AI feedback comment */}
                          {item.feedback && (
                            <div className="pl-14 text-slate-500 text-[10px] leading-normal font-medium">
                              <span className="font-bold text-slate-400">Feedback: </span>
                              {item.feedback}
                            </div>
                          )}
                          {/* Keywords */}
                          {((item.keywords_hit && item.keywords_hit.length > 0) || (item.keywords_missed && item.keywords_missed.length > 0)) && (
                            <div className="pl-14 flex flex-wrap gap-1.5 text-[9px] font-bold">
                              {item.keywords_hit?.map((k, i) => (
                                <span key={i} className="bg-green-50 text-green-600 border border-green-200/60 px-2 py-0.5 rounded-full">✓ {k}</span>
                              ))}
                              {item.keywords_missed?.map((k, i) => (
                                <span key={i} className="bg-red-50 text-red-500 border border-red-200/60 px-2 py-0.5 rounded-full">✗ {k}</span>
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
              <div className="flex h-64 flex-col items-center justify-center text-center text-gray-400">
                <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
