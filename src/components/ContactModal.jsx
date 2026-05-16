import { useState } from "react";
import { X, Loader2, CheckCircle2, Mail } from "lucide-react";

const API_BASE = "https://api.citesite.net";

const INQUIRY_OPTIONS = [
  { value: "general", label: "General inquiry" },
  { value: "issue", label: "Issue" },
  { value: "services", label: "Request for services" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [inquiryType, setInquiryType] = useState("general");
  const [message, setMessage] = useState("");
  const [subscribe, setSubscribe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);

  function validate() {
    const e = {};
    const t = email.trim();
    if (!t) {
      e.email = "Email is required";
    } else if (!EMAIL_REGEX.test(t) || t.length > 320) {
      e.email = "Enter a valid email address";
    }
    const m = message.trim();
    if (!m) {
      e.message = "Message is required";
    } else if (m.length > 2000) {
      e.message = `Too long (${m.length}/2000 characters)`;
    }
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setServerError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          inquiry_type: inquiryType,
          message: message.trim(),
          subscribe,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setServerError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setServerError(
        "Network error. Please check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm " +
    "placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Contact Us</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {submitted ? (
            <div className="text-center py-6">
              <CheckCircle2
                size={40}
                className="text-emerald-400 mx-auto mb-3"
              />
              <h3 className="text-white font-semibold text-lg mb-1">
                Message sent
              </h3>
              <p className="text-slate-400 text-sm">
                We&apos;ll get back to you as soon as possible.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Email */}
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={`${inputCls} ${errors.email ? "border-red-500" : ""}`}
                  maxLength={320}
                />
                {errors.email && (
                  <p className="text-red-400 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              {/* Inquiry type */}
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">
                  How can we help?
                </label>
                <select
                  value={inquiryType}
                  onChange={(e) => setInquiryType(e.target.value)}
                  className={inputCls}
                >
                  {INQUIRY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">
                  Message
                  <span
                    className={`ml-1 ${message.trim().length > 2000 ? "text-red-400" : "text-slate-500"}`}
                  >
                    ({message.trim().length}/2000)
                  </span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Tell us what's on your mind…"
                  className={`${inputCls} resize-none ${errors.message ? "border-red-500" : ""}`}
                  maxLength={2100}
                />
                {errors.message && (
                  <p className="text-red-400 text-xs mt-1">{errors.message}</p>
                )}
              </div>

              {/* Newsletter checkbox */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={subscribe}
                  onChange={(e) => setSubscribe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-cyan-500 cursor-pointer"
                />
                <span className="text-sm text-slate-300">
                  Subscribe to GEO tips and CiteSite updates
                </span>
              </label>

              {/* Server error */}
              {serverError && (
                <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">
                  {serverError}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-slate-400 border border-slate-600 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Sending…
                    </>
                  ) : (
                    "Send message"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
