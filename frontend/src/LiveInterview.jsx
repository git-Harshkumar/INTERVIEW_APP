import { useCallback, useEffect, useRef, useState } from "react";
import api from "./api";
import ALEX_AVATAR from "./assets/alex-real.png";
import * as faceapi from "face-api.js";

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

const EXPRESSION_LABELS = ["neutral", "happy", "surprised", "sad", "angry", "fearful", "disgusted"];
const FILLER_WORDS = ["um", "uh", "like", "actually", "basically", "literally", "you know", "i mean", "sort of", "kind of"];
const SECURITY_LIMITS = {
  maxViolations: 5,
  warningThresholds: [1, 3, 5],
  noFaceWarningSamples: 3,
  multipleFaceWarningSamples: 2,
  resizeRatioThreshold: 0.22,
};

const WARNING_TIER_MESSAGES = [
  "Please remain focused on the interview window.",
  "Multiple focus violations detected.",
  "Flag candidate for review.",
];

const VIOLATION_TYPE_LABELS = {
  copy: "Copy attempt",
  cut: "Cut attempt",
  paste: "Paste attempt",
  right_click: "Context menu",
  tab_hidden: "Tab switch / minimize",
  window_blur: "Window focus loss",
  fullscreen_exit: "Fullscreen exit",
  navigation_attempt: "Navigation / refresh",
  multiple_displays: "Multiple monitors",
  display_risk: "Display risk",
  screen_share_limit: "Screen share note",
  multiple_faces: "Multiple faces",
  candidate_absent: "Candidate absent",
  window_resize: "Excessive resize",
  keyboard_shortcut: "Keyboard shortcut",
  interview_start: "Interview started",
  interview_end: "Interview ended",
  coding_submission: "Coding submission",
  coding_run: "Code execution",
};

const CODING_LANGUAGES = {
  javascript: {
    label: "JavaScript",
    template: "function twoSum(nums, target) {\n  // Return indexes of two numbers that add up to target.\n  return [];\n}",
  },
  python: {
    label: "Python",
    template: "def two_sum(nums, target):\n    # Return indexes of two numbers that add up to target.\n    return []",
  },
  java: {
    label: "Java",
    template: "class Solution {\n  public int[] twoSum(int[] nums, int target) {\n    return new int[]{};\n  }\n}",
  },
  cpp: {
    label: "C++",
    template: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n  vector<int> twoSum(vector<int>& nums, int target) {\n    return {};\n  }\n};",
  },
};

const DEFAULT_CODING_CHALLENGE = {
  id: "two-sum",
  title: "Two Sum",
  prompt: "Given an array of integers nums and an integer target, return the indexes of two numbers that add up to target.",
  inputHint: "Custom input JSON: {\"nums\":[2,7,11,15],\"target\":9}",
  tests: [
    { name: "Basic pair", nums: [2, 7, 11, 15], target: 9, expected: [0, 1] },
    { name: "Middle pair", nums: [3, 2, 4], target: 6, expected: [1, 2] },
    { name: "Duplicate values", nums: [3, 3], target: 6, expected: [0, 1] },
    { name: "Negative values", nums: [-1, -2, -3, -4, -5], target: -8, expected: [2, 4] },
  ],
};

function createFaceStats() {
  return {
    samples: 0,
    detected: 0,
    expressions: Object.fromEntries(EXPRESSION_LABELS.map(label => [label, 0])),
  };
}

function topExpression(expressions = {}) {
  return Object.entries(expressions).sort((a, b) => b[1] - a[1])[0]?.[0] || "neutral";
}

function analyseSpeechDelivery(text) {
  const normalized = ` ${text.toLowerCase().replace(/[^a-z\s']/g, " ")} `;
  const words = normalized.trim().split(/\s+/).filter(Boolean);
  const fillerCount = FILLER_WORDS.reduce((count, filler) => {
    const pattern = new RegExp(`\\b${filler.replace(" ", "\\s+")}\\b`, "g");
    return count + (normalized.match(pattern) || []).length;
  }, 0);
  const shortAnswer = words.length < 18;
  const repeatedStarts = (normalized.match(/\b(i think|so|basically|actually)\b/g) || []).length;

  return {
    wordCount: words.length,
    fillerCount,
    fillerRate: words.length ? Math.round((fillerCount / words.length) * 100) : 0,
    clarityFlag: shortAnswer || fillerCount >= 4 || repeatedStarts >= 3,
  };
}

function buildDeliveryAnalysis(faceStats, answerMetrics) {
  const detectedPct = faceStats.samples
    ? Math.round((faceStats.detected / faceStats.samples) * 100)
    : 0;
  const dominantExpression = topExpression(faceStats.expressions);
  const totalWords = answerMetrics.reduce((sum, item) => sum + item.wordCount, 0);
  const totalFillers = answerMetrics.reduce((sum, item) => sum + item.fillerCount, 0);
  const fillerRate = totalWords ? Math.round((totalFillers / totalWords) * 100) : 0;
  const unclearAnswers = answerMetrics.filter(item => item.clarityFlag).length;
  const expressionMix = Object.entries(faceStats.expressions)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, count]) => ({
      label,
      percent: faceStats.detected ? Math.round((count / faceStats.detected) * 100) : 0,
    }));

  const improvements = [];
  if (detectedPct < 60) improvements.push("Keep your face centered in the camera with steady lighting.");
  if (dominantExpression === "neutral") improvements.push("Add a little more facial warmth when answering, especially during introductions and examples.");
  if (["sad", "angry", "fearful", "disgusted"].includes(dominantExpression)) improvements.push("Practice relaxing your face between points so your delivery feels calmer and more confident.");
  if (fillerRate >= 4) improvements.push("Reduce filler words by pausing silently for a second before continuing.");
  if (unclearAnswers > 0) improvements.push("Structure shorter answers with a clear beginning, example, and conclusion.");
  if (improvements.length === 0) improvements.push("Your delivery signals looked steady. Keep practicing concise, confident answers.");

  return {
    detectedPct,
    dominantExpression,
    expressionMix,
    totalFillers,
    fillerRate,
    unclearAnswers,
    summary: `Camera detected your face in ${detectedPct}% of samples. Your most common expression was ${dominantExpression}, with ${totalFillers} filler-word signals across the interview.`,
    improvements,
  };
}

function buildSecurityAnalysis(violations, threshold) {
  const highRisk = violations.filter(item => item.severity === "high").length;
  const byType = violations.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});

  return {
    violationCount: violations.length,
    threshold,
    highRisk,
    interviewerNotified: violations.length >= threshold,
    byType,
    violations,
    summary: violations.length
      ? `${violations.length} secure-mode event(s) were logged, including ${highRisk} high-risk event(s).`
      : "No secure-mode violations were logged.",
  };
}

function getWarningTier(count, thresholds) {
  if (count >= thresholds[2]) return 3;
  if (count >= thresholds[1]) return 2;
  if (count >= thresholds[0]) return 1;
  return 0;
}

function buildIntegrityReport({ violations, proctoring, codingReports, codingActivity, executionHistory, startedAt, endedAt, thresholds }) {
  const tier = getWarningTier(violations.length, thresholds);
  const flaggedForReview = tier >= 3;
  return {
    startedAt,
    endedAt,
    durationSec: startedAt && endedAt ? Math.round((new Date(endedAt) - new Date(startedAt)) / 1000) : 0,
    totalEvents: violations.length,
    warningTier: tier,
    warningMessage: tier > 0 ? WARNING_TIER_MESSAGES[tier - 1] : null,
    flaggedForReview,
    thresholds,
    events: violations,
    byType: violations.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {}),
    proctoringSummary: buildProctoringAnalysis(proctoring),
    codingSummary: buildCodingAnalysis(codingReports),
    codingActivityCount: codingActivity.length,
    executionRuns: executionHistory.length,
    recommendation: flaggedForReview
      ? "Review required — integrity threshold exceeded."
      : tier === 2
        ? "Proceed with caution — multiple violations logged."
        : violations.length > 0
          ? "Minor integrity events logged — review audit trail."
          : "Clean integrity record.",
  };
}

function buildProctoringAnalysis(proctoring) {
  const faceVisiblePct = proctoring.samples
    ? Math.round((proctoring.faceVisible / proctoring.samples) * 100)
    : 0;
  const flags = [];
  if (proctoring.noFaceSamples >= SECURITY_LIMITS.noFaceWarningSamples) flags.push("Candidate left the webcam frame repeatedly.");
  if (proctoring.multipleFaceSamples >= SECURITY_LIMITS.multipleFaceWarningSamples) flags.push("Multiple faces appeared in the webcam frame.");
  if (faceVisiblePct < 65) flags.push("Face visibility was low during the interview.");
  if (flags.length === 0) flags.push("No major webcam proctoring concerns were detected.");

  return {
    samples: proctoring.samples,
    faceVisiblePct,
    noFaceSamples: proctoring.noFaceSamples,
    multipleFaceSamples: proctoring.multipleFaceSamples,
    flags,
    summary: `Candidate face was visible in ${faceVisiblePct}% of webcam samples.`,
  };
}

function buildCodingAnalysis(codingReports) {
  if (!codingReports.length) {
    return {
      attempted: false,
      score: 0,
      summary: "No coding challenge was included in this interview.",
      reports: [],
    };
  }
  const score = Math.round(codingReports.reduce((sum, item) => sum + item.score, 0) / codingReports.length);
  const passed = codingReports.reduce((sum, item) => sum + item.passed, 0);
  const total = codingReports.reduce((sum, item) => sum + item.total, 0);
  return {
    attempted: true,
    score,
    passed,
    total,
    summary: `Coding score ${score}/100 with ${passed}/${total} tests passed.`,
    reports: codingReports,
  };
}

function normalizePair(value) {
  return Array.isArray(value) ? value.map(Number).sort((a, b) => a - b).join(",") : "";
}

function parseCustomCodingInput(raw) {
  if (!raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.nums) || typeof parsed.target !== "number") return null;
    return { name: "Custom input", nums: parsed.nums, target: parsed.target, expected: null };
  } catch {
    return null;
  }
}

function estimateComplexity(code) {
  const normalized = code.toLowerCase();
  const nestedLoops = /(for|while)[\s\S]{0,260}(for|while)/.test(normalized);
  const hasHashLookup = /(map|set|object|dict|unordered_map|hashmap|\{\})/.test(normalized);
  const hasSort = /\.sort|sort\(/.test(normalized);

  if (nestedLoops) return { time: "O(n^2)", space: "O(1)", note: "Nested loops suggest a brute-force search." };
  if (hasHashLookup) return { time: "O(n)", space: "O(n)", note: "Hash lookup pattern suggests a linear-time solution." };
  if (hasSort) return { time: "O(n log n)", space: "O(n)", note: "Sorting can work, but preserving original indexes needs care." };
  return { time: "Likely O(n)", space: "Review needed", note: "The code needs manual review for exact complexity." };
}

function buildCodingFeedback({ code, language, passed, total, runnable, customResult }) {
  const complexity = estimateComplexity(code);
  const correctness = total ? Math.round((passed / total) * 100) : runnable ? 0 : 45;
  const strengths = [];
  const improvements = [];

  if (passed === total && total > 0) strengths.push("Passed all visible and hidden-style test cases.");
  if (complexity.time === "O(n)") strengths.push("Uses an efficient linear-time direction.");
  if (code.length > 120) strengths.push("Submitted a non-trivial implementation for review.");
  if (passed < total && runnable) improvements.push("Debug failing edge cases before discussing optimization.");
  if (complexity.time === "O(n^2)") improvements.push("Consider using a hash map to reduce lookup time.");
  if (!runnable) improvements.push("Connect a backend container runner to execute this language safely.");
  if (customResult) strengths.push("Custom input was executed for candidate-driven testing.");

  return {
    score: correctness,
    correctness,
    timeComplexity: complexity.time,
    spaceComplexity: complexity.space,
    complexityNote: complexity.note,
    strengths: strengths.length ? strengths : ["The solution is ready for interviewer review."],
    improvements: improvements.length ? improvements : ["Discuss edge cases and trade-offs in the follow-up."],
  };
}

function runJavaScriptChallenge(code, challenge, customInput) {
  const workerSource = `
    self.onmessage = (event) => {
      const { code, tests, customInput } = event.data;
      const normalize = value => Array.isArray(value) ? value.map(Number).sort((a, b) => a - b).join(",") : "";
      try {
        const fn = new Function(code + "; return typeof twoSum === 'function' ? twoSum : null;")();
        if (!fn) throw new Error("Define a function named twoSum(nums, target).");
        const results = tests.map(test => {
          const output = fn([...test.nums], test.target);
          const passed = normalize(output) === normalize(test.expected);
          return { name: test.name, output, expected: test.expected, passed };
        });
        let customResult = null;
        if (customInput) {
          customResult = fn([...customInput.nums], customInput.target);
        }
        self.postMessage({ ok: true, results, customResult });
      } catch (err) {
        self.postMessage({ ok: false, error: err.message || String(err) });
      }
    };
  `;

  return new Promise(resolve => {
    const blob = new Blob([workerSource], { type: "application/javascript" });
    const worker = new Worker(URL.createObjectURL(blob));
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({ ok: false, error: "Execution timed out after 2 seconds." });
    }, 2000);

    worker.onmessage = event => {
      clearTimeout(timer);
      worker.terminate();
      resolve(event.data);
    };
    worker.onerror = event => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ ok: false, error: event.message || "Worker execution failed." });
    };
    worker.postMessage({ code, tests: challenge.tests, customInput });
  });
}

async function analyzeCodeSubmission({ code, language, challenge, customInputRaw }) {
  const customInput = parseCustomCodingInput(customInputRaw);
  const canRun = language === "javascript";
  let results = [];
  let customResult = null;
  let error = "";

  if (canRun) {
    const run = await runJavaScriptChallenge(code, challenge, customInput);
    if (run.ok) {
      results = run.results;
      customResult = run.customResult;
    } else {
      error = run.error;
    }
  }

  const passed = results.filter(item => item.passed).length;
  const total = results.length || challenge.tests.length;
  const feedback = buildCodingFeedback({
    code,
    language,
    passed,
    total,
    runnable: canRun,
    customResult,
  });

  return {
    language,
    runnable: canRun,
    passed,
    total,
    tests: results,
    customInputValid: !customInputRaw.trim() || !!customInput,
    customResult,
    error,
    ...feedback,
  };
}

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
  const [enableCoding,   setEnableCoding]   = useState(true);
  const [secureMode,     setSecureMode]     = useState(true);
  const [violationLimit, setViolationLimit] = useState(SECURITY_LIMITS.maxViolations);
  const [warningThresholds, setWarningThresholds] = useState([...SECURITY_LIMITS.warningThresholds]);
  const [fullscreenReady, setFullscreenReady] = useState(false);
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
      enableCoding,
      secureMode: true,
      violationLimit,
      warningThresholds,
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

        <div className="s-field">
          <label className="s-label">Assessment Controls</label>
          <div className="s-check-grid">
            <label className="s-check-row">
              <input type="checkbox" checked={secureMode} disabled />
              <span>
                Secure interview mode (always on)
                <small>Automatically tracks tab switches, focus loss, copy/paste, fullscreen exits, and display risks.</small>
              </span>
            </label>
            <label className="s-check-row">
              <input type="checkbox" checked={enableCoding} onChange={e => setEnableCoding(e.target.checked)} />
              <span>
                Include coding challenge
                <small>Add an integrated coding exercise with tests and follow-up analysis.</small>
              </span>
            </label>
          </div>
          <div className="s-threshold-grid">
            <div className="s-threshold-row">
              <span>Warning 1 (first violation)</span>
              <input
                className="s-input s-threshold-input"
                type="number" min="1" max="20"
                value={warningThresholds[0]}
                onChange={e => {
                  const v = Math.max(1, Number(e.target.value) || 1);
                  setWarningThresholds([v, Math.max(v + 1, warningThresholds[1]), Math.max(v + 2, warningThresholds[2])]);
                }}
              />
            </div>
            <div className="s-threshold-row">
              <span>Warning 2 (multiple violations)</span>
              <input
                className="s-input s-threshold-input"
                type="number" min="2" max="20"
                value={warningThresholds[1]}
                onChange={e => {
                  const v = Math.max(warningThresholds[0] + 1, Number(e.target.value) || 3);
                  setWarningThresholds([warningThresholds[0], v, Math.max(v + 1, warningThresholds[2])]);
                }}
              />
            </div>
            <div className="s-threshold-row">
              <span>Warning 3 (flag for review)</span>
              <input
                className="s-input s-threshold-input"
                type="number" min="3" max="20"
                value={warningThresholds[2]}
                onChange={e => {
                  const v = Math.max(warningThresholds[1] + 1, Number(e.target.value) || 5);
                  setWarningThresholds([warningThresholds[0], warningThresholds[1], v]);
                  setViolationLimit(v);
                }}
              />
            </div>
          </div>
        </div>

        {secureMode && !fullscreenReady && (
          <div className="s-fs-gate">
            <p className="s-fs-title">Fullscreen required</p>
            <p className="s-fs-desc">You must enter fullscreen before the interview can begin. This helps ensure a secure assessment environment.</p>
            <button
              type="button"
              className="s-btn-ghost s-fs-btn"
              onClick={async () => {
                try {
                  await document.documentElement.requestFullscreen();
                  setFullscreenReady(true);
                } catch {
                  setErr("Could not enter fullscreen. Please allow fullscreen in your browser and try again.");
                }
              }}
            >
              Enter Fullscreen
            </button>
          </div>
        )}

        {err && <p className="s-err">{err}</p>}

        <button
          className="s-start-btn"
          onClick={handleStart}
          disabled={secureMode && !fullscreenReady}
        >
          <span>▶</span> {fullscreenReady || !secureMode ? "Start Interview" : "Enter Fullscreen First"}
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
  const [, setTranscript] = useState("");
  const [chatLog,    setChatLog]    = useState([]);
  const [report,     setReport]     = useState(null);
  const [turn,       setTurn]       = useState(0);
  const [volume,     setVolume]     = useState(0);
  const [errMsg,     setErrMsg]     = useState("");
  const [elapsed,    setElapsed]    = useState(0);
  const [isFS,       setIsFS]       = useState(false);
  const [cameraStatus, setCameraStatus] = useState("off");
  const [faceStatus, setFaceStatus] = useState("Loading face analysis...");
  const [faceSnapshot, setFaceSnapshot] = useState(null);
  const [violations, setViolations] = useState([]);
  const [securityWarning, setSecurityWarning] = useState("");
  const [warningTier, setWarningTier] = useState(0);
  const [interviewerAlert, setInterviewerAlert] = useState(false);
  const [showEventLog, setShowEventLog] = useState(false);
  const [needsFullscreen, setNeedsFullscreen] = useState(false);
  const [codingChallenge, setCodingChallenge] = useState(DEFAULT_CODING_CHALLENGE);
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const [codeText, setCodeText] = useState(CODING_LANGUAGES.javascript.template);
  const [customInput, setCustomInput] = useState("");
  const [codeResult, setCodeResult] = useState(null);
  const [executionHistory, setExecutionHistory] = useState([]);

  const mediaRecRef  = useRef(null);
  const chunksRef    = useRef([]);
  const resolveRef   = useRef(null);
  const streamRef    = useRef(null);
  const cameraStreamRef = useRef(null);
  const analyserRef  = useRef(null);
  const audioCtxRef   = useRef(null);
  const volTimer     = useRef(null);
  const faceTimer    = useRef(null);
  const timerRef     = useRef(null);
  const mounted      = useRef(true);
  const runActiveRef = useRef(false);
  const speakTokenRef = useRef(0);
  const containerRef = useRef(null);
  const configRef    = useRef(null);
  const videoRef     = useRef(null);
  const phaseRef     = useRef("");
  const faceModelsLoadedRef = useRef(false);
  const faceStatsRef = useRef(createFaceStats());
  const answerMetricsRef = useRef([]);
  const violationsRef = useRef([]);
  const proctoringRef = useRef({
    samples: 0,
    faceVisible: 0,
    noFaceSamples: 0,
    multipleFaceSamples: 0,
    suspiciousEvents: [],
  });
  const codingReportsRef = useRef([]);
  const codingActivityRef = useRef([]);
  const executionHistoryRef = useRef([]);
  const interviewStartedAtRef = useRef(null);
  const windowSizeRef = useRef(null);
  const lastTierRef = useRef(0);
  const notifyAiRef = useRef(null);
  const codeSaveTimerRef = useRef(null);
  const CODE_DRAFT_KEY = "prepmate-coding-draft";

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearInterval(volTimer.current);
      clearInterval(timerRef.current);
      window.speechSynthesis?.cancel();
      speakTokenRef.current += 1;
      runActiveRef.current = false;
      _stopRec();
      const closeAudio = audioCtxRef.current?.close?.();
      closeAudio?.catch?.(() => {});
      streamRef.current?.getTracks().forEach(t => t.stop());
      cameraStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const onFSChange = () => setIsFS(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, []);

  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    if (screen !== "interview" || !cameraStreamRef.current || !videoRef.current) return;
    videoRef.current.srcObject = cameraStreamRef.current;
    _startFaceAnalysis();
    return () => clearInterval(faceTimer.current);
  }, [screen]);

  function _logViolation(type, detail, severity = "medium", { skipTier = false, skipAiNotify = false } = {}) {
    if (!configRef.current?.secureMode || phaseRef.current === "done") return null;
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type,
      detail,
      severity,
      timestamp: new Date().toISOString(),
      label: VIOLATION_TYPE_LABELS[type] || type,
    };
    violationsRef.current = [...violationsRef.current, entry];
    setViolations(violationsRef.current);

    const thresholds = configRef.current?.warningThresholds || SECURITY_LIMITS.warningThresholds;
    const tier = getWarningTier(violationsRef.current.length, thresholds);
    const tierMessage = tier > 0 ? WARNING_TIER_MESSAGES[tier - 1] : detail;

    if (!skipTier) {
      setSecurityWarning(tierMessage);
      setWarningTier(tier);
    }

    if (tier >= 2 && tier > lastTierRef.current && !skipAiNotify) {
      lastTierRef.current = tier;
      setInterviewerAlert(true);
      setChatLog(prev => [...prev, {
        role: "system",
        content: `[Proctoring Alert — Tier ${tier}] ${tierMessage}`,
        timestamp: entry.timestamp,
      }]);
      notifyAiRef.current?.(tier, tierMessage);
    } else if (tier === 1 && violationsRef.current.length === thresholds[0]) {
      setChatLog(prev => [...prev, {
        role: "system",
        content: `[Proctoring Notice] ${WARNING_TIER_MESSAGES[0]}`,
        timestamp: entry.timestamp,
      }]);
    }

    const limit = configRef.current?.violationLimit || thresholds[2] || SECURITY_LIMITS.maxViolations;
    if (violationsRef.current.length >= limit) {
      setInterviewerAlert(true);
      setErrMsg("Security threshold exceeded. The interviewer has been notified in the integrity report.");
    }

    return entry;
  }

  notifyAiRef.current = async (tier, message) => {
    if (phaseRef.current === "done" || !mounted.current) return;
    if (tier >= 2) {
      await _speak(message);
    }
  };

  useEffect(() => {
    if (screen !== "interview" || !config?.secureMode) return;

    const preventAndLog = (event, type, detail) => {
      event.preventDefault();
      _logViolation(type, detail);
    };
    const onCopy = event => preventAndLog(event, "copy", "Copy action blocked during secure assessment.");
    const onCut = event => preventAndLog(event, "cut", "Cut action blocked during secure assessment.");
    const onPaste = event => preventAndLog(event, "paste", "Paste action blocked during secure assessment.");
    const onContextMenu = event => preventAndLog(event, "right_click", "Right-click menu blocked during secure assessment.");
    const onKeyDown = event => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "c") {
        event.preventDefault();
        _logViolation("copy", "Ctrl+C copy shortcut blocked during secure assessment.", "medium");
      } else if (key === "v") {
        event.preventDefault();
        _logViolation("paste", "Ctrl+V paste shortcut blocked during secure assessment.", "medium");
      } else if (key === "x") {
        event.preventDefault();
        _logViolation("cut", "Ctrl+X cut shortcut blocked during secure assessment.", "medium");
      } else if (key === "r" || key === "f5") {
        event.preventDefault();
        _logViolation("navigation_attempt", "Refresh shortcut blocked during secure assessment.", "high");
      }
    };
    const onVisibility = () => {
      if (document.hidden) _logViolation("tab_hidden", "Candidate left the interview tab or minimized the browser.", "high");
    };
    const onBlur = () => _logViolation("window_blur", "Interview window lost focus.", "medium");
    const onFullscreen = () => {
      if (!document.fullscreenElement && phaseRef.current !== "done") {
        _logViolation("fullscreen_exit", "Candidate exited full-screen assessment mode.", "high");
        setNeedsFullscreen(true);
      } else {
        setNeedsFullscreen(false);
      }
    };
    const onBeforeUnload = event => {
      _logViolation("navigation_attempt", "Candidate attempted to leave or reload the interview.", "high");
      event.preventDefault();
      event.returnValue = "";
    };
    const onResize = () => {
      const base = windowSizeRef.current;
      if (!base) return;
      const widthDelta = Math.abs(window.innerWidth - base.width) / base.width;
      const heightDelta = Math.abs(window.innerHeight - base.height) / base.height;
      if (widthDelta > SECURITY_LIMITS.resizeRatioThreshold || heightDelta > SECURITY_LIMITS.resizeRatioThreshold) {
        _logViolation("window_resize", "Browser window was resized excessively during the interview.", "medium");
        windowSizeRef.current = { width: window.innerWidth, height: window.innerHeight };
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreen);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("resize", onResize);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown, true);

    const focusPoll = setInterval(() => {
      if (phaseRef.current === "done" || document.hidden) return;
      if (!document.hasFocus()) {
        if (!focusPoll._lost) {
          focusPoll._lost = true;
          _logViolation("window_blur", "Application focus lost (polling detected).", "medium");
        }
      } else {
        focusPoll._lost = false;
      }
    }, 3000);

    const displayInfo = window.screen;
    if (displayInfo?.isExtended) {
      _logViolation("multiple_displays", "Multiple displays detected by the browser.", "high");
    } else if (window.screen && (window.screen.availWidth > window.innerWidth * 1.8 || window.screen.availHeight > window.innerHeight * 1.8)) {
      _logViolation("display_risk", "Large available display area detected; multiple-monitor check is inconclusive.", "low");
    }
    _logViolation("screen_share_limit", "Browser cannot reliably detect external screen-sharing apps; webcam and focus signals will be monitored.", "low", { skipTier: true, skipAiNotify: true });

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown, true);
      clearInterval(focusPoll);
    };
  }, [screen, config]);

  // ── Audio helpers ────────────────────────────────────────────────────────────

  function _stopRec() {
    try {
      if (mediaRecRef.current && mediaRecRef.current.state !== "inactive")
        mediaRecRef.current.stop();
    } catch {
      // Recorder may already be inactive when the user exits or re-records.
    }
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
        if (ctx.state === "suspended") await ctx.resume();
        const an  = ctx.createAnalyser();
        an.fftSize = 256;
        an.smoothingTimeConstant = 0.75;
        ctx.createMediaStreamSource(stream).connect(an);
        audioCtxRef.current = ctx;
        analyserRef.current = an;
        volTimer.current = setInterval(() => {
          if (!analyserRef.current || !mounted.current) return;
          const d = new Uint8Array(analyserRef.current.fftSize);
          analyserRef.current.getByteTimeDomainData(d);
          const rms = Math.sqrt(d.reduce((sum, value) => {
            const centered = (value - 128) / 128;
            return sum + centered * centered;
          }, 0) / d.length);
          setVolume(Math.round(rms * 180));
        }, 80);
      }
      return true;
    } catch {
      setErrMsg("🚫 Microphone access denied. Allow mic in your browser settings and reload.");
      return false;
    }
  }

  async function _initCamera() {
    if (cameraStreamRef.current) return true;
    try {
      setCameraStatus("starting");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setCameraStatus("on");

      if (!faceModelsLoadedRef.current) {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceExpressionNet.loadFromUri("/models"),
        ]);
        faceModelsLoadedRef.current = true;
      }
      setFaceStatus("Face analysis ready");
      return true;
    } catch (err) {
      console.error("Camera init error:", err);
      setCameraStatus("blocked");
      setFaceStatus("Camera unavailable");
      return false;
    }
  }

  function _stopCamera() {
    clearInterval(faceTimer.current);
    cameraStreamRef.current?.getTracks().forEach(t => t.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraStatus("off");
  }

  function _startFaceAnalysis() {
    clearInterval(faceTimer.current);
    if (!faceModelsLoadedRef.current || !videoRef.current) return;

    faceTimer.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !mounted.current) return;

      const stats = faceStatsRef.current;
      const shouldScoreSample = phaseRef.current === "recording";
      if (shouldScoreSample) stats.samples += 1;
      proctoringRef.current.samples += 1;

      try {
        const allFaces = await faceapi.detectAllFaces(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 })
        );
        if (allFaces.length > 1) {
          proctoringRef.current.multipleFaceSamples += 1;
          if (proctoringRef.current.multipleFaceSamples % SECURITY_LIMITS.multipleFaceWarningSamples === 0) {
            _logViolation("multiple_faces", "Multiple faces detected in the webcam frame.", "high");
          }
        }

        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 }))
          .withFaceExpressions();

        if (!detection) {
          proctoringRef.current.noFaceSamples += 1;
          if (proctoringRef.current.noFaceSamples % SECURITY_LIMITS.noFaceWarningSamples === 0) {
            _logViolation("candidate_absent", "Candidate was not visible in the webcam frame for multiple samples.", "high");
          }
          setFaceSnapshot(prev => prev ? { ...prev, detected: false } : { detected: false, dominant: "No face", confidence: 0 });
          setFaceStatus("No face detected");
          return;
        }

        const dominant = topExpression(detection.expressions);
        proctoringRef.current.faceVisible += 1;
        if (shouldScoreSample) {
          stats.detected += 1;
          stats.expressions[dominant] = (stats.expressions[dominant] || 0) + 1;
        }
        const confidence = Math.round((detection.expressions[dominant] || 0) * 100);

        setFaceSnapshot({ detected: true, dominant, confidence });
        setFaceStatus(phaseRef.current === "recording" ? "Analysing expression" : "Camera ready");
      } catch (err) {
        console.error("Face analysis error:", err);
        setFaceStatus("Face analysis paused");
      }
    }, 1200);
  }

  function _finishWithReport(rpt) {
    const endedAt = new Date().toISOString();
    _logViolation("interview_end", "Interview session ended.", "low", { skipTier: true, skipAiNotify: true });

    const deliveryAnalysis = buildDeliveryAnalysis(faceStatsRef.current, answerMetricsRef.current);
    const thresholds = configRef.current?.warningThresholds || SECURITY_LIMITS.warningThresholds;
    const securityAnalysis = buildSecurityAnalysis(
      violationsRef.current,
      configRef.current?.violationLimit || thresholds[2] || SECURITY_LIMITS.maxViolations
    );
    const proctoringAnalysis = buildProctoringAnalysis(proctoringRef.current);
    const codingAnalysis = buildCodingAnalysis(codingReportsRef.current);
    const integrityReport = buildIntegrityReport({
      violations: violationsRef.current,
      proctoring: proctoringRef.current,
      codingReports: codingReportsRef.current,
      codingActivity: codingActivityRef.current,
      executionHistory: executionHistoryRef.current,
      startedAt: interviewStartedAtRef.current,
      endedAt,
      thresholds,
    });
    const skillScores = {
      problem_solving: rpt.topicScores?.problem_solving ?? codingAnalysis.score,
      coding_skills: codingAnalysis.attempted ? codingAnalysis.score : (rpt.topicScores?.coding_skills ?? 0),
      communication: rpt.topicScores?.communication ?? 0,
      technical_knowledge: rpt.topicScores?.technical_knowledge ?? 0,
      confidence: Math.max(0, Math.min(100, deliveryAnalysis.detectedPct - deliveryAnalysis.fillerRate * 2)),
      behavioral_responses: rpt.topicScores?.behavioral_responses ?? rpt.topicScores?.communication ?? 0,
    };
    const hiringRecommendation =
      integrityReport.flaggedForReview ? "Do not proceed — integrity review required" :
      rpt.overallScore >= 80 && securityAnalysis.highRisk === 0 ? "Strong hire" :
      rpt.overallScore >= 65 && securityAnalysis.highRisk <= 1 ? "Hire / continue process" :
      rpt.overallScore >= 50 ? "Borderline - needs review" :
      "Do not proceed";

    setReport({
      ...rpt,
      skillScores,
      hiringRecommendation,
      overallCandidateRanking: rpt.overallScore >= 80 ? "Top tier" : rpt.overallScore >= 65 ? "Competitive" : rpt.overallScore >= 50 ? "Developing" : "Below bar",
      deliveryAnalysis,
      securityAnalysis,
      proctoringAnalysis,
      codingAnalysis,
      integrityReport,
      transcript: chatLog,
    });
    setPhase("done");
  }

  // ── Speak via browser TTS (always used — no external avatar API needed) ──────
  function _speak(text) {
    return _speakBrowser(text);
  }

  // Browser TTS
  function _speakBrowser(text) {
    return new Promise(resolve => {
      const synth = window.speechSynthesis;
      const token = speakTokenRef.current + 1;
      speakTokenRef.current = token;
      synth?.cancel();
      if (!window.speechSynthesis || !text) { resolve(); return; }
      const parts = text
        .replace(/\s+/g, " ")
        .match(/[^.!?]+(?:[.!?]+|$)/g)
        ?.map(part => part.trim())
        .filter(Boolean) || [text.trim()];
      let i = 0;
      const next = () => {
        if (token !== speakTokenRef.current || i >= parts.length || !mounted.current) {
          resolve();
          return;
        }
        const u = new SpeechSynthesisUtterance(parts[i++].trim());
        u.rate = 1.35; u.pitch = 1;
        const voices = synth.getVoices();
        const v = voices.find(v => v.name.includes("Google") && v.lang === "en-US")
               || voices.find(v => v.lang.startsWith("en"));
        if (v) u.voice = v;
        u.onend  = () => token === speakTokenRef.current && next();
        u.onerror = () => token === speakTokenRef.current && next();
        synth.speak(u);
      };
      if (synth.getVoices().length === 0) {
        synth.addEventListener("voiceschanged", next, { once: true });
      } else {
        next();
      }
    });
  }

  // ── MediaRecorder start ──────────────────────────────────────────────────────
  function _startRecording() {
    const stream = streamRef.current;
    if (!stream || !stream.getAudioTracks().some(track => track.readyState === "live")) {
      setErrMsg("Microphone is not active. Allow microphone access and restart the interview.");
      return false;
    }
    audioCtxRef.current?.resume?.().catch?.(() => {});
    chunksRef.current = [];
    const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", ""]
      .find(t => !t || MediaRecorder.isTypeSupported(t)) || "";
    try {
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mr.ondataavailable = e => { if (e.data?.size > 0) chunksRef.current.push(e.data); };
      mr.onerror = e => setErrMsg("Recording error: " + (e.error?.message || "Microphone recording stopped."));
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

  function _codingPromptText(challenge) {
    return `${challenge.title}: ${challenge.prompt}`;
  }

  function _securityContextMessages() {
    const recent = violationsRef.current
      .filter(v => !["interview_start", "interview_end", "screen_share_limit", "coding_run", "coding_submission"].includes(v.type))
      .slice(-5);
    if (!recent.length) return [];
    return [{
      role: "system",
      content: `PROCTORING CONTEXT: ${recent.length} recent integrity event(s): ${recent.map(v => `[${v.type}] ${v.detail}`).join("; ")}. Acknowledge only if directly relevant.`,
    }];
  }

  // ── Main interview async loop ────────────────────────────────────────────────
  async function _runInterview(cfg) {
    let history = [];
    const topicStr = cfg.topics.join(", ");
    const codingTurn = cfg.enableCoding ? Math.max(1, Math.floor(cfg.maxTurns / 2)) : -1;

    for (let t = 0; t < cfg.maxTurns; t++) {
      if (!mounted.current) return;

      setPhase("thinking");
      setTranscript("");

      if (t === codingTurn) {
        const challenge = DEFAULT_CODING_CHALLENGE;
        setCodingChallenge(challenge);
        setCodeResult(null);
        setCodeText(CODING_LANGUAGES[codeLanguage].template);
        setCustomInput("");
        const prompt = _codingPromptText(challenge);
        setCurrentQ(prompt);
        setChatLog(prev => [...prev, { role: "assistant", content: prompt }]);
        setTurn(t + 1);
        setPhase("speaking");
        await _speak(`Let's do a coding exercise. ${challenge.prompt}`);
        if (!mounted.current) return;
        setPhase("coding");

        const codingSummary = await _waitForAnswer();
        if (!mounted.current) return;
        setChatLog(prev => [...prev, { role: "user", content: codingSummary }]);
        history = [
          ...history,
          { role: "assistant", content: prompt },
          { role: "user", content: codingSummary },
        ];
        continue;
      }

      // Ask AI
      let aiData;
      try {
        const res = await api.post("/interview/chat", {
          messages:   [..._securityContextMessages(), ...history],
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
        if (mounted.current) _finishWithReport(rpt);
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
        messages:   [..._securityContextMessages(), ...history],
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
        if (mounted.current) _finishWithReport(d.report);
      }
    } catch (err) {
      console.error("Final report request failed:", err);
    }
  }

  // ── Handle Start ─────────────────────────────────────────────────────────────
  async function handleStart(cfg) {
    if (runActiveRef.current) return;
    runActiveRef.current = true;
    setErrMsg("");
    const micOk = await _initMic();
    if (!micOk) {
      runActiveRef.current = false;
      return;
    }
    await _initCamera();

    setConfig(cfg);
    configRef.current = cfg;
    setScreen("interview");
    setChatLog([]);
    setTurn(0);
    setReport(null);
    setTranscript("");
    setCurrentQ("");
    setElapsed(0);
    setFaceSnapshot(null);
    setViolations([]);
    setSecurityWarning("");
    setWarningTier(0);
    setInterviewerAlert(false);
    setShowEventLog(false);
    setNeedsFullscreen(false);
    setExecutionHistory([]);
    setCodeResult(null);
    faceStatsRef.current = createFaceStats();
    answerMetricsRef.current = [];
    violationsRef.current = [];
    proctoringRef.current = { samples: 0, faceVisible: 0, noFaceSamples: 0, multipleFaceSamples: 0, suspiciousEvents: [] };
    codingReportsRef.current = [];
    codingActivityRef.current = [];
    executionHistoryRef.current = [];
    lastTierRef.current = 0;
    interviewStartedAtRef.current = new Date().toISOString();
    windowSizeRef.current = { width: window.innerWidth, height: window.innerHeight };

    // Enforce fullscreen before interview begins
    if (cfg.secureMode) {
      try {
        if (!document.fullscreenElement) {
          await containerRef.current?.requestFullscreen();
        }
      } catch {
        setNeedsFullscreen(true);
      }
    }

    _logViolation("interview_start", "Secure interview mode activated.", "low", { skipTier: true, skipAiNotify: true });

    // Start timer
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);

    // Run the loop
    try {
      await _runInterview(cfg);
    } finally {
      runActiveRef.current = false;
    }
  }

  // ── Submit answer ─────────────────────────────────────────────────────────────
  function handleLanguageChange(lang) {
    setCodeLanguage(lang);
    setCodeText(CODING_LANGUAGES[lang].template);
    setCodeResult(null);
    _logCodingActivity("language_change", { language: lang });
  }

  function _logCodingActivity(action, meta = {}) {
    const entry = { action, timestamp: new Date().toISOString(), ...meta };
    codingActivityRef.current = [...codingActivityRef.current, entry];
  }

  useEffect(() => {
    if (phase !== "coding") return;
    clearTimeout(codeSaveTimerRef.current);
    codeSaveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(CODE_DRAFT_KEY, JSON.stringify({
          code: codeText,
          language: codeLanguage,
          challengeId: codingChallenge.id,
          savedAt: new Date().toISOString(),
        }));
        _logCodingActivity("auto_save", { chars: codeText.length });
      } catch {
        // localStorage may be unavailable in private mode.
      }
    }, 800);
    return () => clearTimeout(codeSaveTimerRef.current);
  }, [codeText, codeLanguage, phase, codingChallenge.id]);

  useEffect(() => {
    if (phase !== "coding") return;
    try {
      const raw = localStorage.getItem(CODE_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.challengeId === codingChallenge.id && draft.code) {
        setCodeText(draft.code);
        if (draft.language && CODING_LANGUAGES[draft.language]) setCodeLanguage(draft.language);
      }
    } catch {
      // Ignore corrupt drafts.
    }
  }, [phase, codingChallenge.id]);

  async function handleRunCode() {
    setErrMsg("");
    const result = await analyzeCodeSubmission({
      code: codeText,
      language: codeLanguage,
      challenge: codingChallenge,
      customInputRaw: customInput,
    });
    if (!mounted.current) return null;
    const runEntry = {
      timestamp: new Date().toISOString(),
      passed: result.passed,
      total: result.total,
      error: result.error || null,
      language: codeLanguage,
    };
    executionHistoryRef.current = [...executionHistoryRef.current, runEntry];
    setExecutionHistory(executionHistoryRef.current);
    _logCodingActivity("run", runEntry);
    _logViolation("coding_run", `Code executed: ${result.passed}/${result.total} tests passed.`, "low", { skipTier: true, skipAiNotify: true });
    setCodeResult(result);
    return result;
  }

  async function handleSubmitCode() {
    if (phase !== "coding") return;
    setPhase("submitting");
    const result = await handleRunCode();
    if (!result) return;
    const submittedAt = new Date().toISOString();
    codingReportsRef.current = [...codingReportsRef.current, {
      challengeTitle: codingChallenge.title,
      language: CODING_LANGUAGES[codeLanguage].label,
      code: codeText,
      submittedAt,
      executionHistory: [...executionHistoryRef.current],
      ...result,
    }];
    _logCodingActivity("submit", { submittedAt, score: result.score, passed: result.passed, total: result.total });
    _logViolation("coding_submission", `Coding challenge submitted at ${submittedAt}.`, "low", { skipTier: true, skipAiNotify: true });
    try { localStorage.removeItem(CODE_DRAFT_KEY); } catch { /* ignore */ }
    const summary = [
      `Coding submission for ${codingChallenge.title} in ${CODING_LANGUAGES[codeLanguage].label}.`,
      `Correctness: ${result.correctness}/100 (${result.passed}/${result.total} tests passed).`,
      `Estimated time complexity: ${result.timeComplexity}.`,
      `Estimated space complexity: ${result.spaceComplexity}.`,
      result.error ? `Execution error: ${result.error}.` : "",
      `Code:\n${codeText}`,
    ].filter(Boolean).join("\n");
    if (resolveRef.current) {
      resolveRef.current(summary);
      resolveRef.current = null;
    }
  }

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
    answerMetricsRef.current.push(analyseSpeechDelivery(text));
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
  async function handleReenterFullscreen() {
    try {
      await containerRef.current?.requestFullscreen();
      setNeedsFullscreen(false);
    } catch {
      setErrMsg("Could not re-enter fullscreen. Please use your browser's fullscreen control.");
    }
  }

  const handleExit = useCallback(async () => {
    clearInterval(timerRef.current);
    _stopRec();
    _stopCamera();
    window.speechSynthesis?.cancel();
    speakTokenRef.current += 1;
    runActiveRef.current = false;
    try {
      await document.exitFullscreen();
    } catch {
      // Ignore when the page is not currently in fullscreen.
    }
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
              {config?.secureMode && (
                <button
                  className={`ir-viol-badge${interviewerAlert ? " ir-viol-badge-alert" : ""}`}
                  onClick={() => setShowEventLog(v => !v)}
                  title="Interviewer proctoring dashboard"
                >
                  🛡 {violations.length} violation{violations.length !== 1 ? "s" : ""}
                  {warningTier > 0 && <span className="ir-viol-tier">T{warningTier}</span>}
                </button>
              )}
              {!isFS && config?.secureMode && (
                <span className="ir-fs-warn">Not fullscreen</span>
              )}
              <span className="ir-timer">⏱ {mm}:{ss}</span>
              <button className="ir-exit-btn" onClick={handleExit} title="Exit Interview">
                ✕ Exit
              </button>
            </div>
          </header>

          {securityWarning && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-rise">
              <div className="bg-white dark:bg-gray-900 border-2 border-red-500 rounded-3xl shadow-2xl p-8 sm:p-10 max-w-lg w-full text-center m-4">
                <div className="w-24 h-24 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <span className="text-5xl">{warningTier >= 3 ? "🚩" : warningTier >= 2 ? "⚠️" : "👀"}</span>
                </div>
                <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3">
                  {warningTier >= 3 ? "Flagged for Review" : warningTier >= 2 ? "Security Warning" : "Focus Reminder"}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-lg mb-8 leading-relaxed">
                  {securityWarning}
                </p>
                <button 
                  onClick={() => setSecurityWarning("")} 
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg shadow-red-600/30 text-lg"
                >
                  I Understand, Resume Interview
                </button>
              </div>
            </div>
          )}

          {needsFullscreen && config?.secureMode && (
            <div className="ir-fs-overlay">
              <div className="ir-fs-modal">
                <h4>Fullscreen Required</h4>
                <p>You exited fullscreen mode. Re-enter fullscreen to continue the secure interview.</p>
                <button className="ir-btn ir-btn-submit" onClick={handleReenterFullscreen}>
                  Re-enter Fullscreen
                </button>
              </div>
            </div>
          )}

          {showEventLog && config?.secureMode && (
            <ProctoringDashboard
              violations={violations}
              warningTier={warningTier}
              thresholds={config?.warningThresholds || SECURITY_LIMITS.warningThresholds}
              onClose={() => setShowEventLog(false)}
            />
          )}

          {/* Main area */}
          <main className="ir-main">

            {/* LEFT — Animated AI Avatar */}
            <aside className="ir-avatar-col">
              <AnimatedAvatar phase={phase} />
              <CandidateCamera
                videoRef={videoRef}
                status={cameraStatus}
                faceStatus={faceStatus}
                snapshot={faceSnapshot}
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

              {/* CODING CHALLENGE */}
              {phase === "coding" && (
                <div className="ir-coding-area">
                  <div className="ir-q-mini">
                    <span className="ir-q-mini-label">Coding Challenge</span>
                    <p className="ir-q-mini-text">{codingChallenge.title}: {codingChallenge.prompt}</p>
                    <small className="ir-coding-hint">{codingChallenge.inputHint}</small>
                  </div>
                  <div className="ir-coding-toolbar">
                    <select
                      className="ir-coding-select"
                      value={codeLanguage}
                      onChange={e => handleLanguageChange(e.target.value)}
                    >
                      {Object.entries(CODING_LANGUAGES).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                    <span className="ir-coding-autosave">Auto-save enabled</span>
                  </div>
                  <textarea
                    className="ir-code-editor"
                    value={codeText}
                    onChange={e => setCodeText(e.target.value)}
                    spellCheck={false}
                  />
                  <input
                    className="ir-coding-input"
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    placeholder='Custom test input (optional JSON)'
                  />
                  {codeResult && (
                    <div className={`ir-code-result${codeResult.passed === codeResult.total ? " ir-code-pass" : ""}`}>
                      <strong>{codeResult.passed}/{codeResult.total} tests passed</strong>
                      {codeResult.error && <p className="ir-err">{codeResult.error}</p>}
                      {codeResult.tests?.map(t => (
                        <div key={t.name} className={`ir-test-row${t.passed ? " ir-test-pass" : " ir-test-fail"}`}>
                          {t.passed ? "✓" : "✗"} {t.name}
                        </div>
                      ))}
                      {executionHistory.length > 0 && (
                        <div className="ir-exec-history">
                          <small>Execution history ({executionHistory.length} run{executionHistory.length !== 1 ? "s" : ""})</small>
                          {executionHistory.slice(-3).map((run, i) => (
                            <div key={i} className="ir-exec-row">
                              {new Date(run.timestamp).toLocaleTimeString()} — {run.passed}/{run.total} passed
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {errMsg && <p className="ir-err">{errMsg}</p>}
                  <div className="ir-btn-row">
                    <button className="ir-btn ir-btn-ghost" onClick={handleRunCode}>▶ Run Tests</button>
                    <button className="ir-btn ir-btn-submit" onClick={handleSubmitCode}>✅ Submit Solution</button>
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

                  {report.deliveryAnalysis && (
                    <div className="ir-delivery">
                      <div>
                        <p className="ir-delivery-kicker">Delivery and Face Expression</p>
                        <p className="ir-delivery-summary">{report.deliveryAnalysis.summary}</p>
                      </div>
                      <div className="ir-delivery-stats">
                        <MiniMetric label="Face visible" value={`${report.deliveryAnalysis.detectedPct}%`} />
                        <MiniMetric label="Main expression" value={report.deliveryAnalysis.dominantExpression} />
                        <MiniMetric label="Fillers" value={report.deliveryAnalysis.totalFillers} />
                        <MiniMetric label="Filler rate" value={`${report.deliveryAnalysis.fillerRate}%`} />
                      </div>
                      {report.deliveryAnalysis.expressionMix?.length > 0 && (
                        <div className="ir-expression-mix">
                          {report.deliveryAnalysis.expressionMix.map(item => (
                            <div key={item.label} className="ir-expression-row">
                              <span>{item.label}</span>
                              <div className="ir-expression-track"><div style={{ width: `${item.percent}%` }} /></div>
                              <strong>{item.percent}%</strong>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="ir-fb-card ir-fb-amber">
                        <p className="ir-fb-head">Improvement Notes</p>
                        {report.deliveryAnalysis.improvements.map((s, i) => <p key={i} className="ir-fb-item">â€¢ {s}</p>)}
                      </div>
                    </div>
                  )}

                  {report.integrityReport && (
                    <IntegrityReportSection report={report.integrityReport} />
                  )}

                  {report.securityAnalysis && (
                    <div className="ir-integrity-card">
                      <p className="ir-delivery-kicker">Security Analysis</p>
                      <p className="ir-delivery-summary">{report.securityAnalysis.summary}</p>
                      <div className="ir-delivery-stats">
                        <MiniMetric label="Total events" value={report.securityAnalysis.violationCount} />
                        <MiniMetric label="High risk" value={report.securityAnalysis.highRisk} />
                        <MiniMetric label="Interviewer notified" value={report.securityAnalysis.interviewerNotified ? "Yes" : "No"} />
                      </div>
                    </div>
                  )}

                  {report.proctoringAnalysis && (
                    <div className="ir-integrity-card">
                      <p className="ir-delivery-kicker">Webcam Proctoring</p>
                      <p className="ir-delivery-summary">{report.proctoringAnalysis.summary}</p>
                      {report.proctoringAnalysis.flags?.map((flag, i) => (
                        <p key={i} className="ir-fb-item">• {flag}</p>
                      ))}
                    </div>
                  )}

                  {report.codingAnalysis?.attempted && (
                    <div className="ir-integrity-card">
                      <p className="ir-delivery-kicker">Coding Assessment</p>
                      <p className="ir-delivery-summary">{report.codingAnalysis.summary}</p>
                      {report.codingAnalysis.reports?.map((r, i) => (
                        <div key={i} className="ir-coding-report-row">
                          <strong>{r.challengeTitle}</strong>
                          <span>{r.language} — {r.passed}/{r.total} tests — Score {r.score}</span>
                          {r.submittedAt && <small>Submitted {new Date(r.submittedAt).toLocaleString()}</small>}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="ir-log">
                    <p className="ir-log-title">💬 Interview Transcript</p>
                    {chatLog.map((m, i) => (
                      <div key={i} className={`ir-msg ir-msg-${m.role}`}>
                        <span className="ir-msg-who">
                          {m.role === "assistant" ? "🤖 Alex" : m.role === "system" ? "🛡 Proctoring" : "👤 You"}
                        </span>
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

// ─── Animated AI Avatar (no external API needed) ──────────────────────────────
function AnimatedAvatar({ phase }) {
  const isSpeaking   = phase === "speaking";
  const isListening  = phase === "recording";
  const isThinking   = phase === "thinking" || phase === "submitting";

  return (
    <div className={`ir-video-card${isSpeaking ? " ir-video-speaking" : isListening ? " ir-video-listening" : isThinking ? " ir-video-thinking" : ""}`}>
      <div className="ir-face-wrap">

        {/* Animated ring glow */}
        <div className={`av-ring-outer${isSpeaking ? " av-ring-speaking" : isListening ? " av-ring-listening" : ""}`} />

        {/* Avatar portrait image */}
        <img
          src={ALEX_AVATAR}
          alt="Alex — AI Interviewer"
          className={`ir-face-img${isSpeaking ? " av-img-talking" : isListening ? " av-img-listening" : isThinking ? " av-img-thinking" : " av-img-idle"}`}
          draggable={false}
        />

        <div className={`av-life-layer${isSpeaking ? " av-life-speaking" : isListening ? " av-life-listening" : ""}`}>
          <span className="av-eye av-eye-left" />
          <span className="av-eye av-eye-right" />
          <span className="av-mouth">
            <span />
            <span />
            <span />
          </span>
        </div>

        {/* Speaking wave bars overlay */}
        {isSpeaking && (
          <div className="av-wave-overlay">
            {[...Array(7)].map((_, i) => (
              <span key={i} className="av-wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        )}

        {/* Thinking / processing spinner overlay */}
        {isThinking && (
          <div className="av-thinking-overlay">
            <div className="av-think-ring" />
          </div>
        )}

        {/* Video overlay — nameplate + status badge */}
        <div className="ir-video-overlay">
          <div className="ir-nameplate">
            <span className={`ir-np-dot${isSpeaking ? " ir-np-dot-live" : isListening ? " ir-np-dot-listen" : ""}`} />
            Alex
          </div>
          {isSpeaking  && <div className="ir-speaking-badge"><WaveBars /> Speaking</div>}
          {isThinking  && <div className="ir-thinking-badge"><Spin /> Thinking</div>}
          {isListening && <div className="ir-listening-badge"><Pulse /> Listening</div>}
        </div>
      </div>
      <div className="ir-role-tag">Senior Software Engineer · AI Interviewer</div>
    </div>
  );
}

// ─── Small sub-components ──────────────────────────────────────────────────────
function CandidateCamera({ videoRef, status, faceStatus, snapshot }) {
  const isOn = status === "on";
  const expression = snapshot?.detected ? snapshot.dominant : status === "blocked" ? "Camera blocked" : "Waiting";

  return (
    <div className="ir-camera-card">
      <div className="ir-camera-frame">
        <video ref={videoRef} className="ir-camera-video" autoPlay muted playsInline />
        {!isOn && (
          <div className="ir-camera-empty">
            <span>{status === "blocked" ? "Camera unavailable" : "Starting camera"}</span>
          </div>
        )}
        <div className="ir-camera-overlay">
          <span className={`ir-camera-dot ${snapshot?.detected ? "ir-camera-dot-on" : ""}`} />
          <span>{expression}</span>
          {snapshot?.detected && <strong>{snapshot.confidence}%</strong>}
        </div>
      </div>
      <div className="ir-camera-meta">
        <span>Candidate camera</span>
        <small>{faceStatus}</small>
      </div>
    </div>
  );
}

function ScoreCard({ label, score, big }) {
  const c = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className={`ir-score-card${big ? " ir-score-big" : ""}`}>
      <p className="ir-score-num" style={{ color: c }}>{score}</p>
      <p className="ir-score-lbl">{label}</p>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="ir-mini-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ProctoringDashboard({ violations, warningTier, thresholds, onClose }) {
  const auditViolations = violations.filter(v => !["interview_start", "interview_end", "screen_share_limit"].includes(v.type));
  return (
    <aside className="ir-proctor-panel">
      <div className="ir-proctor-head">
        <div>
          <strong>Interviewer Dashboard</strong>
          <p>Live proctoring & violation count</p>
        </div>
        <button className="ir-proctor-close" onClick={onClose}>✕</button>
      </div>
      <div className="ir-proctor-stats">
        <div className="ir-proctor-stat">
          <strong>{auditViolations.length}</strong>
          <span>Violations</span>
        </div>
        <div className="ir-proctor-stat">
          <strong>T{warningTier || 0}</strong>
          <span>Warning tier</span>
        </div>
        <div className="ir-proctor-stat">
          <strong>{thresholds[2]}</strong>
          <span>Review threshold</span>
        </div>
      </div>
      <div className="ir-proctor-thresholds">
        <span>T1 @ {thresholds[0]}: {WARNING_TIER_MESSAGES[0]}</span>
        <span>T2 @ {thresholds[1]}: {WARNING_TIER_MESSAGES[1]}</span>
        <span>T3 @ {thresholds[2]}: {WARNING_TIER_MESSAGES[2]}</span>
      </div>
      <div className="ir-proctor-log">
        <p className="ir-proctor-log-title">Event Log</p>
        {violations.length === 0 && <p className="ir-dim">No events yet.</p>}
        {[...violations].reverse().map(v => (
          <div key={v.id} className={`ir-proctor-event ir-sev-${v.severity}`}>
            <span className="ir-proctor-time">{new Date(v.timestamp).toLocaleTimeString()}</span>
            <strong>{v.label || v.type}</strong>
            <p>{v.detail}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

function IntegrityReportSection({ report }) {
  return (
    <div className="ir-integrity-card ir-integrity-main">
      <p className="ir-delivery-kicker">Integrity Report</p>
      <p className="ir-delivery-summary">{report.recommendation}</p>
      <div className="ir-delivery-stats">
        <MiniMetric label="Total events" value={report.totalEvents} />
        <MiniMetric label="Warning tier" value={`T${report.warningTier}`} />
        <MiniMetric label="Flagged" value={report.flaggedForReview ? "Yes" : "No"} />
        <MiniMetric label="Duration" value={`${Math.floor(report.durationSec / 60)}m ${report.durationSec % 60}s`} />
      </div>
      {report.warningMessage && (
        <div className={`ir-sec-banner ir-sec-tier-${report.warningTier}`}>
          <p>{report.warningMessage}</p>
        </div>
      )}
      <div className="ir-proctor-log ir-integrity-log">
        <p className="ir-proctor-log-title">Complete Audit Trail</p>
        {report.events.map(v => (
          <div key={v.id} className={`ir-proctor-event ir-sev-${v.severity}`}>
            <span className="ir-proctor-time">{new Date(v.timestamp).toLocaleString()}</span>
            <strong>{v.label || v.type}</strong>
            <p>{v.detail}</p>
          </div>
        ))}
      </div>
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

.s-check-grid { display:flex; flex-direction:column; gap:10px; margin-bottom:14px; }
.s-check-row {
  display:flex; align-items:flex-start; gap:10px; cursor:pointer;
  padding:10px 12px; border-radius:10px; background:rgba(255,255,255,.03);
  border:1px solid rgba(255,255,255,.08);
}
.s-check-row input { margin-top:3px; accent-color:#3b82f6; }
.s-check-row span { display:flex; flex-direction:column; gap:3px; font-size:13px; color:#cbd5e1; }
.s-check-row small { font-size:11px; color:#64748b; font-weight:400; line-height:1.4; }
.s-threshold-grid { display:flex; flex-direction:column; gap:8px; }
.s-threshold-row {
  display:flex; align-items:center; justify-content:space-between; gap:12px;
  font-size:12px; color:#94a3b8;
}
.s-threshold-input { width:72px; text-align:center; padding:6px 8px; }
.s-fs-gate {
  margin:16px 0; padding:16px; border-radius:12px;
  background:rgba(245,158,11,.08); border:1px solid rgba(245,158,11,.25);
}
.s-fs-title { font-weight:700; color:#fbbf24; margin:0 0 6px; font-size:14px; }
.s-fs-desc { font-size:12px; color:#94a3b8; margin:0 0 12px; line-height:1.5; }
.s-fs-btn { width:100%; justify-content:center; }
.s-start-btn:disabled { opacity:.45; cursor:not-allowed; transform:none; box-shadow:none; }

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

.ir-viol-badge {
  padding:5px 12px; border-radius:99px; font-size:11px; font-weight:700;
  border:1px solid rgba(245,158,11,.35); background:rgba(245,158,11,.12);
  color:#fbbf24; cursor:pointer; display:flex; align-items:center; gap:6px;
}
.ir-viol-badge-alert {
  border-color:rgba(239,68,68,.45); background:rgba(239,68,68,.15); color:#f87171;
  animation:ir-viol-pulse 1.5s ease-in-out infinite;
}
.ir-viol-tier {
  background:rgba(0,0,0,.3); padding:1px 6px; border-radius:99px; font-size:10px;
}
@keyframes ir-viol-pulse { 0%,100%{opacity:1} 50%{opacity:.65} }
.ir-fs-warn { font-size:11px; color:#f87171; font-weight:600; }

.ir-sec-banner {
  display:flex; align-items:flex-start; gap:12px; padding:12px 24px;
  border-bottom:1px solid rgba(255,255,255,.08); flex-shrink:0;
}
.ir-sec-tier-1 { background:rgba(59,130,246,.12); border-color:rgba(59,130,246,.25); }
.ir-sec-tier-2 { background:rgba(245,158,11,.15); border-color:rgba(245,158,11,.3); }
.ir-sec-tier-3 { background:rgba(239,68,68,.18); border-color:rgba(239,68,68,.35); }
.ir-sec-banner strong { display:block; font-size:13px; margin-bottom:2px; }
.ir-sec-banner p { margin:0; font-size:12px; color:#cbd5e1; line-height:1.45; }
.ir-sec-icon { font-size:18px; flex-shrink:0; margin-top:2px; }

.ir-fs-overlay {
  position:fixed; inset:0; z-index:10000; background:rgba(2,8,23,.85);
  display:flex; align-items:center; justify-content:center; padding:24px;
}
.ir-fs-modal {
  max-width:420px; width:100%; padding:28px; border-radius:16px;
  background:#0f172a; border:1px solid rgba(239,68,68,.35); text-align:center;
}
.ir-fs-modal h4 { margin:0 0 10px; color:#f87171; }
.ir-fs-modal p { font-size:13px; color:#94a3b8; margin:0 0 18px; line-height:1.55; }

.ir-proctor-panel {
  position:fixed; top:60px; right:16px; width:340px; max-height:calc(100vh - 80px);
  z-index:9998; overflow:hidden; display:flex; flex-direction:column;
  background:rgba(15,23,42,.97); border:1px solid rgba(255,255,255,.12);
  border-radius:14px; box-shadow:0 20px 60px rgba(0,0,0,.5);
}
.ir-proctor-head {
  display:flex; justify-content:space-between; align-items:flex-start;
  padding:14px 16px; border-bottom:1px solid rgba(255,255,255,.08);
}
.ir-proctor-head strong { font-size:14px; display:block; }
.ir-proctor-head p { margin:2px 0 0; font-size:11px; color:#64748b; }
.ir-proctor-close {
  background:none; border:none; color:#94a3b8; cursor:pointer; font-size:16px; padding:4px;
}
.ir-proctor-stats {
  display:grid; grid-template-columns:repeat(3,1fr); gap:8px; padding:12px 16px;
  border-bottom:1px solid rgba(255,255,255,.06);
}
.ir-proctor-stat {
  text-align:center; padding:8px; border-radius:8px; background:rgba(255,255,255,.04);
}
.ir-proctor-stat strong { display:block; font-size:18px; color:#60a5fa; }
.ir-proctor-stat span { font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:.04em; }
.ir-proctor-thresholds {
  display:flex; flex-direction:column; gap:4px; padding:10px 16px;
  font-size:10px; color:#64748b; border-bottom:1px solid rgba(255,255,255,.06);
}
.ir-proctor-log { flex:1; overflow-y:auto; padding:12px 16px; }
.ir-proctor-log-title { font-size:12px; font-weight:700; color:#94a3b8; margin:0 0 10px; }
.ir-proctor-event {
  padding:8px 10px; margin-bottom:6px; border-radius:8px; font-size:11px;
  background:rgba(255,255,255,.03); border-left:3px solid rgba(148,163,184,.4);
}
.ir-proctor-event.ir-sev-high { border-left-color:#ef4444; }
.ir-proctor-event.ir-sev-medium { border-left-color:#f59e0b; }
.ir-proctor-event.ir-sev-low { border-left-color:#64748b; }
.ir-proctor-event strong { display:block; color:#e2e8f0; margin-bottom:2px; }
.ir-proctor-event p { margin:0; color:#94a3b8; line-height:1.4; }
.ir-proctor-time { font-size:10px; color:#475569; display:block; margin-bottom:2px; }

.ir-integrity-card {
  margin:16px 0; padding:16px; border-radius:12px;
  background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08);
}
.ir-integrity-main { border-color:rgba(99,102,241,.25); }
.ir-integrity-log { max-height:280px; }

.ir-coding-area { display:flex; flex-direction:column; gap:12px; height:100%; }
.ir-coding-hint { color:#64748b; font-size:11px; display:block; margin-top:4px; }
.ir-coding-toolbar { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.ir-coding-select {
  padding:8px 12px; border-radius:8px; background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.12); color:#e2e8f0; font-size:13px;
}
.ir-coding-autosave { font-size:11px; color:#22c55e; }
.ir-code-editor {
  flex:1; min-height:220px; padding:14px; border-radius:10px;
  background:#0d1117; border:1px solid rgba(255,255,255,.12); color:#e2e8f0;
  font-family:'Consolas','Monaco',monospace; font-size:13px; line-height:1.55;
  resize:vertical; outline:none;
}
.ir-code-editor:focus { border-color:rgba(59,130,246,.45); }
.ir-coding-input {
  padding:10px 12px; border-radius:8px; background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.1); color:#e2e8f0; font-size:12px;
  font-family:monospace;
}
.ir-code-result {
  padding:12px; border-radius:10px; background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.1); font-size:12px;
}
.ir-code-pass { border-color:rgba(34,197,94,.35); background:rgba(34,197,94,.08); }
.ir-test-row { padding:3px 0; color:#94a3b8; }
.ir-test-pass { color:#22c55e; }
.ir-test-fail { color:#f87171; }
.ir-exec-history { margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,.08); }
.ir-exec-row { font-size:11px; color:#64748b; padding:2px 0; }
.ir-coding-report-row {
  padding:8px 0; border-bottom:1px solid rgba(255,255,255,.06);
  display:flex; flex-direction:column; gap:2px; font-size:12px;
}
.ir-coding-report-row small { color:#64748b; }

/* Main split */
.ir-main {
  display:flex; flex:1; overflow:hidden;
  min-height:0; /* allow flex children to shrink */
}

/* ─ Avatar / Video column — HALF SCREEN LEFT */
.ir-avatar-col {
  width:46%;
  flex-shrink:0;
  display:flex;
  flex-direction:column;
  align-items:stretch;
  justify-content:flex-start;
  padding:16px 20px;
  gap:14px;
  overflow-y:auto;
  border-right:1px solid rgba(255,255,255,.07);
  background:rgba(2,5,16,.9);
}
@media(max-width:860px){
  .ir-main { flex-direction:column; }
  .ir-avatar-col { width:100%; padding:14px 16px; border-right:none;
                   border-bottom:1px solid rgba(255,255,255,.06);
                   flex-direction:row; justify-content:flex-start; }
  .ir-video-card, .ir-camera-card { max-width:50%; }
}
@media(max-width:620px){
  .ir-avatar-col { flex-direction:column; }
  .ir-video-card, .ir-camera-card { max-width:100%; }
}

/* Video card — full height portrait, fills the left half */
.ir-video-card {
  width:100%;
  max-width:100%;
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
  padding-bottom:110%; /* 4:5 portrait ratio */
  overflow:hidden;
  background:#0d1117;
}

/* Full face image (base layer) */
.ir-face-img {
  position:absolute;
  top:0; left:0; width:100%; height:100%;
  object-fit:cover; object-position:center top;
  display:block; user-select:none;
  transform-origin:50% 42%;
  will-change:transform, filter;
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

/* ─── AnimatedAvatar CSS ──────────────────────────────────────────────────── */

/* Animated ring that pulses behind the avatar */
.av-ring-outer {
  position:absolute;
  top:50%; left:50%;
  transform:translate(-50%,-50%);
  width:70%; padding-bottom:70%;
  border-radius:50%;
  z-index:1; pointer-events:none;
  transition:all .4s;
}
.av-ring-speaking {
  box-shadow:0 0 0 8px rgba(99,102,241,.25), 0 0 60px rgba(99,102,241,.35);
  animation:av-ring-pulse 1.2s ease-in-out infinite;
}
.av-ring-listening {
  box-shadow:0 0 0 8px rgba(34,197,94,.2), 0 0 40px rgba(34,197,94,.25);
  animation:av-ring-pulse-green 1.4s ease-in-out infinite;
}
@keyframes av-ring-pulse {
  0%,100% { box-shadow:0 0 0 8px rgba(99,102,241,.25), 0 0 60px rgba(99,102,241,.35); }
  50%      { box-shadow:0 0 0 18px rgba(99,102,241,.1), 0 0 80px rgba(99,102,241,.5); }
}
@keyframes av-ring-pulse-green {
  0%,100% { box-shadow:0 0 0 8px rgba(34,197,94,.2), 0 0 40px rgba(34,197,94,.25); }
  50%      { box-shadow:0 0 0 16px rgba(34,197,94,.08), 0 0 60px rgba(34,197,94,.35); }
}

/* Talking animation — subtle scale breathe on the portrait */
.av-img-idle { animation:av-idle-breathe 5.5s ease-in-out infinite; }
.av-img-listening { animation:av-listen-lean 3.8s ease-in-out infinite; }
.av-img-thinking {
  filter:saturate(.92) brightness(.92);
  animation:av-thinking-drift 3s ease-in-out infinite;
}
.av-img-talking { animation:av-talking .52s ease-in-out infinite alternate; }
@keyframes av-idle-breathe {
  0%,100% { transform:scale(1) translateY(0); }
  45%     { transform:scale(1.012) translateY(-2px); }
  70%     { transform:scale(1.006) translateX(1px); }
}
@keyframes av-listen-lean {
  0%,100% { transform:scale(1.012) translateX(0) rotate(0deg); }
  50%     { transform:scale(1.018) translateX(-3px) rotate(-.45deg); }
}
@keyframes av-thinking-drift {
  0%,100% { transform:scale(1.006) translateY(0); }
  50%     { transform:scale(1.016) translateY(-3px); }
}
@keyframes av-talking {
  from { transform:scale(1.012) translateY(0); }
  to   { transform:scale(1.028) translateY(-3px); }
}

/* Lightweight expression layer for blink and speech movement */
.av-life-layer {
  position:absolute;
  inset:0;
  z-index:7;
  pointer-events:none;
  opacity:.85;
}
.av-eye {
  position:absolute;
  top:31%;
  width:8%;
  height:2px;
  border-radius:999px;
  background:rgba(15,23,42,.72);
  opacity:.28;
  transform-origin:center;
  animation:av-blink 5.8s ease-in-out infinite;
}
.av-eye-left { left:37%; }
.av-eye-right { right:36%; animation-delay:.08s; }
@keyframes av-blink {
  0%, 92%, 100% { transform:scaleY(.35); opacity:.18; }
  94%, 96%     { transform:scaleY(2.8); opacity:.48; }
}
.av-mouth {
  position:absolute;
  left:50%;
  top:58%;
  width:16%;
  height:18px;
  transform:translateX(-50%);
  display:flex;
  align-items:flex-end;
  justify-content:center;
  gap:3px;
  opacity:0;
}
.av-mouth span {
  width:22%;
  height:5px;
  border-radius:999px;
  background:rgba(15,23,42,.78);
  box-shadow:0 0 10px rgba(255,255,255,.12);
  animation:av-mouth-talk .34s ease-in-out infinite alternate;
}
.av-mouth span:nth-child(2) { animation-delay:.08s; }
.av-mouth span:nth-child(3) { animation-delay:.16s; }
.av-life-speaking .av-mouth { opacity:.72; }
.av-life-listening .av-eye {
  opacity:.35;
  animation-duration:4.4s;
}
@keyframes av-mouth-talk {
  from { height:4px; transform:translateY(0); }
  to   { height:15px; transform:translateY(2px); }
}

/* Speaking wave bars overlay (bottom of avatar) */
.av-wave-overlay {
  position:absolute;
  bottom:52px; left:50%;
  transform:translateX(-50%);
  display:flex; align-items:flex-end; gap:3px;
  z-index:8; pointer-events:none;
  height:32px;
}
.av-wave-bar {
  display:inline-block;
  width:4px; border-radius:3px;
  background:linear-gradient(to top, #6366f1, #a78bfa);
  animation:av-wave-dance .6s ease-in-out infinite alternate;
  box-shadow:0 0 6px rgba(99,102,241,.6);
}
@keyframes av-wave-dance {
  0%   { height:4px;  opacity:.7; }
  100% { height:28px; opacity:1; }
}

/* Thinking spinner overlay */
.av-thinking-overlay {
  position:absolute;
  top:50%; left:50%;
  transform:translate(-50%,-50%);
  z-index:7; pointer-events:none;
}
.av-think-ring {
  width:56px; height:56px;
  border-radius:50%;
  border:3px solid rgba(59,130,246,.15);
  border-top-color:#3b82f6;
  animation:s-spin 1s linear infinite;
}

/* Green dot for listening state */
.ir-np-dot-listen {
  background:#22c55e;
  box-shadow:0 0 6px rgba(34,197,94,.8);
  animation:ir-blink 1.3s ease-in-out infinite;
}



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
.ir-camera-card {
  width:100%; max-width:100%;
  border:1px solid rgba(255,255,255,.1);
  border-radius:14px; overflow:hidden;
  background:rgba(15,23,42,.9);
  flex:1;
}
.ir-camera-frame {
  position:relative; width:100%; aspect-ratio:4/3;
  background:#050a14; overflow:hidden;
  min-height:200px;
}
.ir-camera-video {
  width:100%; height:100%; object-fit:cover;
  transform:scaleX(-1); display:block;
}
.ir-camera-empty {
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  background:rgba(2,6,23,.9); color:#94a3b8; font-size:13px;
}
.ir-camera-overlay {
  position:absolute; left:10px; right:10px; bottom:10px;
  display:flex; align-items:center; gap:7px;
  background:rgba(2,6,23,.78); border:1px solid rgba(255,255,255,.09);
  border-radius:999px; color:#e2e8f0; padding:6px 10px; font-size:12px;
  text-transform:capitalize; backdrop-filter:blur(8px);
}
.ir-camera-overlay strong { margin-left:auto; color:#93c5fd; }
.ir-camera-dot {
  width:8px; height:8px; border-radius:50%; background:#64748b; flex-shrink:0;
}
.ir-camera-dot-on {
  background:#22c55e; box-shadow:0 0 8px rgba(34,197,94,.8);
}
.ir-camera-meta {
  display:flex; justify-content:space-between; gap:10px; align-items:center;
  padding:9px 11px; font-size:12px; color:#e2e8f0;
}
.ir-camera-meta small { color:#64748b; text-align:right; }

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
/* Question cards */
.ir-q-card {
  background:linear-gradient(135deg,rgba(59,130,246,.08),rgba(99,102,241,.05));
  border:1px solid rgba(59,130,246,.3);
  border-left:4px solid #3b82f6;
  border-radius:16px; padding:28px 30px;
  max-width:680px;
  box-shadow:0 4px 24px rgba(59,130,246,.1);
  position:relative; overflow:hidden;
}
.ir-q-card::before {
  content:''; position:absolute; top:-40px; right:-40px;
  width:120px; height:120px; border-radius:50%;
  background:rgba(99,102,241,.06); pointer-events:none;
}
.ir-q-card-speaking {
  background:linear-gradient(135deg,rgba(167,139,250,.1),rgba(99,102,241,.06));
  border-color:rgba(167,139,250,.4);
  border-left-color:#6366f1;
  box-shadow:0 4px 32px rgba(99,102,241,.15);
}
.ir-q-label {
  font-size:10px; font-weight:800; text-transform:uppercase;
  letter-spacing:.1em; color:#818cf8; display:flex;
  align-items:center; gap:6px; margin-bottom:14px;
}
.ir-q-label::before {
  content:''; display:inline-block; width:6px; height:6px;
  border-radius:50%; background:#6366f1;
  box-shadow:0 0 8px rgba(99,102,241,.8);
  animation:ir-blink 1.4s ease-in-out infinite;
}
.ir-q-text {
  font-size:19px; font-weight:500; line-height:1.7;
  margin:0; color:#f1f5f9;
  text-shadow:0 1px 2px rgba(0,0,0,.3);
}

/* Mini question reminder (in recording phase) */
.ir-q-mini {
  background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.1);
  border-left:3px solid #6366f1;
  border-radius:12px; padding:14px 18px;
}
.ir-q-mini-label {
  font-size:10px; font-weight:800; text-transform:uppercase;
  letter-spacing:.08em; color:#6366f1; display:block; margin-bottom:6px;
}
.ir-q-mini-text {
  font-size:15px; color:#cbd5e1; margin:0; line-height:1.55; font-weight:400;
}

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

.ir-delivery {
  background:rgba(59,130,246,.04); border:1px solid rgba(59,130,246,.16);
  border-radius:14px; padding:18px; display:flex; flex-direction:column; gap:14px;
}
.ir-delivery-kicker {
  margin:0 0 6px; font-size:12px; font-weight:800; letter-spacing:.05em;
  text-transform:uppercase; color:#60a5fa;
}
.ir-delivery-summary {
  margin:0; color:#cbd5e1; font-size:14px; line-height:1.6;
}
.ir-delivery-stats {
  display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:10px;
}
@media(max-width:620px){ .ir-delivery-stats{ grid-template-columns:repeat(2, minmax(0,1fr)); } }
.ir-mini-metric {
  border:1px solid rgba(255,255,255,.08); border-radius:10px;
  background:rgba(255,255,255,.04); padding:12px; min-width:0;
}
.ir-mini-metric strong {
  display:block; color:#f8fafc; font-size:18px; text-transform:capitalize;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.ir-mini-metric span {
  display:block; color:#64748b; font-size:10px; margin-top:4px; text-transform:uppercase;
}
.ir-expression-mix { display:flex; flex-direction:column; gap:8px; }
.ir-expression-row {
  display:grid; grid-template-columns:78px 1fr 44px; gap:10px; align-items:center;
  color:#94a3b8; font-size:12px; text-transform:capitalize;
}
.ir-expression-row strong { color:#cbd5e1; text-align:right; }
.ir-expression-track {
  height:8px; border-radius:999px; background:rgba(255,255,255,.08); overflow:hidden;
}
.ir-expression-track div {
  height:100%; border-radius:inherit; background:linear-gradient(90deg,#38bdf8,#22c55e);
}

.ir-log { background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.06);
          border-radius:12px; padding:16px; }
.ir-log-title { font-weight:700; font-size:14px; margin:0 0 12px; color:#e2e8f0; }
.ir-msg       { border-radius:8px; padding:10px 12px; margin-bottom:8px; }
.ir-msg-assistant { background:rgba(59,130,246,.07); border-left:3px solid #3b82f6; }
.ir-msg-user      { background:rgba(255,255,255,.04); border-left:3px solid #334155; }
.ir-msg-system    { background:rgba(245,158,11,.08); border-left:3px solid #f59e0b; }
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
