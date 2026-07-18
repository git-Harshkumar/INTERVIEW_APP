import * as faceapi from "face-api.js";
import { useCallback, useEffect, useRef, useState } from "react";
import api from "./api";
import ALEX_AVATAR from "./assets/alex-real.png";
import { Shield, Timer, LogOut, CheckCircle2, AlertTriangle, Play, Mic, RotateCcw, Video, Users, User, ArrowRight, Volume2, Sparkles, HelpCircle } from 'lucide-react';

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
  noFaceWarningSamples: 6,
  multipleFaceWarningSamples: 4,
  resizeRatioThreshold: 0.22,
  graceSeconds: 10,
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
  const [jobRole, setJobRole] = useState("");
  const [interviewType, setInterviewType] = useState("topics");
  const [selectedTopics, setSelectedTopics] = useState(
    TOPIC_OPTIONS.includes(defaultTopic) ? [defaultTopic] : ["JavaScript", "React"]
  );
  const [customTopic, setCustomTopic] = useState("");
  const [cvText, setCvText] = useState("");
  const [difficulty, setDifficulty] = useState(defaultDifficulty || "medium");
  const [maxTurns, setMaxTurns] = useState(5);
  const [enableCoding, setEnableCoding] = useState(true);
  const [secureMode, setSecureMode] = useState(true);
  const [violationLimit, setViolationLimit] = useState(SECURITY_LIMITS.maxViolations);
  const [warningThresholds, setWarningThresholds] = useState([...SECURITY_LIMITS.warningThresholds]);
  const [fullscreenReady, setFullscreenReady] = useState(false);
  const [err, setErr] = useState("");

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
      jobRole: jobRole.trim() || "Software Engineer",
      interviewType,
      topics: selectedTopics,
      cvText: cvText.trim(),
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
              {[3, 5, 8, 10].map(n => (
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
  const [screen, setScreen] = useState("setup");
  const [config, setConfig] = useState(null);
  const [phase, setPhase] = useState("");   // thinking|speaking|recording|submitting|done
  const [currentQ, setCurrentQ] = useState("");
  const [, setTranscript] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [report, setReport] = useState(null);
  const [turn, setTurn] = useState(0);
  const [volume, setVolume] = useState(0);
  const [errMsg, setErrMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [isFS, setIsFS] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("off");
  const [faceStatus, setFaceStatus] = useState("Loading face analysis...");
  const [faceSnapshot, setFaceSnapshot] = useState(null);
  const [violations, setViolations] = useState([]);
  const [securityWarning, setSecurityWarning] = useState("");
  const [warningTier, setWarningTier] = useState(0);
  const [interviewerAlert, setInterviewerAlert] = useState(false);
  const securityWarningRef = useRef("");
  const [showEventLog, setShowEventLog] = useState(false);
  const [needsFullscreen, setNeedsFullscreen] = useState(false);
  const [codingChallenge, setCodingChallenge] = useState(DEFAULT_CODING_CHALLENGE);
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const [codeText, setCodeText] = useState(CODING_LANGUAGES.javascript.template);
  const [customInput, setCustomInput] = useState("");
  const [codeResult, setCodeResult] = useState(null);
  const [executionHistory, setExecutionHistory] = useState([]);

  const mediaRecRef = useRef(null);
  const chunksRef = useRef([]);
  const resolveRef = useRef(null);
  const streamRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const volTimer = useRef(null);
  const faceTimer = useRef(null);
  const timerRef = useRef(null);
  const mounted = useRef(true);
  const runActiveRef = useRef(false);
  const speakTokenRef = useRef(0);
  const containerRef = useRef(null);
  const configRef = useRef(null);
  const videoRef = useRef(null);
  const phaseRef = useRef("");
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
      closeAudio?.catch?.(() => { });
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
  useEffect(() => { securityWarningRef.current = securityWarning; }, [securityWarning]);

  useEffect(() => {
    if (screen !== "interview" || !cameraStreamRef.current || !videoRef.current) return;
    videoRef.current.srcObject = cameraStreamRef.current;
    _startFaceAnalysis();
    return () => clearInterval(faceTimer.current);
  }, [screen]);

  function _logViolation(type, detail, severity = "medium", { skipTier = false, skipAiNotify = false } = {}) {
    if (!configRef.current?.secureMode || phaseRef.current === "done") return null;

    // Ignore certain violations during the grace stabilization window
    const elapsedSec = interviewStartedAtRef.current
      ? Math.floor((Date.now() - new Date(interviewStartedAtRef.current).getTime()) / 1000)
      : 0;
    if (elapsedSec < SECURITY_LIMITS.graceSeconds && ["window_blur", "window_resize", "multiple_faces", "candidate_absent", "display_risk", "multiple_displays"].includes(type)) {
      return null;
    }
    // Suppress window_blur when the security warning modal is displayed (it steals focus itself)
    if (type === "window_blur" && securityWarningRef.current) {
      return null;
    }

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
    const activeViolationsCount = violationsRef.current.filter(
      v => !["interview_start", "interview_end", "screen_share_limit", "multiple_displays", "display_risk", "coding_run", "coding_submission"].includes(v.type)
    ).length;
    const tier = getWarningTier(activeViolationsCount, thresholds);
    const tierMessage = tier > 0 ? WARNING_TIER_MESSAGES[tier - 1] : detail;

    if (!skipTier && !["interview_start", "interview_end", "screen_share_limit", "multiple_displays", "display_risk", "coding_run", "coding_submission"].includes(type)) {
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
    } else if (tier === 1 && activeViolationsCount === thresholds[0] && !["interview_start", "interview_end", "screen_share_limit", "multiple_displays", "display_risk", "coding_run", "coding_submission"].includes(type)) {
      setChatLog(prev => [...prev, {
        role: "system",
        content: `[Proctoring Notice] ${WARNING_TIER_MESSAGES[0]}`,
        timestamp: entry.timestamp,
      }]);
    }

    const limit = configRef.current?.violationLimit || thresholds[2] || SECURITY_LIMITS.maxViolations;
    if (activeViolationsCount >= limit) {
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
    chunksRef.current = [];
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
        const an = ctx.createAnalyser();
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
        u.onend = () => token === speakTokenRef.current && next();
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
    audioCtxRef.current?.resume?.().catch?.(() => { });
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
        chunksRef.current = [];
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
          messages: [..._securityContextMessages(), ...history],
          system: "",
          topic: topicStr,
          difficulty: cfg.difficulty,
          turn: t,
          maxTurns: cfg.maxTurns,
          cv_text: cfg.cvText,
          job_role: cfg.jobRole,
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
        { role: "user", content: answer },
      ];
    }

    // Run one more turn to get final report if loop exited without is_final
    if (!mounted.current) return;
    setPhase("thinking");
    const cfg2 = configRef.current;
    try {
      const res = await api.post("/interview/chat", {
        messages: [..._securityContextMessages(), ...history],
        system: "",
        topic: cfg2.topics.join(", "),
        difficulty: cfg2.difficulty,
        turn: cfg2.maxTurns,
        maxTurns: cfg2.maxTurns,
        cv_text: cfg2.cvText,
        job_role: cfg2.jobRole,
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
  const volPct = Math.min(volume * 3.5, 100);
  const volColor = volume > 18 ? "#22c55e" : volume > 7 ? "#f59e0b" : "#1e293b";
  const activeViolations = violations.filter(v => !["interview_start", "interview_end", "screen_share_limit", "multiple_displays", "display_risk", "coding_run", "coding_submission"].includes(v.type));

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
            <div className="ir-logo-wrap">
              <div className="ir-logo-icon">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="ir-logo-text">PrepMate AI</span>
            </div>

            {/* Progress dots */}
            <div className="ir-progress">
              {phase !== "done" && Array.from({ length: config?.maxTurns || 5 }, (_, i) => (
                <div
                  key={i}
                  className={`ir-pdot ${i < turn ? "ir-pdot-done" : i === turn - 1 ? "ir-pdot-cur" : ""}`}
                />
              ))}
            </div>

            <div className="ir-topbar-right">
              {config?.secureMode && (
                <button
                  className={`ir-viol-badge-premium ${
                    activeViolations.length > 0 ? "ir-viol-badge-alert" : "ir-viol-badge-clean"
                  }`}
                  onClick={() => setShowEventLog(v => !v)}
                  title="Interviewer proctoring dashboard"
                >
                  <Shield size={14} className={activeViolations.length > 0 ? "text-red-400" : "text-emerald-500"} />
                  <span>{activeViolations.length} Violations</span>
                </button>
              )}
              {!isFS && config?.secureMode && (
                <span className="ir-fs-warn">Not fullscreen</span>
              )}
              <div className="ir-timer-pill">
                <Timer size={14} className="text-slate-400" />
                <span>{mm}:{ss}</span>
              </div>
              <button className="ir-exit-btn-premium" onClick={handleExit} title="Exit Interview">
                <LogOut size={13} />
                <span>Exit</span>
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
                  <div className="ir-session-label">
                    <span className="ir-session-phase">SESSION PHASE {String(turn).padStart(2,'0')}/{String(config?.maxTurns||5).padStart(2,'0')}</span>
                  </div>
                  <span className="ir-q-label">— INQUIRY FRAGMENT</span>
                  <p className="ir-q-text">"{currentQ}"</p>
                  {config?.topics?.length > 0 && (
                    <div className="ir-topic-tags-premium">
                      {config.topics.slice(0, 3).map(t => (
                        <span key={t} className="ir-topic-tag-premium">
                          <Sparkles size={11} />
                          <span>{t.toUpperCase()}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* RECORDING */}
              {phase === "recording" && (
                <div className="ir-answer-area">
                  {/* Session phase + question card */}
                  <div className="ir-q-card ir-q-card-recording">
                    <div className="ir-session-label">
                      <span className="ir-session-phase">SESSION PHASE {String(turn).padStart(2,'0')}/{String(config?.maxTurns||5).padStart(2,'0')}</span>
                    </div>
                    <span className="ir-q-label">— INQUIRY FRAGMENT</span>
                    <p className="ir-q-text">"{currentQ}"</p>
                    {config?.topics?.length > 0 && (
                      <div className="ir-topic-tags-premium">
                        {config.topics.slice(0, 3).map(t => (
                          <span key={t} className="ir-topic-tag-premium">
                            <Sparkles size={11} />
                            <span>{t.toUpperCase()}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recording panel */}
                  <div className="ir-rec-panel-premium">
                    <div className="ir-rec-main-row">
                      <div className="ir-rec-mic-btn">
                        <Mic size={18} className="text-white" />
                      </div>
                      <div className="ir-rec-info">
                        <span className="ir-rec-status-text">Recording Response...</span>
                        <span className="ir-rec-timer-text">
                          <span className="ir-rec-dot-active" />
                          {mm}:{ss} / 03:00
                        </span>
                      </div>
                      <div className="ir-rec-amplitude-bars">
                        {[...Array(6)].map((_, i) => {
                          const h = Math.max(4, Math.min(24, (volume * (i + 1)) % 24 + 4));
                          return (
                            <span 
                              key={i} 
                              className="ir-amplitude-bar" 
                              style={{ height: `${h}px` }} 
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Horizontal Waveform */}
                    <div className="ir-rec-waveform-row">
                      {[...Array(40)].map((_, i) => {
                        const h = 4 + Math.sin(i * 0.4 + elapsed * 2) * (volume > 4 ? 12 : 3) + Math.random() * 4;
                        return (
                          <span 
                            key={i} 
                            className="ir-waveform-stick" 
                            style={{ height: `${Math.max(4, h)}px` }} 
                          />
                        );
                      })}
                    </div>

                    {errMsg && <p className="ir-err">{errMsg}</p>}

                    <div className="ir-btn-row-premium">
                      <button className="ir-btn-rerecord-premium" onClick={handleReRecord}>
                        <RotateCcw size={13} />
                        <span>Re-record</span>
                      </button>
                      <button className="ir-btn-submit-premium" onClick={handleSubmit}>
                        <span>Submit Answer</span>
                        <ArrowRight size={14} />
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
  const isSpeaking = phase === "speaking";
  const isListening = phase === "recording";
  const isThinking = phase === "thinking" || phase === "submitting";

  let statusText = "••• AI INTERVIEWER IDLE";
  if (isSpeaking) statusText = "••• AI INTERVIEWER SPEAKING";
  if (isListening) statusText = "••• AI INTERVIEWER LISTENING";
  if (isThinking) statusText = "••• AI INTERVIEWER THINKING";

  return (
    <div className="ir-avatar-container">
      <div className={`ir-avatar-circle-wrap ${isSpeaking ? "speaking" : isListening ? "listening" : isThinking ? "thinking" : ""}`}>
        <div className="ir-avatar-circle-glow" />
        <img
          src={ALEX_AVATAR}
          alt="Alex — AI Interviewer"
          className="ir-avatar-circle-img"
          draggable={false}
        />
        {isSpeaking && (
          <div className="av-wave-overlay-premium">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="av-wave-bar-premium" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        )}
      </div>
      <h3 className="ir-avatar-name">Alex</h3>
      <p className={`ir-avatar-status ${isSpeaking ? "status-speaking" : isListening ? "status-listening" : isThinking ? "status-thinking" : ""}`}>
        {statusText}
      </p>
    </div>
  );
}

// ─── Small sub-components ──────────────────────────────────────────────────────
function CandidateCamera({ videoRef, status, faceStatus, snapshot }) {
  const isOn = status === "on";
  const isStarting = status === "starting";

  return (
    <div className="ir-camera-premium">
      {/* You label header */}
      <div className="ir-camera-you-label">
        <div className="ir-camera-you-dot" />
        <span>YOU (Candidate Preview)</span>
      </div>

      <div className="ir-camera-frame-premium">
        {/* Corner guide markers for biometrics */}
        <div className="ir-camera-corner corner-tl" />
        <div className="ir-camera-corner corner-tr" />
        <div className="ir-camera-corner corner-bl" />
        <div className="ir-camera-corner corner-br" />

        <video ref={videoRef} className="ir-camera-video-premium" autoPlay muted playsInline />

        {/* Overlay when camera not yet on */}
        {!isOn && (
          <div className="ir-camera-empty-premium">
            {isStarting ? (
              <div className="ir-camera-starting">
                <div className="ir-camera-spinner" />
                <span>Starting camera…</span>
              </div>
            ) : (
              <div className="ir-camera-starting">
                <span className="ir-camera-blocked-icon">{status === "blocked" ? "🚫" : "📷"}</span>
                <span>{status === "blocked" ? "Camera Unavailable" : "Waiting for camera…"}</span>
              </div>
            )}
          </div>
        )}

        {/* Top Biometrics active badge */}
        <div className="ir-camera-badge-top">
          <span className="ir-camera-badge-dot" />
          <span>BIOMETRICS ACTIVE</span>
        </div>

        {/* Bottom expression/status badge */}
        <div className="ir-camera-badge-bottom">
          {snapshot?.detected && snapshot?.dominant
            ? <span>😊 {snapshot.dominant.toUpperCase()} · {snapshot.confidence}%</span>
            : <span>LIVE STREAM</span>
          }
        </div>

        {/* Face-not-detected warning overlay */}
        {isOn && snapshot && !snapshot.detected && (
          <div className="ir-camera-no-face">
            <span>👤 No face detected</span>
          </div>
        )}
      </div>

      {/* Face status text below camera */}
      <p className="ir-camera-status-text">
        {isOn
          ? (snapshot?.detected
              ? `✅ Face detected · ${faceStatus}`
              : `⚠️ ${faceStatus}`)
          : (status === "blocked" ? "🚫 Camera blocked — allow access" : "⏳ Initialising camera…")
        }
      </p>
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
        <p className="ir-proctor-log-title">Violation Log</p>
        {auditViolations.map((v, i) => (
          <div key={i} className={`ir-proctor-event ir-sev-${v.severity}`}>
            <span className="ir-proctor-time">{new Date(v.timestamp).toLocaleTimeString()}</span>
            <strong>{v.label}</strong>
            <p>{v.detail}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

const CSS = `
/* ── Root ── */
.li-root {
  font-family: 'Inter', sans-serif;
  color: #1e293b;
  background: #f8fafc;
}
.li-root-fs {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  overflow: auto;
  background: #f8fafc;
}

/* ── SETUP SCREEN ── */
.s-wrap {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 32px 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
}
.s-card {
  width: 100%;
  max-width: 760px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.03);
}
@media(max-width:600px){ .s-card{ padding: 24px 18px; } }

.s-head { margin-bottom: 28px; }
.s-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: #2563eb;
  background: rgba(37, 99, 235, 0.08);
  border: 1px solid rgba(37, 99, 235, 0.15);
  border-radius: 99px;
  padding: 4px 12px;
  margin-bottom: 10px;
}
.s-title { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0 0 8px; }
.s-sub { color: #64748b; font-size: 14px; line-height: 1.65; margin: 0; }

.s-field { margin-bottom: 22px; }
.s-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 10px;
}
.s-label-count {
  font-size: 11px;
  font-weight: 500;
  color: #2563eb;
  background: rgba(37, 99, 235, 0.08);
  border-radius: 99px;
  padding: 1px 8px;
}
.s-hint-text { font-size: 12px; color: #64748b; margin: 0 0 10px; line-height: 1.5; }

.s-input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  color: #0f172a;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: all .2s;
}
.s-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
.s-input::placeholder { color: #94a3b8; }
.s-input-sm { width: auto; flex: 1; }

/* Type toggle */
.s-toggle-row { display: flex; gap: 10px; }
.s-toggle-btn {
  flex: 1;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #64748b;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;
  transition: all .18s;
}
.s-toggle-btn:hover { border-color: #cbd5e1; color: #334155; }
.s-toggle-btn-on {
  background: rgba(37, 99, 235, 0.05);
  border-color: #3b82f6;
  color: #2563eb;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.05);
}
.s-toggle-hint { font-size: 11px; font-weight: 400; color: inherit; opacity: .8; }

/* Topic pills */
.s-pill-grid { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 12px; }
.s-pill {
  padding: 6px 14px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #64748b;
  cursor: pointer;
  transition: all .15s;
}
.s-pill:hover { border-color: #cbd5e1; color: #334155; }
.s-pill-on {
  background: rgba(37, 99, 235, 0.08);
  border-color: #3b82f6;
  color: #2563eb;
  font-weight: 600;
}
.s-custom-row { display: flex; gap: 8px; align-items: center; }
.s-btn-ghost {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  cursor: pointer;
  white-space: nowrap;
  transition: all .15s;
}
.s-btn-ghost:hover { background: #f8fafc; color: #334155; }

/* Difficulty / Questions */
.s-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media(max-width:500px){ .s-two-col{ grid-template-columns: 1fr; } }

.s-seg { display: flex; gap: 4px; background: #f1f5f9; padding: 4px; border-radius: 10px; }
.s-seg-btn {
  flex: 1;
  padding: 8px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all .15s;
}
.s-seg-btn:hover { color: #334155; }
.s-seg-btn-on {
  background: #ffffff;
  color: #2563eb;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.s-err { color: #ef4444; font-size: 13px; margin: 4px 0 14px; }

.s-start-btn {
  width: 100%;
  padding: 16px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(135deg, #3b82f6, #4f46e5);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 8px 24px rgba(79, 70, 229, 0.25);
  transition: all .2s;
  margin-top: 8px;
}
.s-start-btn:hover { box-shadow: 0 12px 30px rgba(79, 70, 229, 0.38); transform: translateY(-1px); }
.s-footer-note { text-align: center; color: #94a3b8; font-size: 12px; margin: 14px 0 0; }

.s-check-grid { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
.s-check-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  padding: 12px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
}
.s-check-row input { margin-top: 4px; accent-color: #3b82f6; }
.s-check-row span { display: flex; flex-direction: column; gap: 3px; font-size: 13px; color: #334155; }
.s-check-row small { font-size: 11px; color: #64748b; font-weight: 400; line-height: 1.45; }
.s-threshold-grid { display: flex; flex-direction: column; gap: 8px; }
.s-threshold-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: #64748b;
}
.s-threshold-input { width: 72px; text-align: center; padding: 6px 8px; background: #ffffff; border: 1px solid #cbd5e1; }
.s-fs-gate {
  margin: 16px 0;
  padding: 16px;
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.2);
}
.s-fs-title { font-weight: 700; color: #d97706; margin: 0 0 6px; font-size: 14px; }
.s-fs-desc { font-size: 12px; color: #64748b; margin: 0 0 12px; line-height: 1.5; }
.s-fs-btn { width: 100%; justify-content: center; }
.s-start-btn:disabled { opacity: .45; cursor: not-allowed; transform: none; box-shadow: none; }

/* ── INTERVIEW ROOM ── */
.ir-room {
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
  overflow: hidden;
}

/* Top bar */
.ir-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  flex-shrink: 0;
  gap: 16px;
  z-index: 100;
}
.ir-logo-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ir-logo-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6, #4f46e5);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
}
.ir-logo-text {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.ir-progress { display: flex; align-items: center; gap: 8px; flex: 1; justify-content: center; }
.ir-pdot {
  width: 24px;
  height: 6px;
  border-radius: 3px;
  background: #e2e8f0;
  transition: all .3s ease;
}
.ir-pdot-done { background: #3b82f6; }
.ir-pdot-cur {
  background: linear-gradient(90deg, #3b82f6, #6366f1);
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.4);
  width: 36px;
}

.ir-topbar-right { display: flex; align-items: center; gap: 10px; }

/* Premium Badges */
.ir-viol-badge-premium {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}
.ir-viol-badge-clean {
  background: rgba(16, 185, 129, 0.06);
  border-color: rgba(16, 185, 129, 0.15);
  color: #059669;
}
.ir-viol-badge-clean:hover {
  background: rgba(16, 185, 129, 0.1);
}
.ir-viol-badge-alert {
  background: rgba(239, 68, 68, 0.06);
  border-color: rgba(239, 68, 68, 0.15);
  color: #dc2626;
  animation: badge-pulse 1.8s infinite alternate;
}
@keyframes badge-pulse {
  from { transform: scale(1); }
  to { transform: scale(1.03); }
}

.ir-timer-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 99px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.ir-exit-btn-premium {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border-radius: 99px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.15);
  color: #ef4444;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.ir-exit-btn-premium:hover {
  background: #ef4444;
  color: white;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
}

.ir-fs-warn { font-size: 11px; color: #ef4444; font-weight: 600; }

.ir-sec-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 24px;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}
.ir-sec-tier-1 { background: rgba(59, 130, 246, 0.05); border-color: rgba(59, 130, 246, 0.1); }
.ir-sec-tier-2 { background: rgba(245, 158, 11, 0.05); border-color: rgba(245, 158, 11, 0.15); }
.ir-sec-tier-3 { background: rgba(239, 68, 68, 0.05); border-color: rgba(239, 68, 68, 0.18); }
.ir-sec-banner strong { display: block; font-size: 13px; margin-bottom: 2px; }
.ir-sec-banner p { margin: 0; font-size: 12px; color: #475569; line-height: 1.45; }

.ir-fs-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.ir-fs-modal {
  max-width: 420px;
  width: 100%;
  padding: 32px;
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid #fca5a5;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0,0,0,0.1);
}
.ir-fs-modal h4 { margin: 0 0 10px; color: #dc2626; font-size: 18px; font-weight: 700; }
.ir-fs-modal p { font-size: 13px; color: #64748b; margin: 0 0 20px; line-height: 1.55; }

.ir-proctor-panel {
  position: fixed;
  top: 70px;
  right: 16px;
  width: 340px;
  max-height: calc(100vh - 90px);
  z-index: 9998;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 20px 48px rgba(0,0,0,0.08);
}
.ir-proctor-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
}
.ir-proctor-head strong { font-size: 14px; color: #0f172a; display: block; }
.ir-proctor-head p { margin: 2px 0 0; font-size: 11px; color: #64748b; }
.ir-proctor-close {
  background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 16px; padding: 4px;
}
.ir-proctor-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
}
.ir-proctor-stat {
  text-align: center; padding: 8px; border-radius: 8px; background: #f8fafc; border: 1px solid #f1f5f9;
}
.ir-proctor-stat strong { display: block; font-size: 18px; color: #2563eb; }
.ir-proctor-stat span { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: .04em; }

.ir-proctor-thresholds {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 16px;
  font-size: 10px;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
}
.ir-proctor-log { flex: 1; overflow-y: auto; padding: 12px 16px; }
.ir-proctor-log-title { font-size: 12px; font-weight: 700; color: #334155; margin: 0 0 10px; }
.ir-proctor-event {
  padding: 8px 10px; margin-bottom: 6px; border-radius: 8px; font-size: 11px;
  background: #f8fafc; border-left: 3px solid #cbd5e1; border: 1px solid #e2e8f0; border-left-width: 3px;
}
.ir-proctor-event.ir-sev-high { border-left-color: #ef4444; }
.ir-proctor-event.ir-sev-medium { border-left-color: #f59e0b; }
.ir-proctor-event.ir-sev-low { border-left-color: #64748b; }
.ir-proctor-event strong { display: block; color: #334155; margin-bottom: 2px; }
.ir-proctor-event p { margin: 0; color: #64748b; line-height: 1.4; }
.ir-proctor-time { font-size: 10px; color: #94a3b8; display: block; margin-bottom: 2px; }

.ir-integrity-card {
  margin: 16px 0; padding: 16px; border-radius: 12px;
  background: #ffffff; border: 1px solid #e2e8f0;
}
.ir-integrity-main { border-color: #cbd5e1; }
.ir-integrity-log { max-height: 280px; }

.ir-coding-area { display: flex; flex-direction: column; gap: 12px; height: 100%; }
.ir-coding-hint { color: #64748b; font-size: 11px; display: block; margin-top: 4px; }
.ir-coding-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.ir-coding-select {
  padding: 8px 12px; border-radius: 8px; background: #ffffff;
  border: 1px solid #cbd5e1; color: #334155; font-size: 13px;
}
.ir-coding-autosave { font-size: 11px; color: #16a34a; font-weight: 500; }
.ir-code-editor {
  flex: 1; min-height: 220px; padding: 14px; border-radius: 10px;
  background: #0f172a; border: 1px solid #334155; color: #f8fafc;
  font-family: 'Consolas', 'Monaco', monospace; font-size: 13px; line-height: 1.55;
  resize: vertical; outline: none;
}
.ir-coding-input {
  padding: 10px 12px; border-radius: 8px; background: #ffffff;
  border: 1px solid #cbd5e1; color: #334155; font-size: 12px;
}
.ir-code-result {
  padding: 12px; border-radius: 10px; background: #f8fafc; border: 1px solid #cbd5e1; font-size: 12px;
}
.ir-code-pass { border-color: rgba(34,197,94,.35); background: rgba(34,197,94,.04); }

/* Main Split layout */
.ir-main {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* Avatar col - left side (38% width) */
.ir-avatar-col {
  width: 38%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  padding: 28px 20px;
  border-right: 1px solid #e2e8f0;
  background: #ffffff;
  overflow-y: auto;
}

/* Avatar container layout matching screenshot */
.ir-avatar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-top: 15px;
}
.ir-avatar-circle-wrap {
  width: 170px;
  height: 170px;
  border-radius: 50%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}
.ir-avatar-circle-img {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #ffffff;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
  position: relative;
  z-index: 10;
}
.ir-avatar-circle-glow {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  background: transparent;
  border: 4px solid transparent;
  transition: all 0.3s ease;
  z-index: 1;
}

/* Glow colors depending on interviewer status */
.ir-avatar-circle-wrap.speaking .ir-avatar-circle-glow {
  border-color: #6366f1;
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
  animation: circle-pulse-glow 1.5s infinite alternate;
}
.ir-avatar-circle-wrap.listening .ir-avatar-circle-glow {
  border-color: #22c55e;
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
}
.ir-avatar-circle-wrap.thinking .ir-avatar-circle-glow {
  border-color: #3b82f6;
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
}

@keyframes circle-pulse-glow {
  from { transform: scale(0.98); opacity: 0.8; }
  to { transform: scale(1.02); opacity: 1; }
}

.ir-avatar-name {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin: 16px 0 6px;
}
.ir-avatar-status {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #94a3b8;
  text-transform: uppercase;
}
.ir-avatar-status.status-speaking { color: #6366f1; }
.ir-avatar-status.status-listening { color: #16a34a; }
.ir-avatar-status.status-thinking { color: #2563eb; }

/* Camera feed - prominent candidate preview */
.ir-camera-premium {
  width: 100%;
  max-width: 280px;
  margin-top: 16px;
}
.ir-camera-you-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 6px;
}
.ir-camera-you-dot {
  width: 8px;
  height: 8px;
  background: #22c55e;
  border-radius: 50%;
  animation: dot-pulse 1.2s infinite alternate;
  flex-shrink: 0;
}
.ir-camera-frame-premium {
  width: 100%;
  aspect-ratio: 4/3;
  border-radius: 14px;
  overflow: hidden;
  background: #0f172a;
  position: relative;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
  border: 2px solid rgba(99, 102, 241, 0.3);
}
.ir-camera-video-premium {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
  display: block;
}
.ir-camera-empty-premium {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
}
.ir-camera-starting {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 500;
}
.ir-camera-blocked-icon {
  font-size: 28px;
}
.ir-camera-spinner {
  width: 28px;
  height: 28px;
  border: 2px solid #334155;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.ir-camera-no-face {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(239, 68, 68, 0.85);
  color: white;
  font-size: 9px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  z-index: 8;
  white-space: nowrap;
}
.ir-camera-status-text {
  margin: 6px 0 0;
  font-size: 10px;
  font-weight: 500;
  color: #64748b;
  text-align: center;
  line-height: 1.4;
}

/* Camera overlays */
.ir-camera-corner {
  position: absolute;
  width: 10px;
  height: 10px;
  border: 2px solid #6366f1;
  z-index: 10;
}
.corner-tl { top: 7px; left: 7px; border-right: none; border-bottom: none; }
.corner-tr { top: 7px; right: 7px; border-left: none; border-bottom: none; }
.corner-bl { bottom: 7px; left: 7px; border-right: none; border-top: none; }
.corner-br { bottom: 7px; right: 7px; border-left: none; border-top: none; }

.ir-camera-badge-top {
  position: absolute;
  top: 7px;
  left: 20px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(4px);
  padding: 3px 8px;
  border-radius: 4px;
  color: white;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.06em;
  z-index: 5;
}
.ir-camera-badge-dot {
  width: 5px;
  height: 5px;
  background: #ef4444;
  border-radius: 50%;
  animation: dot-pulse 1s infinite alternate;
}
@keyframes dot-pulse {
  from { opacity: 0.4; }
  to { opacity: 1; }
}

.ir-camera-badge-bottom {
  position: absolute;
  bottom: 7px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(4px);
  padding: 3px 8px;
  border-radius: 4px;
  color: white;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.05em;
  z-index: 5;
  white-space: nowrap;
}

/* Right Content Col - 62% width */
.ir-content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Inquiry Card - light eye catching theme */
.ir-q-card {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.02);
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}
.ir-q-card-speaking {
  border-color: rgba(99, 102, 241, 0.15);
  box-shadow: 0 10px 30px rgba(99, 102, 241, 0.03);
}
.ir-q-card-recording {
  border-color: rgba(34, 197, 94, 0.15);
}

.ir-session-label { margin-bottom: 12px; }
.ir-session-phase {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.06);
  border: 1px solid rgba(59, 130, 246, 0.12);
  border-radius: 99px;
  padding: 4px 14px;
  display: inline-block;
}

.ir-q-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: #94a3b8;
  display: block;
  margin-bottom: 14px;
}
.ir-q-text {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.5;
  margin: 0 0 20px;
  color: #0f172a;
}

.ir-topic-tags-premium {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.ir-topic-tag-premium {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 99px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Recording Panel Overhaul matching screenshot */
.ir-rec-panel-premium {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 24px;
  padding: 24px 32px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.ir-rec-main-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.ir-rec-mic-btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #3b82f6;
  box-shadow: 0 0 15px rgba(59, 130, 246, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ir-rec-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}
.ir-rec-status-text {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}
.ir-rec-timer-text {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ir-rec-dot-active {
  width: 6px;
  height: 6px;
  background: #ef4444;
  border-radius: 50%;
  animation: dot-pulse 1s infinite alternate;
}

.ir-rec-amplitude-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 24px;
  width: 40px;
  justify-content: flex-end;
}
.ir-amplitude-bar {
  width: 3px;
  background: #3b82f6;
  border-radius: 1.5px;
  transition: height 0.1s ease;
}

/* Horizontal Waveform */
.ir-rec-waveform-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0 16px;
  gap: 2px;
}
.ir-waveform-stick {
  flex: 1;
  background: #cbd5e1;
  border-radius: 1px;
  max-width: 4px;
  min-height: 4px;
  transition: height 0.15s ease;
}

.ir-btn-row-premium {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 5px;
}
.ir-btn-rerecord-premium {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 24px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.ir-btn-rerecord-premium:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.ir-btn-submit-premium {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 32px;
  border-radius: 12px;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
  transition: all 0.2s;
}
.ir-btn-submit-premium:hover {
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.35);
  transform: translateY(-1px);
}

.ir-thinking {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 18px;
}
.ir-dots { display: flex; gap: 8px; }
.ir-dots span {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #3b82f6;
  animation: ir-bounce 1.2s ease-in-out infinite;
}
.ir-dots span:nth-child(2){ animation-delay:.2s; background:#6366f1; }
.ir-dots span:nth-child(3){ animation-delay:.4s; background:#a78bfa; }
@keyframes ir-bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-14px)} }
.ir-dim { color: #64748b; font-size: 14px; margin: 0; }

/* Report & done styles */
.ir-report {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 680px;
}
.ir-report-hero {
  background: rgba(16, 185, 129, 0.05);
  border: 1px solid rgba(16, 185, 129, 0.15);
  border-radius: 16px;
  padding: 24px;
}
.ir-report-title { font-size: 20px; font-weight: 800; color: #059669; margin: 0 0 8px; }
.ir-report-sum { color: #475569; font-size: 14px; line-height: 1.65; margin: 0; }

.ir-score-row { display: flex; flex-wrap: wrap; gap: 10px; }
.ir-score-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px 16px;
  text-align: center;
  min-width: 90px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.01);
}
.ir-score-big { padding: 18px 20px; border-color: #cbd5e1; }
.ir-score-num { font-size: 28px; font-weight: 800; margin: 0 0 4px; }
.ir-score-big .ir-score-num { font-size: 42px; }
.ir-score-lbl { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }

.ir-fb-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media(max-width:500px){ .ir-fb-grid{ grid-template-columns:1fr; } }
.ir-fb-card { border-radius: 12px; padding: 16px 18px; border: 1px solid; }
.ir-fb-green { background: rgba(16, 185, 129, 0.04); border-color: rgba(16, 185, 129, 0.15); }
.ir-fb-amber { background: rgba(245, 158, 11, 0.04); border-color: rgba(245, 158, 11, 0.15); }
.ir-fb-head { font-weight: 700; font-size: 13px; margin: 0 0 10px; }
.ir-fb-green .ir-fb-head { color: #059669; }
.ir-fb-amber .ir-fb-head { color: #d97706; }
.ir-fb-item { font-size: 13px; color: #475569; margin: 0 0 5px; line-height: 1.5; }

.ir-delivery {
  background: rgba(59, 130, 246, 0.03);
  border: 1px solid rgba(59, 130, 246, 0.1);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ir-delivery-kicker {
  margin: 0 0 6px; font-size: 11px; font-weight: 800; letter-spacing: .08em;
  text-transform: uppercase; color: #2563eb;
}
.ir-delivery-summary {
  margin: 0; color: #334155; font-size: 14px; line-height: 1.6;
}
.ir-delivery-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
@media(max-width:620px){ .ir-delivery-stats{ grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.ir-mini-metric {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  padding: 12px;
  min-width: 0;
}
.ir-mini-metric strong {
  display: block; color: #0f172a; font-size: 16px; text-transform: capitalize;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ir-mini-metric span {
  display: block; color: #64748b; font-size: 9px; margin-top: 4px; text-transform: uppercase;
}

.ir-log { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
.ir-log-title { font-weight: 700; font-size: 14px; margin: 0 0 12px; color: #0f172a; }
.ir-msg { border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; }
.ir-msg-assistant { background: rgba(59, 130, 246, 0.05); border-left: 3px solid #3b82f6; }
.ir-msg-user { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid #64748b; }
.ir-msg-system { background: rgba(245, 158, 11, 0.05); border-left: 3px solid #f59e0b; }
.ir-msg-who { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #64748b; display: block; margin-bottom: 4px; }
.ir-msg-text { font-size: 13px; color: #334155; margin: 0; line-height: 1.55; }
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
