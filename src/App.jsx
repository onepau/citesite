import { useState, useEffect } from "react";
import { marked } from "marked";
import { pdf } from "@react-pdf/renderer";
import { AuditPDFDocument } from "./components/AuditPDFDocument";
import { PDFEditModal } from "./components/PDFEditModal";
import { getLocalPrice, formatPrice } from "./utils/pricing";
import {
  Search,
  Lock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronRight,
  Mail,
  CreditCard,
  X,
  ArrowRight,
  BarChart3,
  Shield,
  FileText,
  Globe,
  Eye,
  Zap,
  Menu,
  Star,
  TrendingUp,
  Sparkles,
  Target,
  CalendarRange,
  Wrench,
  ListChecks,
} from "lucide-react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

const mdFiles = import.meta.glob("../content/blog/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

/* ═══════════════════════════════════════════════════════════════════
   AUDIT ENGINE CONFIGURATION
   ───────────────────────────────────────────────────────────────────
   Single source of truth for all audit criteria.
   To update: add/remove/reorder items, adjust weights (must sum to 1.0),
   change tier to 'free' or 'paid', update scoring bands and recommendations.
   ═══════════════════════════════════════════════════════════════════ */

const AUDIT_DIMENSIONS = [
  {
    id: "crawlability",
    dimension: "A",
    name: "Crawlability & Retrievability",
    shortName: "Crawlability",
    weight: 0.2,
    tier: "free",
    icon: "Globe",
    description:
      "SSR vs CSR, robots.txt directives (including AI-bot rules for GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot), sitemap, canonical, response codes, llms.txt, HTTPS, mobile rendering.",
    scoringBands: [
      {
        min: 0,
        max: 30,
        label: "Critical",
        desc: "AI bots see empty or broken content",
      },
      {
        min: 31,
        max: 60,
        label: "Needs Work",
        desc: "Crawlable with friction",
      },
      { min: 61, max: 85, label: "Good", desc: "Cleanly crawlable" },
      {
        min: 86,
        max: 100,
        label: "Excellent",
        desc: "Cleanly crawlable with explicit AI-bot allowances and llms.txt support",
      },
    ],
    checks: [
      {
        id: "ssr-csr",
        name: "Server-side rendering",
        description: "Page returns substantive HTML to non-JS crawlers",
        maxPoints: 20,
        tier: "free",
      },
      {
        id: "robots-ai",
        name: "AI bot directives",
        description:
          "robots.txt rules for GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot",
        maxPoints: 20,
        tier: "paid",
      },
      {
        id: "sitemap",
        name: "XML Sitemap",
        description: "Valid sitemap.xml present and referenced in robots.txt",
        maxPoints: 15,
        tier: "free",
      },
      {
        id: "canonical",
        name: "Canonical tag",
        description: "Self-referencing canonical URL present",
        maxPoints: 10,
        tier: "free",
      },
      {
        id: "llms-txt",
        name: "llms.txt support",
        description: "Presence of /llms.txt and/or /llms-full.txt",
        maxPoints: 15,
        tier: "paid",
      },
      {
        id: "https",
        name: "HTTPS",
        description: "Served over HTTPS with valid certificate",
        maxPoints: 10,
        tier: "free",
      },
      {
        id: "mobile",
        name: "Mobile rendering",
        description: "Mobile viewport meta tag and responsive rendering",
        maxPoints: 10,
        tier: "free",
      },
    ],
    recommendations: [
      "Implement server-side rendering (SSR) or static site generation (SSG) to ensure AI crawlers receive full HTML content.",
      "Add explicit AI-bot allow rules to robots.txt for GPTBot, ClaudeBot, PerplexityBot.",
      "Create and maintain an /llms.txt file describing your site's purpose, key content areas, and preferred citation format.",
    ],
  },
  {
    id: "content-structure",
    dimension: "B",
    name: "Content Structure & Passage Retrievability",
    shortName: "Content Structure",
    weight: 0.2,
    tier: "free",
    icon: "FileText",
    description:
      "Semantic HTML, heading hierarchy, self-contained paragraphs, definitional opening sentence, lists, tables, Q&A blocks, chunk-level answerability for passage retrieval.",
    scoringBands: [
      {
        min: 0,
        max: 30,
        label: "Critical",
        desc: "Wall of text, no structure",
      },
      {
        min: 31,
        max: 60,
        label: "Needs Work",
        desc: "Some structure but weak chunk answerability",
      },
      {
        min: 61,
        max: 85,
        label: "Good",
        desc: "Well-structured, answer-ready",
      },
      {
        min: 86,
        max: 100,
        label: "Excellent",
        desc: "Purpose-built for passage retrieval",
      },
    ],
    checks: [
      {
        id: "semantic-html",
        name: "Semantic HTML",
        description:
          "Uses article, section, nav, aside, header, footer correctly",
        maxPoints: 15,
        tier: "free",
      },
      {
        id: "heading-hierarchy",
        name: "Heading hierarchy",
        description: "Logical H1-H6 nesting without skips",
        maxPoints: 15,
        tier: "free",
      },
      {
        id: "self-contained",
        name: "Self-contained paragraphs",
        description:
          "Paragraphs are independently meaningful without surrounding context",
        maxPoints: 20,
        tier: "paid",
      },
      {
        id: "definitional",
        name: "Definitional opening",
        description:
          "Key sections begin with a clear, citable definition sentence",
        maxPoints: 20,
        tier: "paid",
      },
      {
        id: "qa-blocks",
        name: "Q&A / FAQ blocks",
        description: "Presence of question-and-answer formatted content",
        maxPoints: 15,
        tier: "paid",
      },
      {
        id: "lists-tables",
        name: "Lists & tables",
        description:
          "Structured data presented in scannable list or table format",
        maxPoints: 15,
        tier: "free",
      },
    ],
    recommendations: [
      "Begin each major section with a definitional sentence that directly answers 'What is [topic]?'",
      "Break long paragraphs into self-contained chunks that can be extracted as standalone passages.",
      "Add FAQ sections using Q&A format with corresponding FAQPage schema markup.",
    ],
  },
  {
    id: "structured-data",
    dimension: "C",
    name: "Structured Data & Machine-Readable Signals",
    shortName: "Structured Data",
    weight: 0.15,
    tier: "paid",
    icon: "BarChart3",
    description:
      "JSON-LD @type(s) and relevance, required and recommended properties, @graph for multiple types, Schema.org validity, author, publisher, datePublished, dateModified, sameAs, mentions, Open Graph, Twitter Card.",
    scoringBands: [
      { min: 0, max: 30, label: "Critical", desc: "None or broken" },
      { min: 31, max: 60, label: "Needs Work", desc: "Present but incomplete" },
      { min: 61, max: 85, label: "Good", desc: "Valid and appropriate" },
      {
        min: 86,
        max: 100,
        label: "Excellent",
        desc: "Comprehensive multi-type graph with full E-E-A-T signalling",
      },
    ],
    checks: [
      {
        id: "jsonld-present",
        name: "JSON-LD present",
        description: "At least one valid JSON-LD block in page source",
        maxPoints: 15,
        tier: "free",
      },
      {
        id: "jsonld-types",
        name: "Appropriate @types",
        description:
          "Schema types match content type (Article, Product, FAQPage, etc.)",
        maxPoints: 20,
        tier: "paid",
      },
      {
        id: "jsonld-graph",
        name: "@graph structure",
        description: "Multiple related types linked via @graph",
        maxPoints: 15,
        tier: "paid",
      },
      {
        id: "eeat-props",
        name: "E-E-A-T properties",
        description:
          "author, publisher, datePublished, dateModified, sameAs present",
        maxPoints: 20,
        tier: "paid",
      },
      {
        id: "og-tags",
        name: "Open Graph tags",
        description: "Complete OG metadata for social sharing",
        maxPoints: 15,
        tier: "free",
      },
      {
        id: "twitter-card",
        name: "Twitter/X Card",
        description: "Twitter card meta tags present",
        maxPoints: 15,
        tier: "free",
      },
    ],
    recommendations: [
      "Implement JSON-LD @graph combining Article/WebPage, Person (author), and Organization (publisher) types.",
      "Add datePublished and dateModified to signal content freshness to AI systems.",
      "Include sameAs links pointing to authoritative profiles (LinkedIn, official bios, ORCID).",
    ],
  },
  {
    id: "eeat",
    dimension: "D",
    name: "E-E-A-T & Citability Signals",
    shortName: "E-E-A-T",
    weight: 0.15,
    tier: "paid",
    icon: "Shield",
    description:
      "Named author with bio and credentials, Person and Organization schema, outbound citations to primary sources, original data, about/contact pages, sameAs links, reviews and press mentions.",
    scoringBands: [
      { min: 0, max: 30, label: "Critical", desc: "Anonymous, no sourcing" },
      { min: 31, max: 60, label: "Needs Work", desc: "Some attribution" },
      {
        min: 61,
        max: 85,
        label: "Good",
        desc: "Clear authorship and sourcing",
      },
      {
        min: 86,
        max: 100,
        label: "Excellent",
        desc: "Fully verifiable expertise with linked credentials",
      },
    ],
    checks: [
      {
        id: "named-author",
        name: "Named author",
        description:
          "Content attributed to a named individual with visible bio",
        maxPoints: 20,
        tier: "paid",
      },
      {
        id: "author-schema",
        name: "Author schema",
        description:
          "Person schema with credentials, sameAs, and expertise signals",
        maxPoints: 20,
        tier: "paid",
      },
      {
        id: "outbound-citations",
        name: "Outbound citations",
        description:
          "Links to primary sources, studies, or authoritative references",
        maxPoints: 20,
        tier: "paid",
      },
      {
        id: "original-data",
        name: "Original data/experience",
        description: "Evidence of primary research or first-hand experience",
        maxPoints: 20,
        tier: "paid",
      },
      {
        id: "about-contact",
        name: "About & Contact pages",
        description: "Discoverable about and contact pages linked from content",
        maxPoints: 20,
        tier: "paid",
      },
    ],
    recommendations: [
      "Add a visible author bio with credentials, headshot, and links to authoritative profiles.",
      "Cite primary sources (studies, reports, official documentation) rather than secondary aggregators.",
      "Create a comprehensive About page with Organization schema, including founding date, team, and press mentions.",
    ],
  },
  {
    id: "content-quality",
    dimension: "E",
    name: "Content Quality & Topical Completeness",
    shortName: "Content Quality",
    weight: 0.15,
    tier: "paid",
    icon: "Star",
    description:
      "Depth relative to query intent, coverage of adjacent entities and follow-up questions, originality vs. commodity content, freshness, evidence of primary research.",
    scoringBands: [
      { min: 0, max: 30, label: "Critical", desc: "Thin or duplicative" },
      { min: 31, max: 60, label: "Needs Work", desc: "Adequate but generic" },
      {
        min: 61,
        max: 85,
        label: "Good",
        desc: "Comprehensive and substantive",
      },
      {
        min: 86,
        max: 100,
        label: "Excellent",
        desc: "Original, authoritative, definitional for the query",
      },
    ],
    checks: [
      {
        id: "depth",
        name: "Content depth",
        description: "Sufficient depth relative to likely query intent",
        maxPoints: 25,
        tier: "paid",
      },
      {
        id: "adjacent-entities",
        name: "Adjacent entity coverage",
        description: "Covers related topics and likely follow-up questions",
        maxPoints: 20,
        tier: "paid",
      },
      {
        id: "originality",
        name: "Originality",
        description:
          "Original perspective, data, or insight vs. commodity content",
        maxPoints: 25,
        tier: "paid",
      },
      {
        id: "freshness",
        name: "Freshness signals",
        description: "Evidence of recent updates and content maintenance",
        maxPoints: 15,
        tier: "paid",
      },
      {
        id: "primary-research",
        name: "Primary research",
        description: "First-hand data, case studies, or experiential evidence",
        maxPoints: 15,
        tier: "paid",
      },
    ],
    recommendations: [
      "Address the top 3-5 follow-up questions a reader would naturally ask after consuming your content.",
      "Add original data points, case studies, or first-hand observations that cannot be found elsewhere.",
      "Display visible last-updated dates and maintain a regular content refresh cadence.",
    ],
  },
  {
    id: "technical-seo",
    dimension: "F",
    name: "On-Page Technical SEO",
    shortName: "Technical SEO",
    weight: 0.15,
    tier: "free",
    icon: "Zap",
    description:
      "Title tag, meta description, H1, image alt text, internal linking, URL structure, Core Web Vitals signals, mobile viewport tag.",
    scoringBands: [
      {
        min: 0,
        max: 30,
        label: "Critical",
        desc: "Multiple fundamentals missing",
      },
      {
        min: 31,
        max: 60,
        label: "Needs Work",
        desc: "Basics covered but weak",
      },
      { min: 61, max: 85, label: "Good", desc: "Well-executed" },
      {
        min: 86,
        max: 100,
        label: "Excellent",
        desc: "Polished across all fundamentals",
      },
    ],
    checks: [
      {
        id: "title-tag",
        name: "Title tag",
        description: "Unique, descriptive title under 60 characters",
        maxPoints: 15,
        tier: "free",
      },
      {
        id: "meta-desc",
        name: "Meta description",
        description: "Compelling meta description under 160 characters",
        maxPoints: 15,
        tier: "free",
      },
      {
        id: "h1",
        name: "H1 tag",
        description: "Single, descriptive H1 matching page intent",
        maxPoints: 10,
        tier: "free",
      },
      {
        id: "img-alt",
        name: "Image alt text",
        description: "All content images have descriptive alt attributes",
        maxPoints: 15,
        tier: "free",
      },
      {
        id: "internal-links",
        name: "Internal linking",
        description: "Contextual internal links to related content",
        maxPoints: 15,
        tier: "paid",
      },
      {
        id: "url-structure",
        name: "URL structure",
        description: "Clean, descriptive, hyphenated URL slug",
        maxPoints: 15,
        tier: "free",
      },
      {
        id: "cwv",
        name: "Core Web Vitals",
        description:
          "Visible performance signals (no render-blocking, lazy loading, etc.)",
        maxPoints: 15,
        tier: "paid",
      },
    ],
    recommendations: [
      "Craft title tags that include the primary keyword within the first 30 characters.",
      "Add descriptive alt text to all images — describe content, not just 'image of...'.",
      "Implement lazy loading for below-fold images and defer non-critical JavaScript.",
    ],
  },
];

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const lines = match[1].split("\n");
  const result = {};
  let currentKey = null;
  let currentVal = "";
  for (const line of lines) {
    if (/^\s/.test(line) && currentKey) {
      currentVal += " " + line.trim();
      result[currentKey] = currentVal;
    } else {
      const colon = line.indexOf(":");
      if (colon === -1) continue;
      currentKey = line.slice(0, colon).trim();
      currentVal = line.slice(colon + 1).trim();
      result[currentKey] = currentVal;
    }
  }
  if (result.featured === "true") result.featured = true;
  if (result.featured === "false") result.featured = false;
  return result;
}

const BLOG_POSTS = Object.entries(mdFiles)
  .map(([path, raw], idx) => {
    const slug = path.replace("../content/blog/", "").replace(".md", "");
    const fm = parseFrontmatter(raw);
    return {
      id: idx + 1,
      slug,
      title: fm.title || slug,
      excerpt: fm.excerpt || "",
      category: fm.category || "",
      date: (fm.date || "").slice(0, 10),
      readTime: fm.readTime || "",
      featured: fm.featured === true,
    };
  })
  .sort((a, b) => b.date.localeCompare(a.date));

/* ═══════════════════════════════════════════════════════════════════
   API CONFIGURATION
   ───────────────────────────────────────────────────────────────────
   Public audits call the Worker directly (free-tier results).
   Admin audits on localhost use admin key from localStorage.
   Set key once in browser console: localStorage.setItem("adminKey", "your-key")
   ═══════════════════════════════════════════════════════════════════ */
const API_BASE = "https://api.citesite.net";
const IS_LOCAL =
  typeof window !== "undefined" && window.location.hostname === "localhost";

const getAccessJWT = () => {
  const match = document.cookie.match(/CF_Authorization=([^;]+)/);
  return match ? match[1] : null;
};

const callAuditAPI = async (url, isAdmin = false, orderId = null) => {
  const headers = { "Content-Type": "application/json" };
  if (isAdmin) {
    if (IS_LOCAL) {
      // For local dev: reads admin key from localStorage
      // Set it once in console: localStorage.setItem("adminKey", "your-key")
      const key = localStorage.getItem("adminKey");
      if (key) headers["X-Admin-Key"] = key;
    } else {
      const jwt = getAccessJWT();
      if (jwt) headers["Cf-Access-Jwt-Assertion"] = jwt;
    }
  }

  const isPaid = orderId !== null;
  const endpoint =
    isPaid || isAdmin ? `${API_BASE}/api/audit/full` : `${API_BASE}/api/audit`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ url, ...(orderId && { orderId }) }),
  });

  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: "Could not parse server response" }));
    throw new Error(err.error || `API error: ${res.status}`);
  }

  const data = await res.json();
  if (data.error) {
    const err = new Error(data.error);
    err.code = data.errorCode || null;
    throw err;
  }

  // Merge API dimension data with local config (for icon, shortName, static recommendations)
  // while preserving all top-level fields (criticalIssues, improvements, signatureRecommendation, inspection)
  return {
    ...data,
    dimensions: data.dimensions.map((dim) => {
      const config = AUDIT_DIMENSIONS.find((d) => d.id === dim.id) || {};
      return {
        ...config,
        ...dim,
        checks: dim.checks.map((c) => {
          const configCheck =
            (config.checks || []).find((cc) => cc.id === c.id) || {};
          return { ...configCheck, ...c };
        }),
      };
    }),
  };
};

/* ═══════════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
   ═══════════════════════════════════════════════════════════════════ */
const getOverallScore = (dims) =>
  Math.round(dims.reduce((s, d) => s + d.score * d.weight, 0));

const getScoreColor = (score) => {
  if (score >= 86) return "#10b981";
  if (score >= 61) return "#3b82f6";
  if (score >= 31) return "#f59e0b";
  return "#ef4444";
};

const getScoreLabel = (score) => {
  if (score >= 86) return "Excellent";
  if (score >= 61) return "Good";
  if (score >= 31) return "Needs Work";
  return "Critical";
};

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
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-[135deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#1e293b"
          strokeWidth="8"
          strokeDasharray={`${arc} ${circ}`}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-xs text-slate-400">/100</span>
      </div>
    </div>
  );
};

const LockedOverlay = ({ onUnlock, priceLabel = "CHF 49.99", message }) => (
  <div className="absolute inset-0 backdrop-blur-md bg-slate-900/60 rounded-xl flex flex-col items-center justify-center z-10 p-6">
    <Lock size={32} className="text-cyan-400 mb-3" />
    <p className="text-white font-semibold text-center mb-1">
      {message || "Full analysis available in the detailed report"}
    </p>
    <p className="text-slate-400 text-sm text-center mb-4">
      Get expert recommendations with AI + human review
    </p>
    <button
      onClick={onUnlock}
      className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center gap-2"
    >
      Unlock Full Report — {priceLabel} <ArrowRight size={16} />
    </button>
  </div>
);

const DimensionCard = ({ dim, isPaid, onUnlock, priceLabel }) => {
  const Ico = IconMap[dim.icon] || Globe;
  const color = getScoreColor(dim.score);
  const freeChecks = dim.checks.filter((c) => c.tier === "free");
  const paidChecks = dim.checks.filter((c) => c.tier === "paid");
  const firstObs = dim.observations?.[0];

  return (
    <div className="relative bg-slate-800/80 rounded-xl border border-slate-700/50 p-5 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: `${color}20` }}
          >
            <Ico size={20} style={{ color }} />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">
              {dim.dimension}. {dim.name}
            </h3>
            <p className="text-slate-400 text-xs">
              Weight: {dim.weight * 100}% · Confidence: {dim.confidence || "—"}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold" style={{ color }}>
            {dim.score}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: `${color}20`, color }}
          >
            {getScoreLabel(dim.score)}
          </span>
        </div>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
        <div
          className="h-2 rounded-full transition-all duration-1000"
          style={{ width: `${dim.score}%`, background: color }}
        />
      </div>

      {/* First observation as a free-tier taste; rest gated server-side */}
      {firstObs && (
        <div className="mb-3 pl-3 border-l-2 border-cyan-500/40">
          <p className="text-xs text-slate-300 leading-relaxed">{firstObs}</p>
          {!isPaid && dim.observations?.length === 1 && (
            <p className="text-[10px] text-slate-500 mt-1 italic">
              + further observations in the full report
            </p>
          )}
        </div>
      )}

      {freeChecks.length > 0 && (
        <div className="space-y-2 mb-3">
          {freeChecks.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                {c.score >= c.maxPoints * 0.7 ? (
                  <CheckCircle size={14} className="text-emerald-400" />
                ) : c.score >= c.maxPoints * 0.4 ? (
                  <AlertTriangle size={14} className="text-amber-400" />
                ) : (
                  <XCircle size={14} className="text-red-400" />
                )}
                <span className="text-slate-300">{c.name}</span>
              </div>
              <span className="text-slate-400 text-xs">
                {c.score}/{c.maxPoints}
              </span>
            </div>
          ))}
        </div>
      )}
      {paidChecks.length > 0 && (
        <div className="relative mt-2">
          {!isPaid && (
            <LockedOverlay
              onUnlock={onUnlock}
              priceLabel={priceLabel}
              message="Deep checks in the full report"
            />
          )}
          <div className="space-y-2">
            {paidChecks.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  {c.score !== null && c.score >= c.maxPoints * 0.7 ? (
                    <CheckCircle size={14} className="text-emerald-400" />
                  ) : c.score !== null && c.score >= c.maxPoints * 0.4 ? (
                    <AlertTriangle size={14} className="text-amber-400" />
                  ) : (
                    <XCircle size={14} className="text-red-400" />
                  )}
                  <span className="text-slate-300">{c.name}</span>
                </div>
                <span className="text-slate-400 text-xs">
                  {c.score !== null ? `${c.score}/${c.maxPoints}` : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paid-only narrative + quick wins (paid tier only — these fields are stripped server-side for free) */}
      {isPaid && dim.narrative && (
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">
            Narrative
          </p>
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
            {dim.narrative}
          </p>
        </div>
      )}
      {isPaid && dim.quickWins?.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">
            Quick Wins
          </p>
          <ul className="space-y-1">
            {dim.quickWins.map((w, i) => (
              <li key={i} className="flex gap-2 text-xs text-slate-300">
                <CheckCircle
                  size={12}
                  className="text-emerald-400 shrink-0 mt-0.5"
                />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {isPaid && dim.prioritizedActions?.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">
            Prioritised Actions
          </p>
          <div className="space-y-2">
            {dim.prioritizedActions.map((a, i) => (
              <div
                key={i}
                className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-700/50"
              >
                <p className="text-xs text-slate-200 mb-1.5">{a.action}</p>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                    Effort: <span className="font-semibold">{a.effort}</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                    Impact: <span className="font-semibold">{a.impact}</span>
                  </span>
                  {a.estimatedTrafficLift && (
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300">
                      {a.estimatedTrafficLift}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const PaymentModal = ({ onClose, url, localPrice }) => {
  const [email, setEmail] = useState("");
  const [editableUrl, setEditableUrl] = useState(url || "");
  const [step, setStep] = useState("details");
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const isUrlPrefilled = !!url;
  const priceLabel = localPrice ? formatPrice(localPrice) : "CHF 49.99";
  const isLocalised = localPrice && localPrice.currency !== "CHF";

  const handlePay = async () => {
    if (!email) return setPaymentError("Please enter an email");
    const trimmedUrl = editableUrl.trim();
    if (!trimmedUrl) return setPaymentError("Please enter a URL");
    let normalisedUrl;
    try {
      const candidate = /^https?:\/\//i.test(trimmedUrl)
        ? trimmedUrl
        : `https://${trimmedUrl}`;
      const parsed = new URL(candidate);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
        throw new Error("protocol");
      // The URL constructor accepts almost anything as a hostname (it just %-encodes
      // junk), so require a DNS-style hostname with at least one dot.
      if (
        !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(
          parsed.hostname,
        )
      ) {
        throw new Error("hostname");
      }
      normalisedUrl = parsed.toString();
    } catch {
      return setPaymentError(
        "Please enter a valid URL (e.g. https://example.com)",
      );
    }
    setPaymentError(null);
    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, url: normalisedUrl }),
      });
      const data = await res
        .json()
        .catch(() => ({ error: "Could not parse server response" }));
      if (!res.ok) throw new Error(data.error || "Checkout creation failed");
      if (data.checkoutUrl && data.orderId) {
        // Store orderId and URL so we can load full audit after payment
        sessionStorage.setItem("pendingOrderId", data.orderId);
        sessionStorage.setItem("pendingAuditUrl", normalisedUrl);
        // redirect to Stripe Checkout
        window.location.href = data.checkoutUrl;
        return;
      }
      throw new Error("No checkout URL received");
    } catch (e) {
      console.error("Checkout error", e);
      setPaymentError(e.message || "Checkout failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X size={20} />
        </button>
        {step === "details" ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <FileText size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">
                  Detailed SEO/GEO Report
                </h3>
                <p className="text-slate-400 text-sm">
                  AI-powered analysis + human expert review
                </p>
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4 mb-4 space-y-2 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-cyan-400" /> Executive
                summary (3–5 paragraphs)
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-400" /> Full
                6-dimension audit with narratives + quick wins
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-400" />{" "}
                Prioritised actions (effort/impact/traffic-lift)
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-400" />{" "}
                Competitor gap analysis + 30/60/90 day roadmap
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-400" /> Tool
                recommendations + JSON-LD code snippets
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-400" /> Delivered
                as a 16-page PDF within 48 hours
              </div>
            </div>
            <div className="text-sm text-slate-400 mb-2">URL to audit</div>
            {isUrlPrefilled ? (
              <div className="bg-slate-900 rounded-lg p-3 text-cyan-400 text-sm mb-4 font-mono truncate">
                {editableUrl}
              </div>
            ) : (
              <input
                type="url"
                value={editableUrl}
                onChange={(e) => setEditableUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 mb-4"
                placeholder="https://example.com"
              />
            )}
            <div className="mb-4">
              <label className="text-sm text-slate-400 block mb-1">
                Email for report delivery
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                placeholder="you@example.com"
              />
            </div>
            <button
              onClick={handlePay}
              disabled={processing}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <CreditCard size={18} />{" "}
              {processing ? "Processing…" : `Pay ${priceLabel}`}
            </button>
            {paymentError && (
              <p className="text-red-400 text-xs mt-2">{paymentError}</p>
            )}
            <p className="text-slate-500 text-xs text-center mt-3">
              Secure payment via Stripe. You will not be charged until you
              confirm.
            </p>
            {isLocalised && (
              <p className="text-slate-600 text-[10px] text-center mt-1">
                Localised display from CHF 49 · charged in CHF at today's rate
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-emerald-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">
              Order Confirmed
            </h3>
            <p className="text-slate-400 text-sm mb-1">
              Your bespoke SEO/GEO report is being prepared.
            </p>
            <p className="text-slate-400 text-sm mb-4">
              We'll deliver it to <span className="text-cyan-400">{email}</span>{" "}
              within 48 hours.
            </p>
            <button
              onClick={onClose}
              className="bg-slate-700 text-white px-6 py-2 rounded-lg hover:bg-slate-600 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   DEV ADMIN PANEL — renders only on localhost
   Usage:
     1. Paste your ADMIN_KEY into the input (saved to localStorage).
     2. Click "Admin Mode" to go to /admin-audit with full results + PDF export.
   ═══════════════════════════════════════════════════════════════════ */
const DevAdminPanel = () => {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(() => localStorage.getItem("adminKey") || "");
  const active =
    typeof window !== "undefined" &&
    window.location.pathname === "/admin-audit";

  const saveAndGo = () => {
    localStorage.setItem("adminKey", key);
    window.location.href = "/admin-audit";
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] text-xs font-mono">
      {open ? (
        <div className="bg-amber-950 border border-amber-600 rounded-xl p-4 w-64 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-amber-400 font-bold tracking-widest text-[10px] uppercase">
              Dev · Admin Panel
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-amber-600 hover:text-amber-400"
            >
              <X size={14} />
            </button>
          </div>

          {active ? (
            <div className="flex items-center gap-2 bg-amber-500/10 rounded-lg px-3 py-2 mb-3">
              <CheckCircle size={13} className="text-amber-400" />
              <span className="text-amber-300 font-semibold">
                Admin mode active
              </span>
            </div>
          ) : null}

          <label className="text-amber-600 block mb-1">Admin Key</label>
          <input
            type="password"
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              localStorage.setItem("adminKey", e.target.value);
            }}
            placeholder="paste your ADMIN_KEY"
            className="w-full bg-amber-950/80 border border-amber-800 rounded-lg px-3 py-1.5 text-amber-200 placeholder-amber-800 focus:outline-none focus:border-amber-500 mb-3"
          />

          {active ? (
            <button
              onClick={() => {
                window.location.href = "/";
              }}
              className="w-full bg-slate-700 text-white py-1.5 rounded-lg hover:bg-slate-600 transition-colors"
            >
              ← Back to public view
            </button>
          ) : (
            <button
              onClick={saveAndGo}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-1.5 rounded-lg font-semibold hover:from-amber-400 hover:to-orange-400 transition-all"
            >
              Enter Admin Mode →
            </button>
          )}

          <p className="text-amber-800 text-[9px] mt-2 leading-tight">
            Sends X-Admin-Key to the worker. Key is saved in localStorage.
          </p>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="bg-amber-500 text-amber-950 px-3 py-1.5 rounded-lg font-bold hover:bg-amber-400 transition-colors shadow-lg flex items-center gap-1.5"
        >
          <Shield size={13} /> DEV
        </button>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════════════ */
const PAGES = {
  HOME: "home",
  ADMIN_AUDIT: "admin-audit",
  RESULTS: "results",
  POST: "post",
  BLOG: "blog",
  PRICING: "pricing",
};

export default function App() {
  const [page, setPage] = useState(() => {
    if (
      typeof window !== "undefined" &&
      window.location.pathname === "/admin-audit"
    )
      return PAGES.ADMIN_AUDIT;
    return PAGES.HOME;
  });
  const isAdmin =
    typeof window !== "undefined" &&
    window.location.pathname === "/admin-audit";
  const [url, setUrl] = useState("");
  const [auditUrl, setAuditUrl] = useState("");
  const [results, setResults] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [auditError, setAuditError] = useState(null);
  const [auditErrorCode, setAuditErrorCode] = useState(null);
  const [nlEmail, setNlEmail] = useState("");
  const [nlSent, setNlSent] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [postContent, setPostContent] = useState("");
  const [localPrice, setLocalPrice] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Fetch localised price once on mount (cached after first call)
  useEffect(() => {
    let cancelled = false;
    getLocalPrice().then((p) => {
      if (!cancelled) setLocalPrice(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Check for payment success in URL params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const checkoutSuccess = params.get("checkout") === "success";
      const storedOrderId = sessionStorage.getItem("pendingOrderId");
      const storedAuditUrl = sessionStorage.getItem("pendingAuditUrl");

      if (checkoutSuccess && storedOrderId) {
        setPaymentSuccess(true);
        setOrderId(storedOrderId);
        // If URL was entered directly in payment modal (direct paid audit), set it here
        if (storedAuditUrl && !auditUrl) {
          setAuditUrl(storedAuditUrl);
        }
        sessionStorage.removeItem("pendingOrderId");
        sessionStorage.removeItem("pendingAuditUrl");
        // Clear URL params for cleaner history
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }
    }
  }, [auditUrl]);

  // Auto-load full audit when payment succeeds
  useEffect(() => {
    if (paymentSuccess && orderId && auditUrl) {
      const loadFullAudit = async () => {
        setLoading(true);
        setAuditError(null);
        setAuditErrorCode(null);
        try {
          const data = await callAuditAPI(auditUrl, false, orderId);
          setResults(data);
          setPage(PAGES.RESULTS);
          setShowPayment(false);
        } catch (err) {
          setAuditError(err.message);
          setAuditErrorCode(err.code || null);
        } finally {
          setLoading(false);
        }
      };
      loadFullAudit();
    }
  }, [paymentSuccess, orderId, auditUrl]);

  const priceLabel = localPrice ? formatPrice(localPrice) : "CHF 49.99";
  const isLocalisedPrice = localPrice && localPrice.currency !== "CHF";

  const loadPost = (post) => {
    setSelectedPost(post);
    setPage(PAGES.POST);
    const raw = mdFiles[`../content/blog/${post.slug}.md`];
    if (raw) {
      const body = raw.replace(/^---[\s\S]*?---\n/, "");
      setPostContent(marked.parse(body));
    } else {
      setPostContent("<p>Full post content coming soon.</p>");
    }
  };

  const handleGeneratePDF = async (editedData) => {
    setPdfGenerating(true);
    try {
      const blob = await pdf(
        <AuditPDFDocument auditData={editedData} url={auditUrl} />,
      ).toBlob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      let host = "site";
      try {
        host = new URL(auditUrl).hostname;
      } catch {
        /* fall back to default */
      }
      link.download = `citesite-audit-${host}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      setShowPDFModal(false);
    } catch {
      alert("PDF generation failed. Please try again.");
    } finally {
      setPdfGenerating(false);
    }
  };

  const runAudit = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setAuditError(null);
    setAuditErrorCode(null);
    setAuditUrl(url.trim());
    try {
      const data = await callAuditAPI(url.trim(), isAdmin);
      setResults(data);
      setPage(PAGES.RESULTS);
    } catch (err) {
      setAuditError(err.message);
      setAuditErrorCode(err.code || null);
      setPage(isAdmin ? "admin-audit" : "home");
    } finally {
      setLoading(false);
    }
  };

  const overall = results ? getOverallScore(results.dimensions) : 0;
  const overallColor = getScoreColor(overall);
  const radarData = results
    ? results.dimensions.map((d) => ({
        dim: d.shortName,
        score: d.score,
        fullMark: 100,
      }))
    : [];

  const topImprovements = results?.improvements?.length
    ? results.improvements.slice(0, 3)
    : results
      ? [...results.dimensions]
          .sort(
            (a, b) => (100 - b.score) * b.weight - (100 - a.score) * a.weight,
          )
          .slice(0, 3)
      : [];

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* NAV */}
      <nav className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => {
              setPage(isAdmin ? "admin-audit" : "home");
              setResults(null);
            }}
            className="flex items-center gap-2 text-white font-bold text-lg"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Eye size={18} />
            </div>
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              CiteSite
            </span>
          </button>
          <div className="hidden md:flex items-center gap-6 text-sm">
            <button
              onClick={() => setPage(PAGES.HOME)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              Audit
            </button>
            <button
              onClick={() => setPage(PAGES.BLOG)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              Blog
            </button>
            <button
              onClick={() => setPage(PAGES.PRICING)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              Pricing
            </button>
            <button
              onClick={() => setShowPayment(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:from-cyan-400 hover:to-blue-500"
            >
              Get Full Report — {priceLabel}
            </button>
          </div>
          <button
            className="md:hidden text-slate-400"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Menu size={24} />
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-slate-800 px-4 py-3 space-y-2 bg-slate-950">
            <button
              onClick={() => {
                setPage(PAGES.HOME);
                setMenuOpen(false);
              }}
              className="block w-full text-left text-slate-300 py-2"
            >
              Audit
            </button>
            <button
              onClick={() => {
                setPage(PAGES.BLOG);
                setMenuOpen(false);
              }}
              className="block w-full text-left text-slate-300 py-2"
            >
              Blog
            </button>
            <button
              onClick={() => {
                setPage(PAGES.PRICING);
                setMenuOpen(false);
              }}
              className="block w-full text-left text-slate-300 py-2"
            >
              Pricing
            </button>
          </div>
        )}
      </nav>

      {/* HOME */}
      {page === PAGES.HOME && !loading && !auditError && (
        <div>
          <section className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
            <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-medium mb-6 border border-cyan-500/20">
              SEO + GEO + AIO Audit Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              See how{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                AI search engines
              </span>{" "}
              see your website
            </h1>
            <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
              Get an instant audit across six weighted dimensions — from
              crawlability to citability. Discover what's helping and hurting
              your visibility in ChatGPT, Perplexity, Gemini, and beyond.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runAudit()}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-5 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm"
                placeholder="Enter any URL — e.g. https://example.com/blog-post"
              />
              <button
                onClick={runAudit}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Search size={18} /> Audit
              </button>
            </div>
          </section>

          {/* DIMENSIONS PREVIEW */}
          <section className="max-w-6xl mx-auto px-4 pb-16">
            <h2 className="text-xl font-bold text-center mb-8 text-white">
              Six dimensions. One score.
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {AUDIT_DIMENSIONS.map((d) => {
                const Ico = IconMap[d.icon] || Globe;
                return (
                  <div
                    key={d.id}
                    className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 hover:border-cyan-500/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                        <Ico size={18} className="text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-sm">
                          {d.dimension}. {d.shortName}
                        </h3>
                        <span className="text-slate-500 text-xs">
                          Weight: {d.weight * 100}%
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      {d.description.slice(0, 120)}…
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* CTA */}
          <section className="max-w-4xl mx-auto px-4 pb-16">
            <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-2xl border border-slate-700 p-8 md:p-12 text-center">
              <h2 className="text-2xl font-bold text-white mb-3">
                Go deeper with a bespoke report
              </h2>
              <p className="text-slate-400 mb-6 max-w-lg mx-auto">
                Our detailed 16-page PDF combines AI analysis with human expert
                review — complete with executive summary, per-dimension
                narratives, competitor gaps, a 30/60/90 day roadmap, prioritised
                fixes with traffic-lift estimates, and a signature
                recommendation.
              </p>
              <button
                onClick={() => setShowPayment(true)}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all inline-flex items-center gap-2"
              >
                Order Full Report — {priceLabel} <ArrowRight size={18} />
              </button>
            </div>
          </section>

          {/* NEWSLETTER */}
          <section className="max-w-xl mx-auto px-4 pb-20 text-center">
            <Mail size={28} className="text-cyan-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-2">
              Stay ahead of AI search
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Practical GEO tips, algorithm updates, and case studies. No spam.
            </p>
            {nlSent ? (
              <p className="text-emerald-400 text-sm flex items-center justify-center gap-2">
                <CheckCircle size={16} /> You're on the list.
              </p>
            ) : (
              <div className="flex gap-2">
                <input
                  type="email"
                  value={nlEmail}
                  onChange={(e) => setNlEmail(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  placeholder="your@email.com"
                />
                <button
                  onClick={() => nlEmail && setNlSent(true)}
                  className="bg-cyan-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-500"
                >
                  Subscribe
                </button>
              </div>
            )}
            <p className="text-slate-600 text-xs mt-2">
              We respect your privacy. Unsubscribe anytime.
            </p>
          </section>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="max-w-md mx-auto px-4 pt-32 text-center">
          <div className="w-16 h-16 rounded-full border-4 border-slate-700 border-t-cyan-500 animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-bold text-white mb-2">
            Analysing your page…
          </h2>
          <p className="text-slate-400 text-sm">
            Fetching, inspecting, and scoring across 6 dimensions
          </p>
          <p className="text-slate-500 text-xs mt-1">
            This usually takes 20–30 seconds
          </p>
          <p className="text-cyan-400 text-sm mt-2 font-mono truncate">{url}</p>
        </div>
      )}

      {/* ERROR */}
      {auditError &&
        !loading &&
        (page === PAGES.HOME || page === PAGES.ADMIN_AUDIT) && (
          <div className="max-w-md mx-auto px-4 pt-16 text-center">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
              <XCircle size={32} className="text-red-400 mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-2">
                {auditErrorCode === "rate_limit"
                  ? "Audit temporarily unavailable"
                  : "Audit failed"}
              </h3>
              {auditErrorCode === "rate_limit" ? (
                <>
                  <p className="text-slate-400 text-sm mb-3">
                    The audit engine hit a token rate limit. Common causes:
                  </p>
                  <ul className="text-slate-400 text-sm text-left mb-4 space-y-1 list-disc list-inside">
                    <li>The target page has a very large HTML document</li>
                    <li>The domain has an unusually long robots.txt file</li>
                    <li>High demand on the service at this moment</li>
                  </ul>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => {
                        setAuditError(null);
                        setAuditErrorCode(null);
                      }}
                      className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-600"
                    >
                      Try again
                    </button>
                    <button
                      onClick={() => {
                        setAuditError(null);
                        setAuditErrorCode(null);
                        setShowPayment(true);
                      }}
                      className="bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-cyan-400"
                    >
                      Get a paid audit →
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-slate-400 text-sm mb-4">{auditError}</p>
                  <button
                    onClick={() => {
                      setAuditError(null);
                      setAuditErrorCode(null);
                    }}
                    className="bg-slate-700 text-white px-5 py-2 rounded-lg text-sm hover:bg-slate-600"
                  >
                    Try again
                  </button>
                </>
              )}
            </div>
          </div>
        )}

      {/* ADMIN AUDIT */}
      {page === PAGES.ADMIN_AUDIT && !loading && !auditError && (
        <div>
          <section className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
            <div className="inline-block px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium mb-6 border border-amber-500/20">
              ADMIN — Full Audit Mode
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Admin Audit
              </span>
            </h1>
            <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto">
              Full unfiltered results across all six dimensions. No paid tier
              restrictions.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runAudit()}
                className="flex-1 bg-slate-800 border border-amber-500/30 rounded-xl px-5 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm"
                placeholder="Enter any URL to audit"
              />
              <button
                onClick={runAudit}
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:from-amber-400 hover:to-orange-500 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Search size={18} /> Full Audit
              </button>
            </div>
          </section>
        </div>
      )}

      {/* RESULTS */}
      {page === PAGES.RESULTS && results && !loading && (
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                {isAdmin && (
                  <div className="inline-block px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium mb-3 border border-amber-500/20">
                    ADMIN — Full Results
                  </div>
                )}
                <p className="text-slate-400 text-sm mb-1">Audit results for</p>
                <p className="text-cyan-400 font-mono text-sm truncate">
                  {auditUrl}
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowPDFModal(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all shrink-0"
                >
                  <FileText size={16} /> Export 16-Page PDF
                </button>
              )}
            </div>
          </div>

          {/* OVERALL */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-6 flex items-center gap-8">
              <ScoreGauge score={overall} size={140} />
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  Overall Score
                </h2>
                <span
                  className="text-sm px-3 py-1 rounded-full font-medium"
                  style={{
                    background: `${overallColor}20`,
                    color: overallColor,
                  }}
                >
                  {getScoreLabel(overall)}
                </span>
                <p className="text-slate-400 text-sm mt-3">
                  Weighted average across {AUDIT_DIMENSIONS.length} dimensions,{" "}
                  {AUDIT_DIMENSIONS.reduce((s, d) => s + d.checks.length, 0)}{" "}
                  individual checks.
                </p>
              </div>
            </div>
            <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-4">
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis
                    dataKey="dim"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  <Radar
                    dataKey="score"
                    stroke="#06b6d4"
                    fill="#06b6d4"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* FREE PREVIEW BADGE */}
          {!isAdmin && results.tier === "free" && (
            <div className="flex items-center justify-between flex-wrap gap-3 mb-6 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-widest border border-amber-500/30">
                  Free Preview
                </span>
                <span className="text-xs text-slate-300">
                  Headline scores + one observation per dimension. The full
                  audit unlocks narratives, code fixes, a 30/60/90 day roadmap,
                  competitor gaps and a 16-page PDF.
                </span>
              </div>
              <button
                onClick={() => setShowPayment(true)}
                className="text-cyan-400 text-xs font-bold hover:text-cyan-300 whitespace-nowrap"
              >
                Unlock {priceLabel} →
              </button>
            </div>
          )}

          {/* EXECUTIVE SUMMARY (paid) */}
          {isAdmin && results.executiveSummary && (
            <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-6 mb-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles size={20} className="text-cyan-400" /> Executive
                Summary
              </h3>
              <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                {results.executiveSummary.split(/\n\n+/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          )}

          {/* DIMENSION CARDS */}
          <div className="grid md:grid-cols-2 gap-5 mb-8">
            {results.dimensions.map((d) => (
              <DimensionCard
                key={d.id}
                dim={d}
                isPaid={isAdmin}
                onUnlock={() => setShowPayment(true)}
                priceLabel={priceLabel}
              />
            ))}
          </div>

          {/* QUICK WINS */}
          <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-cyan-400" /> Quick Wins{" "}
              {!isAdmin && "(Free Preview)"}
            </h3>
            <div className="space-y-3">
              {topImprovements.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 bg-slate-900/50 rounded-lg p-4"
                >
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-white text-sm font-medium">
                      {item.title ||
                        `${item.shortName}: ${item.recommendations?.[0]}`}
                    </p>
                    {item.description && (
                      <p className="text-slate-400 text-xs mt-1">
                        {item.description}
                      </p>
                    )}
                    {item.impact && (
                      <p className="text-slate-500 text-xs mt-1">
                        Impact: {item.impact} · Effort: {item.effort}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CRITICAL ISSUES & SIGNATURE REC — locked for public, open for admin */}
          <div className="relative bg-slate-800/80 rounded-xl border border-slate-700/50 p-6 mb-6">
            {!isAdmin && (
              <LockedOverlay
                onUnlock={() => setShowPayment(true)}
                priceLabel={priceLabel}
                message="Code-level fixes in the full report"
              />
            )}
            <h3 className="text-lg font-bold text-white mb-4">
              Critical Issues & Code Fixes
            </h3>
            <div className={`space-y-4 ${!isAdmin ? "opacity-40" : ""}`}>
              {(results.criticalIssues || []).map((issue, i) => (
                <div key={i} className="bg-slate-900/50 rounded-lg p-4">
                  <p className="text-white text-sm font-semibold mb-1 flex items-center gap-2">
                    <XCircle size={14} className="text-red-400" /> {issue.title}
                  </p>
                  <p className="text-slate-400 text-xs mb-2">
                    {issue.description}
                  </p>
                  {issue.fix && !issue.locked && (
                    <p className="text-slate-300 text-xs mb-2">{issue.fix}</p>
                  )}
                  {issue.codeSnippet && (
                    <pre className="bg-slate-950 text-cyan-300 text-xs p-3 rounded-lg overflow-x-auto mt-2 whitespace-pre-wrap">
                      {issue.codeSnippet}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* COMPETITOR GAP ANALYSIS (paid) */}
          {isAdmin && results.competitorInsights && (
            <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-6 mb-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Target size={20} className="text-cyan-400" /> Competitor Gap
                Analysis
              </h3>
              <p className="text-sm italic bg-cyan-500/5 border-l-4 border-cyan-500 px-4 py-3 rounded-r-lg mb-4 text-slate-200">
                {results.competitorInsights.benchmark}
              </p>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">
                Identified gaps
              </p>
              <div className="space-y-2">
                {(results.competitorInsights.gaps || []).map((gap, i) => (
                  <div
                    key={i}
                    className="flex gap-3 p-3 bg-slate-900/50 rounded-lg"
                  >
                    <div className="shrink-0 w-6 h-6 bg-cyan-500/10 rounded-md flex items-center justify-center text-cyan-400 text-xs font-bold">
                      {i + 1}
                    </div>
                    <p className="text-sm text-slate-300 leading-snug">{gap}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 30/60/90 DAY ROADMAP (paid) */}
          {isAdmin && results.roadmap && (
            <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-6 mb-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CalendarRange size={20} className="text-cyan-400" /> 30 / 60 /
                90 Day Roadmap
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  {
                    label: "0–30 Days",
                    items: results.roadmap.thirtyDay,
                    accent: "border-cyan-500 text-cyan-400",
                  },
                  {
                    label: "31–60 Days",
                    items: results.roadmap.sixtyDay,
                    accent: "border-amber-500 text-amber-400",
                  },
                  {
                    label: "61–90 Days",
                    items: results.roadmap.ninetyDay,
                    accent: "border-emerald-500 text-emerald-400",
                  },
                ].map((phase, i) => (
                  <div
                    key={i}
                    className={`p-4 bg-slate-900/50 rounded-lg border-t-4 ${phase.accent}`}
                  >
                    <p className="text-[10px] uppercase font-black tracking-widest mb-3">
                      {phase.label}
                    </p>
                    <ul className="space-y-2">
                      {(phase.items || []).map((item, j) => (
                        <li
                          key={j}
                          className="text-xs leading-snug text-slate-300 flex gap-2"
                        >
                          <span className="text-cyan-400 shrink-0">▸</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TOOL RECOMMENDATIONS (paid) */}
          {isAdmin && results.toolRecommendations?.length > 0 && (
            <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-6 mb-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Wrench size={20} className="text-cyan-400" /> Recommended Tools
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {results.toolRecommendations.map((tool, i) => (
                  <div
                    key={i}
                    className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 text-sm leading-snug text-slate-300"
                  >
                    {tool}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WHAT'S LOCKED — teaser for free users */}
          {!isAdmin && results.tier === "free" && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900/60 rounded-xl border border-cyan-500/20 p-6 mb-6">
              <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <Lock size={18} className="text-cyan-400" /> What's in the full
                report
              </h3>
              <p className="text-slate-400 text-xs mb-5">
                Eight sections beyond this preview, written by AI and reviewed
                by a human expert.
              </p>
              <div className="grid md:grid-cols-2 gap-3 mb-5">
                {[
                  {
                    Ico: Sparkles,
                    title: "Executive Summary",
                    desc: "C-suite narrative covering risk and top-3 opportunities",
                  },
                  {
                    Ico: FileText,
                    title: "Per-dimension Narratives",
                    desc: "2-3 paragraph analysis tied to specific page elements",
                  },
                  {
                    Ico: ListChecks,
                    title: "Quick Wins",
                    desc: "Concrete changes implementable in under one working day",
                  },
                  {
                    Ico: TrendingUp,
                    title: "Prioritised Actions",
                    desc: "Effort/Impact/Traffic-lift ratings for every recommendation",
                  },
                  {
                    Ico: Target,
                    title: "Competitor Gap Analysis",
                    desc: "Industry benchmark + 4-6 specific gaps versus that benchmark",
                  },
                  {
                    Ico: CalendarRange,
                    title: "30/60/90 Day Roadmap",
                    desc: "Phased action plan, 4-6 priorities per phase",
                  },
                  {
                    Ico: Wrench,
                    title: "Tool Recommendations",
                    desc: "6-10 named tools tied to issues found on your site",
                  },
                  {
                    Ico: FileText,
                    title: "16-page PDF Report",
                    desc: "Editable, brandable, ready to hand to a client",
                  },
                ].map((f, i) => (
                  <div
                    key={i}
                    className="flex gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700/40"
                  >
                    <f.Ico
                      size={16}
                      className="text-cyan-400 shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-semibold text-white mb-0.5">
                        {f.title}
                      </p>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowPayment(true)}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center justify-center gap-2"
              >
                Unlock Full Report — {priceLabel} <ArrowRight size={16} />
              </button>
              {isLocalisedPrice && (
                <p className="text-slate-500 text-[10px] text-center mt-2">
                  Pegged to CHF 49 · charged in CHF at today's rate
                </p>
              )}
            </div>
          )}

          {results.signatureRecommendation && isAdmin && (
            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-xl border border-cyan-500/30 p-6 mb-10">
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Star size={20} className="text-cyan-400" /> Signature
                Recommendation
              </h3>
              <p className="text-cyan-400 font-semibold text-sm mb-1">
                {results.signatureRecommendation.title}
              </p>
              <p className="text-slate-300 text-sm mb-3">
                {results.signatureRecommendation.description}
              </p>
              {results.signatureRecommendation.codeSnippet && (
                <pre className="bg-slate-950 text-cyan-300 text-xs p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                  {results.signatureRecommendation.codeSnippet}
                </pre>
              )}
            </div>
          )}

          {/* NEWSLETTER IN RESULTS */}
          <div className="max-w-xl mx-auto text-center pb-12">
            <h3 className="text-lg font-bold text-white mb-2">
              Get GEO insights in your inbox
            </h3>
            {nlSent ? (
              <p className="text-emerald-400 text-sm flex items-center justify-center gap-2">
                <CheckCircle size={16} /> Subscribed.
              </p>
            ) : (
              <div className="flex gap-2">
                <input
                  type="email"
                  value={nlEmail}
                  onChange={(e) => setNlEmail(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  placeholder="your@email.com"
                />
                <button
                  onClick={() => nlEmail && setNlSent(true)}
                  className="bg-cyan-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-500"
                >
                  Subscribe
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BLOG */}
      {page === PAGES.BLOG && (
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-white mb-2">Blog</h1>
          <p className="text-slate-400 mb-8">
            Guides, case studies, and updates on SEO, GEO, and AI-optimised
            content.
          </p>
          <div className="grid md:grid-cols-2 gap-5">
            {BLOG_POSTS.map((p) => (
              <article
                key={p.id}
                onClick={() => loadPost(p)}
                className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-5 hover:border-cyan-500/30 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {p.category}
                  </span>
                  <span className="text-slate-500 text-xs">{p.readTime}</span>
                </div>
                <h2 className="text-white font-semibold mb-2 group-hover:text-cyan-400 transition-colors">
                  {p.title}
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-3">
                  {p.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">{p.date}</span>
                  <span className="text-cyan-400 text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                    Read <ChevronRight size={14} />
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* BLOG POST */}
      {page === PAGES.POST && selectedPost && (
        <div className="max-w-2xl mx-auto px-4 py-12">
          <button
            onClick={() => setPage(PAGES.BLOG)}
            className="text-slate-400 text-sm mb-8 hover:text-white flex items-center gap-1"
          >
            <ChevronRight size={14} className="rotate-180" /> Back to Blog
          </button>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {selectedPost.category}
            </span>
            <span className="text-slate-500 text-xs">
              {selectedPost.readTime}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {selectedPost.title}
          </h1>
          <p className="text-slate-500 text-sm mb-10">{selectedPost.date}</p>
          {postContent ? (
            <div
              className="blog-content"
              dangerouslySetInnerHTML={{ __html: postContent }}
            />
          ) : (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-cyan-500 animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* PRICING */}
      {page === PAGES.PRICING && (
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-white text-center mb-2">
            Pricing
          </h1>
          <p className="text-slate-400 text-center mb-10">
            One clear price. No subscriptions.
          </p>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-white font-bold text-xl mb-1">Free Audit</h3>
              <p className="text-3xl font-bold text-white mb-1">
                {localPrice ? `${localPrice.symbol}0` : "$0"}
              </p>
              <p className="text-slate-400 text-xs mb-4">
                A real taste of the audit engine
              </p>
              <ul className="space-y-2 text-sm text-slate-300 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" /> Overall
                  score across 6 dimensions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" />{" "}
                  Per-dimension score + confidence rating
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" /> One
                  observation per dimension
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" />{" "}
                  Free-tier check results (16 checks)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" /> Top
                  critical issue + improvement (titles)
                </li>
                <li className="flex items-center gap-2">
                  <XCircle size={14} className="text-slate-600" /> Deep checks
                  (E-E-A-T, content quality)
                </li>
                <li className="flex items-center gap-2">
                  <XCircle size={14} className="text-slate-600" /> Narrative
                  analysis & quick wins
                </li>
                <li className="flex items-center gap-2">
                  <XCircle size={14} className="text-slate-600" /> Code snippets
                  & implementation guides
                </li>
                <li className="flex items-center gap-2">
                  <XCircle size={14} className="text-slate-600" /> 16-page PDF
                  report
                </li>
              </ul>
              <button
                onClick={() => setPage(PAGES.HOME)}
                className="w-full border border-slate-600 text-white py-2.5 rounded-lg font-medium hover:bg-slate-700 transition-colors"
              >
                Run Free Audit
              </button>
            </div>
            <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl border border-cyan-500/30 p-6 relative">
              <div className="absolute -top-3 right-4 px-3 py-0.5 bg-cyan-500 text-white text-xs font-bold rounded-full">
                RECOMMENDED
              </div>
              <h3 className="text-white font-bold text-xl mb-1">Full Report</h3>
              <p className="text-3xl font-bold text-white mb-1">
                {priceLabel}{" "}
                <span className="text-sm font-normal text-slate-400">
                  one-off
                </span>
              </p>
              <p className="text-slate-400 text-xs mb-1">
                16-page PDF · AI + human review · delivered in 48h
              </p>
              {isLocalisedPrice && (
                <p className="text-slate-500 text-[10px] mb-4">
                  Pegged to CHF 49 · charged in CHF at today's rate
                </p>
              )}
              {!isLocalisedPrice && <div className="mb-4" />}
              <ul className="space-y-2 text-sm text-slate-300 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" />{" "}
                  Everything in the free audit
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles size={14} className="text-cyan-400" /> Executive
                  summary (3-5 paragraphs)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" /> All
                  paid checks unlocked
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" />{" "}
                  Per-dimension narratives + quick wins
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" />{" "}
                  Prioritised actions with traffic-lift estimates
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" /> 3
                  critical issues with code fixes
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" /> 5
                  improvements ranked by impact/effort
                </li>
                <li className="flex items-center gap-2">
                  <Target size={14} className="text-cyan-400" /> Competitor gap
                  analysis
                </li>
                <li className="flex items-center gap-2">
                  <CalendarRange size={14} className="text-cyan-400" /> 30 / 60
                  / 90 day roadmap
                </li>
                <li className="flex items-center gap-2">
                  <Wrench size={14} className="text-cyan-400" /> Tool
                  recommendations tied to your issues
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" />{" "}
                  Signature AI citability recommendation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" /> Human
                  expert review and sign-off
                </li>
              </ul>
              <button
                onClick={() => setShowPayment(true)}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-2.5 rounded-lg font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all"
              >
                Order Report — {priceLabel}
              </button>
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
            <button
              onClick={() => setPage(PAGES.HOME)}
              className="hover:text-white transition-colors"
            >
              Audit
            </button>
            <button
              onClick={() => setPage(PAGES.BLOG)}
              className="hover:text-white transition-colors"
            >
              Blog
            </button>
            <button
              onClick={() => setPage(PAGES.PRICING)}
              className="hover:text-white transition-colors"
            >
              Pricing
            </button>
          </div>
        </div>
      </footer>

      {showPayment && (
        <PaymentModal
          onClose={() => setShowPayment(false)}
          url={auditUrl || url}
          localPrice={localPrice}
        />
      )}

      {/* ── DEV ADMIN PANEL — localhost only ── */}
      {IS_LOCAL && <DevAdminPanel />}

      {showPDFModal && results && (
        <PDFEditModal
          auditData={results}
          url={auditUrl}
          onClose={() => setShowPDFModal(false)}
          onGenerate={handleGeneratePDF}
          isGenerating={pdfGenerating}
        />
      )}
    </div>
  );
}
