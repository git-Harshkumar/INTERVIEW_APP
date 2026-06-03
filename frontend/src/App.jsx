import { useEffect, useMemo, useRef, useState } from 'react';
import './index.css';
import heroImage from './assets/hero.png';
import { signInWithGoogle } from './firebase.js';

const signInPhoto =
  'https://images.pexels.com/photos/1181302/pexels-photo-1181302.jpeg?cs=srgb&dl=pexels-divinetechygirl-1181302.jpg&fm=jpg';

const tracks = [
  {
    id: 'frontend',
    label: 'Frontend Engineer',
    cue: 'Ship UI rounds with architecture, performance, accessibility, and product tradeoffs.',
    topics: ['React architecture', 'State flows', 'Accessibility audits', 'Performance fixes'],
    prompt: 'Walk me through how you would split a dashboard into reusable React features without over-abstracting.',
  },
  {
    id: 'backend',
    label: 'Backend Engineer',
    cue: 'Practice system design, debugging, APIs, and production reasoning with realistic pressure.',
    topics: ['API design', 'Caching strategy', 'Observability', 'Failure handling'],
    prompt: 'Design an interview scheduling service that survives burst traffic and keeps recruiter actions traceable.',
  },
  {
    id: 'product',
    label: 'Product + HR',
    cue: 'Rehearse stakeholder stories, prioritization, leadership signals, and concise behavioral answers.',
    topics: ['Ownership stories', 'Prioritization', 'Conflict handling', 'Decision quality'],
    prompt: 'Tell me about a time you changed course after new user feedback invalidated your original plan.',
  },
];

const scorecards = [
  { label: 'Mock loops completed', value: '12.4k' },
  { label: 'Median confidence lift', value: '31%' },
  { label: 'Avg. feedback turnaround', value: '18 sec' },
];

const focusAreas = [
  {
    title: 'Session plans that feel personal',
    body: 'Every prep loop is anchored to role, seniority, and company style instead of generic question dumps.',
  },
  {
    title: 'Feedback you can act on',
    body: 'Clarity, structure, technical depth, and storytelling get broken into concrete edits for the next round.',
  },
  {
    title: 'A calmer way to rehearse',
    body: 'Built to make repetition easier: short drills, clear pacing, and realistic prompts without noisy UI.',
  },
];

const stages = [
  'Role brief',
  'Adaptive questions',
  'Follow-up pressure test',
  'Delivery feedback',
];

const planNotes = {
  junior: 'More prompting, more structure, and clearer correction loops for first serious interviews.',
  mid: 'Balanced technical depth with communication polish and tradeoff-oriented follow-ups.',
  senior: 'Staff-level framing, system choices, stakeholder judgment, and crisp leadership narratives.',
};

function getCurrentView() {
  if (typeof window === 'undefined') return 'home';
  return window.location.hash === '#/signin' ? 'signin' : 'home';
}

function useCountUp(value) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    let frame = 0;
    let started = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started) return;
        started = true;
        const startedAt = performance.now();
        const duration = 1200;

        const tick = (now) => {
          const progress = Math.min((now - startedAt) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(Math.round(value * eased));
          if (progress < 1) {
            frame = requestAnimationFrame(tick);
          }
        };

        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.35 },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return [ref, display];
}

function LiveMetric({ value, suffix, label }) {
  const [ref, display] = useCountUp(value);

  return (
    <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--panel-muted)] px-5 py-4">
      <div ref={ref} className="font-display text-3xl text-[color:var(--text-strong)]">
        {display}
        {suffix}
      </div>
      <p className="mt-2 text-sm text-[color:var(--text-muted)]">{label}</p>
    </div>
  );
}

function SignInPage({ onAuth, onBack }) {
  return (
    <section className="signin-shell">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="signin-visual relative overflow-hidden border-b border-[color:var(--border-soft)] lg:border-b-0 lg:border-r">
          <img
            src={signInPhoto}
            alt="Professional candidate working on a laptop in a modern workspace"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,18,0.12),rgba(10,12,18,0.84))]" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(241,123,77,0.24),transparent_36%,rgba(9,11,16,0.74))]" />

          <div className="relative flex h-full flex-col justify-between px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-black/15 px-4 py-2 text-sm font-medium text-white backdrop-blur"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="m15 18-6-6 6-6" />
              </svg>
              Back to overview
            </button>

            <div className="max-w-xl space-y-6">
              <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/80 backdrop-blur">
                Sign in with context, not clutter
              </div>

              <div className="space-y-4 text-white">
                <h1 className="font-display text-5xl leading-[0.95] sm:text-6xl">
                  Step back into prep with a cleaner head.
                </h1>
                <p className="max-w-lg text-lg leading-8 text-white/80">
                  Pick up your interview loops, revisit scorecards, and move straight into focused practice without a noisy auth screen slowing you down.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: 'Question banks', value: '42' },
                  { label: 'Daily drill length', value: '14 min' },
                  { label: 'Typical confidence lift', value: '31%' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 backdrop-blur">
                    <div className="font-display text-3xl">{item.value}</div>
                    <p className="mt-2 text-sm text-white/72">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center bg-[color:var(--bg)] px-5 py-10 sm:px-8">
          <div className="w-full max-w-xl rounded-[2rem] border border-[color:var(--border-strong)] bg-[color:var(--panel)] p-6 shadow-[var(--shadow-deep)] sm:p-8">
            <div className="mb-8 space-y-3">
              <p className="text-sm uppercase tracking-[0.24em] text-[color:var(--text-dim)]">PrepMate account</p>
              <h2 className="font-display text-4xl text-[color:var(--text-strong)] sm:text-5xl">
                Enter the interview studio
              </h2>
              <p className="max-w-lg text-base leading-7 text-[color:var(--text-muted)]">
                Your current frontend supports Google sign-in. The screen below frames that entry point like a polished product surface instead of a placeholder flow.
              </p>
            </div>

            <div className="space-y-5">
              <div className="grid gap-3 rounded-[1.6rem] border border-[color:var(--border-soft)] bg-[color:var(--panel-muted)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--text-dim)]">What happens next</p>
                    <h3 className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]">Personalized workspace setup</h3>
                  </div>
                  <span className="rounded-full border border-[color:var(--border-soft)] px-3 py-1 text-xs text-[color:var(--text-muted)]">
                    Fast entry
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {tracks.flatMap((track) => track.topics.slice(0, 2)).map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full border border-[color:var(--border-soft)] bg-[color:var(--panel)] px-3 py-2 text-xs text-[color:var(--text-muted)]"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.4rem] border border-[color:var(--border-soft)] bg-[color:var(--panel-muted)] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--text-dim)]">Session handoff</p>
                  <p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">
                    Resume your latest role track, saved company context, and answer feedback without rebuilding your setup.
                  </p>
                </div>
                <div className="rounded-[1.4rem] border border-[color:var(--border-soft)] bg-[color:var(--panel-muted)] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--text-dim)]">Current auth path</p>
                  <p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">
                    Continue with Google and hand off to the existing dashboard route already used by the frontend.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onAuth}
                className="flex w-full items-center justify-center gap-3 rounded-full bg-[color:var(--accent)] px-6 py-4 text-base font-semibold text-[color:var(--accent-ink)] transition hover:-translate-y-0.5 hover:brightness-105"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M21.81 10.04H12.2v3.92h5.51c-.24 1.26-.96 2.33-2.04 3.05v2.53h3.31c1.94-1.79 3.05-4.43 3.05-7.54 0-.67-.06-1.31-.22-1.96Z"
                  />
                  <path
                    fill="currentColor"
                    d="M12.2 22c2.76 0 5.08-.92 6.77-2.46l-3.31-2.53c-.92.62-2.09.99-3.46.99-2.66 0-4.91-1.79-5.71-4.2H3.07v2.61A10.22 10.22 0 0 0 12.2 22Z"
                  />
                  <path
                    fill="currentColor"
                    d="M6.49 13.8a6.14 6.14 0 0 1 0-3.6V7.59H3.07a10.22 10.22 0 0 0 0 8.82l3.42-2.61Z"
                  />
                  <path
                    fill="currentColor"
                    d="M12.2 6.05c1.5 0 2.85.52 3.91 1.54l2.92-2.92A9.75 9.75 0 0 0 12.2 2 10.22 10.22 0 0 0 3.07 7.59l3.42 2.61c.8-2.41 3.05-4.15 5.71-4.15Z"
                  />
                </svg>
                Continue with Google
              </button>

              <p className="text-center text-sm leading-7 text-[color:var(--text-dim)]">
                By continuing, you return to your saved prep flow and current interview workspace.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function App() {
  const [view, setView] = useState(getCurrentView);
  const [selectedTrack, setSelectedTrack] = useState(tracks[0]);
  const [experience, setExperience] = useState('mid');
  const [roleInput, setRoleInput] = useState('Frontend Engineer');
  const [companyInput, setCompanyInput] = useState('Razorpay');

  const sessionOutline = useMemo(
    () => [
      `Role target: ${roleInput || selectedTrack.label}`,
      `Interview style: ${selectedTrack.label}`,
      `Focus company: ${companyInput || 'Your target company'}`,
      `Coaching mode: ${planNotes[experience]}`,
    ],
    [companyInput, experience, roleInput, selectedTrack],
  );

  const handleAuth = async () => {
    try {
      await signInWithGoogle();
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Authentication failed', error);
    }
  };

  useEffect(() => {
    const syncView = () => setView(getCurrentView());
    window.addEventListener('hashchange', syncView);
    return () => window.removeEventListener('hashchange', syncView);
  }, []);

  const openSignIn = () => {
    window.location.hash = '/signin';
    setView('signin');
  };

  const openHome = () => {
    window.location.hash = '';
    setView('home');
  };

  if (view === 'signin') {
    return <SignInPage onAuth={handleAuth} onBack={openHome} />;
  }

  return (
    <div className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      <div className="app-shell">
        <header className="sticky top-0 z-30 border-b border-[color:var(--border-soft)] bg-[color:rgba(10,12,18,0.78)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
            <a href="#top" className="flex items-center gap-3 text-[color:var(--text-strong)]">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--panel)] shadow-[var(--shadow-soft)]">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-[color:var(--accent)]" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M6 7.5h8.5a3.5 3.5 0 1 1 0 7H12" />
                  <path d="M6 12h6" />
                  <path d="M6 16.5h12" />
                </svg>
              </span>
              <span>
                <span className="block font-display text-2xl leading-none tracking-[0.01em]">PrepMate</span>
                <span className="block text-xs uppercase tracking-[0.24em] text-[color:var(--text-dim)]">Interview Studio</span>
              </span>
            </a>

            <nav className="hidden items-center gap-8 text-sm text-[color:var(--text-muted)] md:flex">
              <a href="#workspace" className="transition hover:text-[color:var(--text-strong)]">Workspace</a>
              <a href="#signals" className="transition hover:text-[color:var(--text-strong)]">Signals</a>
              <a href="#method" className="transition hover:text-[color:var(--text-strong)]">Method</a>
            </nav>

            <button
              type="button"
              onClick={openSignIn}
              className="rounded-full border border-[color:var(--border-strong)] bg-[color:var(--accent)] px-5 py-2.5 text-sm font-semibold text-[color:var(--accent-ink)] transition hover:-translate-y-0.5 hover:brightness-105"
            >
              Sign in
            </button>
          </div>
        </header>

        <main id="top">
          <section className="hero-band">
            <div className="mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pb-24 lg:pt-20">
              <div className="reveal space-y-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--panel-muted)] px-4 py-2 text-xs uppercase tracking-[0.24em] text-[color:var(--text-dim)]">
                  Interview prep without the generic noise
                </div>

                <div className="space-y-5">
                  <h1 className="max-w-3xl font-display text-5xl leading-[0.94] text-[color:var(--text-strong)] sm:text-6xl lg:text-7xl">
                    Practice like the panel already knows your resume.
                  </h1>
                  <p className="max-w-2xl text-lg leading-8 text-[color:var(--text-muted)]">
                    PrepMate turns interview prep into a focused working session: tailored prompts, sharper follow-ups,
                    and feedback that sounds like a strong coach instead of a generic checklist.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {scorecards.map((card) => (
                    <div key={card.label} className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--panel)] px-5 py-4 shadow-[var(--shadow-soft)]">
                      <div className="font-display text-3xl text-[color:var(--text-strong)]">{card.value}</div>
                      <p className="mt-2 text-sm text-[color:var(--text-muted)]">{card.label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={openSignIn}
                    className="rounded-full bg-[color:var(--accent)] px-6 py-3.5 text-base font-semibold text-[color:var(--accent-ink)] transition hover:-translate-y-0.5 hover:brightness-105"
                  >
                    Start with sign in
                  </button>
                  <a
                    href="#workspace"
                    className="rounded-full border border-[color:var(--border-strong)] px-6 py-3.5 text-base font-semibold text-[color:var(--text-strong)] transition hover:bg-[color:var(--panel-muted)]"
                  >
                    See the workspace
                  </a>
                </div>
              </div>

              <div className="reveal-delay relative" id="workspace">
                <div className="absolute inset-x-[8%] top-0 h-24 rounded-full bg-[color:var(--accent-fade)] blur-3xl" />
                <div className="workspace-panel relative overflow-hidden rounded-[2rem] border border-[color:var(--border-strong)] bg-[color:var(--panel)] p-5 shadow-[var(--shadow-deep)] sm:p-6">
                  <div className="flex items-start justify-between gap-4 border-b border-[color:var(--border-soft)] pb-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-dim)]">Session Planner</p>
                      <h2 className="mt-2 font-display text-3xl text-[color:var(--text-strong)]">Build your next drill</h2>
                    </div>
                    <img src={heroImage} alt="PrepMate session layers" className="hidden h-24 w-24 object-contain opacity-90 sm:block" />
                  </div>

                  <div className="mt-6 grid gap-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      {tracks.map((track) => (
                        <button
                          key={track.id}
                          type="button"
                          onClick={() => setSelectedTrack(track)}
                          className={`rounded-2xl border px-4 py-4 text-left transition ${
                            selectedTrack.id === track.id
                              ? 'border-[color:var(--accent)] bg-[color:var(--accent-fade)] text-[color:var(--text-strong)]'
                              : 'border-[color:var(--border-soft)] bg-[color:var(--panel-muted)] text-[color:var(--text-muted)] hover:border-[color:var(--border-strong)]'
                          }`}
                        >
                          <div className="text-sm font-semibold">{track.label}</div>
                          <p className="mt-2 text-sm leading-6">{track.cue}</p>
                        </button>
                      ))}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                      <div className="rounded-[1.6rem] border border-[color:var(--border-soft)] bg-[color:var(--panel-muted)] p-5">
                        <div className="grid gap-4">
                          <label className="grid gap-2 text-sm">
                            <span className="text-[color:var(--text-dim)]">Target role</span>
                            <input
                              value={roleInput}
                              onChange={(event) => setRoleInput(event.target.value)}
                              className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--panel)] px-4 py-3 text-[color:var(--text-strong)] outline-none transition placeholder:text-[color:var(--text-dim)] focus:border-[color:var(--accent)]"
                              placeholder="Frontend Engineer"
                            />
                          </label>

                          <label className="grid gap-2 text-sm">
                            <span className="text-[color:var(--text-dim)]">Dream company</span>
                            <input
                              value={companyInput}
                              onChange={(event) => setCompanyInput(event.target.value)}
                              className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--panel)] px-4 py-3 text-[color:var(--text-strong)] outline-none transition placeholder:text-[color:var(--text-dim)] focus:border-[color:var(--accent)]"
                              placeholder="Razorpay"
                            />
                          </label>

                          <div className="grid gap-2 text-sm">
                            <span className="text-[color:var(--text-dim)]">Experience band</span>
                            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--panel)] p-1">
                              {['junior', 'mid', 'senior'].map((level) => (
                                <button
                                  key={level}
                                  type="button"
                                  onClick={() => setExperience(level)}
                                  className={`rounded-xl px-3 py-2 capitalize transition ${
                                    experience === level
                                      ? 'bg-[color:var(--text-strong)] text-[color:var(--bg)]'
                                      : 'text-[color:var(--text-muted)] hover:bg-[color:var(--panel-muted)]'
                                  }`}
                                >
                                  {level}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-dashed border-[color:var(--border-strong)] px-4 py-4 text-sm text-[color:var(--text-muted)]">
                            {planNotes[experience]}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[1.6rem] border border-[color:var(--border-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-dim)]">First prompt</p>
                            <h3 className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]">{selectedTrack.label}</h3>
                          </div>
                          <span className="rounded-full border border-[color:var(--border-soft)] px-3 py-1 text-xs text-[color:var(--text-muted)]">
                            Adaptive loop
                          </span>
                        </div>

                        <div className="mt-5 rounded-[1.4rem] border border-[color:var(--border-soft)] bg-[color:rgba(4,6,10,0.46)] p-5">
                          <p className="text-sm uppercase tracking-[0.22em] text-[color:var(--text-dim)]">Interviewer asks</p>
                          <p className="mt-4 text-lg leading-8 text-[color:var(--text-strong)]">
                            {selectedTrack.prompt}
                          </p>
                        </div>

                        <div className="mt-5 grid gap-3">
                          {sessionOutline.map((item) => (
                            <div key={item} className="flex items-start gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--panel-muted)] px-4 py-3 text-sm text-[color:var(--text-muted)]">
                              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[color:var(--accent)]" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="signals" className="border-y border-[color:var(--border-soft)] bg-[color:var(--panel-wash)]">
            <div className="mx-auto grid max-w-7xl gap-5 px-5 py-10 sm:px-8 lg:grid-cols-3">
              <LiveMetric value={87} suffix="%" label="Users who improve answer structure after three sessions" />
              <LiveMetric value={14} suffix=" min" label="Average guided drill length for focused weekday practice" />
              <LiveMetric value={42} suffix="" label="Role-specific question cues available in the current frontend flow" />
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
            <div className="mb-10 max-w-2xl">
              <p className="text-sm uppercase tracking-[0.24em] text-[color:var(--text-dim)]">Why this feels different</p>
              <h2 className="mt-3 font-display text-4xl text-[color:var(--text-strong)] sm:text-5xl">
                Built like a prep studio, not a template landing page.
              </h2>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {focusAreas.map((item) => (
                <article key={item.title} className="rounded-[1.8rem] border border-[color:var(--border-soft)] bg-[color:var(--panel)] p-6 shadow-[var(--shadow-soft)]">
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--panel-muted)] text-[color:var(--accent)]">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M5 12.5 9.2 16 19 6.5" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold text-[color:var(--text-strong)]">{item.title}</h3>
                  <p className="mt-4 text-base leading-7 text-[color:var(--text-muted)]">{item.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="method" className="border-t border-[color:var(--border-soft)]">
            <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-[color:var(--text-dim)]">Method</p>
                <h2 className="mt-3 font-display text-4xl text-[color:var(--text-strong)] sm:text-5xl">
                  A full session arc, visible before you even log in.
                </h2>
                <p className="mt-5 max-w-xl text-lg leading-8 text-[color:var(--text-muted)]">
                  The frontend now shows a believable product flow instead of isolated sections. Candidates can understand
                  the rhythm of a session, the type of prompts they will face, and how feedback gets shaped.
                </p>
              </div>

              <div className="grid gap-4">
                {stages.map((stage, index) => (
                  <div key={stage} className="flex gap-4 rounded-[1.6rem] border border-[color:var(--border-soft)] bg-[color:var(--panel)] p-5 shadow-[var(--shadow-soft)]">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--accent)] text-lg font-semibold text-[color:var(--accent-ink)]">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-[color:var(--text-strong)]">{stage}</h3>
                      <p className="mt-2 text-base leading-7 text-[color:var(--text-muted)]">
                        {index === 0 && 'Set the role, target company, and seniority so the drill begins with context instead of guesswork.'}
                        {index === 1 && 'Questions adjust to the selected track with targeted prompts that sound like a real interviewer.'}
                        {index === 2 && 'The flow can introduce tradeoff questions and clarification pressure once the core answer is in motion.'}
                        {index === 3 && 'Candidates leave with a cleaner plan for the next attempt: what to sharpen, shorten, and make more concrete.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="px-5 pb-20 sm:px-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-8 rounded-[2rem] border border-[color:var(--border-strong)] bg-[linear-gradient(135deg,rgba(241,123,77,0.12),rgba(30,36,48,0.94))] px-6 py-10 shadow-[var(--shadow-deep)] lg:flex-row lg:items-center lg:justify-between lg:px-8">
              <div className="max-w-2xl">
                <p className="text-sm uppercase tracking-[0.24em] text-[color:var(--text-dim)]">Ready for the real rounds</p>
                <h2 className="mt-3 font-display text-4xl text-[color:var(--text-strong)] sm:text-5xl">
                  Bring the frontend to life, then hand backend integration over cleanly.
                </h2>
                <p className="mt-4 text-lg leading-8 text-[color:var(--text-muted)]">
                  This version keeps backend assumptions minimal, preserves your Google sign-in entry point, and gives the product
                  a stronger visual identity right now.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={openSignIn}
                  className="rounded-full bg-[color:var(--text-strong)] px-6 py-3.5 text-base font-semibold text-[color:var(--bg)] transition hover:-translate-y-0.5"
                >
                  Open sign-in page
                </button>
                <a
                  href="#workspace"
                  className="rounded-full border border-[color:var(--border-strong)] px-6 py-3.5 text-base font-semibold text-[color:var(--text-strong)] transition hover:bg-[color:rgba(255,255,255,0.06)]"
                >
                  Review the flow
                </a>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
