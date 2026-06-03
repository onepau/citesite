import { useState, useRef } from "react";

const API_BASE = "https://api.citesite.net";

export function SchemaForge() {
  const [url, setUrl] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef(null);

  const generate = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setOutput("");
    setCopied(false);

    try {
      const response = await fetch(`${API_BASE}/api/audit/schema-forge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Generation failed");
      setOutput(data.schema.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ fontFamily: "'DM Mono', 'Courier New', monospace", color: "#e8e8f0" }}>
      {/* URL Input */}
      <div style={{ marginBottom: "24px" }}>
        <label style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#555570", display: "block", marginBottom: "10px" }}>
          Target URL
        </label>
        <div style={{ display: "flex", gap: "12px" }}>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            placeholder="https://example.com/blog/post"
            style={{
              flex: 1,
              background: "#111120",
              border: "1px solid #2a2a3e",
              borderRadius: "10px",
              padding: "14px 18px",
              fontSize: "13px",
              color: "#e8e8f0",
              outline: "none",
              fontFamily: "inherit",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#7c6af7")}
            onBlur={(e) => (e.target.style.borderColor = "#2a2a3e")}
          />
          <button
            onClick={generate}
            disabled={loading || !url.trim()}
            style={{
              background: loading ? "#2a2a3e" : "linear-gradient(135deg, #7c6af7, #9b6ff7)",
              border: "none",
              borderRadius: "10px",
              padding: "14px 28px",
              fontSize: "13px",
              fontWeight: "600",
              color: loading ? "#555570" : "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              letterSpacing: "0.03em",
              whiteSpace: "nowrap",
              transition: "opacity 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {loading ? (
              <>
                <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                Fetching…
              </>
            ) : (
              "Generate Schema"
            )}
          </button>
        </div>
      </div>

      {/* Schema type badges */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "36px" }}>
        {["Article", "FAQPage", "HowTo", "Product", "Event"].map((s) => (
          <span
            key={s}
            style={{
              fontSize: "11px",
              padding: "4px 10px",
              border: "1px solid #2a2a3e",
              borderRadius: "20px",
              color: "#555570",
              letterSpacing: "0.05em",
            }}
          >
            {s}
          </span>
        ))}
        <span style={{ fontSize: "11px", color: "#333348", alignSelf: "center" }}>auto-detected</span>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: "#1a0f0f",
            border: "1px solid #4a1a1a",
            borderRadius: "10px",
            padding: "16px 20px",
            fontSize: "13px",
            color: "#f87171",
            marginBottom: "24px",
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* Output */}
      {output && (
        <div style={{ animation: "fadeIn 0.4s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <label style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#555570" }}>
              Generated Schema
            </label>
            <button
              onClick={copy}
              style={{
                background: copied ? "#1a2f1a" : "#1a1a2e",
                border: `1px solid ${copied ? "#4a8f4a" : "#2a2a3e"}`,
                borderRadius: "6px",
                padding: "6px 14px",
                fontSize: "12px",
                color: copied ? "#86efac" : "#9b8ff7",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.2s",
              }}
            >
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>
          <textarea
            ref={textareaRef}
            readOnly
            value={output}
            rows={20}
            style={{
              width: "100%",
              background: "#0d0d1a",
              border: "1px solid #2a2a3e",
              borderRadius: "12px",
              padding: "24px",
              fontSize: "12px",
              lineHeight: "1.7",
              color: "#b8c0e8",
              fontFamily: "inherit",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <div
            style={{
              marginTop: "20px",
              padding: "16px 20px",
              background: "#0f0f1e",
              border: "1px solid #1e1e3a",
              borderRadius: "10px",
              fontSize: "12px",
              color: "#555570",
              lineHeight: "1.6",
            }}
          >
            <strong style={{ color: "#7c6af7" }}>Next step:</strong> Paste this block inside your page&apos;s{" "}
            <code style={{ color: "#9b8ff7" }}>&lt;head&gt;</code> or before{" "}
            <code style={{ color: "#9b8ff7" }}>&lt;/body&gt;</code>. Validate with{" "}
            <span style={{ color: "#9b8ff7" }}>Google&apos;s Rich Results Test</span>.
          </div>
        </div>
      )}

      {/* Empty state */}
      {!output && !loading && !error && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 40px",
            border: "1px dashed #1e1e2e",
            borderRadius: "16px",
            color: "#333348",
          }}
        >
          <div style={{ fontSize: "40px", marginBottom: "16px", opacity: 0.5 }}>⟨/⟩</div>
          <div style={{ fontSize: "13px" }}>Enter a URL above and click Generate</div>
        </div>
      )}

      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 40px",
            border: "1px dashed #2a2a3e",
            borderRadius: "16px",
            color: "#555570",
          }}
        >
          <div style={{ fontSize: "13px", marginBottom: "8px" }}>Fetching page &amp; detecting schemas…</div>
          <div style={{ fontSize: "11px", color: "#333348" }}>Claude is reading {url}</div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
