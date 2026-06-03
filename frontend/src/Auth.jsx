import { useState } from "react";
import api from "./api";

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.post("/login", {
          email: form.email,
          password: form.password,
        });
        localStorage.setItem("token", res.data.access_token);
        onLogin();
      } else {
        await api.post("/register", form);
        setIsLogin(true);
        setError("Account created. You can log in now.");
      }
    } catch (err) {
      if (err.code === "ECONNABORTED" || err.code === "ERR_NETWORK" || !err.response) {
        setError(
          "Cannot reach the server. Make sure the backend is running on port 8000."
        );
      } else {
        setError(err.response?.data?.detail || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-400">
        {isLogin ? "Welcome back" : "Create account"}
      </p>
      <h2 className="mb-6 text-3xl font-display text-white">
        {isLogin ? "Login to PrepMate" : "Start practicing today"}
      </h2>

      <form onSubmit={submit} className="flex flex-col gap-4">
        {!isLogin && (
          <input
            name="name"
            placeholder="Name"
            value={form.name}
            onChange={handleChange}
            className="rounded-xl border border-white/10 bg-[#0a0f1c] px-4 py-3 text-white outline-none focus:border-blue-400"
            required
          />
        )}
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className="rounded-xl border border-white/10 bg-[#0a0f1c] px-4 py-3 text-white outline-none focus:border-blue-400"
          required
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          className="rounded-xl border border-white/10 bg-[#0a0f1c] px-4 py-3 text-white outline-none focus:border-blue-400"
          required
        />

        {error && (
          <p className={`text-sm font-medium ${
            error.includes("created") ? "text-emerald-400" : "text-red-400"
          }`}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
        </button>
      </form>

      <button
        onClick={() => {
          setError("");
          setIsLogin(!isLogin);
        }}
        className="mt-5 text-sm text-slate-300 hover:text-white"
      >
        {isLogin ? "No account? Register" : "Have an account? Login"}
      </button>
    </div>
  );
}
