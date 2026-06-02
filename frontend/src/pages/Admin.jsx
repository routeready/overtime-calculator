import React, { useState, useEffect } from "react";
import { api, uploadDocument } from "../api";

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/admin/users").then(setUsers).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  async function setRole(userId, role) {
    try {
      await api.patch(`/admin/users/${userId}`, { role });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    } catch (err) { alert(err.message); }
  }

  async function setSubStatus(userId, subscription_status) {
    try {
      await api.patch(`/admin/users/${userId}`, { subscription_status });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, subscription_status } : u));
    } catch (err) { alert(err.message); }
  }

  async function deleteUser(userId, email) {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) { alert(err.message); }
  }

  if (loading) return <p><span className="spinner" /> Loading users...</p>;
  if (error) return <p className="error-msg">{error}</p>;

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>{users.length} users</p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
              <th style={{ padding: "8px 12px" }}>Email</th>
              <th style={{ padding: "8px 12px" }}>Role</th>
              <th style={{ padding: "8px 12px" }}>Subscription</th>
              <th style={{ padding: "8px 12px" }}>Questions</th>
              <th style={{ padding: "8px 12px" }}>Joined</th>
              <th style={{ padding: "8px 12px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "8px 12px" }}>
                  {u.email}
                  {!u.email_verified && <span style={{ marginLeft: 6, fontSize: 11, color: "var(--text-muted)" }}>(unverified)</span>}
                </td>
                <td style={{ padding: "8px 12px" }}>
                  <span className={`badge badge-${u.role}`}>{u.role}</span>
                </td>
                <td style={{ padding: "8px 12px" }}>
                  <span className={`badge badge-${u.subscription_status}`}>{u.subscription_status}</span>
                </td>
                <td style={{ padding: "8px 12px" }}>{u.question_count}</td>
                <td style={{ padding: "8px 12px" }}>{new Date(u.created_at).toLocaleDateString("en-CA")}</td>
                <td style={{ padding: "8px 12px" }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <select
                      value={u.role}
                      onChange={e => setRole(u.id, e.target.value)}
                      style={{ width: "auto", padding: "3px 6px", fontSize: 12 }}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                    <select
                      value={u.subscription_status}
                      onChange={e => setSubStatus(u.id, e.target.value)}
                      style={{ width: "auto", padding: "3px 6px", fontSize: 12 }}
                    >
                      <option value="none">none</option>
                      <option value="trialing">trialing</option>
                      <option value="active">active</option>
                      <option value="past_due">past_due</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                    <button
                      onClick={() => deleteUser(u.id, u.email)}
                      style={{ padding: "3px 8px", fontSize: 12, background: "#fee2e2", color: "var(--danger)", border: "none", borderRadius: 4, cursor: "pointer" }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocumentsTab() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadForm, setUploadForm] = useState({ province: "", act_name: "", source_url: "" });
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    api.get("/admin/documents").then(setDocs).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  async function handleUpload(e) {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    setError("");
    try {
      const result = await uploadDocument(selectedFile, uploadForm.province, uploadForm.act_name, uploadForm.source_url);
      const updated = await api.get("/admin/documents");
      setDocs(updated);
      setSelectedFile(null);
      setUploadForm({ province: "", act_name: "", source_url: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleReingest(docId) {
    try {
      await api.post(`/admin/documents/${docId}/reingest`);
      const updated = await api.get("/admin/documents");
      setDocs(updated);
    } catch (err) { alert(err.message); }
  }

  async function handleDelete(docId, filename) {
    if (!confirm(`Delete ${filename} and all its chunks? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/documents/${docId}`);
      setDocs(prev => prev.filter(d => d.id !== docId));
    } catch (err) { alert(err.message); }
  }

  const STATUS_COLORS = {
    complete: "#dcfce7",
    processing: "#dbeafe",
    error: "#fee2e2",
    pending: "#f3f4f6",
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Upload document</h3>
        <form onSubmit={handleUpload}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Province</label>
              <input value={uploadForm.province} onChange={e => setUploadForm(f => ({ ...f, province: e.target.value }))} placeholder="e.g. Ontario" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Act/Regulation name</label>
              <input value={uploadForm.act_name} onChange={e => setUploadForm(f => ({ ...f, act_name: e.target.value }))} placeholder="e.g. Regulation 854" />
            </div>
          </div>
          <div className="form-group">
            <label>Source URL (optional)</label>
            <input value={uploadForm.source_url} onChange={e => setUploadForm(f => ({ ...f, source_url: e.target.value }))} placeholder="https://www.canlii.org/..." />
          </div>
          <div className="form-group">
            <label>File (PDF, TXT, or MD)</label>
            <input type="file" accept=".pdf,.txt,.md" onChange={e => setSelectedFile(e.target.files[0])} />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn-primary" disabled={uploading || !selectedFile}>
            {uploading && <span className="spinner" />}
            Upload and ingest
          </button>
        </form>
      </div>

      {loading ? (
        <p><span className="spinner" /> Loading documents...</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
              <th style={{ padding: "8px 12px" }}>Filename</th>
              <th style={{ padding: "8px 12px" }}>Province</th>
              <th style={{ padding: "8px 12px" }}>Act</th>
              <th style={{ padding: "8px 12px" }}>Chunks</th>
              <th style={{ padding: "8px 12px" }}>Status</th>
              <th style={{ padding: "8px 12px" }}>Ingested</th>
              <th style={{ padding: "8px 12px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map(d => (
              <tr key={d.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: 12 }}>{d.filename}</td>
                <td style={{ padding: "8px 12px" }}>{d.province || "—"}</td>
                <td style={{ padding: "8px 12px" }}>{d.act_name || "—"}</td>
                <td style={{ padding: "8px 12px" }}>{d.chunk_count}</td>
                <td style={{ padding: "8px 12px" }}>
                  <span style={{
                    background: STATUS_COLORS[d.ingestion_status] || "#f3f4f6",
                    padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                    textTransform: "uppercase",
                  }}>
                    {d.ingestion_status}
                  </span>
                  {d.ingestion_error && (
                    <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }} title={d.ingestion_error}>Error</p>
                  )}
                </td>
                <td style={{ padding: "8px 12px" }}>
                  {d.ingested_at ? new Date(d.ingested_at).toLocaleDateString("en-CA") : "—"}
                </td>
                <td style={{ padding: "8px 12px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => handleReingest(d.id)}
                      style={{ padding: "3px 8px", fontSize: 12, background: "#eff6ff", color: "var(--brand-light)", border: "none", borderRadius: 4, cursor: "pointer" }}
                    >
                      Re-ingest
                    </button>
                    <button
                      onClick={() => handleDelete(d.id, d.filename)}
                      style={{ padding: "3px 8px", fontSize: 12, background: "#fee2e2", color: "var(--danger)", border: "none", borderRadius: 4, cursor: "pointer" }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function MonitoringTab() {
  return (
    <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>
      <p style={{ fontSize: 24, marginBottom: 12 }}>📡</p>
      <p style={{ fontSize: 16, fontWeight: 600 }}>Regulation monitoring coming soon</p>
      <p style={{ fontSize: 13, marginTop: 8, maxWidth: 400, margin: "8px auto 0" }}>
        This feature will automatically detect changes to CanLII regulation sources
        and alert you when sections are updated. Review and approve re-ingestion from here.
      </p>
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState("users");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/admin/stats").then(setStats).catch(() => {});
  }, []);

  const tabs = [
    { id: "users", label: "Users" },
    { id: "documents", label: "Documents" },
    { id: "monitoring", label: "Reg Monitoring" },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Admin Panel</h1>
        {stats && (
          <div style={{ display: "flex", gap: 20, fontSize: 13, color: "var(--text-muted)" }}>
            <span>{stats.user_count} users</span>
            <span>{stats.document_count} documents</span>
            <span>{stats.chunk_count.toLocaleString()} chunks</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 2, marginBottom: 20, borderBottom: "1px solid var(--border)" }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "8px 16px",
              background: "none",
              border: "none",
              borderBottom: tab === t.id ? "2px solid var(--brand)" : "2px solid transparent",
              color: tab === t.id ? "var(--brand)" : "var(--text-muted)",
              fontWeight: tab === t.id ? 600 : 400,
              fontSize: 14,
              cursor: "pointer",
              borderRadius: 0,
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card">
        {tab === "users" && <UsersTab />}
        {tab === "documents" && <DocumentsTab />}
        {tab === "monitoring" && <MonitoringTab />}
      </div>
    </div>
  );
}
