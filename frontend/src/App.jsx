import { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [status, setStatus] = useState("Checking...");

  useEffect(() => {
    axios.get("http://localhost:8000/health")
      .then(res => setStatus("✅ Backend connected: " + res.data.status))
      .catch(() => setStatus("❌ Backend not reachable"));
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>AI Interview App</h1>
      <p>Backend status: <strong>{status}</strong></p>
    </div>
  );
}

export default App;