import { useState } from "react";
import {
  Search, Lock, CheckCircle, AlertTriangle, XCircle,
  ChevronRight, Mail, CreditCard, X, BookOpen, ArrowRight,
  BarChart3, Shield, FileText, Globe, Eye, Zap, Menu,
  ChevronDown, Star, TrendingUp, ExternalLink,
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer,
} from "recharts";

import { AUDIT_DIMENSIONS } from "./config/auditEngine.js";
import { BLOG_POSTS } from "./config/blogPosts.js";
import {
  generateScores, getOverallScore, getScoreColor, getScoreLabel,
} from "./utils/scoring.js";

const IconMap = { Globe, FileText, BarChart3, Shield, Star, Zap };


/* ═══════════════════════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */

const ScoreGauge = ({ score, size = 120 }) => {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const filled = (score / 100) * arc;
  const color = getScoreColor(score);
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-[135deg]">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth="8"
          strokeDasharray={`${arc} ${circ}`} strokeLinecap="round" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-slate-400">/100</span>
      </div>
    </div>
  );
};

const LockedOverlay = ({ onUnlock }) => (
  <div className="absolute inset-0 backdrop-blur-md bg-slate-900/60 rounded-xl flex flex-col items-center justify-center z-10 p-6">
    <Lock size={32} className="text-cyan-400 mb-3" />
    <p className="text-white font-semibold text-center mb-1">Full analysis available in the detailed report</p>
    <p className="text-slate-400 text-sm text-center mb-4">Get expert recommendations with AI + human review</p>
    <button onClick={onUnlock}
      className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center gap-2">
      Unlock Full Report — $49 <ArrowRight size={16} />
    </button>
  </div>
);

const DimensionCard = ({ dim, isPaid, onUnlock }) => {
  const Ico = IconMap[dim.icon] || Globe;
  const color = getScoreColor(dim.score);
  const freeChecks = dim.checks.filter(c => c.tier === "free");
  const paidChecks = dim.checks.filter(c => c.tier === "paid");

  return (
    <div className="relative bg-slate-800/80 rounded-xl border border-slate-700/50 p-5 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
            <Ico size={20} style={{ color }} />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">{dim.dimension}. {dim.name}</h3>
            <p className="text-slate-400 text-xs">Weight: {dim.weight * 100}%</p>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold" style={{ color }}>{dim.score}</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>{getScoreLabel(dim.score)}</span>
        </div>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
        <div className="h-2 rounded-full transition-all duration-1000" style={{ width: `${dim.score}%`, background: color }} />
      </div>
      {freeChecks.length > 0 && (
        <div className="space-y-2 mb-3">
          {freeChecks.map(c => (
            <div key={c.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {c.score >= c.maxPoints * 0.7 ? <CheckCircle size={14} className="text-emerald-400" /> :
                 c.score >= c.maxPoints * 0.4 ? <AlertTriangle size={14} className="text-amber-400" /> :
                 <XCircle size={14} className="text-red-400" />}
                <span className="text-slate-300">{c.name}</span>
              </div>
              <span className="text-slate-400 text-xs">{c.score}/{c.maxPoints}</span>
            </div>
          ))}
        </div>
      )}
      {paidChecks.length > 0 && (
        <div className="relative mt-2">
          {!isPaid && <LockedOverlay onUnlock={onUnlock} />}
          <div className="space-y-2">
            {paidChecks.map(c => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {c.score >= c.maxPoints * 0.7 ? <CheckCircle size={14} className="text-emerald-400" /> :
                   c.score >= c.maxPoints * 0.4 ? <AlertTriangle size={14} className="text-amber-400" /> :
                   <XCircle size={14} className="text-red-400" />}
                  <span className="text-slate-300">{c.name}</span>
                </div>
                <span className="text-slate-400 text-xs">{c.score}/{c.maxPoints}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const PaymentModal = ({ onClose, url }) => {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState("details");

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-md w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20} /></button>
        {step === "details" ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <FileText size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Detailed SEO/GEO Report</h3>
                <p className="text-slate-400 text-sm">AI-powered analysis + human expert review</p>
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4 mb-4 space-y-2 text-sm text-slate-300">
              <div className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400" /> Full 6-dimension audit with evidence</div>
              <div className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400" /> Prioritised recommendations (impact vs effort)</div>
              <div className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400" /> JSON-LD code snippets ready to implement</div>
              <div className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400" /> Signature recommendation for AI citability</div>
              <div className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400" /> Delivered as a 10-page PDF within 48 hours</div>
            </div>
            <div className="text-sm text-slate-400 mb-2">URL to audit</div>
            <div className="bg-slate-900 rounded-lg p-3 text-cyan-400 text-sm mb-4 font-mono truncate">{url}</div>
            <div className="mb-4">
              <label className="text-sm text-slate-400 block mb-1">Email for report delivery</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                placeholder="you@example.com" />
            </div>
            <button onClick={() => email && setStep("confirm")}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center justify-center gap-2">
              <CreditCard size={18} /> Pay $49
            </button>
            <p className="text-slate-500 text-xs text-center mt-3">Secure payment via Stripe. You will not be charged until you confirm.</p>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-emerald-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Order Confirmed</h3>
            <p className="text-slate-400 text-sm mb-1">Your bespoke SEO/GEO report is being prepared.</p>
            <p className="text-slate-400 text-sm mb-4">We'll deliver it to <span className="text-cyan-400">{email}</span> within 48 hours.</p>
            <button onClick={onClose}
              className="bg-slate-700 text-white px-6 py-2 rounded-lg hover:bg-slate-600 transition-colors">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════════════ */
export default function App() {
  const [page, setPage] = useState("home");
  const [url, setUrl] = useState("");
  const [auditUrl, setAuditUrl] = useState("");
  const [results, setResults] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nlEmail, setNlEmail] = useState("");
  const [nlSent, setNlSent] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const runAudit = () => {
    if (!url.trim()) return;
    setLoading(true);
    setAuditUrl(url.trim());
    setTimeout(() => {
      setResults(generateScores(url.trim()));
      setPage("results");
      setLoading(false);
    }, 2000);
  };

  const overall = results ? getOverallScore(results) : 0;
  const overallColor = getScoreColor(overall);
  const radarData = results ? results.map(d => ({ dim: d.shortName, score: d.score, fullMark: 100 })) : [];

  const criticalIssues = results ? results.filter(d => d.score < 40).slice(0, 3) : [];
  const topImprovements = results
    ? [...results].sort((a, b) => {
        const aGap = (100 - a.score) * a.weight;
        const bGap = (100 - b.score) * b.weight;
        return bGap - aGap;
      }).slice(0, 3)
    : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* NAV */}
      <nav className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => { setPage("home"); setResults(null); }}
            className="flex items-center gap-2 text-white font-bold text-lg">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Eye size={18} />
            </div>
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">CiteSite</span>
          </button>
          <div className="hidden md:flex items-center gap-6 text-sm">
            <button onClick={() => setPage("home")} className="text-slate-400 hover:text-white transition-colors">Audit</button>
            <button onClick={() => setPage("blog")} className="text-slate-400 hover:text-white transition-colors">Blog</button>
            <button onClick={() => setPage("pricing")} className="text-slate-400 hover:text-white transition-colors">Pricing</button>
            <button onClick={() => setShowPayment(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:from-cyan-400 hover:to-blue-500">
              Get Full Report
            </button>
          </div>
          <button className="md:hidden text-slate-400" onClick={() => setMenuOpen(!menuOpen)}><Menu size={24} /></button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-slate-800 px-4 py-3 space-y-2 bg-slate-950">
            <button onClick={() => { setPage("home"); setMenuOpen(false); }} className="block w-full text-left text-slate-300 py-2">Audit</button>
            <button onClick={() => { setPage("blog"); setMenuOpen(false); }} className="block w-full text-left text-slate-300 py-2">Blog</button>
            <button onClick={() => { setPage("pricing"); setMenuOpen(false); }} className="block w-full text-left text-slate-300 py-2">Pricing</button>
          </div>
        )}
      </nav>

      {/* HOME */}
      {page === "home" && !loading && (
        <div>
          <section className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
            <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-medium mb-6 border border-cyan-500/20">
              SEO + GEO + AIO Audit Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              See how <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">AI search engines</span> see your website
            </h1>
            <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
              Get an instant audit across six weighted dimensions — from crawlability to citability. Discover what's helping and hurting your visibility in ChatGPT, Perplexity, Gemini, and beyond.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <input type="url" value={url} onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && runAudit()}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-5 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm"
                placeholder="Enter any URL — e.g. https://example.com/blog-post" />
              <button onClick={runAudit}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center justify-center gap-2 whitespace-nowrap">
                <Search size={18} /> Audit
              </button>
            </div>
          </section>

          {/* DIMENSIONS PREVIEW */}
          <section className="max-w-6xl mx-auto px-4 pb-16">
            <h2 className="text-xl font-bold text-center mb-8 text-white">Six dimensions. One score.</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {AUDIT_DIMENSIONS.map(d => {
                const Ico = IconMap[d.icon] || Globe;
                return (
                  <div key={d.id} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 hover:border-cyan-500/30 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                        <Ico size={18} className="text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-sm">{d.dimension}. {d.shortName}</h3>
                        <span className="text-slate-500 text-xs">Weight: {d.weight * 100}%</span>
                      </div>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">{d.description.slice(0, 120)}…</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* CTA */}
          <section className="max-w-4xl mx-auto px-4 pb-16">
            <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-2xl border border-slate-700 p-8 md:p-12 text-center">
              <h2 className="text-2xl font-bold text-white mb-3">Go deeper with a bespoke report</h2>
              <p className="text-slate-400 mb-6 max-w-lg mx-auto">Our detailed 10-page PDF combines AI analysis with human expert review — complete with prioritised fixes, code snippets, and a signature recommendation.</p>
              <button onClick={() => setShowPayment(true)}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all inline-flex items-center gap-2">
                Order Full Report — $49 <ArrowRight size={18} />
              </button>
            </div>
          </section>

          {/* NEWSLETTER */}
          <section className="max-w-xl mx-auto px-4 pb-20 text-center">
            <Mail size={28} className="text-cyan-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-2">Stay ahead of AI search</h3>
            <p className="text-slate-400 text-sm mb-4">Practical GEO tips, algorithm updates, and case studies. No spam.</p>
            {nlSent ? (
              <p className="text-emerald-400 text-sm flex items-center justify-center gap-2"><CheckCircle size={16} /> You're on the list.</p>
            ) : (
              <div className="flex gap-2">
                <input type="email" value={nlEmail} onChange={e => setNlEmail(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  placeholder="your@email.com" />
                <button onClick={() => nlEmail && setNlSent(true)}
                  className="bg-cyan-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-500">Subscribe</button>
              </div>
            )}
            <p className="text-slate-600 text-xs mt-2">We respect your privacy. Unsubscribe anytime.</p>
          </section>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="max-w-md mx-auto px-4 pt-32 text-center">
          <div className="w-16 h-16 rounded-full border-4 border-slate-700 border-t-cyan-500 animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-bold text-white mb-2">Analysing your page…</h2>
          <p className="text-slate-400 text-sm">Fetching, inspecting, and scoring across 6 dimensions</p>
          <p className="text-cyan-400 text-sm mt-2 font-mono truncate">{url}</p>
        </div>
      )}

      {/* RESULTS */}
      {page === "results" && results && !loading && (
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-6">
            <p className="text-slate-400 text-sm mb-1">Audit results for</p>
            <p className="text-cyan-400 font-mono text-sm truncate">{auditUrl}</p>
          </div>

          {/* OVERALL */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-6 flex items-center gap-8">
              <ScoreGauge score={overall} size={140} />
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Overall Score</h2>
                <span className="text-sm px-3 py-1 rounded-full font-medium" style={{ background: `${overallColor}20`, color: overallColor }}>{getScoreLabel(overall)}</span>
                <p className="text-slate-400 text-sm mt-3">Weighted average across {AUDIT_DIMENSIONS.length} dimensions, {AUDIT_DIMENSIONS.reduce((s,d)=>s+d.checks.length,0)} individual checks.</p>
              </div>
            </div>
            <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-4">
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="dim" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar dataKey="score" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* DIMENSION CARDS */}
          <div className="grid md:grid-cols-2 gap-5 mb-8">
            {results.map(d => (
              <DimensionCard key={d.id} dim={d} isPaid={false} onUnlock={() => setShowPayment(true)} />
            ))}
          </div>

          {/* FREE RECOMMENDATIONS */}
          <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><TrendingUp size={20} className="text-cyan-400" /> Quick Wins (Free Preview)</h3>
            <div className="space-y-3">
              {topImprovements.map((d, i) => (
                <div key={d.id} className="flex items-start gap-3 bg-slate-900/50 rounded-lg p-4">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                  <div>
                    <p className="text-white text-sm font-medium">{d.shortName}: {d.recommendations[0]}</p>
                    <p className="text-slate-400 text-xs mt-1">Current score: {d.score}/100 · Weight: {d.weight*100}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LOCKED FULL RECS */}
          <div className="relative bg-slate-800/80 rounded-xl border border-slate-700/50 p-6 mb-10">
            <LockedOverlay onUnlock={() => setShowPayment(true)} />
            <h3 className="text-lg font-bold text-white mb-4">Full Recommendations & Code Snippets</h3>
            <div className="space-y-3 opacity-40">
              {results.map(d => d.recommendations.slice(1).map((r, i) => (
                <div key={`${d.id}-${i}`} className="bg-slate-900/50 rounded-lg p-4">
                  <p className="text-white text-sm">{d.shortName}: {r}</p>
                </div>
              )))}
            </div>
          </div>

          {/* NEWSLETTER IN RESULTS */}
          <div className="max-w-xl mx-auto text-center pb-12">
            <h3 className="text-lg font-bold text-white mb-2">Get GEO insights in your inbox</h3>
            {nlSent ? (
              <p className="text-emerald-400 text-sm flex items-center justify-center gap-2"><CheckCircle size={16} /> Subscribed.</p>
            ) : (
              <div className="flex gap-2">
                <input type="email" value={nlEmail} onChange={e => setNlEmail(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  placeholder="your@email.com" />
                <button onClick={() => nlEmail && setNlSent(true)}
                  className="bg-cyan-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-500">Subscribe</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BLOG */}
      {page === "blog" && (
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-white mb-2">Blog</h1>
          <p className="text-slate-400 mb-8">Guides, case studies, and updates on SEO, GEO, and AI-optimised content.</p>
          <div className="grid md:grid-cols-2 gap-5">
            {BLOG_POSTS.map(p => (
              <article key={p.id} className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-5 hover:border-cyan-500/30 transition-colors cursor-pointer group">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{p.category}</span>
                  <span className="text-slate-500 text-xs">{p.readTime}</span>
                </div>
                <h2 className="text-white font-semibold mb-2 group-hover:text-cyan-400 transition-colors">{p.title}</h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-3">{p.excerpt}</p>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">{p.date}</span>
                  <span className="text-cyan-400 text-sm flex items-center gap-1 group-hover:gap-2 transition-all">Read <ChevronRight size={14} /></span>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* PRICING */}
      {page === "pricing" && (
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-white text-center mb-2">Pricing</h1>
          <p className="text-slate-400 text-center mb-10">One clear price. No subscriptions.</p>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-white font-bold text-xl mb-1">Free Audit</h3>
              <p className="text-3xl font-bold text-white mb-4">$0</p>
              <ul className="space-y-2 text-sm text-slate-300 mb-6">
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400" /> Overall score across 6 dimensions</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400" /> Free-tier check results</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400" /> Top 3 quick-win recommendations</li>
                <li className="flex items-center gap-2"><XCircle size={14} className="text-slate-600" /> Deep checks (E-E-A-T, content quality)</li>
                <li className="flex items-center gap-2"><XCircle size={14} className="text-slate-600" /> Code snippets & implementation guides</li>
              </ul>
              <button onClick={() => setPage("home")}
                className="w-full border border-slate-600 text-white py-2.5 rounded-lg font-medium hover:bg-slate-700 transition-colors">Run Free Audit</button>
            </div>
            <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl border border-cyan-500/30 p-6 relative">
              <div className="absolute -top-3 right-4 px-3 py-0.5 bg-cyan-500 text-white text-xs font-bold rounded-full">RECOMMENDED</div>
              <h3 className="text-white font-bold text-xl mb-1">Full Report</h3>
              <p className="text-3xl font-bold text-white mb-1">$49 <span className="text-sm font-normal text-slate-400">one-off</span></p>
              <p className="text-slate-400 text-xs mb-4">10-page PDF · AI + human review · delivered in 48h</p>
              <ul className="space-y-2 text-sm text-slate-300 mb-6">
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400" /> Everything in the free audit</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400" /> All paid checks unlocked</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400" /> 3 critical issues with code fixes</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400" /> 5 improvements ranked by impact/effort</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400" /> Signature AI citability recommendation</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400" /> Human expert review and sign-off</li>
              </ul>
              <button onClick={() => setShowPayment(true)}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-2.5 rounded-lg font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all">Order Report</button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-slate-800 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Eye size={16} className="text-cyan-400" />
            <span>CiteSite</span> · <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-500">
            <button onClick={() => setPage("home")} className="hover:text-white transition-colors">Audit</button>
            <button onClick={() => setPage("blog")} className="hover:text-white transition-colors">Blog</button>
            <button onClick={() => setPage("pricing")} className="hover:text-white transition-colors">Pricing</button>
          </div>
        </div>
      </footer>

      {showPayment && <PaymentModal onClose={() => setShowPayment(false)} url={auditUrl || url || "https://example.com"} />}
    </div>
  );
}