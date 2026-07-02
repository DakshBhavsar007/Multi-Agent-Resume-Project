import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { testAPI } from "../../lib/api";
import { TestShell } from "../../components/test/TestShell";
import { toast } from "react-hot-toast";

export default function CodingRound() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [context, setContext] = useState(null);
  const [problems, setProblems] = useState([]);
  const [pIdx, setPIdx] = useState(0);

  const [code, setCode] = useState({}); // maps slug -> code
  const [language, setLanguage] = useState("python");
  const [consoleOutput, setConsoleOutput] = useState("Run your code to see results here.");
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Custom Input Testing States
  const [useCustomInput, setUseCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState("");

  // Tracks execution results per problem
  const [problemResults, setProblemResults] = useState({});

  useEffect(() => {
    if (!token) {
      setError("Missing token.");
      setLoading(false);
      return;
    }

    Promise.all([
      testAPI.validateToken(token),
      testAPI.getCodingProblems()
    ])
      .then(([ctxRes, pRes]) => {
        setContext(ctxRes);
        setProblems(pRes);
        
        // Initialize starter code
        const initialCodeMap = {};
        pRes.forEach((p) => {
          initialCodeMap[p.slug] = p.starter_code[language] || p.starter_code["python"] || "";
        });
        setCode(initialCodeMap);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load coding round.");
        setLoading(false);
      });
  }, [token]);

  // Update starter code when language changes
  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setCode((prev) => {
      const updated = { ...prev };
      problems.forEach((p) => {
        updated[p.slug] = p.starter_code[lang] || "";
      });
      return updated;
    });
  };

  const handleCodeChange = (val) => {
    const p = problems[pIdx];
    setCode((prev) => ({
      ...prev,
      [p.slug]: val
    }));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const val = e.target.value;
      const updated = val.substring(0, start) + "    " + val.substring(end);
      
      const p = problems[pIdx];
      setCode((prev) => ({
        ...prev,
        [p.slug]: updated
      }));

      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 4;
      }, 0);
    }
  };

  const handleRun = async () => {
    if (running) return;
    setRunning(true);
    setConsoleOutput(useCustomInput ? "Executing custom run..." : "Running test cases...");

    const p = problems[pIdx];
    const userCode = code[p.slug] || "";

    try {
      const res = await testAPI.runCode(
        userCode, 
        language, 
        p.slug, 
        useCustomInput ? customInput : ""
      );
      
      setProblemResults((prev) => ({
        ...prev,
        [p.slug]: res
      }));

      let outputText = "";
      
      // Execution Telemetry
      if (res.execution_time_sec !== undefined) {
        outputText += `Execution Time: ${res.execution_time_sec}s | Memory Usage: ${res.memory_usage_kb} KB\n\n`;
      }

      if (res.results && Array.isArray(res.results)) {
        res.results.forEach((r, i) => {
          if (useCustomInput) {
            outputText += `✓ Custom Run Successful\n  Input Parameters: ${JSON.stringify(r.input)}\n  Output Result: ${JSON.stringify(r.actual)}\n`;
          } else {
            if (r.passed) {
              outputText += `✓ Test ${i + 1} passed\n`;
            } else if (r.error) {
              outputText += `✗ Test ${i + 1} failed: ${r.error}\n`;
            } else {
              outputText += `✗ Test ${i + 1} failed\n  Input: ${JSON.stringify(r.input)}\n  Expected: ${JSON.stringify(r.expected)}\n  Actual: ${JSON.stringify(r.actual)}\n`;
            }
          }
        });
        if (!useCustomInput) {
          const passedCount = res.results.filter((r) => r.passed).length;
          outputText += `\n${passedCount} / ${res.results.length} cases passed.\n`;
        }
      } else {
        outputText += "Execution completed but no tests returned.\n";
      }

      if (res.user_stdout && res.user_stdout.trim() !== "") {
        outputText += `\nStandard Output (stdout):\n${res.user_stdout}\n`;
      }
      if (res.user_stderr && res.user_stderr.trim() !== "") {
        outputText += `\nStandard Error (stderr):\n${res.user_stderr}\n`;
      }

      setConsoleOutput(outputText);
    } catch (err) {
      setConsoleOutput(`Execution Error: ${err.message || "Compilation failed."}`);
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const submissions = problems.map((p) => {
        const result = problemResults[p.slug] || {};
        return {
          slug: p.slug,
          code: code[p.slug] || "",
          language: language,
          results: result.results || [],
          all_passed: result.all_passed || false
        };
      });

      await testAPI.submitCoding(submissions);
      toast.success("Coding round submitted successfully!");

      const currentRoundNum = context.round_number;
      const nextRound = context.sibling_rounds?.find((r) => r.round_number === currentRoundNum + 1 || (r.status === "pending" && r.round_type !== "coding" && r.round_type !== "mcq"));
      if (nextRound && nextRound.token) {
        navigate(`/test/${nextRound.round_type}?token=${nextRound.token}`);
      } else {
        if (context?.application_id) {
          navigate(`/jobs/applications?app_id=${context.application_id}`);
        } else {
          navigate("/jobs/applications");
        }
      }
    } catch (err) {
      toast.error(err.message || "Failed to submit code.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <span className="text-xs text-gray-500 font-medium">Loading problems...</span>
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

  const p = problems[pIdx];

  return (
    <TestShell
      roundName={context.round_name}
      roundType="coding"
      minutes={context.time_limit_minutes}
      candidateName={context.candidate_name}
      jobTitle={context.job_title}
      companyName={context.company_name}
      siblingRounds={context.sibling_rounds}
      onExpiry={handleSubmit}
    >
      <div className="grid h-full grid-cols-12 gap-5 p-5 overflow-hidden">
        {/* Problem Panel */}
        <section className="col-span-12 flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-5">
          <div className="flex items-center gap-2 border-b border-gray-150 px-5 py-3 bg-gray-50/50">
            {problems.map((pr, i) => (
              <button
                key={pr.slug}
                onClick={() => {
                  setPIdx(i);
                  setConsoleOutput("Run your code to see results here.");
                }}
                className={`rounded-full px-4 py-1 text-xs font-semibold transition ${
                  pIdx === i
                    ? "bg-blue-600 text-white"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                }`}
              >
                Problem {i + 1}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {p && (
              <>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-800">{p.title}</h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      p.difficulty === "easy"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {p.difficulty}
                  </span>
                </div>
                
                <div className="mt-4 text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">
                  {p.description}
                </div>

                <h3 className="mt-6 font-semibold text-gray-800 text-xs uppercase tracking-wider">Examples</h3>
                <div className="mt-2 space-y-3">
                  {p.examples.map((ex, i) => (
                    <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-xs leading-relaxed">
                      <div>
                        <span className="font-semibold text-gray-400">Input:</span>{" "}
                        <span className="text-gray-700">{ex.input}</span>
                      </div>
                      <div className="mt-1">
                        <span className="font-semibold text-gray-400">Output:</span>{" "}
                        <span className="text-gray-800">{ex.output}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <h3 className="mt-6 font-semibold text-gray-800 text-xs uppercase tracking-wider">Constraints</h3>
                <ul className="mt-2 space-y-1.5 text-xs text-gray-500 list-disc pl-5">
                  {p.constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>

        {/* Code Editor Panel */}
        <section className="col-span-12 flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-7">
          <div className="flex items-center justify-between border-b border-gray-150 px-4 py-3 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
              </select>
              <span className="hidden text-[10px] font-bold text-gray-400 uppercase sm:block">UTF-8 · LF</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleRun}
                disabled={running}
                className="rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                {running ? "Running..." : "Run Test Cases"}
              </button>
              <button
                onClick={() => {
                  if (pIdx === problems.length - 1) {
                    handleSubmit();
                  } else {
                    setPIdx(pIdx + 1);
                  }
                }}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm"
              >
                {pIdx === problems.length - 1 ? "Submit Round" : "Next Problem"}
              </button>
            </div>
          </div>

          {/* Simple Textarea Editor with Line Numbers Gutter */}
          <div className="relative flex-1 overflow-hidden bg-[#0F172A] text-gray-100 font-mono flex">
            {p && code[p.slug] !== undefined && (
              <>
                {/* Line Numbers Gutter */}
                <div className="select-none text-right font-mono text-[11px] text-slate-500 bg-[#0B0F19] py-4 border-r border-slate-800 flex flex-col items-end pr-2.5 w-10">
                  {(code[p.slug] || "").split('\n').map((_, index) => (
                    <div key={index} style={{ height: '1.25rem', lineHeight: '1.25rem' }}>{index + 1}</div>
                  ))}
                </div>

                {/* Textarea Code Input Overlay */}
                <textarea
                  spellCheck={false}
                  value={code[p.slug]}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 resize-none bg-transparent py-4 px-4 text-xs font-mono leading-relaxed outline-none overflow-y-auto w-full h-full text-slate-200 focus:ring-0"
                  style={{ tabSize: 4, fontFamily: 'monospace', lineHeight: '1.25rem' }}
                />
              </>
            )}
          </div>

          {/* Console / Output with Custom Input Panel Split */}
          <div className="h-[35%] shrink-0 overflow-hidden border-t border-gray-200 bg-gray-50 flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 bg-gray-100/50">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-[10px] text-gray-500 uppercase tracking-wider">Console</span>
                <label className="flex items-center gap-1.5 text-xs text-gray-600 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCustomInput}
                    onChange={(e) => setUseCustomInput(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                  />
                  <span className="text-xs font-semibold text-slate-600 hover:text-slate-800">Test Custom Input</span>
                </label>
              </div>
              <span className="text-[10px] text-gray-400 font-medium">Hidden test cases run on submit</span>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
              {useCustomInput && (
                <div className="w-[35%] border-r border-gray-200 flex flex-col bg-white">
                  <div className="px-3 py-1.5 border-b border-gray-150 bg-gray-50 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                    Input Parameters (JSON/Dict)
                  </div>
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder='e.g., {"nums": [2,7,11,15], "target": 9}'
                    className="flex-1 p-3 text-xs font-mono text-slate-700 outline-none resize-none bg-transparent"
                  />
                </div>
              )}
              <pre className="flex-1 overflow-y-auto whitespace-pre-wrap px-4 py-3 font-mono text-[11px] leading-relaxed text-gray-700 bg-gray-50">
                {consoleOutput}
              </pre>
            </div>
          </div>
        </section>
      </div>
    </TestShell>
  );
}
