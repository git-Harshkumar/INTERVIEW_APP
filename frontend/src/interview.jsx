import { useEffect, useState } from "react";
import api from "./api";

export default function Interview({ initialTopic = "" }) {
  const [topic, setTopic] = useState(initialTopic);
  const [difficulty, setDifficulty] = useState("medium");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialTopic) setTopic(initialTopic);
  }, [initialTopic]);

  const generate = async () => {
    if (!topic.trim()) return alert("Enter a topic first.");
    setLoading(true);
    setQuestions([]);
    setResults({});
    setAnswers({});

    try {
      const res = await api.post("/interview/generate", {
        topic: topic.trim(),
        difficulty,
        count: 5,
      });
      setQuestions(res.data.questions);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to generate questions");
    } finally {
      setLoading(false);
    }
  };

  const evaluate = async (question) => {
    const answer = answers[question.id];
    if (!answer?.trim()) return alert("Write an answer first.");

    try {
      const res = await api.post("/interview/evaluate", {
        question_id: question.id,
        answer_text: answer,
      });
      setResults((prev) => ({ ...prev, [question.id]: res.data }));
    } catch (err) {
      alert(err.response?.data?.detail || "Evaluation failed");
    }
  };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", fontFamily: "sans-serif", padding: "0 1rem", color: "#f8fafc" }}>
      <h2 style={{ fontSize: 28, marginBottom: 16 }}>AI Interview Practice</h2>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          placeholder="Topic (for example React, Python, SQL)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          style={inputStyle}
        />
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          style={{ ...inputStyle, flex: "0 0 150px" }}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <button onClick={generate} disabled={loading} style={buttonStyle("#2563eb")}>
          {loading ? "Generating..." : "Generate Questions"}
        </button>
      </div>

      {questions.map((question, index) => (
        <div key={question.id} style={questionCardStyle}>
          <p style={{ fontWeight: 600, marginBottom: 6 }}>
            Q{index + 1}. {question.question}
          </p>
          {question.hint && <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 10 }}>Hint: {question.hint}</p>}

          <textarea
            rows={4}
            placeholder="Type your answer here..."
            value={answers[question.id] || ""}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
            style={textareaStyle}
          />

          <button onClick={() => evaluate(question)} style={{ ...buttonStyle("#0F6E56"), marginTop: 8 }}>
            Submit and Evaluate
          </button>

          {results[question.id] && (
            <div style={resultStyle}>
              <p style={{ fontSize: 22, fontWeight: 700, color: "#0F6E56" }}>Score: {results[question.id].score}/100</p>
              <p><strong>Feedback:</strong> {results[question.id].feedback}</p>
              <p><strong>Strengths:</strong> {results[question.id].strengths}</p>
              <p><strong>Improve:</strong> {results[question.id].improvements}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const inputStyle = {
  flex: 1,
  minWidth: 220,
  padding: 10,
  fontSize: 14,
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "#0a0f1c",
  color: "#fff",
};

const textareaStyle = {
  width: "100%",
  padding: 10,
  fontSize: 13,
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "#111827",
  color: "#fff",
  resize: "vertical",
};

const questionCardStyle = {
  border: "1px solid rgba(255,255,255,0.12)",
  background: "#0a0f1c",
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
};

const resultStyle = {
  marginTop: 12,
  background: "#ecfdf5",
  color: "#0f172a",
  border: "1px solid #9FE1CB",
  borderRadius: 8,
  padding: 12,
};

const buttonStyle = (background) => ({
  padding: "10px 18px",
  background,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
});
