import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { testAPI } from "../../lib/api";

export default function TestEntry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Missing test access token. Please verify the URL provided.");
      setLoading(false);
      return;
    }

    testAPI.validateToken(token)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to validate test access link.");
        setLoading(false);
      });
  }, [token]);

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      // Stop stream immediately since this was just a permission check
      stream.getTracks().forEach((track) => track.stop());
      setCameraGranted(true);
      setMicGranted(true);
    } catch (err) {
      console.error("Permission request failed", err);
      alert("Please grant camera and microphone access to proceed with the assessment.");
    }
  };

  const handleStart = () => {
    if (!cameraGranted || !micGranted) {
      alert("Camera and Microphone permissions are required to start this proctored test.");
      return;
    }
    // Navigate to the test round type
    navigate(`/test/${data.round_type}?token=${token}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-5">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <span className="text-sm text-gray-500 font-medium">Validating secure test link...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-5">
        <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-lg">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="mt-4 font-semibold text-lg text-gray-900">Verification Error</h2>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-5 font-sans">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gray-900 p-2 flex items-center justify-center shadow-md">
            <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logo-grad-testentry" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>
              <line x1="32" y1="68" x2="68" y2="32" stroke="url(#logo-grad-testentry)" strokeWidth="14" strokeLinecap="round" />
              <circle cx="32" cy="68" r="16" fill="#38bdf8" />
              <circle cx="68" cy="32" r="24" fill="#2563eb" />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">Between Assessment Portal</h1>
          <p className="mt-1 text-sm text-gray-500">Secure proctored testing environment</p>
        </div>

        <div className="mt-8 rounded-xl border border-gray-100 bg-gray-50/50 p-5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block text-xs font-semibold text-gray-400 uppercase">Candidate Name</span>
              <span className="mt-0.5 block font-medium text-gray-800">{data.candidate_name}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-400 uppercase">Company</span>
              <span className="mt-0.5 block font-medium text-gray-800">{data.company_name}</span>
            </div>
            <div className="col-span-2 border-t border-gray-100 pt-3">
              <span className="block text-xs font-semibold text-gray-400 uppercase">Job Profile</span>
              <span className="mt-0.5 block font-semibold text-blue-600">{data.job_title}</span>
            </div>
          </div>
        </div>

        {/* Assessment Rules */}
        <div className="mt-6">
          <h3 className="font-semibold text-gray-900 text-sm">Important Instructions</h3>
          <ul className="mt-2.5 space-y-2 text-xs text-gray-600 list-disc pl-5">
            <li>This assessment is strictly proctored. Your webcam and microphone will remain active.</li>
            <li>Do not switch tabs, exit full screen, or open other applications. Doing so will trigger warnings.</li>
            <li>Make sure your face is fully visible in front of the camera at all times.</li>
            <li>Ensure you are in a quiet, well-lit room.</li>
          </ul>
        </div>

        {/* Permissions check */}
        <div className="mt-8 rounded-xl border border-blue-50 bg-blue-50/30 p-5">
          <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider">Device Check</h3>
          <p className="text-xs text-blue-700 mt-1">Please allow camera and microphone access to proceed.</p>
          
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <span className={`h-2 w-2 rounded-full ${cameraGranted ? "bg-green-500" : "bg-gray-300 animate-pulse"}`} />
                Camera Permission
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <span className={`h-2 w-2 rounded-full ${micGranted ? "bg-green-500" : "bg-gray-300 animate-pulse"}`} />
                Microphone Permission
              </div>
            </div>
            
            {(!cameraGranted || !micGranted) && (
              <button
                onClick={requestPermissions}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm"
              >
                Grant Permissions
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={handleStart}
            disabled={!cameraGranted || !micGranted}
            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition disabled:opacity-40"
          >
            Start Round {data.round_number} · {data.round_name} →
          </button>
        </div>
      </div>
    </div>
  );
}
