import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { portalAuth } from "../../lib/portalApi";
import { usePortalAuthStore } from "../../stores/portalAuthStore";

export default function DeveloperLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth, initFromStorage, jwt } = usePortalAuthStore();

  useEffect(() => {
    initFromStorage();
    if (usePortalAuthStore.getState().jwt) {
      navigate("/developer/portal/dashboard");
    }
  }, [initFromStorage, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await portalAuth.login(email, password);
      setAuth(data);
      toast.success("Welcome back!");
      navigate("/developer/portal/dashboard");
    } catch (err) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-bg overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-100 via-bg to-bg opacity-70"></div>
      
      <div className="w-full max-w-md bg-white rounded-3xl p-8 relative z-10 shadow-2xl shadow-gray-200/50 border border-gray-100 m-4">
        <div className="flex flex-col items-center mb-8">
          <span className="text-gray-500 text-[14px] font-medium mb-1">Developer Portal</span>
          <h1 className="text-3xl font-black tracking-tight text-accent">Vishleshan</h1>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-charcoal">Email Address</label>
            <input 
              type="email" 
              placeholder="developer@company.com" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all placeholder:text-gray-400 font-medium"
              required 
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-charcoal">Password</label>
              <button type="button" className="text-xs text-gray-500 hover:text-accent font-medium">Forgot password?</button>
            </div>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all placeholder:text-gray-400 font-medium"
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-2 bg-accent text-white py-3.5 rounded-xl font-bold tracking-wide hover:bg-accent-dark transition-all shadow-md shadow-accent/20 hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-gray-100 pt-6">
          <p className="text-sm text-gray-500 font-medium">
            New developer? <Link to="/developer/register" className="text-accent hover:text-accent-dark font-bold">Get API Key →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
