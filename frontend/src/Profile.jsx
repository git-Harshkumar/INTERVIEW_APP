import { useState } from 'react';
import { User, Mail, Camera, Activity, Calendar, Trophy, Briefcase, MapPin, Link as LinkIcon, Edit2, Github, Twitter, Linkedin, Check, X } from 'lucide-react';

export default function Profile({ user }) {
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState({
    name:     user?.name        || 'Harsh Kumar',
    email:    user?.email       || 'harsh@example.com',
    role:     'Software Engineer',
    location: 'Patna, Bihar',
    bio:      'Passionate developer building modern web apps. Love competitive programming and turning ideas into products.',
    website:  'github.com/harsh',
    avatar:   `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'Harsh'}`,
  });

  const [draft, setDraft] = useState(profile);
  const change = (e) => setDraft({ ...draft, [e.target.name]: e.target.value });

  const save = () => {
    setProfile(draft);
    setIsEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const cancel = () => {
    setDraft(profile);
    setIsEditing(false);
  };

  const stats = [
    { label: 'Interviews Done',  value: '12',      icon: Activity, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Avg Score',        value: '86/100',   icon: Trophy,   color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Member Since',     value: 'Jun 2026', icon: Calendar, color: 'text-amber-500', bg: 'bg-amber-500/10'  },
  ];

  return (
    <div className="max-w-[860px] mx-auto py-8 px-4 font-sans">
      {/* ── Saved toast ── */}
      {saved && (
        <div className="fixed top-5 right-5 z-[999] bg-emerald-500 text-white rounded-lg px-4 py-2.5 text-sm font-semibold shadow-lg shadow-emerald-500/40 flex items-center gap-2 animate-bounce">
          <Check size={16} /> Profile saved!
        </div>
      )}

      {/* ── Hero card ── */}
      <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d1420] mb-5 shadow-lg shadow-black/5 dark:shadow-black/40">
        {/* Cover */}
        <div className="h-[140px] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 relative">
          <div className="absolute inset-0 bg-black/15 backdrop-blur-[2px]" />
        </div>

        {/* Body */}
        <div className="px-8 pb-8">
          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-[52px] mb-5 relative z-10">
            <div className="relative">
              <div className="w-[100px] h-[100px] rounded-full border-4 border-white dark:border-[#0d1420] overflow-hidden bg-gray-100 dark:bg-slate-800">
                <img src={profile.avatar} alt="avatar" className="w-full h-full object-cover" />
              </div>
              <button className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-indigo-500 border-2 border-white dark:border-[#0d1420] flex items-center justify-center cursor-pointer text-white hover:bg-indigo-600 transition-colors">
                <Camera size={13} />
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pb-1">
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-slate-200 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  <Edit2 size={14} /> Edit Profile
                </button>
              ) : (
                <>
                  <button onClick={cancel} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-slate-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                    <X size={14} /> Cancel
                  </button>
                  <button onClick={save} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-500 border-0 text-white cursor-pointer hover:bg-indigo-600 shadow-md shadow-indigo-500/20 transition-all">
                    <Check size={14} /> Save
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Name + role */}
          {!isEditing ? (
            <div className="mb-5">
              <h1 className="text-gray-900 dark:text-white text-2xl font-bold m-0 mb-1">{profile.name}</h1>
              <p className="text-indigo-600 dark:text-indigo-400 text-sm m-0 mb-3 flex items-center gap-1.5 font-medium">
                <Briefcase size={14} /> {profile.role}
              </p>
              <p className="text-gray-600 dark:text-slate-400 text-sm leading-relaxed max-w-[520px] m-0">{profile.bio}</p>
            </div>
          ) : (
            <div className="mb-5">
              <p className="text-gray-500 dark:text-slate-400 text-xs mb-3 font-medium uppercase tracking-wide">Editing your profile</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <Field label="Full Name"  name="name"     value={draft.name}     onChange={change} />
                <Field label="Job Title"  name="role"     value={draft.role}     onChange={change} />
                <Field label="Location"   name="location" value={draft.location} onChange={change} />
                <Field label="Website"    name="website"  value={draft.website}  onChange={change} />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 dark:text-slate-400 font-semibold mb-1 uppercase tracking-wide">Bio</label>
                <textarea
                  name="bio" value={draft.bio} onChange={change} rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white text-sm outline-none resize-y focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Meta row */}
          {!isEditing && (
            <div className="flex gap-5 flex-wrap">
              <Meta icon={<MapPin size={13} />}    text={profile.location} />
              <Meta icon={<Mail size={13} />}       text={profile.email} />
              <Meta icon={<LinkIcon size={13} />}   text={profile.website} link={`https://${profile.website}`} />
            </div>
          )}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white dark:bg-[#0d1420] border border-gray-200 dark:border-white/10 rounded-2xl p-4 md:p-5 flex items-center gap-4 shadow-sm shadow-black/5 dark:shadow-black/20">
              <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                <Icon size={20} className={s.color} />
              </div>
              <div>
                <p className="text-gray-500 dark:text-slate-400 text-[11px] font-semibold uppercase tracking-wider m-0 mb-0.5">{s.label}</p>
                <p className="text-gray-900 dark:text-white text-xl font-bold m-0">{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Bottom row: Social + Skills ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Social */}
        <div className="bg-white dark:bg-[#0d1420] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm shadow-black/5">
          <p className="text-gray-900 dark:text-white text-sm font-semibold mb-3.5 tracking-tight">Connect</p>
          <div className="flex flex-col gap-2.5">
            {[
              { Icon: Github,   label: 'GitHub',   color: 'text-gray-900 dark:text-white' },
              { Icon: Linkedin, label: 'LinkedIn',  color: 'text-blue-600' },
              { Icon: Twitter,  label: 'Twitter',   color: 'text-sky-500' },
            ].map(({ Icon, label, color }) => (
              <a key={label} href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-gray-600 dark:text-slate-300 no-underline text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/10">
                <Icon size={16} className={color} />
                <span className="text-gray-700 dark:text-slate-300 font-medium">{label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div className="bg-white dark:bg-[#0d1420] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm shadow-black/5">
          <p className="text-gray-900 dark:text-white text-sm font-semibold mb-3.5 tracking-tight">Top Skills</p>
          <div className="flex flex-wrap gap-2">
            {['React', 'FastAPI', 'Python', 'PostgreSQL', 'C++', 'DSA', 'REST APIs', 'Git'].map(skill => (
              <span key={skill} className="px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                {skill}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function Field({ label, name, value, onChange }) {
  return (
    <div>
      <label className="block text-[11px] text-gray-500 dark:text-slate-400 font-semibold mb-1 uppercase tracking-wide">{label}</label>
      <input name={name} value={value} onChange={onChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors" />
    </div>
  );
}

function Meta({ icon, text, link }) {
  const inner = (
    <span className="flex items-center gap-1.5 text-gray-500 dark:text-slate-400 text-sm font-medium hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors">
      {icon} {text}
    </span>
  );
  return link
    ? <a href={link} target="_blank" rel="noreferrer" className="no-underline">{inner}</a>
    : inner;
}