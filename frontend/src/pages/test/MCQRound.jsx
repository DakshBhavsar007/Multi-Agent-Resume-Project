import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { testAPI } from "../../lib/api";
import { TestShell } from "../../components/test/TestShell";
import { toast } from "react-hot-toast";

export default function MCQRound() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const allowBacktrack = false; // Strict sequential navigation check
  const [error, setError] = useState("");
  const [context, setContext] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Missing token.");
      setLoading(false);
      return;
    }

    Promise.all([
      testAPI.validateToken(token),
      testAPI.getMcqQuestions()
    ])
      .then(([ctxRes, qRes]) => {
        setContext(ctxRes);
        
        // Shuffle options dynamically for each question
        const shuffledQuestions = qRes.map((q) => {
          const originalOptions = q.options || {};
          const keys = Object.keys(originalOptions);
          const shuffledKeys = [...keys];
          
          for (let i = shuffledKeys.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledKeys[i], shuffledKeys[j]] = [shuffledKeys[j], shuffledKeys[i]];
          }
          
          return {
            ...q,
            shuffledOptionKeys: shuffledKeys
          };
        });

        setQuestions(shuffledQuestions);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load MCQ assessment.");
        setLoading(false);
      });
  }, [token]);

  const setAns = (optKey) => {
    const q = questions[idx];
    setAnswers((prev) => ({
      ...prev,
      [q.id]: optKey
    }));
  };

  const toggleFlag = () => {
    const next = new Set(flagged);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setFlagged(next);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      await testAPI.submitMcq(answers);
      toast.success("MCQ answers submitted successfully!");
      // Proceed to the next round if available
      const currentRoundNum = context.round_number;
      const nextRound = context.sibling_rounds?.find((r) => r.round_number === currentRoundNum + 1 || (r.status === "pending" && r.round_type !== "mcq"));
      if (nextRound && nextRound.token) {
        navigate(`/test/${nextRound.round_type}?token=${nextRound.token}`);
      } else {
        // Complete the test suite
        if (context?.application_id) {
          navigate(`/jobs/applications?app_id=${context.application_id}`);
        } else {
          navigate("/jobs/applications");
        }
      }
    } catch (err) {
      toast.error(err.message || "Failed to submit answers.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <span className="text-xs text-gray-500 font-medium">Loading questions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-5">
        <div className="w-full max-w-sm rounded-xl border border-red-100 bg-white p-6 text-center shadow">
          <h3 className="font-semibold text-gray-900 text-base">Error Loading Round</h3>
          <p className="text-xs text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  const q = questions[idx];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;

  return (
    <TestShell
      roundName={context.round_name}
      roundType="mcq"
      minutes={context.time_limit_minutes}
      candidateName={context.candidate_name}
      jobTitle={context.job_title}
      companyName={context.company_name}
      siblingRounds={context.sibling_rounds}
      onExpiry={handleSubmit}
    >
      <div className="grid h-full grid-cols-12 gap-5 p-5 overflow-hidden">
        {/* Question Panel */}
        <section className="col-span-12 flex h-full flex-col rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-8 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-150 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-sm text-gray-800">Question {idx + 1}</span>
              <span className="text-xs text-gray-400 font-medium">of {totalQuestions}</span>
            </div>
            <button
              onClick={toggleFlag}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                flagged.has(idx)
                  ? "border-amber-200 bg-amber-50 text-amber-600"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 3v18l7-4 7 4V3z" />
              </svg>
              {flagged.has(idx) ? "Flagged for Review" : "Flag"}
            </button>
          </div>

          <div className="flex flex-1 flex-col justify-between p-6 overflow-y-auto">
            <div>
              <h2 className="text-lg font-medium leading-relaxed text-gray-900">{q?.question_text}</h2>
              <div className="mt-6 grid gap-3">
                {q && (q.shuffledOptionKeys || Object.keys(q.options || {})).map((optKey) => {
                  const optText = q.options[optKey];
                  const selected = answers[q.id] === optKey;
                  return (
                    <button
                      key={optKey}
                      onClick={() => setAns(optKey)}
                      className={`flex items-center gap-3.5 rounded-xl border p-4 text-left transition ${
                        selected
                          ? "border-blue-600 bg-blue-50/50"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-bold transition ${
                          selected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-gray-200 text-gray-500"
                        }`}
                      >
                        {optKey}
                      </span>
                      <span className="text-sm font-medium text-gray-800">{optText}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {!allowBacktrack && (
              <div className="mt-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-700 font-semibold flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-amber-700 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3Z"/></svg>
                Sequential Testing: Backtracking is disabled. You cannot return to this question once submitted.
              </div>
            )}

            <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-100">
              {allowBacktrack && (
                <button
                  onClick={() => setIdx((i) => Math.max(0, i - 1))}
                  disabled={idx === 0}
                  className="rounded-full border border-gray-200 px-5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  Previous
                </button>
              )}

              {idx === totalQuestions - 1 ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting || (!allowBacktrack && !answers[q?.id])}
                  className="rounded-full bg-green-600 px-6 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-40 ml-auto"
                >
                  {submitting ? "Submitting..." : "Submit Round Answers →"}
                </button>
              ) : (
                <button
                  onClick={() => setIdx((i) => Math.min(totalQuestions - 1, i + 1))}
                  disabled={!allowBacktrack && !answers[q?.id]}
                  className="rounded-full bg-blue-600 px-6 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40 ml-auto"
                >
                  Next Question
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Sidebar */}
        <aside className="col-span-12 flex h-full flex-col gap-4 lg:col-span-4 overflow-hidden">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-baseline justify-between">
              <h3 className="font-semibold text-sm text-gray-800">Progress</h3>
              <span className="text-xs text-gray-400 font-semibold">
                {answeredCount}/{totalQuestions} Answered
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
              />
            </div>
            <div className="mt-5 grid grid-cols-5 gap-2.5 max-h-40 overflow-y-auto pr-1">
              {questions.map((item, i) => {
                const ans = answers[item.id] !== undefined;
                const flag = flagged.has(i);
                const active = i === idx;
                return (
                  <button
                    key={item.id}
                    onClick={() => allowBacktrack && setIdx(i)}
                    disabled={!allowBacktrack && !active}
                    className={`relative grid h-10 place-items-center rounded-lg text-xs font-bold transition ${
                      active ? "ring-2 ring-blue-600 ring-offset-2" : ""
                    } ${
                      ans
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    } ${(!allowBacktrack && !active) ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    {i + 1}
                    {flag && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex-1 overflow-y-auto">
            <h3 className="font-semibold text-sm text-gray-800">Legend</h3>
            <ul className="mt-3 space-y-2.5 text-xs">
              <li className="flex items-center gap-3 text-gray-500">
                <span className="h-4 w-4 rounded bg-blue-600" /> Answered
              </li>
              <li className="flex items-center gap-3 text-gray-500">
                <span className="h-4 w-4 rounded bg-gray-100 border border-gray-200" /> Not answered
              </li>
              <li className="flex items-center gap-3 text-gray-500">
                <span className="h-4 w-4 rounded bg-gray-100 ring-2 ring-blue-600 ring-offset-1" /> Current Question
              </li>
              <li className="flex items-center gap-3 text-gray-500">
                <span className="relative h-4 w-4 rounded bg-gray-100 border border-gray-200">
                  <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
                </span>{" "}
                Flagged for Review
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </TestShell>
  );
}
