import React, { useState, useRef, useEffect } from "react";
import { api } from "../api";
import { useAuth } from "../App";
import { Link } from "react-router-dom";

function AnswerBlock({ answer }) {
  // Parse ANSWER / CITATION / NOTE structure
  const sections = {};
  const blocks = answer.split(/\n(?=ANSWER\n|CITATION\n|NOTE\n)/);
  blocks.forEach(block => {
    const match = block.match(/^(ANSWER|CITATION|NOTE)\n([\s\S]*)/);
    if (match) sections[match[1]] = match[2].trim();
  });

  if (Object.keys(sections).length === 0) {
    return <p style={{ lineHeight: 1.7 }}>{answer}</p>;
  }

  return (
    <div>
      {sections.ANSWER && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 6 }}>Answer</p>
          <p style={{ lineHeight: 1.7 }}>{sections.ANSWER}</p>
        </div>
      )}
      {sections.CITATION && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "#eff6ff", borderLeft: "3px solid var(--brand-light)", borderRadius: 4 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--brand-light)", marginBottom: 4 }}>Citation</p>
          <p style={{ fontSize: 14, color: "var(--brand)" }}>{sections.CITATION}</p>
        </div>
      )}
      {sections.NOTE && (
        <div style={{ padding: "10px 14px", background: "#fffbeb", borderLeft: "3px solid var(--accent)", borderRadius: 4 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#92400e", marginBottom: 4 }}>Note</p>
          <p style={{ fontSize: 14, color: "#78350f" }}>{sections.NOTE}</p>
        </div>
      )}
    </div>
  );
}

function Message({ role, content, citations, chunksUsed }) {
  return (
    <div style={{
      display: "flex",
      gap: 12,
      padding: "16px 0",
      borderBottom: "1px solid var(--border)",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
        background: role === "user" ? "var(--brand)" : "#f1f5f9",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 700, color: role === "user" ? "#fff" : "var(--text-muted)",
      }}>
        {role === "user" ? "Q" : "A"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {role === "user"
          ? <p style={{ fontWeight: 500 }}>{content}</p>
          : <AnswerBlock answer={content} />
        }
        {role === "assistant" && chunksUsed > 0 && (
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
            {chunksUsed} regulation section{chunksUsed !== 1 ? "s" : ""} retrieved
          </p>
        )}
      </div>
    </div>
  );
}

export default function Ask() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  const isSubscribed = user && ["active", "trialing"].includes(user.subscription_status);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q || loading) return;

    setMessages(prev => [...prev, { role: "user", content: q }]);
    setQuery("");
    setLoading(true);
    setError("");

    try {
      const data = await api.post("/ask", { query: q });
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.answer,
        citations: data.citations,
        chunksUsed: data.chunks_used,
      }]);
    } catch (err) {
      if (err.message?.includes("402") || err.message?.toLowerCase().includes("subscription")) {
        setError("Your subscription has expired. Please renew to continue asking questions.");
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px", minHeight: "calc(100vh - 52px)", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--brand)" }}>Ask a regulation question</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
          Answers are grounded in the ingested regulation corpus only — no training-data guesses.
        </p>
      </div>

      {!isSubscribed && (
        <div style={{ background: "#fffbeb", border: "1px solid #fbbf24", borderRadius: "var(--radius)", padding: "12px 16px", marginBottom: 16, fontSize: 14 }}>
          Your free trial has ended. <Link to="/billing" style={{ fontWeight: 600 }}>Renew your subscription</Link> to continue.
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto" }}>
        {messages.length === 0 && (
          <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "40px 0", textAlign: "center" }}>
            <p style={{ fontSize: 28, marginBottom: 12 }}>⛏</p>
            <p>Ask anything about Ontario mining health and safety regulations.</p>
            <p style={{ marginTop: 6, fontSize: 13 }}>e.g. "What are the requirements for ground support in underground mines?"</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <Message key={i} {...msg} />
        ))}

        {loading && (
          <div style={{ display: "flex", gap: 12, padding: "16px 0" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>A</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 14 }}>
              <span className="spinner" /> Searching regulations...
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "var(--radius)", padding: "12px 16px", marginTop: 8 }}>
            <p style={{ color: "var(--danger)", fontSize: 14 }}>{error}</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Ask a question about mining regulations..."
          disabled={loading || !isSubscribed}
          style={{ flex: 1 }}
          autoFocus
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !query.trim() || !isSubscribed}
          style={{ flexShrink: 0 }}
        >
          Ask
        </button>
      </form>
    </div>
  );
}
