import React, { useState, useEffect } from "react";
import { api } from "../api";
import { useAuth } from "../App";

const STATUS_LABELS = {
  active: { label: "Active", cls: "badge-active" },
  trialing: { label: "Free trial", cls: "badge-trialing" },
  past_due: { label: "Payment past due", cls: "badge-past_due" },
  cancelled: { label: "Cancelled", cls: "badge-cancelled" },
  none: { label: "No subscription", cls: "badge-none" },
};

export default function Billing() {
  const { user } = useAuth();
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get("/billing/status")
      .then(setBilling)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubscribe() {
    setActionLoading(true);
    setError("");
    try {
      const data = await api.post("/billing/checkout");
      window.location.href = data.checkout_url;
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel your subscription? You will retain access until the end of the current billing period.")) return;
    setActionLoading(true);
    setError("");
    try {
      const data = await api.post("/billing/cancel");
      setMessage(data.message);
      const updated = await api.get("/billing/status");
      setBilling(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  const status = billing?.subscription_status || user?.subscription_status || "none";
  const statusInfo = STATUS_LABELS[status] || STATUS_LABELS.none;
  const isActive = ["active", "trialing"].includes(status);

  return (
    <div style={{ maxWidth: 560, margin: "40px auto", padding: "0 16px" }}>
      <div className="card">
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Subscription</h1>

        {loading ? (
          <p style={{ color: "var(--text-muted)" }}><span className="spinner" /> Loading...</p>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "14px 16px", background: "var(--bg)", borderRadius: "var(--radius)" }}>
              <div>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Current status</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <span className={`badge ${statusInfo.cls}`}>{statusInfo.label}</span>
                </div>
              </div>
              {billing?.subscription_end_date && (
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    {status === "trialing" ? "Trial ends" : status === "cancelled" ? "Access until" : "Next billing"}
                  </p>
                  <p style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>
                    {new Date(billing.subscription_end_date).toLocaleDateString("en-CA", { dateStyle: "medium" })}
                  </p>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Mining Bible — Monthly</h3>
              <ul style={{ fontSize: 14, color: "var(--text-muted)", paddingLeft: 16, lineHeight: 2 }}>
                <li>Unlimited regulation Q&amp;A</li>
                <li>Ontario Reg. 854, OHSA, Mining Act, and more</li>
                <li>Precise citations with section numbers</li>
                <li>Grounded answers — no hallucinated sections</li>
              </ul>
            </div>

            {message && <p className="success-msg" style={{ marginBottom: 12 }}>{message}</p>}
            {error && <p className="error-msg" style={{ marginBottom: 12 }}>{error}</p>}

            {!isActive && status !== "trialing" && (
              <button
                className="btn-primary"
                onClick={handleSubscribe}
                disabled={actionLoading}
                style={{ width: "100%" }}
              >
                {actionLoading && <span className="spinner" />}
                Subscribe
              </button>
            )}

            {status === "active" && !message && (
              <button
                className="btn-secondary"
                onClick={handleCancel}
                disabled={actionLoading}
                style={{ fontSize: 13 }}
              >
                {actionLoading && <span className="spinner" />}
                Cancel subscription
              </button>
            )}

            {status === "trialing" && (
              <button
                className="btn-primary"
                onClick={handleSubscribe}
                disabled={actionLoading}
                style={{ width: "100%" }}
              >
                {actionLoading && <span className="spinner" />}
                Add payment method
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
