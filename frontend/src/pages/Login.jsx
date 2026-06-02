import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../App";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.post("/auth/login", { email, password });
      setUser(data.user);
      navigate("/ask");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div className="card" style={{ width: 380 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: "var(--brand)" }}>
          ⛏ Mining Bible
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>
          Canadian mining regulations reference
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={loading}>
            {loading && <span className="spinner" />}
            Sign in
          </button>
        </form>

        <div style={{ marginTop: 16, fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
          <Link to="/auth/forgot-password">Forgot password?</Link>
          {" · "}
          <Link to="/register">Create account</Link>
        </div>
      </div>
    </div>
  );
}
