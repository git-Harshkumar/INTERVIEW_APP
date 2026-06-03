import { useState, useEffect, useRef } from 'react';
import './index.css';
import api from './api';
import Auth from './Auth';
import Interview from './interview';
import LiveInterview from './LiveInterview';

const CountingNumber = ({ end, duration = 2000, suffix = "", prefix = "", decimals = 0 }) => {
  const [count, setCount] = useState(0);
  const nodeRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          // Reset when out of view so it counts up again when scrolled back
          setIsVisible(false);
          setCount(0);
        }
      },
      { threshold: 0.1 }
    );

    if (nodeRef.current) observer.observe(nodeRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);

      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      setCount(easeProgress * end);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };
    window.requestAnimationFrame(step);
  }, [isVisible, end, duration]);

  const formattedCount = decimals > 0
    ? count.toFixed(decimals)
    : Math.floor(count).toLocaleString();

  return (
    <span ref={nodeRef}>
      {prefix}{formattedCount}{suffix}
    </span>
  );
};

const Dashboard = ({ user, initialTopic, onLogout, onHome }) => {
  const [activeTab, setActiveTab] = useState("practice");
  const [liveTopic, setLiveTopic] = useState(initialTopic || "React");
  const [liveDifficulty, setLiveDifficulty] = useState("medium");
  const [answers, setAnswers] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get("/interview/my-answers");
      setAnswers(res.data);
    } catch (error) {
      console.error("Could not load answer history", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") loadHistory();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#020817] text-slate-50 font-body">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#020817]/90 backdrop-blur-md">
        <nav className="flex flex-col gap-4 px-6 py-4 max-w-7xl mx-auto md:flex-row md:items-center md:justify-between">
          <button onClick={onHome} className="text-left text-xl font-medium tracking-tight text-white">
            PrepMate AI
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-300">Signed in as {user?.name || user?.email || "Candidate"}</span>
            <button onClick={onLogout} className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/10">
              Logout
            </button>
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-blue-400 uppercase mb-2">Dashboard</p>
            <h1 className="text-3xl sm:text-4xl font-display text-white">Practice with your saved interview system</h1>
          </div>
          <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
            {[
              ["practice", "Written Practice"],
              ["live", "Live Interview"],
              ["history", "Answer History"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`rounded-lg px-4 py-2 text-sm transition-colors ${activeTab === key ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "practice" && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
            <Interview initialTopic={initialTopic} />
          </div>
        )}

        {activeTab === "live" && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px]">
              <input
                value={liveTopic}
                onChange={(e) => setLiveTopic(e.target.value)}
                placeholder="Topic for live interview"
                className="w-full rounded-xl border border-white/10 bg-[#0a0f1c] px-4 py-3 text-white outline-none focus:border-blue-400"
              />
              <select
                value={liveDifficulty}
                onChange={(e) => setLiveDifficulty(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0a0f1c] px-4 py-3 text-white outline-none focus:border-blue-400"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <LiveInterview topic={liveTopic || "React"} difficulty={liveDifficulty} />
          </div>
        )}

        {activeTab === "history" && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-display text-white">Saved Answers</h2>
              <button onClick={loadHistory} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/10">
                Refresh
              </button>
            </div>
            {historyLoading && <p className="text-slate-400">Loading your saved answers...</p>}
            {!historyLoading && answers.length === 0 && <p className="text-slate-400">No evaluated answers yet. Submit an answer in practice mode to save one.</p>}
            <div className="grid gap-4">
              {answers.map((answer) => (
                <article key={answer.id} className="rounded-xl border border-white/10 bg-[#0a0f1c] p-5">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <p className="text-sm text-slate-400">Question #{answer.question_id}</p>
                    <p className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-300">
                      {answer.score}/100
                    </p>
                  </div>
                  <p className="mb-3 text-slate-200">{answer.answer}</p>
                  <p className="text-sm text-slate-400">{answer.feedback}</p>
                </article>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState(() => localStorage.getItem("token") ? "dashboard" : "landing");
  const [user, setUser] = useState(null);
  const [starterTopic, setStarterTopic] = useState("");

  const loadUser = async () => {
    if (!localStorage.getItem("token")) return;
    try {
      const res = await api.get("/me");
      setUser(res.data);
    } catch (error) {
      localStorage.removeItem("token");
      setUser(null);
      setView("landing");
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const handleAuth = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setView("auth");
      return;
    }
    // Validate the existing token — if invalid, go to login instead of dashboard
    try {
      const res = await api.get("/me");
      setUser(res.data);
      setView("dashboard");
    } catch {
      localStorage.removeItem("token");
      setUser(null);
      setView("auth");
    }
  };

  const handleLogin = async () => {
    await loadUser();
    setView("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setView("landing");
  };

  const startPractice = () => {
    setStarterTopic(starterTopic.trim());
    handleAuth();
  };

  if (view === "auth") {
    return (
      <div className="min-h-screen bg-[#020817] px-6 py-10 text-slate-50">
        <button onClick={() => setView("landing")} className="mb-8 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10">
          Back to home
        </button>
        <Auth onLogin={handleLogin} />
      </div>
    );
  }

  if (view === "dashboard") {
    return (
      <Dashboard
        user={user}
        initialTopic={starterTopic}
        onLogout={handleLogout}
        onHome={() => setView("landing")}
      />
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#020817] text-slate-50 font-body selection:bg-blue-500/30">
      {/* Background Video (kept fixed so it persists down the page if desired) */}
      <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute top-0 left-0 w-full h-[120%] object-cover opacity-40 mix-blend-screen"
        >
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4" type="video/mp4" />
        </video>
        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#020817]/40 via-transparent to-[#020817]"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[20%] right-[-10%] w-[30%] h-[40%] bg-indigo-500/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation */}
        <header className="w-full border-b border-white/5 bg-white/5 backdrop-blur-md">
          <nav className="flex flex-row justify-between items-center px-6 py-4 max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <span className="text-xl font-medium tracking-tight text-white">PrepMate AI</span>
            </div>
            <div className="hidden md:flex gap-8 items-center">
              <a href="#home" className="text-sm text-white transition-colors">Home</a>
              <a href="#features" className="text-sm text-slate-300 hover:text-white transition-colors">Features</a>
              <a href="#mock-interview" className="text-sm text-slate-300 hover:text-white transition-colors">Mock Interview</a>
              <a href="#pricing" className="text-sm text-slate-300 hover:text-white transition-colors">Pricing</a>
              <a href="#contact" className="text-sm text-slate-300 hover:text-white transition-colors">Contact</a>
            </div>
            <button onClick={handleAuth} className="hidden sm:block rounded-full px-5 py-2 text-sm font-medium text-white border border-white/10 hover:bg-white/10 transition-colors">
              Sign In
            </button>
          </nav>
        </header>

        {/* Hero Content */}
        <main id="home" className="relative flex flex-col items-center justify-center max-w-5xl mx-auto px-6 pt-20 lg:pt-32 pb-32 gap-12">

          {/* Abstract Floating Shapes (Background) */}
          <div className="absolute top-10 left-[10%] w-24 h-24 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md rotate-12 animate-pulse hidden md:block"></div>
          <div className="absolute bottom-10 right-[15%] w-32 h-32 rounded-full bg-blue-500/5 border border-white/5 backdrop-blur-xl -rotate-12 animate-pulse hidden md:block" style={{ animationDelay: '1s' }}></div>

          {/* Top Copy */}
          <div className="relative z-10 flex-1 flex flex-col items-center text-center">

            {/* Top Pill Badge */}
            <div className="animate-fade-rise inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-300 mb-6 backdrop-blur-sm">
              <span className="text-yellow-400">★</span> Rated #1 AI Interview Prep
            </div>

            <h1 className="animate-fade-rise text-5xl sm:text-6xl lg:text-7xl leading-[1.1] tracking-tight font-display text-white mb-6">
              Personalized interview sessions <br className="hidden md:block" />
              designed around your target role and experience level.
            </h1>

            <p className="animate-fade-rise-delay text-slate-300 text-base sm:text-lg max-w-2xl leading-relaxed mb-10">
              Prepare for technical and HR interviews with a conversational AI. Get instant feedback, improve your delivery, and land your next role with confidence.
            </p>

            {/* Interactive Demo Input */}
            <div className="animate-fade-rise-delay w-full max-w-md mx-auto relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative flex items-center bg-[#0a0f1c] border border-white/10 rounded-xl p-2 shadow-2xl">
                <div className="pl-3 pr-2 text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <input
                  type="text"
                  value={starterTopic}
                  onChange={(e) => setStarterTopic(e.target.value)}
                  placeholder="Enter a job title to see your first question..."
                  className="flex-1 bg-transparent border-none outline-none text-slate-200 text-sm placeholder:text-slate-500 py-2"
                />
                <button onClick={startPractice} className="bg-white text-black font-medium text-sm px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1">
                  Start <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              </div>
            </div>

          </div>

        </main>

        {/* Features Section */}
        <section id="features" className="w-full max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest text-blue-400 uppercase mb-3">What You Get</p>
            <h2 className="text-3xl sm:text-4xl font-display text-white">Everything you need to land the job</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 hover:-translate-y-1 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">AI Mock Interviews</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Practice realistic technical & HR interview scenarios tailored to your target company.</p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 hover:-translate-y-1 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Instant Feedback</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Get AI-generated scoring on clarity, confidence, depth, and communication within seconds.</p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 hover:-translate-y-1 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Performance Analytics</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Visual dashboards that track your growth, highlight weak spots, and measure session-over-session improvement.</p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 hover:-translate-y-1 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Role-Based Questions</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Frontend, Backend, Full Stack, HR, Data Science, and more — always relevant to your role.</p>
            </div>

          </div>
        </section>

        {/* Statistics Section */}
        <div className="w-full border-t border-white/5 bg-[#020817]/40 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/10">
            <div className="flex flex-col items-center justify-center text-center px-4">
              <div className="text-2xl sm:text-3xl font-display text-white mb-1">
                <CountingNumber end={15000} suffix="+" duration={2500} />
              </div>
              <div className="text-xs sm:text-sm text-slate-400">Interviews Practiced</div>
            </div>
            <div className="flex flex-col items-center justify-center text-center px-4">
              <div className="text-2xl sm:text-3xl font-display text-white mb-1">
                <CountingNumber end={4.9} decimals={1} suffix="/5" duration={2500} />
              </div>
              <div className="text-xs sm:text-sm text-slate-400">User Rating</div>
            </div>
            <div className="flex flex-col items-center justify-center text-center px-4">
              <div className="text-2xl sm:text-3xl font-display text-white mb-1">
                <CountingNumber end={500} suffix="+" duration={2500} />
              </div>
              <div className="text-xs sm:text-sm text-slate-400">Question Sets</div>
            </div>
            <div className="flex flex-col items-center justify-center text-center px-4">
              <div className="text-2xl sm:text-3xl font-display text-emerald-400 mb-1">
                <CountingNumber end={85} suffix="%" duration={2500} />
              </div>
              <div className="text-xs sm:text-sm text-slate-400">Confidence Improvement</div>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <section id="mock-interview" className="w-full max-w-5xl mx-auto px-6 py-24 border-t border-white/5">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest text-blue-400 uppercase mb-3">Simple Process</p>
            <h2 className="text-3xl sm:text-4xl font-display text-white">From signup to offer letter in 3 steps</h2>
          </div>
          <div className="relative flex flex-col md:flex-row items-start gap-12 md:gap-0">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-8 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Step 1 */}
            <div className="flex-1 flex flex-col items-center text-center px-6">
              <div className="relative w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">1</span>
                <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Create Your Profile</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Tell us your target role, experience level, and the companies you're aiming for.</p>
            </div>

            {/* Step 2 */}
            <div className="flex-1 flex flex-col items-center text-center px-6">
              <div className="relative w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">2</span>
                <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Practice with AI</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Have a realistic conversation with our AI interviewer. It adapts in real-time to your answers.</p>
            </div>

            {/* Step 3 */}
            <div className="flex-1 flex flex-col items-center text-center px-6">
              <div className="relative w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">3</span>
                <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Get Hired</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Review your detailed scorecard, act on AI suggestions, and walk into real interviews with confidence.</p>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="w-full border-t border-white/5 py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold tracking-widest text-blue-400 uppercase mb-3">Real Results</p>
              <h2 className="text-3xl sm:text-4xl font-display text-white">Loved by candidates worldwide</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Testimonial 1 */}
              <div className="p-7 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/8 transition-all duration-300">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">&ldquo;PrepMate AI completely changed how I prepare for interviews. After 2 weeks of daily practice sessions, I landed an offer at a top-tier startup. The feedback is scarily accurate.&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">RK</div>
                  <div>
                    <div className="text-sm font-medium text-white">Rahul K.</div>
                    <div className="text-xs text-slate-500">SDE-II @ Zepto</div>
                  </div>
                </div>
              </div>

              {/* Testimonial 2 */}
              <div className="p-7 rounded-2xl bg-white/5 border border-blue-500/20 backdrop-blur-md hover:bg-white/8 transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.08)]">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">&ldquo;I used to freeze up in behavioral rounds. After a month of PrepMate, I felt like I was having a casual conversation — even in the toughest panels. Got 3 offers in one month.&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-pink-600 flex items-center justify-center text-white text-xs font-bold">PS</div>
                  <div>
                    <div className="text-sm font-medium text-white">Priya S.</div>
                    <div className="text-xs text-slate-500">Product Manager @ Razorpay</div>
                  </div>
                </div>
              </div>

              {/* Testimonial 3 */}
              <div className="p-7 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/8 transition-all duration-300">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">&ldquo;The role-specific question sets are incredible. I was preparing for a data science role and every question felt like it was pulled directly from actual interviews at FAANG companies.&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold">AM</div>
                  <div>
                    <div className="text-sm font-medium text-white">Arjun M.</div>
                    <div className="text-xs text-slate-500">Data Scientist @ PhonePe</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 w-full relative z-10 bg-transparent">
          <h2 className="text-4xl sm:text-5xl font-display text-white text-center">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4 mt-12 items-stretch">

            {/* Starter Card */}
            <div className="bg-[#131B2E]/80 backdrop-blur-md border border-slate-800 rounded-xl p-8 flex flex-col justify-between text-left hover:border-slate-700 transition-colors duration-300">
              <div>
                <h3 className="text-xl font-sans font-semibold text-slate-300">Starter</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold text-white">₹999</span>
                  <span className="text-slate-400 text-sm"> /mo</span>
                </div>
                <ul className="space-y-3 my-6">
                  {[
                    '10 Mock interviews/month',
                    'Full Feedback Reports',
                    '30-minute sessions',
                  ].map(f => (
                    <li key={f} className="flex items-center gap-3 text-slate-300 text-sm">
                      <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <button className="w-full bg-gradient-to-r from-blue-400 to-indigo-400 text-slate-900 font-medium py-3 rounded-lg text-center transition-all hover:opacity-90 mt-8">
                Get Started
              </button>
            </div>

            {/* Pro Card — featured */}
            <div className="bg-[#131B2E]/80 backdrop-blur-md border border-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.5)] rounded-xl p-8 flex flex-col justify-between text-left transform scale-105 z-10">
              <div>
                <h3 className="text-xl font-sans font-semibold text-white">Pro</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold text-white">₹1,999</span>
                  <span className="text-slate-400 text-sm"> /mo</span>
                </div>
                <ul className="space-y-3 my-6">
                  {[
                    '10 Mock interviews/month',
                    'Full Feedback Reports',
                    '30-minute sessions',
                    'Enhanced Engagements',
                    '20-minute sessions',
                  ].map(f => (
                    <li key={f} className="flex items-center gap-3 text-slate-300 text-sm">
                      <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <button className="w-full bg-gradient-to-r from-blue-400 to-indigo-400 text-slate-900 font-medium py-3 rounded-lg text-center transition-all hover:opacity-90 mt-8 shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                Get Started
              </button>
            </div>

            {/* Enterprise Card */}
            <div className="bg-[#131B2E]/80 backdrop-blur-md border border-slate-800 rounded-xl p-8 flex flex-col justify-between text-left hover:border-slate-700 transition-colors duration-300">
              <div>
                <h3 className="text-xl font-sans font-semibold text-slate-300">Enterprise</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold text-white">₹3,999</span>
                  <span className="text-slate-400 text-sm"> /mo</span>
                </div>
                <ul className="space-y-3 my-6">
                  {[
                    '20 Mock interviews/month',
                    'Full Feedback Reports',
                    '30-minute sessions',
                    'Enhanced Engagements',
                    'Actioned Engagements',
                  ].map(f => (
                    <li key={f} className="flex items-center gap-3 text-slate-300 text-sm">
                      <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <button className="w-full bg-gradient-to-r from-blue-400 to-indigo-400 text-slate-900 font-medium py-3 rounded-lg text-center transition-all hover:opacity-90 mt-8">
                Get Started
              </button>
            </div>

          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-20 bg-transparent w-full relative z-10">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest text-blue-400 uppercase mb-3">Get In Touch</p>
            <h2 className="text-4xl sm:text-5xl font-display text-white">Contact</h2>
          </div>
          <div className="max-w-4xl mx-auto bg-[#1E293B]/40 border border-slate-700/50 rounded-2xl p-10 backdrop-blur-sm">
            <form className="flex flex-col gap-6">
              {/* Top Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label htmlFor="name" className="text-sm font-medium text-slate-300">Name</label>
                  <input
                    type="text"
                    id="name"
                    placeholder="John Doe"
                    className="w-full bg-[#334155]/60 border border-transparent focus:border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="email" className="text-sm font-medium text-slate-300">Email</label>
                  <input
                    type="email"
                    id="email"
                    placeholder="john@example.com"
                    className="w-full bg-[#334155]/60 border border-transparent focus:border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Middle Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label htmlFor="subject-text" className="text-sm font-medium text-slate-300">Subject</label>
                  <input
                    type="text"
                    id="subject-text"
                    placeholder="How can we help?"
                    className="w-full bg-[#334155]/60 border border-transparent focus:border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="subject-select" className="text-sm font-medium text-slate-300">Subject</label>
                  <select
                    id="subject-select"
                    defaultValue=""
                    className="w-full bg-[#334155]/60 border border-transparent focus:border-slate-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all appearance-none"
                  >
                    <option value="" disabled className="text-slate-400">Select a category</option>
                    <option value="sales" className="bg-[#1E293B]">Sales</option>
                    <option value="support" className="bg-[#1E293B]">Support</option>
                    <option value="partnership" className="bg-[#1E293B]">Partnership</option>
                    <option value="other" className="bg-[#1E293B]">Other</option>
                  </select>
                </div>
              </div>

              {/* Bottom Row */}
              <div className="flex flex-col gap-2">
                <label htmlFor="message" className="text-sm font-medium text-slate-300">Message</label>
                <textarea
                  id="message"
                  rows={5}
                  placeholder="Your message here..."
                  className="w-full bg-[#334155]/60 border border-transparent focus:border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-white text-slate-900 font-semibold py-4 rounded-xl transition-all hover:bg-slate-100 mt-6 tracking-wide text-lg"
              >
                Send
              </button>
            </form>
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="w-full border-t border-white/5 py-24">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <p className="text-xs font-semibold tracking-widest text-blue-400 uppercase mb-4">Start Today — It's Free</p>
            <h2 className="text-4xl sm:text-5xl font-display text-white mb-6 leading-tight">
              Your next offer is one<br className="hidden sm:block" /> practice session away.
            </h2>
            <p className="text-slate-400 text-base sm:text-lg mb-10 max-w-xl mx-auto leading-relaxed">
              Join thousands of candidates who turned interview anxiety into interview confidence with PrepMate AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button onClick={handleAuth} className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] hover:-translate-y-0.5 transition-all duration-200 text-base">
                Get Started for Free
              </button>
              <button onClick={handleAuth} className="px-8 py-4 border border-white/10 text-slate-300 font-medium rounded-xl hover:bg-white/5 hover:text-white transition-all duration-200 text-base">
                Watch a Demo
              </button>
            </div>
          </div>
        </section>

        {/* Global Footer */}
        <footer className="border-t border-slate-900 bg-[#0B1120] py-8 px-6 mt-12 w-full relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-slate-400 font-sans max-w-7xl mx-auto gap-6 md:gap-0">
            <div className="font-semibold text-white text-lg">
              PrepMate AI
            </div>
            <div className="flex space-x-6">
              <a href="#" className="hover:text-white transition-colors">Home</a>
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <a href="#contact" className="hover:text-white transition-colors">Contact</a>
            </div>
            <div>
              Copyright &copy; 2026 All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
