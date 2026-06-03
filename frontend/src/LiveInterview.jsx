import { useCallback, useEffect, useRef, useState } from "react";
import api from "./api";

// ─── Constants ─────────────────────────────────────────────────────────────────
const TOPIC_OPTIONS = [
  "JavaScript", "TypeScript", "React", "Vue.js", "Angular", "Next.js",
  "Node.js", "Express", "Python", "Django", "FastAPI", "Flask",
  "Java", "Spring Boot", "Go", "Rust", "C++",
  "SQL & Databases", "MongoDB", "Redis", "GraphQL",
  "System Design", "Data Structures", "Algorithms",
  "AWS / Cloud", "DevOps", "Docker", "Kubernetes",
  "Machine Learning", "CSS & HTML", "REST APIs", "General HR",
];

// ─── Setup Screen ─────────────────────────────────────────────────────────────
function SetupScreen({ onStart, defaultTopic, defaultDifficulty }) {
  const [jobRole,        setJobRole]        = useState("");
  const [interviewType,  setInterviewType]  = useState("topics");
  const [selectedTopics, setSelectedTopics] = useState(
    TOPIC_OPTIONS.includes(defaultTopic) ? [defaultTopic] : ["JavaScript", "React"]
  );
  const [customTopic,    setCustomTopic]    = useState("");
  const [cvText,         setCvText]         = useState("");
  const [difficulty,     setDifficulty]     = useState(defaultDifficulty || "medium");
  const [maxTurns,       setMaxTurns]       = useState(30);
  const [err,            setErr]            = useState("");

  const toggleTopic = (t) =>
    setSelectedTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const addCustom = () => {
    const t = customTopic.trim();
    if (!t) return;
    if (!selectedTopics.includes(t)) setSelectedTopics(prev => [...prev, t]);
    setCustomTopic("");
  };

  const handleStart = () => {
    if (interviewType === "topics" && selectedTopics.length === 0) {
      setErr("Please select at least one topic."); return;
    }
    if (interviewType === "cv" && !cvText.trim()) {
      setErr("Please paste your CV / resume text."); return;
    }
    setErr("");
    onStart({
      jobRole:       jobRole.trim() || "Software Engineer",
      interviewType,
      topics:        selectedTopics,
      cvText:        cvText.trim(),
      difficulty,
      maxTurns,
    });
  };

  return (
    <div className="s-wrap">
      <div className="s-card">
        {/* Header */}
        <div className="s-head">
          <span className="s-badge">Interview Setup</span>
          <h2 className="s-title">Configure Your Interview</h2>
          <p className="s-sub">
            Tell us about your target role and how you'd like to be interviewed.
            Alex, your AI interviewer, will tailor every question to your profile.
          </p>
        </div>

        {/* Job Role */}
        <div className="s-field">
          <label className="s-label">🎯 Target Role</label>
          <input
            className="s-input"
            value={jobRole}
            onChange={e => setJobRole(e.target.value)}
            placeholder="e.g. Senior Frontend Developer, Full Stack Engineer…"
          />
        </div>

        {/* Interview Type */}
        <div className="s-field">
          <label className="s-label">📋 Interview Type</label>
          <div className="s-toggle-row">
            <button
              className={`s-toggle-btn ${interviewType === "topics" ? "s-toggle-btn-on" : ""}`}
              onClick={() => setInterviewType("topics")}
            >
              🗂️ Topic-Based
              <span className="s-toggle-hint">Pick from a list of topics</span>
            </button>
            <button
              className={`s-toggle-btn ${interviewType === "cv" ? "s-toggle-btn-on" : ""}`}
              onClick={() => setInterviewType("cv")}
            >
              📄 CV-Based
              <span className="s-toggle-hint">AI asks from your resume</span>
            </button>
          </div>
        </div>

        {/* Topic pills */}
        {interviewType === "topics" && (
          <div className="s-field">
            <label className="s-label">
              Select Topics
              <span className="s-label-count">{selectedTopics.length} selected</span>
            </label>
            <div className="s-pill-grid">
              {TOPIC_OPTIONS.map(t => (
                <button
                  key={t}
                  className={`s-pill ${selectedTopics.includes(t) ? "s-pill-on" : ""}`}
                  onClick={() => toggleTopic(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="s-custom-row">
              <input
                className="s-input s-input-sm"
                value={customTopic}
                onChange={e => setCustomTopic(e.target.value)}
                placeholder="Add a custom topic…"
                onKeyDown={e => e.key === "Enter" && addCustom()}
              />
              <button className="s-btn-ghost" onClick={addCustom}>+ Add</button>
            </div>
          </div>
        )}

        {/* CV Upload */}
{interviewType === "cv" && (
  <div className="s-field">
    <label className="s-label">📄 Upload Resume PDF</label>

    <p className="s-hint-text">
      Upload your resume in PDF format. AI will automatically extract the text and generate interview questions based on your experience.
    </p>

    <input
      type="file"
      accept=".pdf"
      className="s-input"
      onChange={async (e) => {
        const file = e.target.files[0];

        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
          const res = await api.post(
            "/interview/upload-cv",
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          );

          setCvText(res.data.cv_text);

          alert("✅ Resume uploaded successfully!");
        } catch (err) {
          console.error(err);
          alert(
            err.response?.data?.detail ||
            "Failed to upload PDF."
          );
        }
      }}
    />

    {cvText && (
      <div
        style={{
          marginTop: "12px",
          padding: "10px",
          borderRadius: "8px",
          background: "rgba(34,197,94,.08)",
          border: "1px solid rgba(34,197,94,.25)",
        }}
      >
        ✅ Resume parsed successfully
      </div>
    )}
  </div>
)}

        {/* Difficulty + Questions */}
        <div className="s-two-col">
          <div className="s-field">
            <label className="s-label">⚡ Difficulty</label>
            <div className="s-seg">
              {["easy", "medium", "hard"].map(d => (
                <button
                  key={d}
                  className={`s-seg-btn ${difficulty === d ? "s-seg-btn-on" : ""}`}
                  onClick={() => setDifficulty(d)}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="s-field">
            <label className="s-label">❓ Questions</label>
            <div className="s-seg">
              {[3, 5, 6, 8].map(n => (
                <button
                  key={n}
                  className={`s-seg-btn ${maxTurns === n ? "s-seg-btn-on" : ""}`}
                  onClick={() => setMaxTurns(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {err && <p className="s-err">{err}</p>}

        <button className="s-start-btn" onClick={handleStart}>
          <span>▶</span> Start Full-Screen Interview
        </button>

        <p className="s-footer-note">
          🎙️ Uses Groq Whisper for accurate speech-to-text — works in any browser
        </p>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function LiveInterview({
  topic: defaultTopic = "React",
  difficulty: defaultDiff = "medium",
}) {
  const [screen,     setScreen]     = useState("setup");
  const [config,     setConfig]     = useState(null);
  const [phase,      setPhase]      = useState("");   // thinking|speaking|recording|submitting|done
  const [currentQ,   setCurrentQ]   = useState("");
  const [transcript, setTranscript] = useState("");
  const [chatLog,    setChatLog]    = useState([]);
  const [report,     setReport]     = useState(null);
  const [turn,       setTurn]       = useState(0);
  const [volume,     setVolume]     = useState(0);
  const [errMsg,     setErrMsg]     = useState("");
  const [elapsed,    setElapsed]    = useState(0);
  const [isFS,       setIsFS]       = useState(false);

  const mediaRecRef  = useRef(null);
  const chunksRef    = useRef([]);
  const resolveRef   = useRef(null);
  const streamRef    = useRef(null);
  const analyserRef  = useRef(null);
  const volTimer     = useRef(null);
  const timerRef     = useRef(null);
  const mounted      = useRef(true);
  const containerRef = useRef(null);
  const configRef    = useRef(null);
  // HeyGen refs
  const heygenSessionRef = useRef(null);   // HeyGen session_id
  const heygenReadyRef   = useRef(false);  // true once WebRTC connected
  const speakResolveRef  = useRef(null);   // resolves _speak() promise
  const speakTimeoutRef  = useRef(null);   // safety timeout for speak

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearInterval(volTimer.current);
      clearInterval(timerRef.current);
      window.speechSynthesis?.cancel();
      _stopRec();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const onFSChange = () => setIsFS(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, []);

  useEffect(() => { configRef.current = config; }, [config]);

  // ── Audio helpers ────────────────────────────────────────────────────────────

  function _stopRec() {
    try {
      if (mediaRecRef.current && mediaRecRef.current.state !== "inactive")
        mediaRecRef.current.stop();
    } catch {}
    mediaRecRef.current = null;
    chunksRef.current   = [];
  }

  async function _initMic() {
    if (streamRef.current) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        const ctx = new AC();
        const an  = ctx.createAnalyser();
        an.fftSize = 256;
        ctx.createMediaStreamSource(stream).connect(an);
        analyserRef.current = an;
        volTimer.current = setInterval(() => {
          if (!analyserRef.current || !mounted.current) return;
          const d = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(d);
          setVolume(Math.round(d.reduce((a, b) => a + b, 0) / d.length));
        }, 80);
      }
      return true;
    } catch {
      setErrMsg("🚫 Microphone access denied. Allow mic in your browser settings and reload.");
      return false;
    }
  }

  // ── HeyGen avatar speak — sends text to live WebRTC avatar ──────────────────
  function _speak(text) {
    return new Promise(resolve => {
      if (!text) { resolve(); return; }
      // If HeyGen avatar is ready, use it
      if (heygenReadyRef.current && heygenSessionRef.current) {
        speakResolveRef.current = resolve;
        api.post("/interview/heygen/task", {
          session_id: heygenSessionRef.current,
          text: text.trim(),
          task_type: "talk",
        }).catch(() => {
          // Fallback to browser TTS if HeyGen fails
          _speakBrowser(text).then(resolve);
        });
        // Safety timeout — resolve after estimated duration if AVATAR_STOP event is missed
        const words = text.split(" ").length;
        const ms    = Math.max(words * 380 + 1500, 3000);
        speakTimeoutRef.current = setTimeout(() => {
          if (speakResolveRef.current) {
            speakResolveRef.current();
            speakResolveRef.current = null;
          }
        }, ms);
      } else {
        // HeyGen not ready yet — fall back to browser TTS
        _speakBrowser(text).then(resolve);
      }
    });
  }

  // Browser TTS fallback
  function _speakBrowser(text) {
    return new Promise(resolve => {
      window.speechSynthesis?.cancel();
      if (!window.speechSynthesis || !text) { resolve(); return; }
      const parts = text.match(/[^.!?]+[.!?]+/g) || [text];
      let i = 0;
      const next = () => {
        if (i >= parts.length || !mounted.current) { resolve(); return; }
        const u = new SpeechSynthesisUtterance(parts[i++].trim());
        u.rate = 1.1; u.pitch = 1;
        const voices = window.speechSynthesis.getVoices();
        const v = voices.find(v => v.name.includes("Google") && v.lang === "en-US")
               || voices.find(v => v.lang.startsWith("en"));
        if (v) u.voice = v;
        u.onend  = next;
        u.onerror = next;
        window.speechSynthesis.speak(u);
      };
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.addEventListener("voiceschanged", next, { once: true });
      } else {
        next();
      }
    });
  }

  // ── MediaRecorder start ──────────────────────────────────────────────────────
  function _startRecording() {
    const stream = streamRef.current;
    if (!stream) return false;
    chunksRef.current = [];
    const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", ""]
      .find(t => !t || MediaRecorder.isTypeSupported(t)) || "";
    try {
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mr.ondataavailable = e => { if (e.data?.size > 0) chunksRef.current.push(e.data); };
      mr.start(200);
      mediaRecRef.current = mr;
      return true;
    } catch (e) {
      setErrMsg("Recording error: " + e.message);
      return false;
    }
  }

  // ── Stop recorder → send to Groq Whisper → return transcript ────────────────
  async function _stopAndTranscribe() {
    return new Promise(resolve => {
      const mr = mediaRecRef.current;
      if (!mr || mr.state === "inactive") { resolve(""); return; }
      mr.onstop = async () => {
        const type = mr.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current  = [];
        mediaRecRef.current = null;
        if (blob.size < 500) { resolve(""); return; }
        const fd = new FormData();
        fd.append("file", blob, "recording.webm");
        try {
          const res = await api.post("/interview/transcribe", fd, {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 40000,
          });
          resolve(res.data.transcript?.trim() || "");
        } catch (err) {
          console.error("Transcription error:", err);
          resolve("");
        }
      };
      try { mr.stop(); } catch { resolve(""); }
    });
  }

  // ── Pause loop until Submit is clicked ──────────────────────────────────────
  function _waitForAnswer() {
    return new Promise(resolve => { resolveRef.current = resolve; });
  }

  // ── Main interview async loop ────────────────────────────────────────────────
  async function _runInterview(cfg) {
    let history = [];
    const topicStr = cfg.topics.join(", ");

    for (let t = 0; t < cfg.maxTurns; t++) {
      if (!mounted.current) return;

      setPhase("thinking");
      setTranscript("");

      // Ask AI
      let aiData;
      try {
        const res = await api.post("/interview/chat", {
          messages:   history,
          system:     "",
          topic:      topicStr,
          difficulty: cfg.difficulty,
          turn:       t,
          maxTurns:   cfg.maxTurns,
          cv_text:    cfg.cvText,
          job_role:   cfg.jobRole,
        });
        aiData = res.data;
      } catch (err) {
        if (!mounted.current) return;
        setErrMsg("Error contacting AI: " + (err.response?.data?.detail || err.message));
        return;
      }

      if (!mounted.current) return;
      const { question, is_final, report: rpt } = aiData;

      // Final report
      if (is_final && rpt) {
        setCurrentQ("Interview complete!");
        setPhase("speaking");
        await _speak(question || "Thank you — that concludes our interview.");
        if (mounted.current) { setReport(rpt); setPhase("done"); }
        return;
      }

      // AI speaks question
      setCurrentQ(question);
      setChatLog(prev => [...prev, { role: "assistant", content: question }]);
      setTurn(t + 1);
      setPhase("speaking");
      await _speak(question);
      if (!mounted.current) return;

      // User records answer
      setPhase("recording");
      setTranscript("");
      _startRecording();

      const answer = await _waitForAnswer(); // blocks until Submit clicked
      if (!mounted.current) return;

      setChatLog(prev => [...prev, { role: "user", content: answer }]);
      history = [
        ...history,
        { role: "assistant", content: question },
        { role: "user",      content: answer   },
      ];
    }

    // Run one more turn to get final report if loop exited without is_final
    if (!mounted.current) return;
    setPhase("thinking");
    const cfg2 = configRef.current;
    try {
      const res = await api.post("/interview/chat", {
        messages:   history,
        system:     "",
        topic:      cfg2.topics.join(", "),
        difficulty: cfg2.difficulty,
        turn:       cfg2.maxTurns,
        maxTurns:   cfg2.maxTurns,
        cv_text:    cfg2.cvText,
        job_role:   cfg2.jobRole,
      });
      const d = res.data;
      if (d.report) {
        setPhase("speaking");
        setCurrentQ("Interview complete!");
        await _speak(d.question || "Thank you — that concludes our interview.");
        if (mounted.current) { setReport(d.report); setPhase("done"); }
      }
    } catch {}
  }

  // ── Handle Start ─────────────────────────────────────────────────────────────
  const handleStart = useCallback(async (cfg) => {
    setErrMsg("");
    const micOk = await _initMic();
    if (!micOk) return;

    setConfig(cfg);
    configRef.current = cfg;
    setScreen("interview");
    setChatLog([]);
    setTurn(0);
    setReport(null);
    setTranscript("");
    setCurrentQ("");
    setElapsed(0);

    // Enter fullscreen
    try { await containerRef.current?.requestFullscreen(); } catch {}

    // Start timer
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);

    // Run the loop
    await _runInterview(cfg);
  }, []);

  // ── Submit answer ─────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (phase !== "recording") return;
    setPhase("submitting");
    setErrMsg("");

    const text = await _stopAndTranscribe();
    if (!mounted.current) return;

    if (!text.trim()) {
      setErrMsg("❌ No speech detected. Please speak clearly and try again.");
      setPhase("recording");
      _startRecording();
      return;
    }

    setTranscript(text);
    if (resolveRef.current) {
      resolveRef.current(text.trim());
      resolveRef.current = null;
    }
  }, [phase]);

  // ── Re-record ─────────────────────────────────────────────────────────────────
  const handleReRecord = useCallback(() => {
    _stopRec();
    setTranscript("");
    setErrMsg("");
    _startRecording();
    setPhase("recording");
  }, []);

  // ── Exit fullscreen / interview ───────────────────────────────────────────────
  const handleExit = useCallback(async () => {
    clearInterval(timerRef.current);
    _stopRec();
    window.speechSynthesis?.cancel();
    try { await document.exitFullscreen(); } catch {}
    setScreen("setup");
    setPhase("");
    setReport(null);
    setChatLog([]);
    setTurn(0);
    setTranscript("");
    setCurrentQ("");
  }, []);

  // ── Timer display ─────────────────────────────────────────────────────────────
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const volPct   = Math.min(volume * 3.5, 100);
  const volColor = volume > 18 ? "#22c55e" : volume > 7 ? "#f59e0b" : "#1e293b";

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className={`li-root${isFS ? " li-root-fs" : ""}`}>

      {/* ── SETUP SCREEN ─────────────────────────────────────────────────────── */}
      {screen === "setup" && (
        <SetupScreen
          onStart={handleStart}
          defaultTopic={defaultTopic}
          defaultDifficulty={defaultDiff}
        />
      )}

      {/* ── INTERVIEW ROOM ───────────────────────────────────────────────────── */}
      {screen === "interview" && (
        <div className="ir-room">

          {/* Top bar */}
          <header className="ir-topbar">
            <div className="ir-logo">
              <span className="ir-logo-dot" />
              PrepMate AI
            </div>

            {/* Progress dots */}
            <div className="ir-progress">
              {phase !== "done" && Array.from({ length: config?.maxTurns || 6 }, (_, i) => (
                <div
                  key={i}
                  className={`ir-pdot ${i < turn ? "ir-pdot-done" : i === turn - 1 ? "ir-pdot-cur" : ""}`}
                />
              ))}
              {phase !== "done" && turn > 0 && (
                <span className="ir-turn-label">Q{turn}/{config?.maxTurns}</span>
              )}
            </div>

            <div className="ir-topbar-right">
              <span className="ir-timer">⏱ {mm}:{ss}</span>
              <button className="ir-exit-btn" onClick={handleExit} title="Exit Interview">
                ✕ Exit
              </button>
            </div>
          </header>

          {/* Main area */}
          <main className="ir-main">

            {/* LEFT — HeyGen Live Avatar */}
            <aside className="ir-avatar-col">
              <HeyGenAvatar
                phase={phase}
                sessionIdRef={heygenSessionRef}
                readyRef={heygenReadyRef}
                speakResolveRef={speakResolveRef}
                speakTimeoutRef={speakTimeoutRef}
              />

              {/* Mic volume bar */}
              {phase === 'recording' && (
                <div className="ir-vol-bar-wrap">
                  <div className="ir-vol-track">
                    <div className="ir-vol-fill" style={{ width: `${volPct}%`, background: volColor }} />
                  </div>
                  {volume < 6 && <p className="ir-vol-low">Speak louder ↑</p>}
                </div>
              )}
            </aside>

            {/* RIGHT — Content */}
            <section className="ir-content">

              {/* THINKING */}
              {phase === "thinking" && (
                <div className="ir-thinking">
                  <div className="ir-dots"><span /><span /><span /></div>
                  <p className="ir-dim">Alex is preparing your next question…</p>
                </div>
              )}

              {/* SPEAKING */}
              {phase === "speaking" && (
                <div className="ir-q-card ir-q-card-speaking">
                  <span className="ir-q-label">🎙 Alex is asking:</span>
                  <p className="ir-q-text">{currentQ}</p>
                </div>
              )}

              {/* RECORDING */}
              {phase === "recording" && (
                <div className="ir-answer-area">
                  {/* Compact question reminder */}
                  <div className="ir-q-mini">
                    <span className="ir-q-mini-label">Question</span>
                    <p className="ir-q-mini-text">{currentQ}</p>
                  </div>

                  {/* Recording indicator */}
                  <div className="ir-rec-box">
                    <div className="ir-rec-header">
                      <span className="ir-rec-dot" />
                      <span className="ir-rec-label">Recording — speak your answer now</span>
                    </div>
                    <div className="ir-speak-area">
                      <p className="ir-speak-hint">
                        Speak clearly into your microphone.<br />
                        Click <strong>Submit Answer</strong> when you're done.
                      </p>
                    </div>
                    {errMsg && <p className="ir-err">{errMsg}</p>}
                    <div className="ir-btn-row">
                      <button className="ir-btn ir-btn-submit" onClick={handleSubmit}>
                        ✅ Submit Answer
                      </button>
                      <button className="ir-btn ir-btn-ghost" onClick={handleReRecord}>
                        🔄 Re-record
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBMITTING */}
              {phase === "submitting" && (
                <div className="ir-submitting">
                  <div className="ir-dots"><span /><span /><span /></div>
                  <p className="ir-dim">Transcribing your answer with Groq Whisper…</p>
                </div>
              )}

              {/* DONE — Report */}
              {phase === "done" && report && (
                <div className="ir-report">
                  <div className="ir-report-hero">
                    <h3 className="ir-report-title">Interview Complete 🎉</h3>
                    <p className="ir-report-sum">{report.summary}</p>
                  </div>

                  <div className="ir-score-row">
                    <ScoreCard label="Overall" score={report.overallScore} big />
                    {report.topicScores && Object.entries(report.topicScores).map(([k, v]) => (
                      <ScoreCard key={k} label={k} score={v} />
                    ))}
                  </div>

                  <div className="ir-fb-grid">
                    <div className="ir-fb-card ir-fb-green">
                      <p className="ir-fb-head">✅ Strengths</p>
                      {report.strengths?.map((s, i) => <p key={i} className="ir-fb-item">• {s}</p>)}
                    </div>
                    <div className="ir-fb-card ir-fb-amber">
                      <p className="ir-fb-head">📈 Areas to Improve</p>
                      {report.improvements?.map((s, i) => <p key={i} className="ir-fb-item">• {s}</p>)}
                    </div>
                  </div>

                  <div className="ir-log">
                    <p className="ir-log-title">💬 Interview Transcript</p>
                    {chatLog.map((m, i) => (
                      <div key={i} className={`ir-msg ir-msg-${m.role}`}>
                        <span className="ir-msg-who">{m.role === "assistant" ? "🤖 Alex" : "👤 You"}</span>
                        <p className="ir-msg-text">{m.content}</p>
                      </div>
                    ))}
                  </div>

                  <button className="ir-btn ir-btn-submit ir-btn-full" onClick={handleExit}>
                    Exit & Return to Dashboard
                  </button>
                </div>
              )}

            </section>
          </main>
        </div>
      )}

      <style>{CSS}</style>
    </div>
  );
}

// ─── HeyGen Live Avatar ────────────────────────────────────────────────────────
function HeyGenAvatar({ phase, sessionIdRef, readyRef, speakResolveRef, speakTimeoutRef }) {
  const videoRef  = useRef(null);
  const pcRef     = useRef(null);
  const [status, setStatus] = useState("connecting"); // connecting | ready | error

  useEffect(() => {
    let cancelled = false;
    let pc = null;

    (async () => {
      try {
        setStatus("connecting");

        // 1. Ask backend to create HeyGen session
        const { data } = await api.post("/interview/heygen/new");
        if (cancelled) return;

        const hgData = data?.data;
        if (!hgData) { setStatus("error"); return; }

        const { session_id, sdp: remoteSdp, ice_servers2 } = hgData;
        sessionIdRef.current = session_id;

        // 2. Create WebRTC peer connection using HeyGen's ICE servers
        pc = new RTCPeerConnection({ iceServers: ice_servers2 || [] });
        pcRef.current = pc;

        // 3. When avatar video track arrives, attach to <video>
        pc.ontrack = (e) => {
          if (videoRef.current && e.streams?.[0]) {
            videoRef.current.srcObject = e.streams[0];
            videoRef.current.play().catch(() => {});
          }
        };

        // 4. Handle avatar stop-talking (resolve _speak promise)
        pc.ondatachannel = (e) => {
          e.channel.onmessage = (msg) => {
            try {
              const payload = JSON.parse(msg.data);
              if (payload?.type === "avatar_stop_talking") {
                clearTimeout(speakTimeoutRef.current);
                if (speakResolveRef.current) {
                  speakResolveRef.current();
                  speakResolveRef.current = null;
                }
              }
            } catch {}
          };
        };

        // 5. Set HeyGen's SDP offer as remote description
        await pc.setRemoteDescription(new RTCSessionDescription(remoteSdp));

        // 6. Create our SDP answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // 7. Send answer back to HeyGen via backend
        await api.post("/interview/heygen/start", {
          session_id,
          sdp: answer,
        });

        if (!cancelled) {
          readyRef.current = true;
          setStatus("ready");
        }
      } catch (err) {
        console.error("HeyGen init error:", err);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      readyRef.current = false;
      // Stop session
      if (sessionIdRef.current) {
        api.post("/interview/heygen/stop", { session_id: sessionIdRef.current }).catch(() => {});
        sessionIdRef.current = null;
      }
      pc?.close();
      pcRef.current = null;
    };
  }, []);

  return (
    <div className={`ir-video-card${phase === "speaking" ? " ir-video-speaking" : phase === "recording" ? " ir-video-listening" : phase === "thinking" ? " ir-video-thinking" : ""}`}>
      <div className="ir-face-wrap">

        {/* Live HeyGen video stream */}
        <video
          ref={videoRef}
          className="ir-heygen-video"
          autoPlay
          playsInline
        />

        {/* Loading overlay */}
        {status === "connecting" && (
          <div className="ir-hg-loading">
            <div className="ir-dots"><span /><span /><span /></div>
            <p>Connecting to Alex…</p>
          </div>
        )}

        {/* Error overlay */}
        {status === "error" && (
          <div className="ir-hg-loading">
            <p style={{ color: "#f87171" }}>⚠️ Avatar unavailable<br /><small>Using voice-only mode</small></p>
          </div>
        )}

        {/* Video overlay — nameplate + status badge */}
        <div className="ir-video-overlay">
          <div className="ir-nameplate">
            <span className={`ir-np-dot${phase === "speaking" ? " ir-np-dot-live" : ""}`} />
            Alex
          </div>
          {phase === "speaking"   && <div className="ir-speaking-badge"><WaveBars /> Speaking</div>}
          {phase === "thinking"   && <div className="ir-thinking-badge"><Spin /> Thinking</div>}
          {phase === "recording"  && <div className="ir-listening-badge"><Pulse /> Listening</div>}
          {phase === "submitting" && <div className="ir-thinking-badge"><Spin /> Processing</div>}
        </div>
      </div>
      <div className="ir-role-tag">Senior Software Engineer · Interviewer</div>
    </div>
  );
}

// ─── Small sub-components ──────────────────────────────────────────────────────
function ScoreCard({ label, score, big }) {
  const c = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className={`ir-score-card${big ? " ir-score-big" : ""}`}>
      <p className="ir-score-num" style={{ color: c }}>{score}</p>
      <p className="ir-score-lbl">{label}</p>
    </div>
  );
}

function Spin()     { return <span className="li-spin" />;  }
function Pulse()    { return <span className="li-pulse" />; }
function WaveBars() {
  return (
    <span className="li-wave">
      <span /><span /><span /><span />
    </span>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
/* ── Root ────────────────────────────────────────────────────────────────── */
.li-root { font-family:'Inter',sans-serif; color:#f1f5f9; }
.li-root-fs {
  position:fixed; top:0; left:0; width:100vw; height:100vh;
  z-index:9999; overflow:auto; background:#020817;
}

/* ══════════════════════════════════════════════════════════════════════════
   SETUP SCREEN
══════════════════════════════════════════════════════════════════════════ */
.s-wrap {
  min-height:100vh; display:flex; align-items:flex-start;
  justify-content:center; padding:32px 16px;
}
.s-card {
  width:100%; max-width:760px;
  background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08);
  border-radius:20px; padding:36px 40px;
}
@media(max-width:600px){ .s-card{ padding:24px 18px; } }

.s-head { margin-bottom:28px; }
.s-badge {
  display:inline-block; font-size:10px; font-weight:700; letter-spacing:.1em;
  text-transform:uppercase; color:#60a5fa;
  background:rgba(96,165,250,.1); border:1px solid rgba(96,165,250,.25);
  border-radius:99px; padding:3px 12px; margin-bottom:10px;
}
.s-title { font-size:24px; font-weight:700; margin:0 0 8px; }
.s-sub   { color:#94a3b8; font-size:14px; line-height:1.65; margin:0; }

.s-field { margin-bottom:22px; }
.s-label {
  display:flex; align-items:center; gap:8px;
  font-size:13px; font-weight:600; color:#cbd5e1; margin-bottom:10px;
}
.s-label-count {
  font-size:11px; font-weight:400; color:#60a5fa;
  background:rgba(96,165,250,.1); border-radius:99px; padding:1px 8px;
}
.s-hint-text { font-size:12px; color:#64748b; margin:0 0 10px; line-height:1.5; }

.s-input {
  width:100%; box-sizing:border-box; padding:11px 14px;
  background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1);
  border-radius:10px; color:#f1f5f9; font-size:14px; font-family:inherit;
  outline:none; transition:border-color .2s;
}
.s-input:focus { border-color:rgba(59,130,246,.5); }
.s-input::placeholder { color:#475569; }
.s-input-sm { width:auto; flex:1; }

.s-textarea {
  width:100%; box-sizing:border-box; padding:12px 14px;
  background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1);
  border-radius:10px; color:#f1f5f9; font-size:13px; font-family:inherit;
  resize:vertical; outline:none; transition:border-color .2s; line-height:1.6;
}
.s-textarea:focus { border-color:rgba(59,130,246,.5); }
.s-textarea::placeholder { color:#475569; }

/* Type toggle */
.s-toggle-row { display:flex; gap:10px; }
.s-toggle-btn {
  flex:1; padding:14px 16px; border-radius:12px; border:1px solid rgba(255,255,255,.1);
  background:rgba(255,255,255,.04); color:#94a3b8; cursor:pointer;
  display:flex; flex-direction:column; align-items:center; gap:4px;
  font-size:14px; font-weight:600; transition:all .18s;
}
.s-toggle-btn:hover { border-color:rgba(255,255,255,.2); color:#e2e8f0; }
.s-toggle-btn-on {
  background:rgba(59,130,246,.12); border-color:rgba(59,130,246,.4);
  color:#60a5fa;
}
.s-toggle-hint { font-size:11px; font-weight:400; color:inherit; opacity:.7; }

/* Topic pills */
.s-pill-grid { display:flex; flex-wrap:wrap; gap:7px; margin-bottom:12px; }
.s-pill {
  padding:5px 13px; border-radius:99px; font-size:12px; font-weight:500;
  border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.04);
  color:#94a3b8; cursor:pointer; transition:all .15s;
}
.s-pill:hover { border-color:rgba(255,255,255,.2); color:#e2e8f0; }
.s-pill-on {
  background:rgba(59,130,246,.15); border-color:rgba(59,130,246,.5); color:#60a5fa;
}
.s-custom-row { display:flex; gap:8px; align-items:center; }
.s-btn-ghost {
  padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600;
  border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.06);
  color:#94a3b8; cursor:pointer; white-space:nowrap; transition:all .15s;
}
.s-btn-ghost:hover { background:rgba(255,255,255,.1); color:#e2e8f0; }

/* Difficulty / Questions segmented control */
.s-two-col { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
@media(max-width:500px){ .s-two-col{ grid-template-columns:1fr; } }

.s-seg { display:flex; gap:4px; }
.s-seg-btn {
  flex:1; padding:8px; border-radius:8px; font-size:13px; font-weight:500;
  border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.04);
  color:#94a3b8; cursor:pointer; transition:all .15s;
}
.s-seg-btn:hover { background:rgba(255,255,255,.08); color:#e2e8f0; }
.s-seg-btn-on {
  background:rgba(59,130,246,.15); border-color:rgba(59,130,246,.4); color:#60a5fa;
}

.s-err { color:#f87171; font-size:13px; margin:4px 0 14px; }

.s-start-btn {
  width:100%; padding:15px; border-radius:12px; font-size:16px; font-weight:700;
  background:linear-gradient(135deg,#2563eb,#6366f1); color:#fff; border:none;
  cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px;
  box-shadow:0 0 32px rgba(99,102,241,.35); transition:all .2s; margin-top:8px;
}
.s-start-btn:hover { box-shadow:0 0 48px rgba(99,102,241,.55); transform:translateY(-1px); }
.s-footer-note { text-align:center; color:#475569; font-size:12px; margin:14px 0 0; }

/* ══════════════════════════════════════════════════════════════════════════
   INTERVIEW ROOM
══════════════════════════════════════════════════════════════════════════ */
.ir-room {
  display:flex; flex-direction:column; height:100vh; min-height:100vh;
  background:linear-gradient(135deg, #020817 0%, #0d1526 100%);
  overflow:hidden;
}

/* Top bar */
.ir-topbar {
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 24px; border-bottom:1px solid rgba(255,255,255,.07);
  background:rgba(2,8,23,.8); backdrop-filter:blur(12px);
  flex-shrink:0; gap:16px;
}
.ir-logo {
  display:flex; align-items:center; gap:8px;
  font-size:15px; font-weight:700; color:#f1f5f9; white-space:nowrap;
}
.ir-logo-dot {
  width:8px; height:8px; border-radius:50%; background:#3b82f6;
  box-shadow:0 0 10px rgba(59,130,246,.8); animation:ir-glow 2s ease-in-out infinite;
}
@keyframes ir-glow { 0%,100%{opacity:1} 50%{opacity:.4} }

.ir-progress { display:flex; align-items:center; gap:6px; flex:1; justify-content:center; }
.ir-pdot {
  width:8px; height:8px; border-radius:50%;
  background:rgba(255,255,255,.15); transition:all .3s;
}
.ir-pdot-done { background:#3b82f6; }
.ir-pdot-cur  { background:#6366f1; box-shadow:0 0 8px rgba(99,102,241,.7); transform:scale(1.3); }
.ir-turn-label { font-size:12px; color:#64748b; margin-left:6px; white-space:nowrap; }

.ir-topbar-right { display:flex; align-items:center; gap:12px; }
.ir-timer { font-size:14px; font-weight:600; color:#60a5fa; font-variant-numeric:tabular-nums; }
.ir-exit-btn {
  padding:7px 16px; border-radius:8px; font-size:12px; font-weight:600;
  border:1px solid rgba(239,68,68,.3); background:rgba(239,68,68,.1);
  color:#f87171; cursor:pointer; transition:all .15s; white-space:nowrap;
}
.ir-exit-btn:hover { background:rgba(239,68,68,.2); color:#fca5a5; }

/* Main split */
.ir-main {
  display:flex; flex:1; overflow:hidden;
  min-height:0; /* allow flex children to shrink */
}

/* ─ Avatar / Video column — HALF SCREEN LEFT */
.ir-avatar-col {
  width:50%;
  flex-shrink:0;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  padding:20px 24px;
  gap:12px;
  border-right:1px solid rgba(255,255,255,.07);
  background:rgba(2,5,16,.9);
}
@media(max-width:860px){
  .ir-main { flex-direction:column; }
  .ir-avatar-col { width:100%; padding:14px 16px; border-right:none;
                   border-bottom:1px solid rgba(255,255,255,.06);
                   flex-direction:row; justify-content:flex-start; }
}

/* Video card — full height portrait, fills the left half */
.ir-video-card {
  width:100%;
  max-width:480px;
  border-radius:20px;
  overflow:hidden;
  border:2px solid rgba(255,255,255,.1);
  background:#0a0f1e;
  transition:border-color .4s, box-shadow .4s;
  box-shadow:0 12px 48px rgba(0,0,0,.6);
}
.ir-video-speaking {
  border-color:#6366f1;
  box-shadow:0 0 0 3px rgba(99,102,241,.25), 0 8px 40px rgba(99,102,241,.2);
  animation:vc-speak-glow 1.4s ease-in-out infinite;
}
.ir-video-listening {
  border-color:#22c55e;
  box-shadow:0 0 0 3px rgba(34,197,94,.2), 0 8px 32px rgba(0,0,0,.4);
}
.ir-video-thinking {
  border-color:#3b82f6;
  box-shadow:0 0 0 2px rgba(59,130,246,.15), 0 8px 32px rgba(0,0,0,.4);
}
@keyframes vc-speak-glow {
  0%,100% { box-shadow:0 0 0 3px rgba(99,102,241,.25), 0 8px 40px rgba(99,102,241,.2); }
  50%      { box-shadow:0 0 0 6px rgba(99,102,241,.45), 0 8px 50px rgba(99,102,241,.35); }
}

/* Face wrapper — proper portrait aspect ratio */
.ir-face-wrap {
  position:relative;
  width:100%;
  padding-bottom:125%; /* 4:5 portrait ratio */
  overflow:hidden;
  background:#0d1117;
}

/* Full face image (base layer) */
.ir-face-img {
  position:absolute;
  top:0; left:0; width:100%; height:100%;
  object-fit:cover; object-position:center top;
  display:block; user-select:none;
}

/* HeyGen live video stream */
.ir-heygen-video {
  position:absolute;
  top:0; left:0; width:100%; height:100%;
  object-fit:cover; object-position:center top;
  display:block; background:#050c1a;
}

/* Loading / error overlay on top of video */
.ir-hg-loading {
  position:absolute; top:0; left:0; width:100%; height:100%;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  background:rgba(5,12,26,.85); gap:14px; z-index:6;
  font-size:13px; color:#94a3b8; text-align:center; padding:12px;
}

/* Jaw overlay container — clips to bottom 30% of face */
.ir-jaw-overlay {
  position:absolute;
  top:70%; left:0; width:100%;
  height:30%;
  overflow:hidden;
}

/* The jaw image — positioned to show the correct part of the face */
.ir-jaw-img {
  position:absolute;
  /* Place the image so its bottom-30% is visible */
  bottom:0; left:0;
  width:100%;
  /* Height must be 100/30 * 100% = 333% to position correctly */
  height:333%;
  object-fit:cover; object-position:center top;
  display:block; user-select:none;
  transform-origin:top center;
}

/* Jaw talking animation — moves the jaw img down */
.ir-jaw-talking {
  animation:jaw-open 0.15s ease-in-out infinite alternate;
}
@keyframes jaw-open {
  from { transform:translateY(0);  }
  to   { transform:translateY(5px); }
}

/* Mouth gap SVG — sits at the jaw boundary (70% down) */
.ir-mouth-gap {
  position:absolute;
  top:calc(70% - 10px);
  left:50%;
  transform:translateX(-50%);
  width:38%;
  z-index:5;
  pointer-events:none;
}
.ir-mouth-gap svg { width:100%; height:auto; display:block; }

/* Video overlay: nameplate, speaking badge */
.ir-video-overlay {
  position:absolute;
  bottom:0; left:0; right:0;
  padding:8px 10px;
  background:linear-gradient(transparent, rgba(0,0,0,.75));
  display:flex; align-items:flex-end; justify-content:space-between;
  z-index:10;
}
.ir-nameplate {
  display:flex; align-items:center; gap:6px;
  font-size:12px; font-weight:700; color:#fff;
  text-shadow:0 1px 4px rgba(0,0,0,.8);
}
.ir-np-dot {
  width:8px; height:8px; border-radius:50%; background:#64748b; flex-shrink:0;
}
.ir-np-dot-live {
  background:#22c55e;
  box-shadow:0 0 6px rgba(34,197,94,.8);
  animation:ir-blink 1s ease-in-out infinite;
}

.ir-speaking-badge,
.ir-thinking-badge,
.ir-listening-badge {
  display:flex; align-items:center; gap:5px;
  font-size:10px; font-weight:600; padding:3px 8px;
  border-radius:99px;
}
.ir-speaking-badge  { background:rgba(99,102,241,.7); color:#e0e7ff; }
.ir-thinking-badge  { background:rgba(59,130,246,.6);  color:#dbeafe; }
.ir-listening-badge { background:rgba(34,197,94,.6);   color:#d1fae5; }

/* Role tag below the card */
.ir-role-tag {
  font-size:11px; color:#94a3b8; font-weight:500; text-align:center;
  padding:6px 10px; background:rgba(0,0,0,.6);
  border-top:1px solid rgba(255,255,255,.06); letter-spacing:.02em;
}

/* ─ Content panel — right half */
.ir-content {
  flex:1;
  min-width:0;
  overflow-y:auto;
  padding:32px 36px;
  display:flex;
  flex-direction:column;
}
@media(max-width:700px){ .ir-content{ padding:16px; } }

/* Thinking / Submitting */
.ir-thinking, .ir-submitting {
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  flex:1; gap:18px;
}
.ir-dots { display:flex; gap:8px; }
.ir-dots span {
  width:12px; height:12px; border-radius:50%; background:#3b82f6;
  animation:ir-bounce 1.2s ease-in-out infinite;
}
.ir-dots span:nth-child(2){ animation-delay:.2s; background:#6366f1; }
.ir-dots span:nth-child(3){ animation-delay:.4s; background:#a78bfa; }
@keyframes ir-bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-14px)} }
.ir-dim { color:#64748b; font-size:14px; margin:0; }

/* Question cards */
.ir-q-card {
  background:rgba(59,130,246,.07); border:1px solid rgba(59,130,246,.25);
  border-left:4px solid #3b82f6; border-radius:14px; padding:24px 26px;
  max-width:680px;
}
.ir-q-card-speaking {
  background:rgba(167,139,250,.07); border-color:rgba(167,139,250,.3);
  border-left-color:#6366f1;
}
.ir-q-label { font-size:11px; font-weight:700; text-transform:uppercase;
              letter-spacing:.06em; color:#60a5fa; display:block; margin-bottom:12px; }
.ir-q-text  { font-size:18px; font-weight:500; line-height:1.65; margin:0; color:#e2e8f0; }

/* Answer area */
.ir-answer-area { display:flex; flex-direction:column; gap:14px; max-width:680px; }
.ir-q-mini {
  background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08);
  border-radius:10px; padding:12px 16px;
}
.ir-q-mini-label { font-size:10px; font-weight:700; text-transform:uppercase;
                   letter-spacing:.05em; color:#64748b; display:block; margin-bottom:5px; }
.ir-q-mini-text  { font-size:14px; color:#cbd5e1; margin:0; line-height:1.5; }

.ir-rec-box {
  background:rgba(34,197,94,.04); border:1px solid rgba(34,197,94,.2);
  border-radius:14px; padding:22px;
}
.ir-rec-header { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
.ir-rec-dot {
  width:12px; height:12px; border-radius:50%; background:#ef4444; flex-shrink:0;
  box-shadow:0 0 8px rgba(239,68,68,.7); animation:ir-blink 1s ease-in-out infinite;
}
@keyframes ir-blink { 0%,100%{opacity:1} 50%{opacity:.3} }
.ir-rec-label { font-size:14px; font-weight:600; color:#34d399; }

.ir-speak-area { margin-bottom:14px; }
.ir-speak-hint { font-size:14px; color:#64748b; line-height:1.65; margin:0; }
.ir-err { color:#f87171; font-size:13px; margin:0 0 10px; }

.ir-btn-row { display:flex; gap:10px; flex-wrap:wrap; }
.ir-btn {
  padding:12px 24px; border-radius:10px; font-size:14px; font-weight:600;
  cursor:pointer; border:none; transition:all .18s; outline:none;
}
.ir-btn-submit {
  background:linear-gradient(135deg,#2563eb,#6366f1); color:#fff;
  box-shadow:0 0 20px rgba(99,102,241,.3);
}
.ir-btn-submit:hover { box-shadow:0 0 32px rgba(99,102,241,.55); transform:translateY(-1px); }
.ir-btn-ghost {
  background:rgba(255,255,255,.07); color:#94a3b8;
  border:1px solid rgba(255,255,255,.12);
}
.ir-btn-ghost:hover { background:rgba(255,255,255,.12); color:#e2e8f0; }
.ir-btn-full { width:100%; margin-top:8px; }

/* Report */
.ir-report { display:flex; flex-direction:column; gap:14px; max-width:680px; }
.ir-report-hero {
  background:rgba(34,197,94,.06); border:1px solid rgba(34,197,94,.2);
  border-radius:14px; padding:22px;
}
.ir-report-title { font-size:20px; font-weight:700; color:#34d399; margin:0 0 8px; }
.ir-report-sum   { color:#94a3b8; font-size:14px; line-height:1.65; margin:0; }

.ir-score-row { display:flex; flex-wrap:wrap; gap:10px; }
.ir-score-card {
  background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);
  border-radius:12px; padding:14px 16px; text-align:center; min-width:90px;
}
.ir-score-big { padding:18px 20px; }
.ir-score-num { font-size:28px; font-weight:800; margin:0 0 4px; }
.ir-score-big .ir-score-num { font-size:42px; }
.ir-score-lbl { font-size:10px; color:#64748b; text-transform:capitalize; margin:0; }

.ir-fb-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
@media(max-width:500px){ .ir-fb-grid{ grid-template-columns:1fr; } }
.ir-fb-card  { border-radius:12px; padding:16px 18px; border:1px solid; }
.ir-fb-green { background:rgba(34,197,94,.05); border-color:rgba(34,197,94,.2); }
.ir-fb-amber { background:rgba(245,158,11,.05); border-color:rgba(245,158,11,.2); }
.ir-fb-head  { font-weight:700; font-size:13px; margin:0 0 10px; }
.ir-fb-green .ir-fb-head { color:#34d399; }
.ir-fb-amber .ir-fb-head { color:#f59e0b; }
.ir-fb-item  { font-size:13px; color:#94a3b8; margin:0 0 5px; line-height:1.5; }

.ir-log { background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.06);
          border-radius:12px; padding:16px; }
.ir-log-title { font-weight:700; font-size:14px; margin:0 0 12px; color:#e2e8f0; }
.ir-msg       { border-radius:8px; padding:10px 12px; margin-bottom:8px; }
.ir-msg-assistant { background:rgba(59,130,246,.07); border-left:3px solid #3b82f6; }
.ir-msg-user      { background:rgba(255,255,255,.04); border-left:3px solid #334155; }
.ir-msg-who  { font-size:10px; font-weight:700; text-transform:uppercase;
               letter-spacing:.05em; color:#64748b; display:block; margin-bottom:4px; }
.ir-msg-text { font-size:13px; color:#cbd5e1; margin:0; line-height:1.55; }

/* ── Micro-animation components ─────────────────────────────────────────── */
.li-spin {
  display:inline-block; width:13px; height:13px; border-radius:50%;
  border:2px solid rgba(255,255,255,.2); border-top-color:currentColor;
  animation:s-spin .7s linear infinite; flex-shrink:0;
}
@keyframes s-spin { to{transform:rotate(360deg)} }

.li-pulse {
  display:inline-block; width:10px; height:10px; border-radius:50%; flex-shrink:0;
  background:#34d399; box-shadow:0 0 0 3px rgba(52,211,153,.25);
  animation:s-pulse 1.3s ease-in-out infinite;
}
@keyframes s-pulse {
  0%,100%{box-shadow:0 0 0 3px rgba(52,211,153,.25)}
  50%{box-shadow:0 0 0 8px rgba(52,211,153,.07)}
}

.li-wave {
  display:inline-flex; align-items:flex-end; gap:2px; height:14px; flex-shrink:0;
}
.li-wave span {
  display:inline-block; width:3px; border-radius:2px; background:#c4b5fd;
  animation:s-wave 1s ease-in-out infinite;
}
.li-wave span:nth-child(1){ height:6px;  animation-delay:0s; }
.li-wave span:nth-child(2){ height:10px; animation-delay:.15s; }
.li-wave span:nth-child(3){ height:14px; animation-delay:.3s; }
.li-wave span:nth-child(4){ height:8px;  animation-delay:.45s; }
@keyframes s-wave {
  0%,100%{transform:scaleY(.5)} 50%{transform:scaleY(1)}
}
`;