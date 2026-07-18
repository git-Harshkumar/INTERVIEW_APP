import { Bell, BookOpen, History, Moon, PenLine, Settings, Sun, Video } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import api from './api';
import Auth from './Auth';
import './index.css';
import WrittenPractice from './interview';
import LiveInterview from './LiveInterview';
import Profile from './Profile';
import SettingsTab from './Settings';

// ─── Counting animation ───────────────────────────────────────────────────────
const CountingNumber = ({ end, duration = 2000, suffix = "", decimals = 0 }) => {
  const [count, setCount] = useState(0);
  const nodeRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { setIsVisible(entry.isIntersecting); if (!entry.isIntersecting) setCount(0); },
      { threshold: 0.1 }
    );
    if (nodeRef.current) observer.observe(nodeRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const e = 1 - Math.pow(2, -10 * p);
      setCount(e * end);
      if (p < 1) requestAnimationFrame(step);
      else setCount(end);
    };
    requestAnimationFrame(step);
  }, [isVisible, end, duration]);

  const fmt = decimals > 0 ? count.toFixed(decimals) : Math.floor(count).toLocaleString();
  return <span ref={nodeRef}>{fmt}{suffix}</span>;
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = ({ user, initialTopic, onLogout, onHome, isDarkMode, toggleTheme }) => {
  const [activeTab, setActiveTab] = useState('practice');
  const [liveTopic, setLiveTopic] = useState(initialTopic || '');
  const [liveDifficulty, setLiveDifficulty] = useState('medium');
  const [answers, setAnswers] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  // Written practice: once "Generate Questions" is clicked, show the Interview component
  const [practiceStarted, setPracticeStarted] = useState(false);
  const [practiceTopic, setPracticeTopic] = useState(initialTopic || '');
  const [practiceDifficulty, setPracticeDifficulty] = useState('medium');
  // Live interview: once "Start Interview" is clicked, show LiveInterview component
  const [liveStarted, setLiveStarted] = useState(false);
  const popularTopics = ['JavaScript', 'React', 'Python', 'SQL', 'System Design', 'DSA', 'Node.js', 'TypeScript'];
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/interview/my-answers');
      setAnswers(res.data);
    } catch (err) {
      console.error('Could not load answer history', err);
    } finally {
      setHistoryLoading(false);
    }
  };
  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab]);
  // Reset practice/live state when switching tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab !== 'practice') {
      setPracticeStarted(false);
    }
    if (tab !== 'live') {
      setLiveStarted(false);
    }
  };
  const handleGenerateQuestions = () => {
    if (!liveTopic.trim()) { alert('Please enter a topic first.'); return; }
    setPracticeTopic(liveTopic.trim());
    setPracticeDifficulty(liveDifficulty);
    setPracticeStarted(true);
  };
  const handleStartInterview = () => {
    setLiveStarted(true);
  };
  const getPageTitle = () => {
    switch (activeTab) {
      case 'practice': return 'Written Practice';
      case 'live': return 'Live Interview';
      case 'history': return 'Answer History';
      case 'profile': return 'Profile';
      case 'settings': return 'Settings';
      default: return 'Dashboard';
    }
  };
  const userInitials = user?.name ? user.name.slice(0, 2).toUpperCase() : 'UK';
  const userName = user?.name || 'Utkarsh Kumar';

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0a0f1e] text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-300">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="w-[240px] bg-white dark:bg-[#0d1420] border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 hidden md:flex transition-colors duration-300">
        <div>
          {/* Logo */}
          <div className="h-[60px] flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
            <button onClick={onHome} className="flex items-center gap-2.5 focus:outline-none group">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20 group-hover:scale-105 transition-transform">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <span className="font-bold text-slate-900 dark:text-white tracking-tight text-lg">PrepMate AI</span>
            </button>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-1 px-3 mt-6">
            {[
              { id: 'practice', icon: <PenLine size={18} />, label: 'Written Practice' },
              { id: 'live',     icon: <Video size={18} />,   label: 'Live Interview' },
              { id: 'history',  icon: <History size={18} />,  label: 'Answer History' },
              { id: 'settings', icon: <Settings size={18} />, label: 'Settings' },
            ].map(({ id, icon, label }) => (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                {activeTab === id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-md" />
                )}
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom user */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shrink-0 shadow-md shadow-blue-600/20">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{userName}</p>
              <button onClick={onLogout} className="text-xs text-slate-500 dark:text-slate-400 hover:text-red-600 transition-colors">Logout</button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Area ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Navbar */}
        <header className="h-[60px] flex items-center justify-between px-6 bg-white dark:bg-[#0d1420] border-b border-slate-200 dark:border-slate-800 shrink-0 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Pages</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-slate-900 dark:text-white font-bold">{getPageTitle()}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white transition-colors" title="Toggle Theme">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white relative">
              <Bell size={20} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-blue-600 rounded-full" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-600/20"
              >
                {userInitials}
              </button>
              {showDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 z-50">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{userName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email || ''}</p>
                    </div>
                    <button className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 font-medium" onClick={() => { setShowDropdown(false); handleTabChange('profile'); }}>Profile</button>
                    <button className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 font-medium" onClick={() => { setShowDropdown(false); handleTabChange('settings'); }}>Settings</button>
                    <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                    <button onClick={onLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-50 dark:hover:bg-white/5 font-medium">Logout</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">

          {/* ══ WRITTEN PRACTICE ════════════════════════════════════════════════ */}
          {activeTab === 'practice' && (
            <div className="max-w-5xl mx-auto flex flex-col gap-6">

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Sessions',       value: '0',         color: 'text-blue-600 dark:text-blue-400' },
                  { label: 'Questions Practiced',  value: '0',         color: 'text-indigo-600 dark:text-indigo-400' },
                  { label: 'Avg Score',            value: '0%',        color: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'Current Streak',       value: '🔥 0 days', color: 'text-amber-600 dark:text-amber-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col gap-1 shadow-sm hover:shadow-md transition-shadow">
                    <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">{label}</span>
                    <span className={`text-2xl font-bold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>

              {/* If practice has started, show Interview component; else show config */}
              {practiceStarted ? (
                <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Practice Session</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Topic: <span className="text-blue-600 dark:text-blue-400 font-semibold">{practiceTopic}</span> · Difficulty: <span className="text-blue-600 dark:text-blue-400 font-semibold capitalize">{practiceDifficulty}</span></p>
                    </div>
                    <button
                      onClick={() => setPracticeStarted(false)}
                      className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm px-4 py-2 rounded-xl font-semibold transition-colors"
                    >
                      ← Back to Config
                    </button>
                  </div>
                  <WrittenPractice initialTopic={practiceTopic} initialDifficulty={practiceDifficulty} />
                </div>
              ) : (
                <>
                  {/* Practice config card */}
                  <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1 tracking-tight">AI Interview Practice</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Generate AI-powered technical and behavioral questions with instant feedback evaluation.</p>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Topic</label>
                      <input
                        value={liveTopic}
                        onChange={(e) => setLiveTopic(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerateQuestions()}
                        placeholder="Enter a topic (e.g., React Hooks, System Design, Python)"
                        className="w-full bg-slate-50 dark:bg-[#0a0f1e] border border-slate-300 dark:border-slate-800 focus:border-blue-600 focus:bg-white dark:focus:bg-[#0a0f1e] focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all text-sm outline-none"
                      />
                      <div className="flex flex-wrap gap-2 mt-3">
                        {popularTopics.map((t) => (
                          <button
                            key={t}
                            onClick={() => setLiveTopic(t)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                              liveTopic === t
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20'
                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mb-8">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Difficulty</label>
                      <div className="flex gap-3">
                        {[
                          { val: 'easy',   label: 'Easy',   active: 'bg-emerald-600 text-white border-emerald-600 shadow-sm' },
                          { val: 'medium', label: 'Medium', active: 'bg-blue-600 text-white border-blue-600 shadow-sm' },
                          { val: 'hard',   label: 'Hard',   active: 'bg-rose-600 text-white border-rose-600 shadow-sm' },
                        ].map(({ val, label, active }) => (
                          <button
                            key={val}
                            onClick={() => setLiveDifficulty(val)}
                            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                              liveDifficulty === val ? active : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateQuestions}
                      disabled={!liveTopic.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900/40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all text-base"
                    >
                      ✨ Generate Questions
                    </button>
                    {!liveTopic.trim() && (
                      <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2.5">Enter a topic above to get started</p>
                    )}
                  </div>

                  {/* Recent Practice */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Recent Practice</h3>
                    <div className="flex flex-col gap-3">
                      {[
                        { q: 'Explain the virtual DOM and how React reconciles it.', t: 'React', d: 'Medium', dc: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
                        { q: 'Design a URL shortener like bit.ly', t: 'System Design', d: 'Hard', dc: 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800' },
                        { q: 'What is the event loop in JavaScript?', t: 'JavaScript', d: 'Easy', dc: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
                      ].map((item, i) => (
                        <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                          <div className="flex-1">
                            <p className="text-slate-800 dark:text-slate-200 text-sm font-medium mb-2">{item.q}</p>
                            <div className="flex gap-2">
                              <span className="text-xs border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800/40 font-medium">{item.t}</span>
                              <span className={`text-xs border px-2.5 py-0.5 rounded-full font-semibold ${item.dc}`}>{item.d}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => { setLiveTopic(item.t); setPracticeStarted(false); }}
                            className="shrink-0 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
                          >
                            Practice Again
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══ LIVE INTERVIEW ══════════════════════════════════════════════════ */}
          {activeTab === 'live' && (
            <div className="max-w-4xl mx-auto">
              {liveStarted ? (
                <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-md">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Live Interview Session</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Topic: <span className="text-blue-600 dark:text-blue-400 font-semibold">{liveTopic || 'General'}</span></p>
                    </div>
                    <button
                      onClick={() => setLiveStarted(false)}
                      className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm px-4 py-2 rounded-xl font-semibold transition-colors"
                    >
                      ← Back to Setup
                    </button>
                  </div>
                  <div className="p-4">
                    <LiveInterview topic={liveTopic || 'JavaScript'} difficulty={liveDifficulty} />
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1 tracking-tight">Configure Your Live Interview</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Set up your live AI voice interview with Alex, your AI interviewer.</p>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Topic</label>
                    <input
                      value={liveTopic}
                      onChange={(e) => setLiveTopic(e.target.value)}
                      placeholder="E.g., System Design, React Native, SQL"
                      className="w-full bg-slate-50 dark:bg-[#0a0f1e] border border-slate-300 dark:border-slate-800 focus:border-blue-600 focus:bg-white dark:focus:bg-[#0a0f1e] focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all text-sm outline-none"
                    />
                    <div className="flex flex-wrap gap-2 mt-3">
                      {popularTopics.slice(0, 6).map((t) => (
                        <button
                          key={t}
                          onClick={() => setLiveTopic(t)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                            liveTopic === t
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-8">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Difficulty Level</label>
                    <div className="flex gap-3">
                      {[
                        { val: 'easy',   label: 'Easy (Junior)',      active: 'bg-emerald-600 text-white border-emerald-600 shadow-sm' },
                        { val: 'medium', label: 'Medium (Mid-level)', active: 'bg-blue-600 text-white border-blue-600 shadow-sm' },
                        { val: 'hard',   label: 'Hard (Senior)',      active: 'bg-rose-600 text-white border-rose-600 shadow-sm' },
                      ].map(({ val, label, active }) => (
                        <button
                          key={val}
                          onClick={() => setLiveDifficulty(val)}
                          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all border ${
                            liveDifficulty === val ? active : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 mb-6">
                    <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed font-medium">
                      🎙️ <strong>Live voice interview</strong> — Alex (AI interviewer) will speak questions aloud and you respond via microphone. Make sure your mic is enabled.
                    </p>
                  </div>

                  <button
                    onClick={handleStartInterview}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all"
                  >
                    ▶ Start Live Interview
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ══ ANSWER HISTORY ══════════════════════════════════════════════════ */}
          {activeTab === 'history' && (
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Answer History</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Review your past answers and AI feedback.</p>
                </div>
                {answers.length > 0 && (
                  <button onClick={loadHistory} className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold px-4 py-2 rounded-xl transition-colors border border-slate-200 dark:border-slate-700">
                    ↺ Refresh
                  </button>
                )}
              </div>

              {historyLoading ? (
                <div className="flex items-center justify-center min-h-[300px] bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Loading your history…</p>
                  </div>
                </div>
              ) : answers.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center shadow-sm">
                  <BookOpen size={52} color="#94a3b8" strokeWidth={1.5} className="mb-5" />
                  <h3 className="text-slate-900 dark:text-white text-xl font-bold mb-2">No answers saved yet</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mb-8 leading-relaxed">
                    Complete a Written Practice session to see your AI-evaluated answers and scores here.
                  </p>
                  <button
                    onClick={() => handleTabChange('practice')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold transition-colors shadow-md shadow-blue-600/20"
                  >
                    Start Practicing →
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {answers.map((answer) => (
                    <div key={answer.id} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Question #{answer.question_id}</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold border ${
                          answer.score >= 80
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : answer.score >= 60
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                              : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                        }`}>
                          Score: {answer.score}/100
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold mb-1 tracking-wide">Your Answer</p>
                          <p className="text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-[#0a0f1e] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 leading-relaxed font-medium">{answer.answer}</p>
                        </div>
                        <div>
                          <p className="text-xs text-blue-600 dark:text-blue-400 uppercase font-bold mb-1 tracking-wide">AI Feedback</p>
                          <p className="text-sm text-slate-800 dark:text-slate-200 bg-blue-50/70 dark:bg-blue-900/20 p-3.5 rounded-xl border border-blue-200 dark:border-blue-800 leading-relaxed font-medium">{answer.feedback}</p>
                        </div>
                        {answer.strengths && (
                          <div>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-bold mb-1 tracking-wide">Strengths</p>
                            <p className="text-sm text-slate-800 dark:text-slate-200 bg-emerald-50/70 dark:bg-emerald-900/20 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 leading-relaxed font-medium">{answer.strengths}</p>
                          </div>
                        )}
                        {answer.improvements && (
                          <div>
                            <p className="text-xs text-amber-600 dark:text-amber-400 uppercase font-bold mb-1 tracking-wide">Improvements</p>
                            <p className="text-sm text-slate-800 dark:text-slate-200 bg-amber-50/70 dark:bg-amber-900/20 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800 leading-relaxed font-medium">{answer.improvements}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ PROFILE ════════════════════════════════════════════════════════ */}
          {activeTab === 'profile' && (
            <Profile user={user} />
          )}

          {/* ══ SETTINGS ════════════════════════════════════════════════════════ */}
          {activeTab === 'settings' && (
            <SettingsTab user={user} onLogout={onLogout} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
          )}
        </main>
      </div>
    </div>
  );
};

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState(() => localStorage.getItem('token') ? 'dashboard' : 'landing');
  const [user, setUser] = useState(null);
  const [starterTopic, setStarterTopic] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const loadUser = async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const res = await api.get('/me');
      setUser(res.data);
    } catch {
      localStorage.removeItem('token');
      setUser(null);
      setView('landing');
    }
  };

  useEffect(() => { loadUser(); }, []);

  const handleAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) { setView('auth'); return; }
    try {
      const res = await api.get('/me');
      setUser(res.data);
      setView('dashboard');
    } catch {
      localStorage.removeItem('token');
      setUser(null);
      setView('auth');
    }
  };

  const handleLogin = async () => { await loadUser(); setView('dashboard'); };
  const handleLogout = () => { localStorage.removeItem('token'); setUser(null); setView('landing'); };
  const startPractice = () => { setStarterTopic(starterTopic.trim()); handleAuth(); };

  if (view === 'auth') {
    return (
      <div className="min-h-screen bg-[#020817] px-6 py-10 text-slate-50">
        <button onClick={() => setView('landing')} className="mb-8 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10 transition-colors">
          ← Back to home
        </button>
        <Auth onLogin={handleLogin} />
      </div>
    );
  }

  if (view === 'dashboard') {
    return <Dashboard user={user} initialTopic={starterTopic} onLogout={handleLogout} onHome={() => setView('landing')} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />;
  }

  // ── Landing page ────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#020817] text-slate-50 font-body selection:bg-blue-500/30">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <video autoPlay loop muted playsInline className="absolute top-0 left-0 w-full h-[120%] object-cover opacity-40 mix-blend-screen">
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-[#020817]/40 via-transparent to-[#020817]" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[-10%] w-[30%] h-[40%] bg-indigo-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Nav */}
        <header className="w-full border-b border-white/5 bg-white/5 backdrop-blur-md">
          <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <span className="text-xl font-medium text-white">PrepMate AI</span>
            </div>
            <div className="hidden md:flex gap-8">
              <a href="#home" className="text-sm text-white">Home</a>
              <a href="#features" className="text-sm text-slate-300 hover:text-white">Features</a>
              <a href="#mock-interview" className="text-sm text-slate-300 hover:text-white">Mock Interview</a>
              <a href="#pricing" className="text-sm text-slate-300 hover:text-white">Pricing</a>
              <a href="#contact" className="text-sm text-slate-300 hover:text-white">Contact</a>
            </div>
            <button onClick={handleAuth} className="hidden sm:block rounded-full px-5 py-2 text-sm font-medium text-white border border-white/10 hover:bg-white/10 transition-colors">
              Sign In
            </button>
          </nav>
        </header>

        {/* Hero */}
        <main id="home" className="relative flex flex-col items-center max-w-5xl mx-auto px-6 pt-20 lg:pt-32 pb-32 gap-12">
          <div className="absolute top-10 left-[10%] w-24 h-24 rounded-2xl bg-white/5 border border-white/10 rotate-12 animate-pulse hidden md:block" />
          <div className="absolute bottom-10 right-[15%] w-32 h-32 rounded-full bg-blue-500/5 border border-white/5 -rotate-12 animate-pulse hidden md:block" style={{ animationDelay: '1s' }} />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="animate-fade-rise inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 mb-6">
              <span className="text-yellow-400">★</span> Rated #1 AI Interview Prep
            </div>
            <h1 className="animate-fade-rise text-5xl sm:text-6xl lg:text-7xl leading-[1.1] tracking-tight font-display text-white mb-6">
              Personalized interview sessions <br className="hidden md:block" />
              designed around your target role.
            </h1>
            <p className="animate-fade-rise-delay text-slate-300 text-lg max-w-2xl leading-relaxed mb-10">
              Prepare for technical and HR interviews with a conversational AI. Get instant feedback and land your next role with confidence.
            </p>
            <div className="animate-fade-rise-delay w-full max-w-md mx-auto relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-1000" />
              <div className="relative flex items-center bg-[#0a0f1c] border border-white/10 rounded-xl p-2 shadow-2xl">
                <div className="pl-3 pr-2 text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <input
                  type="text"
                  value={starterTopic}
                  onChange={(e) => setStarterTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && startPractice()}
                  placeholder="Enter a topic to get your first question…"
                  className="flex-1 bg-transparent border-none outline-none text-slate-200 text-sm placeholder:text-slate-500 py-2"
                />
                <button onClick={startPractice} className="bg-white text-black font-medium text-sm px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1">
                  Start <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Features */}
        <section id="features" className="w-full max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest text-blue-400 uppercase mb-3">What You Get</p>
            <h2 className="text-3xl sm:text-4xl font-display text-white">Everything you need to land the job</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { bg: 'bg-blue-500/20', ic: 'text-blue-400', title: 'AI Mock Interviews', desc: 'Practice realistic technical & HR scenarios tailored to your target company.', path: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
              { bg: 'bg-indigo-500/20', ic: 'text-indigo-400', title: 'Instant Feedback', desc: 'AI-generated scoring on clarity, confidence, depth, and communication.', path: 'M13 10V3L4 14h7v7l9-11h-7z' },
              { bg: 'bg-emerald-500/20', ic: 'text-emerald-400', title: 'Performance Analytics', desc: 'Dashboards that track your growth and highlight weak spots.', path: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
              { bg: 'bg-purple-500/20', ic: 'text-purple-400', title: 'Role-Based Questions', desc: 'Frontend, Backend, Full Stack, HR, Data Science — always relevant.', path: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
            ].map(({ bg, ic, title, desc, path }) => (
              <div key={title} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:-translate-y-1 transition-all duration-300">
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-4`}>
                  <svg className={`w-5 h-5 ${ic}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} /></svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <div className="w-full border-t border-white/5 bg-[#020817]/40">
          <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/10">
            {[
              { end: 15000, suffix: '+', label: 'Interviews Practiced', color: 'text-white' },
              { end: 4.9, decimals: 1, suffix: '/5', label: 'User Rating', color: 'text-white' },
              { end: 500, suffix: '+', label: 'Question Sets', color: 'text-white' },
              { end: 85, suffix: '%', label: 'Confidence Improvement', color: 'text-emerald-400' },
            ].map(({ end, suffix, label, color, decimals }) => (
              <div key={label} className="flex flex-col items-center text-center px-4">
                <div className={`text-2xl sm:text-3xl font-display ${color} mb-1`}>
                  <CountingNumber end={end} suffix={suffix} duration={2500} decimals={decimals || 0} />
                </div>
                <div className="text-xs sm:text-sm text-slate-400">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <section id="mock-interview" className="w-full max-w-5xl mx-auto px-6 py-24 border-t border-white/5">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest text-blue-400 uppercase mb-3">Simple Process</p>
            <h2 className="text-3xl sm:text-4xl font-display text-white">From signup to offer letter in 3 steps</h2>
          </div>
          <div className="relative flex flex-col md:flex-row items-start gap-12 md:gap-0">
            <div className="hidden md:block absolute top-8 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            {[
              { num: 1, color: 'blue', title: 'Create Your Profile', desc: "Tell us your target role, experience level, and companies you're aiming for.", path: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
              { num: 2, color: 'indigo', title: 'Practice with AI', desc: 'Have a realistic conversation with our AI interviewer that adapts in real-time.', path: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
              { num: 3, color: 'emerald', title: 'Get Hired', desc: 'Review your scorecard, act on AI suggestions, and walk into real interviews confident.', path: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
            ].map(({ num, color, title, desc, path }) => (
              <div key={num} className="flex-1 flex flex-col items-center text-center px-6">
                <div className={`relative w-16 h-16 rounded-2xl bg-${color}-500/10 border border-${color}-500/30 flex items-center justify-center mb-6`}>
                  <span className={`absolute -top-2 -right-2 w-5 h-5 rounded-full bg-${color}-500 text-white text-[10px] font-bold flex items-center justify-center`}>{num}</span>
                  <svg className={`w-7 h-7 text-${color}-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={path} /></svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="w-full border-t border-white/5 py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold tracking-widest text-blue-400 uppercase mb-3">Real Results</p>
              <h2 className="text-3xl sm:text-4xl font-display text-white">Loved by candidates worldwide</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { initials: 'RK', from: 'blue-400', to: 'indigo-600', name: 'Rahul K.', role: 'SDE-II @ Zepto', text: '"PrepMate AI completely changed how I prepare. After 2 weeks of daily practice, I landed an offer at a top-tier startup. The feedback is scarily accurate."' },
                { initials: 'PS', from: 'purple-400', to: 'pink-600', name: 'Priya S.', role: 'Product Manager @ Razorpay', text: '"I used to freeze in behavioral rounds. After a month of PrepMate, I felt like having a casual conversation even in the toughest panels. Got 3 offers in one month."', featured: true },
                { initials: 'AM', from: 'emerald-400', to: 'teal-600', name: 'Arjun M.', role: 'Data Scientist @ PhonePe', text: '"The role-specific question sets are incredible. Every question felt like it was pulled directly from actual FAANG interviews."' },
              ].map(({ initials, from, to, name, role, text, featured }) => (
                <div key={name} className={`p-7 rounded-2xl bg-white/5 border backdrop-blur-md transition-all duration-300 ${featured ? 'border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.08)]' : 'border-white/10'}`}>
                  <div className="flex gap-1 mb-4">{[...Array(5)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}</div>
                  <p className="text-slate-300 text-sm leading-relaxed mb-6">{text}</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br from-${from} to-${to} flex items-center justify-center text-white text-xs font-bold`}>{initials}</div>
                    <div>
                      <div className="text-sm font-medium text-white">{name}</div>
                      <div className="text-xs text-slate-500">{role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-20 w-full">
          <h2 className="text-4xl sm:text-5xl font-display text-white text-center mb-12">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4 items-stretch">
            {[
              { name: 'Starter', price: '₹999', features: ['10 Mock interviews/month', 'Full Feedback Reports', '30-minute sessions'], featured: false },
              { name: 'Pro', price: '₹1,999', features: ['Unlimited interviews', 'Full Feedback Reports', '60-minute sessions', 'CV-Based Interview Mode', 'Priority support'], featured: true },
              { name: 'Enterprise', price: '₹3,999', features: ['Everything in Pro', 'Team dashboard', 'Custom question sets', 'Dedicated account manager', 'Analytics export'], featured: false },
            ].map(({ name, price, features, featured }) => (
              <div key={name} className={`bg-[#131B2E]/80 backdrop-blur-md rounded-xl p-8 flex flex-col justify-between ${featured ? 'border border-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.5)] scale-105 z-10' : 'border border-slate-800'}`}>
                <div>
                  <h3 className={`text-xl font-semibold mb-4 ${featured ? 'text-white' : 'text-slate-300'}`}>{name}</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white">{price}</span>
                    <span className="text-slate-400 text-sm"> /mo</span>
                  </div>
                  <ul className="space-y-3">
                    {features.map(f => (
                      <li key={f} className="flex items-center gap-3 text-slate-300 text-sm">
                        <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={handleAuth}
                  className={`w-full mt-8 py-3 rounded-lg font-medium transition-all hover:opacity-90 ${featured ? 'bg-gradient-to-r from-blue-400 to-indigo-400 text-slate-900 shadow-[0_0_20px_rgba(59,130,246,0.4)]' : 'bg-gradient-to-r from-blue-400 to-indigo-400 text-slate-900'}`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="py-20 w-full">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest text-blue-400 uppercase mb-3">Get In Touch</p>
            <h2 className="text-4xl sm:text-5xl font-display text-white">Contact</h2>
          </div>
          <div className="max-w-4xl mx-auto bg-[#1E293B]/40 border border-slate-700/50 rounded-2xl p-10 backdrop-blur-sm">
            <form className="flex flex-col gap-6" onSubmit={(e) => { e.preventDefault(); alert('Message sent! We\'ll get back to you soon.'); }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label htmlFor="c-name" className="text-sm font-medium text-slate-300">Name</label>
                  <input type="text" id="c-name" placeholder="John Doe" className="w-full bg-[#334155]/60 border border-transparent focus:border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="c-email" className="text-sm font-medium text-slate-300">Email</label>
                  <input type="email" id="c-email" placeholder="john@example.com" className="w-full bg-[#334155]/60 border border-transparent focus:border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="c-message" className="text-sm font-medium text-slate-300">Message</label>
                <textarea id="c-message" rows={5} placeholder="Your message…" className="w-full bg-[#334155]/60 border border-transparent focus:border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none" />
              </div>
              <button type="submit" className="w-full bg-white text-slate-900 font-semibold py-4 rounded-xl hover:bg-slate-100 transition-all text-lg">Send</button>
            </form>
          </div>
        </section>

        {/* CTA */}
        <section className="w-full border-t border-white/5 py-24">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <p className="text-xs font-semibold tracking-widest text-blue-400 uppercase mb-4">Start Today — It's Free</p>
            <h2 className="text-4xl sm:text-5xl font-display text-white mb-6 leading-tight">
              Your next offer is one<br className="hidden sm:block" /> practice session away.
            </h2>
            <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
              Join thousands of candidates who turned interview anxiety into interview confidence with PrepMate AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={handleAuth} className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:-translate-y-0.5 transition-all duration-200 text-base shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                Get Started for Free
              </button>
              <button onClick={handleAuth} className="px-8 py-4 border border-white/10 text-slate-300 font-medium rounded-xl hover:bg-white/5 hover:text-white transition-all duration-200 text-base">
                Watch a Demo
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-900 bg-[#0B1120] py-8 px-6 w-full">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-slate-400 max-w-7xl mx-auto gap-6 md:gap-0">
            <div className="font-semibold text-white text-lg">PrepMate AI</div>
            <div className="flex space-x-6">
              <a href="#" className="hover:text-white transition-colors">Home</a>
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <a href="#contact" className="hover:text-white transition-colors">Contact</a>
            </div>
            <div>Copyright &copy; 2026 All rights reserved.</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
