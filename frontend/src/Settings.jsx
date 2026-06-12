import { useState } from 'react';
import { Bell, Moon, Volume2, Shield, Trash2, LogOut, ChevronRight, Check } from 'lucide-react';

export default function Settings({ onLogout, user, isDarkMode, toggleTheme }) {
  const [toggles, setToggles] = useState({
    emailNotifications: true,
    soundEffects: false,
    twoFactor: false,
  });

  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');
  const [interviewLength, setInterviewLength] = useState('6');

  const toggle = (key) => {
    if (key === 'darkMode') {
      if (toggleTheme) toggleTheme();
    } else {
      setToggles(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const getToggleValue = (key) => key === 'darkMode' ? isDarkMode : toggles[key];

  const savePreferences = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const toggleItems = [
    {
      key: 'emailNotifications',
      icon: Bell,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      label: 'Email Notifications',
      desc: 'Receive weekly progress reports and tips via email',
    },
    {
      key: 'darkMode',
      icon: Moon,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      label: 'Dark Mode',
      desc: 'Optimised dark theme for focused interview sessions',
    },
    {
      key: 'soundEffects',
      icon: Volume2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      label: 'Sound Effects',
      desc: 'Play subtle sounds during interview transitions',
    },
    {
      key: 'twoFactor',
      icon: Shield,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      label: 'Two-Factor Authentication',
      desc: 'Add an extra layer of security to your account',
    },
  ];

  return (
    <div className="max-w-[680px] mx-auto font-sans relative">
      {/* ── Saved toast ── */}
      {saved && (
        <div className="fixed top-5 right-5 z-[999] bg-emerald-500 text-white rounded-lg px-4 py-2.5 text-sm font-semibold shadow-lg shadow-emerald-500/40 flex items-center gap-2 animate-bounce">
          <Check size={15} /> Preferences saved!
        </div>
      )}

      <h2 className="text-gray-900 dark:text-white text-2xl font-bold mb-1">Settings</h2>
      <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">Manage your account preferences and interview defaults.</p>

      {/* ── Toggle preferences ── */}
      <Section title="Preferences">
        {toggleItems.map(({ key, icon: Icon, color, bg, label, desc }) => (
          <div key={key} className="flex items-center justify-between py-3.5 border-b border-gray-100 dark:border-white/5 gap-3 last:border-0">
            <div className="flex items-center gap-3.5">
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-gray-900 dark:text-slate-200 text-sm font-medium m-0">{label}</p>
                <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5 m-0">{desc}</p>
              </div>
            </div>
            <Toggle on={getToggleValue(key)} onClick={() => toggle(key)} />
          </div>
        ))}
      </Section>

      {/* ── Interview defaults ── */}
      <Section title="Interview Defaults">
        <div className="flex items-center justify-between py-3.5 border-b border-gray-100 dark:border-white/5 gap-3">
          <div>
            <p className="text-gray-900 dark:text-slate-200 text-sm font-medium m-0">Default Difficulty</p>
            <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5 m-0">Starting difficulty for new sessions</p>
          </div>
          <div className="flex gap-1.5">
            {['easy', 'medium', 'hard'].map(d => (
              <button key={d} onClick={() => setDifficulty(d)} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all border ${
                difficulty === d
                  ? d === 'easy' ? 'bg-emerald-500 text-white border-emerald-500' : d === 'medium' ? 'bg-amber-500 text-white border-amber-500' : 'bg-red-500 text-white border-red-500'
                  : 'bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10'
              }`}>
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between py-3.5 border-b border-gray-100 dark:border-white/5 gap-3">
          <div>
            <p className="text-gray-900 dark:text-slate-200 text-sm font-medium m-0">Questions per Session</p>
            <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5 m-0">How many questions the AI asks per interview</p>
          </div>
          <select
            value={interviewLength}
            onChange={e => setInterviewLength(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-slate-200 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500"
          >
            {['4', '6', '8', '10'].map(n => (
              <option key={n} value={n} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">{n} questions</option>
            ))}
          </select>
        </div>

        <div className="pt-4 pb-1">
          <button onClick={savePreferences} className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-br from-blue-500 to-indigo-500 text-white border-0 cursor-pointer shadow-md shadow-indigo-500/30 hover:opacity-90 transition-opacity">
            Save Preferences
          </button>
        </div>
      </Section>

      {/* ── Account ── */}
      <Section title="Account">
        <div className="flex items-center justify-between py-3.5 border-b border-gray-100 dark:border-white/5 gap-3">
          <div>
            <p className="text-gray-900 dark:text-slate-200 text-sm font-medium m-0">Email Address</p>
            <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5 m-0">{user?.email || 'your@email.com'}</p>
          </div>
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-400 whitespace-nowrap hover:bg-gray-100 dark:hover:bg-white/10">
            Change <ChevronRight size={13} />
          </button>
        </div>

        <div className="flex items-center justify-between py-3.5 border-b border-gray-100 dark:border-white/5 gap-3">
          <div>
            <p className="text-gray-900 dark:text-slate-200 text-sm font-medium m-0">Password</p>
            <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5 m-0">Last changed 30 days ago</p>
          </div>
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-400 whitespace-nowrap hover:bg-gray-100 dark:hover:bg-white/10">
            Update <ChevronRight size={13} />
          </button>
        </div>

        <div className="flex items-center justify-between py-3.5 border-b border-gray-100 dark:border-white/5 gap-3">
          <div>
            <p className="text-gray-900 dark:text-slate-200 text-sm font-medium m-0">Export My Data</p>
            <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5 m-0">Download all your interview history and scores</p>
          </div>
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-400 whitespace-nowrap hover:bg-gray-100 dark:hover:bg-white/10">
            Export <ChevronRight size={13} />
          </button>
        </div>
      </Section>

      {/* ── Danger zone ── */}
      <Section title="Danger Zone">
        {/* Sign out */}
        <div className="flex items-center justify-between py-3.5 border-b border-gray-100 dark:border-white/5 gap-3">
          <div>
            <p className="text-gray-900 dark:text-slate-200 text-sm font-medium m-0">Sign Out</p>
            <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5 m-0">Sign out of your account on this device</p>
          </div>
          <button onClick={onLogout} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20">
            <LogOut size={14} /> Sign Out
          </button>
        </div>

        {/* Delete account */}
        <div className="flex items-center justify-between py-3.5 gap-3">
          <div>
            <p className="text-red-600 dark:text-red-400 text-sm font-medium m-0">Delete Account</p>
            <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5 m-0">Permanently delete your account and all data</p>
          </div>
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20">
              <Trash2 size={14} /> Delete
            </button>
          ) : (
            <div className="flex gap-2 items-center">
              <span className="text-xs text-red-500 mr-1">Are you sure?</span>
              <button onClick={() => alert('Delete account — connect to backend!')} className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600">
                Yes, delete
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-white/10">
                Cancel
              </button>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="bg-white dark:bg-[#0d1420] border border-gray-200 dark:border-white/10 rounded-2xl px-5 py-2 mb-4 shadow-sm">
      <p className="text-gray-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-widest mt-3.5 mb-1">{title}</p>
      {children}
    </div>
  );
}

function Toggle({ on, onClick }) {
  return (
    <div onClick={onClick} className={`w-11 h-6 rounded-full shrink-0 relative cursor-pointer transition-colors ${on ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]' : 'bg-gray-200 dark:bg-white/10'}`}>
      <div className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-all duration-200 ${on ? 'left-[23px]' : 'left-[3px]'}`} />
    </div>
  );
}
