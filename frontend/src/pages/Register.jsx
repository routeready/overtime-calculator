import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const data = await api.post("/auth/register", { email, password });
      setSuccess(data.message || "Registration successful! Check your email to verify your account.");
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
          Create account
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>
          7-day free trial — no credit card required to start
        </p>

        {success ? (
          <div>
            <p className="success-msg" style={{ fontSize: 14 }}>{success}</p>
            <p style={{ marginTop: 16, fontSize: 13 }}>
              <Link to="/login">Back to login</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Confirm password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>

            {error && <p className="error-msg">{error}</p>}

            <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={loading}>
              {loading && <span className="spinner" />}
              Create account
            </button>

            <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
