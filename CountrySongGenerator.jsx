import { useState } from "react";

const LABELS = ["TITLE:", "VERSE 1:", "CHORUS:", "VERSE 2:", "BRIDGE:", "FINAL CHORUS:"];

function parseSections(text) {
  if (!text) return [];
  const positions = [];
  for (const label of LABELS) {
    let idx = 0;
    while (true) {
      const pos = text.indexOf(label, idx);
      if (pos === -1) break;
      positions.push({ pos, label });
      idx = pos + label.length;
    }
  }
  positions.sort((a, b) => a.pos - b.pos);
  return positions.map(({ pos, label }, i) => {
    const start = pos + label.length;
    const end = i + 1 < positions.length ? positions[i + 1].pos : text.length;
    return { label, content: text.slice(start, end).trim() };
  });
}

async function callClaude(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = data.content[0].text;
  return text;
}

function SongSection({ label, content }) {
  const isChorus = label.includes("CHORUS");
  const isTitle = label === "TITLE:";
  const lines = content.split("\n").filter((l) => l.trim());

  if (isTitle) {
    return (
      <div style={{ marginBottom: 18 }}>
        <div style={{ color: "#f5c842", fontSize: 12, fontWeight: "bold", letterSpacing: 1, marginBottom: 4 }}>
          TITLE
        </div>
        <div style={{ color: "#f5c842", fontSize: 24, fontWeight: "bold", lineHeight: 1.3 }}>{content}</div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          color: "#c9a227",
          fontSize: 11,
          fontWeight: "bold",
          letterSpacing: 1.5,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label.replace(":", "")}
      </div>
      <div>
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              fontStyle: isChorus ? "italic" : "normal",
              paddingLeft: isChorus ? 24 : 0,
              lineHeight: 1.75,
              color: isChorus ? "#f0dfa0" : "#e8d5a3",
              fontSize: 15,
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

function StepCard({ step, isFinal }) {
  return (
    <div
      style={{
        backgroundColor: "#2d1a0a",
        borderRadius: 10,
        padding: "22px 26px",
        marginBottom: 22,
        border: isFinal ? "2px solid #f5c842" : "1px solid #3d2510",
        fontFamily: "Georgia, serif",
        boxShadow: isFinal ? "0 0 18px rgba(245,200,66,0.12)" : "none",
      }}
    >
      <div
        style={{
          color: "#f5c842",
          fontSize: 15,
          fontWeight: "bold",
          marginBottom: 16,
          paddingBottom: 10,
          borderBottom: "1px solid #3d2510",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {isFinal && (
          <span style={{ fontSize: 16 }}>★</span>
        )}
        {step.label}
      </div>

      {step.critique && (
        <div
          style={{
            backgroundColor: "#1a0f05",
            borderRadius: 6,
            padding: "14px 16px",
            marginBottom: 18,
            borderLeft: "3px solid #6b4e10",
          }}
        >
          <div style={{ color: "#c9a227", fontSize: 11, fontWeight: "bold", letterSpacing: 1, marginBottom: 8 }}>
            CRITIQUE
          </div>
          <div style={{ color: "#b09060", fontSize: 13, lineHeight: 1.65 }}>{step.critique}</div>
        </div>
      )}

      {step.sections && step.sections.length > 0 ? (
        <div>
          {step.critique && (
            <div style={{ color: "#c9a227", fontSize: 11, fontWeight: "bold", letterSpacing: 1, marginBottom: 12 }}>
              REVISED SONG
            </div>
          )}
          {step.sections.map((s, i) => (
            <SongSection key={i} label={s.label} content={s.content} />
          ))}
        </div>
      ) : (
        step.rawText && (
          <div style={{ color: "#e8d5a3", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {step.rawText}
          </div>
        )
      )}
    </div>
  );
}

function LoadingPulse({ message }) {
  return (
    <div style={{ textAlign: "center", padding: "20px 0", fontFamily: "Georgia, serif" }}>
      <div style={{ color: "#8b6914", fontSize: 14, marginBottom: 8 }}>{message}</div>
      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#f5c842",
              opacity: 0.4,
              animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

const LOADING_MESSAGES = [
  "Tuning the guitar and finding the words...",
  "A sharp ear is finding the weak lines...",
  "One last polish before the final take...",
];

export default function CountrySongGenerator() {
  const [theme, setTheme] = useState("");
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addStep = (step) => setSteps((prev) => [...prev, step]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setSteps([]);

    const songTheme = theme.trim() || "life on the open road";

    try {
      // Step 1: generate
      const step1Prompt = `Write a country song about ${songTheme}. Use these exact section labels on their own lines: TITLE:, VERSE 1:, CHORUS:, VERSE 2:, CHORUS:, BRIDGE:, FINAL CHORUS:. Use vivid imagery and real place names.`;
      const step1Out = await callClaude(step1Prompt);
      addStep({
        label: "Step 1 — Original Song",
        sections: parseSections(step1Out),
        rawText: step1Out,
      });

      // Step 2: first critic
      const criticPrompt = (song) =>
        `Here is a country song:\n\n${song}\n\nFind the 2 weakest lines. Write CRITIQUE: then your notes. Then write REVISED SONG: followed by the full improved song using the same section labels.`;

      const step2Out = await callClaude(criticPrompt(step1Out));
      const [step2Before, ...step2Rest] = step2Out.split("REVISED SONG:");
      const step2Critique = step2Before.replace(/^CRITIQUE:/i, "").trim();
      const step2Revised = step2Rest.join("REVISED SONG:").trim();
      addStep({
        label: "Step 2 — First Revision",
        critique: step2Critique,
        sections: parseSections(step2Revised),
        rawText: step2Revised,
      });

      // Step 3: second critic on revised song
      const step3Out = await callClaude(criticPrompt(step2Revised));
      const [step3Before, ...step3Rest] = step3Out.split("REVISED SONG:");
      const step3Critique = step3Before.replace(/^CRITIQUE:/i, "").trim();
      const step3Revised = step3Rest.join("REVISED SONG:").trim();
      addStep({
        label: "Step 3 — Final Song",
        critique: step3Critique,
        sections: parseSections(step3Revised),
        rawText: step3Revised,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.4; }
          40% { transform: scale(1.2); opacity: 1; }
        }
        * { box-sizing: border-box; }
      `}</style>
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#1a0f05",
          color: "#e8d5a3",
          fontFamily: "Georgia, serif",
          padding: "48px 20px 80px",
        }}
      >
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 42 }}>
            <h1
              style={{
                color: "#f5c842",
                fontSize: 38,
                margin: "0 0 6px",
                fontFamily: "Georgia, serif",
                letterSpacing: "-0.5px",
              }}
            >
              Country Song Writer
            </h1>
            <p style={{ color: "#6b4e10", fontSize: 15, margin: 0, fontStyle: "italic" }}>
              Three rounds of AI refinement — each verse better than the last
            </p>
          </div>

          {/* Input card */}
          <div
            style={{
              backgroundColor: "#2d1a0a",
              borderRadius: 10,
              padding: "24px 28px",
              marginBottom: 28,
              border: "1px solid #3d2510",
            }}
          >
            <label
              style={{
                color: "#f5c842",
                fontSize: 13,
                display: "block",
                marginBottom: 8,
                letterSpacing: 0.5,
              }}
            >
              Song Theme
            </label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && generate()}
              placeholder="heartbreak in Nashville, coming home to Texas, a trucker's long night…"
              style={{
                width: "100%",
                backgroundColor: "#1a0f05",
                border: "1px solid #3d2510",
                borderRadius: 5,
                padding: "11px 14px",
                color: "#e8d5a3",
                fontSize: 15,
                fontFamily: "Georgia, serif",
                marginBottom: 18,
                outline: "none",
              }}
            />
            <button
              onClick={generate}
              disabled={loading}
              style={{
                backgroundColor: loading ? "#3d2510" : "#f5c842",
                color: loading ? "#6b4e10" : "#1a0f05",
                border: "none",
                borderRadius: 5,
                padding: "12px 32px",
                fontSize: 16,
                fontFamily: "Georgia, serif",
                fontWeight: "bold",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.2s, color 0.2s",
              }}
            >
              {loading ? "Writing…" : "Write My Song"}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                backgroundColor: "#2d0808",
                border: "1px solid #6b1010",
                borderRadius: 6,
                padding: "14px 18px",
                marginBottom: 22,
                color: "#f08080",
                fontSize: 14,
                fontFamily: "Georgia, serif",
              }}
            >
              {error}
            </div>
          )}

          {/* Steps */}
          {steps.map((step, i) => (
            <StepCard key={i} step={step} isFinal={i === 2} />
          ))}

          {/* Loading indicator */}
          {loading && steps.length < 3 && (
            <LoadingPulse message={LOADING_MESSAGES[steps.length]} />
          )}
        </div>
      </div>
    </>
  );
}
