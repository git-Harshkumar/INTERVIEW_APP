import React, { useState } from "react";
import api from "./api"; // Connects properly to the backend DB via our API setup

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        // Login endpoint
        const res = await api.post("/login", {
          email: formData.email,
          password: formData.password,
        });
        localStorage.setItem("token", res.data.access_token);
        onLogin();
      } else {
        // Register endpoint
        const res = await api.post("/register", {
          name: formData.name,
          email: formData.email,
          password: formData.password,
        });
        // Switch to login on success
        setIsLogin(true);
        setError("Registration successful! Please login.");
        setFormData({ ...formData, password: "" });
      }
    } catch (err) {
      setError(err.response?.data?.detail || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#020817] flex items-center justify-center font-body">
      {/* Background Video matching the landing page exactly */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <video autoPlay loop muted playsInline className="absolute top-0 left-0 w-full h-[120%] object-cover opacity-40 mix-blend-screen">
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-[#020817]/40 via-transparent to-[#020817]" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[-10%] w-[30%] h-[40%] bg-indigo-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Auth Form Container */}
      <div className="relative z-10 w-full max-w-md p-8 bg-[#0a1120]/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl mx-4">
        
        <div className="text-center mb-8">
          <h2 className="text-4xl font-display text-white mb-2 tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-sm text-blue-200/60">
            {isLogin ? "Sign in to continue your interview prep." : "Sign up to start practicing with AI."}
          </p>
        </div>

        {error && (
          <div className={`p-3 rounded-lg text-sm mb-6 ${error.includes('successful') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {!isLogin && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full bg-[#030811]/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="John Doe"
              />
            </div>
          )}
          
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full bg-[#030811]/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full bg-[#030811]/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg mt-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "Please wait..." : (isLogin ? "Sign In" : "Register")}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button" 
            onClick={() => { setIsLogin(!isLogin); setError(""); }}
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            {isLogin ? "Register here" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
