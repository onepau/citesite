/* ═══════════════════════════════════════════════════════════════════
   CiteSite Audit API Worker
   ───────────────────────────────────────────────────────────────────
   POST /api/audit        — Run audit (free tier results only)
   POST /api/audit/full   — Run full audit (requires payment or admin key)

   Admin bypass:
   Send header "X-Admin-Key" matching the ADMIN_KEY secret to unlock
   full results without payment.
   ═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   Add this JWT validation block to the TOP of your
   workers/audit-api/index.js file, before the AUDIT_SYSTEM_PROMPT.
   ═══════════════════════════════════════════════════════════════════ */

async function validateAccessJWT(token, env) {
  if (!token) return null;
  // Refuse to validate without both Access settings — without them, any valid
  // CF Access JWT from any team or app would otherwise grant admin access.
  if (!env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_AUD) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    const header = JSON.parse(
      atob(headerB64.replace(/-/g, "+").replace(/_/g, "/")),
    );

    const certsUrl = `https://${env.CF_ACCESS_TEAM_DOMAIN}.cloudflareaccess.com/cdn-cgi/access/certs`;
    const certsRes = await fetch(certsUrl);
    if (!certsRes.ok) return null;
    const { keys } = await certsRes.json();

    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) return null;

    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const sigBuf = Uint8Array.from(
      atob(signatureB64.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0),
    );
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      sigBuf,
      data,
    );
    if (!valid) return null;

    const payload = JSON.parse(
      atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")),
    );

    if (!payload.exp || payload.exp < Date.now() / 1000) return null;

    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(env.CF_ACCESS_AUD)) return null;

    return payload;
  } catch (e) {
    console.error("JWT validation error:", e);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   Also update the CORS_HEADERS constant to allow the JWT header:
   ═══════════════════════════════════════════════════════════════════ */

const DEFAULT_ALLOWED_ORIGINS = [
  "https://citesite.net",
  "https://www.citesite.net",
  "http://localhost:5174",
  "http://localhost:5173",
];

function corsHeaders(request, env) {
  const allowed = new Set(
    env.ALLOWED_ORIGINS
      ? env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
      : DEFAULT_ALLOWED_ORIGINS,
  );
  const origin = request.headers.get("Origin");
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, X-Admin-Key, Cf-Access-Jwt-Assertion",
    Vary: "Origin",
  };
  if (origin && allowed.has(origin))
    headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

/* ═══════════════════════════════════════════════════════════════════
   After deploying, set these environment variables:

   npx wrangler secret put CF_ACCESS_TEAM_DOMAIN
   # Enter your team name, e.g.: citesite

   npx wrangler secret put CF_ACCESS_AUD
   # Enter the Application Audience tag from Zero Trust dashboard
   ═══════════════════════════════════════════════════════════════════ */

const SCHEMA_FORGE_PROMPT = (url) =>
  `Generate JSON-LD structured data in valid JSON format for the web page at this URL: ${url}

Use the Article schema with the following fields:
@context, @type, headline, description, articleBody, author (with name, jobTitle, and organization), datePublished, keywords, articleSection, publisher (with name and logo), and mainEntityOfPage (URL).

Additionally, automatically detect and include any of the following if present:
- FAQ Section → Use FAQPage schema with all Question and Answer pairs.
- How-To Guides → Use the HowTo schema with steps in the proper order.
- Products or Services Mentioned → Use Product schema.
- Events or Webinars Promoted → Use Event schema.

The output must be a single <script type="application/ld+json"> block in valid JSON format with proper string quoting. Do not include comments or additional explanations — simply return the schema block, ready for copy and paste.`;

const FAST_AUDIT_PROMPT = `You are CiteSite's audit engine. Score a web page for SEO and Generative Engine Optimisation (GEO) readiness. Be concise.

The user message begins with a VERIFIED FACTS block. These values were obtained by the server via live HTTP requests and HTML parsing. They are ground truth — do NOT re-derive any of them from the HTML source.

STEP 1 — CLASSIFY
Using VERIFIED FACTS (visibleTextLength, likelyCsr) and HTML content:
- contentType: article / product / service / landing / FAQ / listicle / portfolio / homepage
- rendering: "ssr" if visibleTextLength > 1000, "csr" if likelyCsr is true, otherwise "hybrid"

STEP 2 — SCORE SIX DIMENSIONS
For each dimension produce: id, score (0–100), confidence (high/medium/low), ONE observation (1–2 sentences), and only the checks listed. Score checks directly from VERIFIED FACTS — no HTML scanning needed for pre-parsed values.

(A) id="crawlability", name="Crawlability & Retrievability", weight=0.20
    checks: "ssr-csr" (from rendering assessment), "sitemap" (from inspection.sitemap VERIFIED FACT)

(B) id="content-structure", name="Content Structure", weight=0.20
    checks: "semantic-html" (from semanticElements), "heading-hierarchy" (from headingStructure), "lists-tables" (from listCount)

(C) id="structured-data", name="Structured Data & Machine-Readable Signals", weight=0.15
    checks: "jsonld-present" (from schemas / jsonLdPresent VERIFIED FACT)

(D) id="eeat", name="E-E-A-T & Citability", weight=0.15
    checks: [] (score from HTML analysis)

(E) id="content-quality", name="Content Quality & Topical Completeness", weight=0.15
    checks: [] (score from HTML analysis)

(F) id="technical-seo", name="On-page Technical SEO", weight=0.15
    checks: "canonical" (canonical), "https" (https), "mobile" (mobileViewport), "og-tags" (ogTags), "twitter-card" (twitterCard), "title-tag" (titleTag), "meta-desc" (metaDescription), "h1" (h1), "img-alt" (imgAltStats), "url-structure" (urlStructure)
    Score each check directly from its VERIFIED FACT value.

STEP 3 — OVERALL SCORE
Weighted average of six dimension scores, rounded to nearest integer.

STEP 4 — ONE CRITICAL ISSUE
{ "title": "≤8 words", "description": "1–2 sentences" }
No fix, no code snippet.

STEP 5 — ONE IMPROVEMENT
{ "rank": 1, "dimension": "letter A–F", "title": "≤8 words" }
No description, no impact, no effort.

RESPONSE FORMAT
Respond ONLY with valid JSON, no markdown, no preamble:
{
  "contentType": "article",
  "rendering": "ssr",
  "dimensions": [
    {
      "id": "crawlability",
      "dimension": "A",
      "name": "Crawlability & Retrievability",
      "weight": 0.20,
      "score": 72,
      "confidence": "high",
      "observations": ["One key finding here."],
      "checks": [
        { "id": "ssr-csr", "name": "Server-side rendering", "score": 80, "maxPoints": 100, "detail": "Full HTML returned." },
        { "id": "sitemap", "name": "Sitemap present", "score": 100, "maxPoints": 100, "detail": "sitemap.xml found." }
      ]
    }
  ],
  "overallScore": 65,
  "criticalIssues": [{ "title": "No structured data present", "description": "No JSON-LD schema found, reducing AI citability." }],
  "improvements": [{ "rank": 1, "dimension": "C", "title": "Add Article schema markup" }]
}`;

const CORE_AUDIT_PROMPT = `You are CiteSite's audit engine. You analyse web pages for SEO and Generative Engine Optimisation (GEO) readiness.

STEP 1 — FETCH AND INSPECT
The user will provide a URL and the HTML source of a page. Before scoring, determine:
- Does the page return substantive HTML server-side, or is it a JavaScript-rendered shell? Flag any divergence.
- Content type: article, product, service, landing, FAQ, listicle, portfolio, homepage.
- Schema present: list every JSON-LD @type found and summarise each.
- Presence of /robots.txt, /sitemap.xml, /llms.txt, /llms-full.txt: copy the boolean values EXACTLY from the "VERIFIED FACTS" block at the top of the user message — they were obtained by live HTTP requests and are authoritative. Never re-derive these from HTML or make assumptions.
- HTTP status, canonical tag, hreflang, mobile viewport, HTTPS, title, meta description, h1, heading structure, OG tags, Twitter card, JSON-LD schemas, img alt stats, URL structure: these are all in the VERIFIED FACTS block — copy the values verbatim and do not re-derive them from HTML.

If the page returns an empty or near-empty shell to a non-JS crawler, halt the scoring breakdown and return that finding as the headline output, with remediation options (SSR, SSG, prerendering, static schema injection).

STEP 2 — SCORE ACROSS SIX WEIGHTED DIMENSIONS
For each dimension provide: a 0-100 score, a confidence level (high / medium / low), and 2-4 specific observations tied to elements found on the page.

(A) Crawlability and retrievability — 20%
(B) Content structure and passage-level retrievability — 20%
(C) Structured data and machine-readable signals — 15%
(D) E-E-A-T and citability signals — 15%
(E) Content quality and topical completeness — 15%
(F) On-page technical SEO — 15%

STEP 3 — OVERALL SCORE
Weighted average of the six dimensions, rounded to the nearest integer.

STEP 4 — FINDINGS AND RECOMMENDATIONS
- Three critical issues, each with a concrete fix and code snippet where applicable.
- Five specific improvements ranked by impact-to-effort ratio, each tied to an observation from Step 2.
- One signature recommendation: the single change that would most improve AI citability for this page.

RESPONSE FORMAT
Respond ONLY with valid JSON (no markdown, no preamble):
{
  "inspection": { "contentType": "article", "rendering": "ssr", "https": true, "canonical": "...", "mobileViewport": true, "hreflang": [], "schemas": [...], "robotsTxt": true, "sitemap": true, "llmsTxt": false, "criticalBlocker": null },
  "dimensions": [
    { "id": "crawlability", "dimension": "A", "name": "Crawlability & Retrievability", "weight": 0.20, "score": 72, "confidence": "high", "observations": ["...", "..."], "checks": [{ "id": "ssr-csr", "name": "Server-side rendering", "score": 18, "maxPoints": 20, "detail": "..." }] }
  ],
  "overallScore": 65,
  "criticalIssues": [{ "title": "...", "description": "...", "fix": "...", "codeSnippet": "..." }],
  "improvements": [{ "rank": 1, "dimension": "A", "title": "...", "description": "...", "impact": "high", "effort": "low", "estimatedTrafficLift": "+5-10%" }],
  "signatureRecommendation": { "title": "...", "description": "...", "codeSnippet": "..." }
}`;

const DETAILED_AUDIT_PROMPT = `You are CiteSite's principal-level audit consultant — 15 years of experience producing consulting-grade GEO/SEO reports. Prioritise depth over brevity. Every recommendation must include effort (Low/Medium/High), impact (Low/Medium/High), and estimated traffic lift where evidence permits. Use British English throughout.

STEP 1 — FETCH AND INSPECT
The user will provide a URL and the HTML source of a page. Before scoring, determine:
- Does the page return substantive HTML server-side, or is it a JavaScript-rendered shell? Flag any divergence.
- Content type: article, product, service, landing, FAQ, listicle, portfolio, homepage.
- Schema present: list every JSON-LD @type found and summarise each.
- Presence of /robots.txt, /sitemap.xml, /llms.txt, /llms-full.txt: copy the boolean values EXACTLY from the "VERIFIED FACTS" block at the top of the user message — they were obtained by live HTTP requests and are authoritative. Never re-derive these from HTML or make assumptions.
- HTTP status, canonical tag, hreflang, mobile viewport, HTTPS, title, meta description, h1, heading structure, OG tags, Twitter card, JSON-LD schemas, img alt stats, URL structure: these are all in the VERIFIED FACTS block — copy the values verbatim and do not re-derive them from HTML.

STEP 2 — SCORE ACROSS SIX WEIGHTED DIMENSIONS
For each dimension provide: a 0-100 score, a confidence level (high / medium / low), and 2-4 specific observations.

(A) Crawlability and retrievability — 20%
(B) Content structure and passage-level retrievability — 20%
(C) Structured data and machine-readable signals — 15%
(D) E-E-A-T and citability signals — 15%
(E) Content quality and topical completeness — 15%
(F) On-page technical SEO — 15%

STEP 3 — OVERALL SCORE
Weighted average of the six dimensions, rounded to the nearest integer.

STEP 4 — FINDINGS AND RECOMMENDATIONS
- Three critical issues with fixes and code snippets.
- Five improvements ranked by impact-to-effort ratio.
- One signature recommendation.

STEP 5 — CONSULTING-GRADE DEPTH
For each dimension, produce: narrative (2-3 paragraphs), quickWins (3-5 items), prioritizedActions (4-8 items with effort/impact/lift).
Also produce: executiveSummary, competitorInsights, roadmap (30/60/90 day), toolRecommendations (6-10 tools).

RESPONSE FORMAT
Respond ONLY with valid JSON (no markdown, no preamble):
{
  "inspection": { ... },
  "dimensions": [
    {
      "id": "crawlability", "dimension": "A", "name": "Crawlability & Retrievability", "weight": 0.20,
      "score": 72, "confidence": "high",
      "observations": ["Robots.txt blocks /api/* but not crawl-critical paths.", "No sitemap.xml found via auto-discovery."],
      "checks": [{ "id": "ssr-csr", "name": "Server-side rendering", "score": 18, "maxPoints": 20, "detail": "Page returns full HTML server-side." }],
      "narrative": "Two or three paragraphs of consulting-grade analysis...",
      "quickWins": ["Submit an XML sitemap via Google Search Console.", "Add /llms.txt with a plain-text site summary.", "Set explicit crawl-delay in robots.txt for bots that respect it."],
      "prioritizedActions": [{ "action": "Generate and submit XML sitemap", "effort": "Low", "impact": "High", "estimatedTrafficLift": "+5-10%" }]
    }
  ],
  "overallScore": 65,
  "executiveSummary": "Two or three paragraph executive summary...",
  "criticalIssues": [...],
  "improvements": [...],
  "signatureRecommendation": { ... },
  "competitorInsights": { "benchmark": "...", "gaps": ["Gap description one.", "Gap description two."] },
  "roadmap": { "thirtyDay": ["Action string one.", "Action string two."], "sixtyDay": ["Action string one."], "ninetyDay": ["Action string one."] },
  "toolRecommendations": [
    { "name": "Screaming Frog SEO Spider", "url": "https://www.screamingfrog.co.uk/", "description": "Desktop crawler for technical SEO and schema auditing.", "freeTier": true },
    { "name": "Google Search Console", "url": "https://search.google.com/search-console/", "description": "First-party index coverage and performance data.", "freeTier": true }
  ]
}`;

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function upsertNewsletterSubscriber(email, env) {
  await env.DB.prepare(
    `INSERT INTO newsletter_subscribers (email, subscribed_at)
     VALUES (?, datetime('now'))
     ON CONFLICT(email) DO UPDATE SET
       subscribed_at = excluded.subscribed_at,
       unsubscribed_at = NULL`,
  )
    .bind(email.trim().toLowerCase())
    .run();
}

function stripNonContent(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchTargetPage(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "CiteSiteBot/1.0 (+https://citesite.net)" },
      redirect: "follow",
    });
    const rawHtml = await res.text();
    return { rawHtml, status: res.status, finalUrl: res.url };
  } catch (err) {
    return { rawHtml: null, status: 0, finalUrl: url, error: err.message };
  }
}

const BOT_UA = { "User-Agent": "CiteSiteBot/1.0 (+https://citesite.net)" };

const isHtmlResponse = (res) =>
  (res.headers.get("content-type") || "").includes("text/html");

async function fetchRobotsTxt(url) {
  try {
    const origin = new URL(url).origin;
    const res = await fetch(`${origin}/robots.txt`, { headers: BOT_UA });
    if (res.ok && !isHtmlResponse(res)) return await res.text();
    return null;
  } catch {
    return null;
  }
}

async function fetchLlmsTxt(url) {
  try {
    const origin = new URL(url).origin;
    const notHtml = (r) => (r.ok && !isHtmlResponse(r) ? r.text() : null);
    const [llms, llmsFull] = await Promise.all([
      fetch(`${origin}/llms.txt`, { headers: BOT_UA })
        .then(notHtml)
        .catch(() => null),
      fetch(`${origin}/llms-full.txt`, { headers: BOT_UA })
        .then(notHtml)
        .catch(() => null),
    ]);
    return { llmsTxt: llms, llmsFullTxt: llmsFull };
  } catch {
    return { llmsTxt: null, llmsFullTxt: null };
  }
}

async function fetchSitemap(url) {
  try {
    const origin = new URL(url).origin;
    // Try /sitemap.xml first, then /sitemap_index.xml
    for (const path of ["/sitemap.xml", "/sitemap_index.xml"]) {
      const res = await fetch(`${origin}${path}`, { headers: BOT_UA });
      if (res.ok && !isHtmlResponse(res)) return await res.text();
    }
    return null;
  } catch {
    return null;
  }
}

function validateAuditUrl(raw) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: "Invalid URL" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { ok: false, error: "URL must use http or https" };
  }

  const host = parsed.hostname.toLowerCase();

  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return { ok: false, error: "URL not allowed" };
  }

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 240
    ) {
      return { ok: false, error: "URL not allowed" };
    }
  }

  if (host.startsWith("[")) {
    const ipv6 = host.slice(1, -1).toLowerCase();
    if (
      ipv6 === "::1" ||
      ipv6.startsWith("fe80") ||
      ipv6.startsWith("fc") ||
      ipv6.startsWith("fd")
    ) {
      return { ok: false, error: "URL not allowed" };
    }
  }

  if (!host.includes(".") && !ipv4) {
    return { ok: false, error: "URL must include a valid domain name" };
  }

  return { ok: true };
}

function extractPageMetadata(html, url) {
  const meta = {};

  meta.https = url.startsWith("https://");

  try {
    const u = new URL(url);
    meta.urlStructure = {
      protocol: u.protocol,
      pathDepth:
        u.pathname === "/" ? 0 : u.pathname.split("/").filter(Boolean).length,
      hasHyphens: /[a-z]+-[a-z]+/.test(u.pathname),
      pathLength: u.pathname.length,
      hasQueryString: u.search.length > 0,
    };
  } catch {
    meta.urlStructure = null;
  }

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  meta.titleTag = titleMatch ? titleMatch[1].trim() : null;

  const descMatch =
    html.match(
      /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i,
    ) ||
    html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);
  meta.metaDescription = descMatch ? descMatch[1].trim() : null;

  const canonicalMatch =
    html.match(
      /<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']*)["']/i,
    ) ||
    html.match(
      /<link\b[^>]*\bhref=["']([^"']*)["'][^>]*\brel=["']canonical["']/i,
    );
  meta.canonical = canonicalMatch ? canonicalMatch[1].trim() : null;

  meta.mobileViewport =
    /<meta\b[^>]*\bname=["']viewport["'][^>]*>/i.test(html) ||
    /<meta\b[^>]*content=["'][^"']*width=device-width[^"']*["'][^>]*>/i.test(
      html,
    );

  const hreflangRe =
    /<link\b[^>]*\bhreflang=["']([^"']*)["'][^>]*\bhref=["']([^"']*)["']/gi;
  meta.hreflang = [];
  let hlm;
  while ((hlm = hreflangRe.exec(html)) !== null) {
    meta.hreflang.push({ lang: hlm[1], href: hlm[2] });
  }

  const jsonldRe =
    /<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  meta.schemas = [];
  let jm;
  while ((jm = jsonldRe.exec(html)) !== null) {
    try {
      const obj = JSON.parse(jm[1].trim());
      meta.schemas.push({ type: obj["@type"] || null, raw: obj });
    } catch {
      meta.schemas.push({ type: null, parseError: true });
    }
  }

  const ogRe =
    /<meta\b[^>]*\bproperty=["'](og:[^"']*)["'][^>]*\bcontent=["']([^"']*)["']/gi;
  meta.ogTags = {};
  let ogm;
  while ((ogm = ogRe.exec(html)) !== null) {
    meta.ogTags[ogm[1]] = ogm[2];
  }
  const ogReRev =
    /<meta\b[^>]*\bcontent=["']([^"']*)["'][^>]*\bproperty=["'](og:[^"']*)["']/gi;
  while ((ogm = ogReRev.exec(html)) !== null) {
    if (!meta.ogTags[ogm[2]]) meta.ogTags[ogm[2]] = ogm[1];
  }

  const twRe =
    /<meta\b[^>]*\bname=["'](twitter:[^"']*)["'][^>]*\bcontent=["']([^"']*)["']/gi;
  meta.twitterCard = {};
  let twm;
  while ((twm = twRe.exec(html)) !== null) {
    meta.twitterCard[twm[1]] = twm[2];
  }
  const twReRev =
    /<meta\b[^>]*\bcontent=["']([^"']*)["'][^>]*\bname=["'](twitter:[^"']*)["']/gi;
  while ((twm = twReRev.exec(html)) !== null) {
    if (!meta.twitterCard[twm[2]]) meta.twitterCard[twm[2]] = twm[1];
  }

  const h1Match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  meta.h1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, "").trim() : null;

  meta.headingStructure = {
    h1: (html.match(/<h1\b/gi) || []).length,
    h2: (html.match(/<h2\b/gi) || []).length,
    h3: (html.match(/<h3\b/gi) || []).length,
    h4: (html.match(/<h4\b/gi) || []).length,
  };

  const allImgs = html.match(/<img\b[^>]*/gi) || [];
  const imgsWithAlt = allImgs.filter((tag) =>
    /\balt=["'][^"']+["']/i.test(tag),
  );
  meta.imgAltStats = {
    total: allImgs.length,
    withAlt: imgsWithAlt.length,
    missing: allImgs.length - imgsWithAlt.length,
  };

  meta.listCount = {
    ul: (html.match(/<ul\b/gi) || []).length,
    ol: (html.match(/<ol\b/gi) || []).length,
    table: (html.match(/<table\b/gi) || []).length,
  };

  meta.semanticElements = {
    article: (html.match(/<article\b/gi) || []).length,
    section: (html.match(/<section\b/gi) || []).length,
    nav: (html.match(/<nav\b/gi) || []).length,
    main: (html.match(/<main\b/gi) || []).length,
    aside: (html.match(/<aside\b/gi) || []).length,
    header: (html.match(/<header\b/gi) || []).length,
    footer: (html.match(/<footer\b/gi) || []).length,
  };

  const visibleText = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  meta.visibleTextLength = visibleText.length;
  meta.likelyCsr = visibleText.length < 500;

  return meta;
}

function buildVerifiedFacts(
  meta,
  robotsTxtFound,
  sitemapFound,
  llmsTxtFound,
  llmsFullTxtFound,
) {
  return [
    `VERIFIED FACTS — pre-fetched and pre-parsed by the server. Accept all values below as`,
    `ground truth. Do NOT re-derive any of them from the HTML source.`,
    ``,
    `## HTTP`,
    `  inspection.robotsTxt   = ${robotsTxtFound}   [${robotsTxtFound ? "HTTP 200" : "HTTP 404 / not found"}]`,
    `  inspection.sitemap     = ${sitemapFound}   [${sitemapFound ? "HTTP 200" : "HTTP 404 / not found"}]`,
    `  inspection.llmsTxt     = ${llmsTxtFound}   [${llmsTxtFound ? "HTTP 200" : "HTTP 404 / not found"}]`,
    `  inspection.llmsFullTxt = ${llmsFullTxtFound}   [${llmsFullTxtFound ? "HTTP 200" : "HTTP 404 / not found"}]`,
    ``,
    `## On-page metadata`,
    `  https            = ${meta.https}`,
    `  titleTag         = ${JSON.stringify(meta.titleTag)}`,
    `  metaDescription  = ${JSON.stringify(meta.metaDescription)}`,
    `  canonical        = ${JSON.stringify(meta.canonical)}`,
    `  mobileViewport   = ${meta.mobileViewport}`,
    `  h1               = ${JSON.stringify(meta.h1)}`,
    `  headingStructure = ${JSON.stringify(meta.headingStructure)}`,
    `  imgAltStats      = ${JSON.stringify(meta.imgAltStats)}`,
    `  listCount        = ${JSON.stringify(meta.listCount)}`,
    `  semanticElements = ${JSON.stringify(meta.semanticElements)}`,
    `  hreflang         = ${JSON.stringify(meta.hreflang)}`,
    ``,
    `## Structured data`,
    `  schemas (JSON-LD @types): ${
      meta.schemas
        .filter((s) => s.type)
        .map((s) => s.type)
        .join(", ") || "none"
    }`,
    `  jsonLdPresent    = ${meta.schemas.some((s) => s.type !== null)}`,
    ``,
    `## Social / OG`,
    `  ogTags           = ${JSON.stringify(meta.ogTags)}`,
    `  twitterCard      = ${JSON.stringify(meta.twitterCard)}`,
    ``,
    `## URL`,
    `  urlStructure     = ${JSON.stringify(meta.urlStructure)}`,
    ``,
    `## SSR/CSR heuristic`,
    `  visibleTextLength = ${meta.visibleTextLength} chars (measured after tag removal)`,
    `  likelyCsr         = ${meta.likelyCsr}`,
  ].join("\n");
}

async function runAudit(url, env, detailed = false) {
  const htmlLimit = detailed ? 30000 : 15000;
  const [page, robotsTxt, rawSitemap, llmsData] = await Promise.all([
    fetchTargetPage(url),
    fetchRobotsTxt(url),
    fetchSitemap(url),
    fetchLlmsTxt(url),
  ]);

  if (!page.rawHtml) {
    return { error: `Could not fetch page: ${page.error}` };
  }

  // If /sitemap.xml and /sitemap_index.xml both failed, try Sitemap: directives from robots.txt
  let sitemapXml = rawSitemap;
  if (!sitemapXml && robotsTxt) {
    const declared = [...robotsTxt.matchAll(/^Sitemap:\s*(.+)$/gim)].map((m) =>
      m[1].trim(),
    );
    for (const sitemapUrl of declared.slice(0, 3)) {
      if (!validateAuditUrl(sitemapUrl).ok) continue;
      try {
        const r = await fetch(sitemapUrl, { headers: BOT_UA });
        if (r.ok) {
          sitemapXml = await r.text();
          break;
        }
      } catch {
        // skip
      }
    }
  }

  const metadata = extractPageMetadata(page.rawHtml, page.finalUrl);
  const cleanedHtml = stripNonContent(page.rawHtml).slice(0, htmlLimit);

  const robotsTxtFound = robotsTxt !== null;
  const sitemapFound = sitemapXml !== null;
  const llmsTxtFound = llmsData.llmsTxt !== null;
  const llmsFullTxtFound = llmsData.llmsFullTxt !== null;

  const verifiedFacts = buildVerifiedFacts(
    metadata,
    robotsTxtFound,
    sitemapFound,
    llmsTxtFound,
    llmsFullTxtFound,
  );

  const userMessage = [
    verifiedFacts,
    ``,
    `Audit this page:`,
    ``,
    `URL: ${url}`,
    `Final URL: ${page.finalUrl}`,
    `HTTP Status: ${page.status}`,
    ``,
    `--- robots.txt ---`,
    robotsTxt ? robotsTxt.slice(0, 2000) : "(not found or inaccessible)",
    ``,
    `--- sitemap.xml ---`,
    sitemapXml ? sitemapXml.slice(0, 2000) : "(not found or inaccessible)",
    ``,
    `--- llms.txt ---`,
    llmsData.llmsTxt ? llmsData.llmsTxt.slice(0, 3000) : "(not found)",
    ``,
    `--- llms-full.txt ---`,
    llmsData.llmsFullTxt ? llmsData.llmsFullTxt.slice(0, 3000) : "(not found)",
    ``,
    `--- HTML SOURCE (scripts/styles stripped, truncated to ${htmlLimit / 1000}k chars) ---`,
    cleanedHtml,
  ].join("\n");

  const systemPrompt = detailed ? DETAILED_AUDIT_PROMPT : FAST_AUDIT_PROMPT;
  const maxTokens = detailed ? 20000 : 3000;
  const model = detailed
    ? env.ANTHROPIC_MODEL || "claude-opus-4-7"
    : env.FREE_AUDIT_MODEL || "claude-haiku-4-5-20251001";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      stream: true,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      return {
        error:
          "The audit engine hit a token rate limit. This can happen when the target page has a very large HTML document, an unusually long robots.txt, or dense llms.txt content — all of which increase the number of tokens sent to the AI. Try again in a moment, or upgrade to a paid audit for priority processing.",
        errorCode: "rate_limit",
      };
    }
    const err = await response.text();
    return { error: `Anthropic API error: ${response.status} — ${err}` };
  }

  // Stream the response — keeps the subrequest alive past Cloudflare's 30s
  // fetch timeout by receiving tokens continuously as they are generated.
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = "";
  let fullText = "";
  let stopReason = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    sseBuffer += decoder.decode(value, { stream: true });

    const lines = sseBuffer.split("\n");
    sseBuffer = lines.pop(); // hold back any incomplete line

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload);
        if (
          evt.type === "content_block_delta" &&
          evt.delta?.type === "text_delta"
        ) {
          fullText += evt.delta.text;
        }
        if (evt.type === "message_delta" && evt.delta?.stop_reason) {
          stopReason = evt.delta.stop_reason;
        }
      } catch {
        // malformed SSE line — skip
      }
    }
  }

  if (stopReason === "max_tokens") {
    return {
      error:
        "The page's content exceeded the AI's output limit and the audit response was cut short. Try auditing a more specific sub-page (e.g. a blog post or product page) rather than the homepage.",
      errorCode: "response_truncated",
    };
  }

  try {
    const clean = fullText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    if (!detailed) {
      const workerInspection = {
        https: metadata.https,
        canonical: metadata.canonical,
        mobileViewport: metadata.mobileViewport,
        hreflang: metadata.hreflang,
        schemas: metadata.schemas,
        robotsTxt: robotsTxtFound,
        sitemap: sitemapFound,
        llmsTxt: llmsTxtFound,
        llmsFullTxt: llmsFullTxtFound,
        criticalBlocker: metadata.likelyCsr ? "likely-csr" : null,
      };
      parsed.inspection = {
        ...workerInspection,
        contentType: parsed.contentType || null,
        rendering: parsed.rendering || null,
      };
      delete parsed.contentType;
      delete parsed.rendering;
    }
    return parsed;
  } catch {
    return { error: "Failed to parse audit response", raw: fullText };
  }
}

/* ═══════════════════════════════════════════════════════════════════
   Free-tier filter — softened ~30/70 split
   ───────────────────────────────────────────────────────────────────
   Free users see real value across all six dimensions (score, one
   observation, free-check breakdown), the technical inspection
   block, the headline of one critical issue and one improvement.
   Everything that constitutes the consulting upgrade — narratives,
   quickWins, prioritizedActions, executiveSummary, competitor gaps,
   roadmap, tool recommendations, full critical-fix code, signature
   recommendation — is stripped server-side.
   ═══════════════════════════════════════════════════════════════════ */

const FREE_CHECK_IDS = new Set([
  "ssr-csr",
  "sitemap",
  "canonical",
  "https",
  "mobile",
  "semantic-html",
  "heading-hierarchy",
  "lists-tables",
  "jsonld-present",
  "og-tags",
  "twitter-card",
  "title-tag",
  "meta-desc",
  "h1",
  "img-alt",
  "url-structure",
]);

const LOCKED_TEXT = "Unlock with full report";

function filterFreeTier(results) {
  if (results.error) return results;

  const filteredDimensions = (results.dimensions || []).map((dim) => ({
    ...dim,
    // Score, name, weight, dimension letter, confidence stay visible.
    // Show only the FIRST observation as a taste; rest gated.
    observations:
      Array.isArray(dim.observations) && dim.observations.length > 0
        ? [dim.observations[0]]
        : [],
    // All checks from FAST_AUDIT_PROMPT are free-tier checks — pass through.
    checks: (dim.checks || []).map((c) => c),
    // STEP 5 fields stripped entirely for free tier.
    narrative: undefined,
    quickWins: undefined,
    prioritizedActions: undefined,
  }));

  // First critical issue: title + description visible; fix + code locked.
  const firstIssue = results.criticalIssues?.[0];
  const filteredCriticalIssues = firstIssue
    ? [
        {
          title: firstIssue.title,
          description: firstIssue.description,
          fix: LOCKED_TEXT,
          codeSnippet: null,
          locked: true,
        },
      ]
    : [];

  // First improvement: title + dimension visible; description/impact/effort locked.
  const firstImprov = results.improvements?.[0];
  const filteredImprovements = firstImprov
    ? [
        {
          rank: firstImprov.rank,
          dimension: firstImprov.dimension,
          title: firstImprov.title,
          description: LOCKED_TEXT,
          impact: null,
          effort: null,
          estimatedTrafficLift: null,
          locked: true,
        },
      ]
    : [];

  return {
    inspection: results.inspection,
    dimensions: filteredDimensions,
    overallScore: results.overallScore,
    executiveSummary: null,
    criticalIssues: filteredCriticalIssues,
    improvements: filteredImprovements,
    signatureRecommendation: {
      title: LOCKED_TEXT,
      description:
        "Order your bespoke audit to reveal the signature recommendation.",
      locked: true,
    },
    competitorInsights: null,
    roadmap: null,
    toolRecommendations: null,
    tier: "free",
  };
}

function extractCoreFromDetailed(results) {
  if (results.error) return results;
  return {
    inspection: results.inspection,
    dimensions: (results.dimensions || []).map(
      ({ narrative, quickWins, prioritizedActions, ...core }) => core,
    ),
    overallScore: results.overallScore,
    criticalIssues: results.criticalIssues,
    improvements: results.improvements,
    signatureRecommendation: results.signatureRecommendation,
  };
}

export default {
  async fetch(request, env, ctx) {
    const CORS_HEADERS = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const reqUrl = new URL(request.url);

    // Admin auth — needed for both GET and POST endpoints.
    const submittedKey = request.headers.get("X-Admin-Key");
    const adminKeyValid = !!env.ADMIN_KEY && submittedKey === env.ADMIN_KEY;
    const accessJWT = request.headers.get("Cf-Access-Jwt-Assertion");
    const jwtPayload = accessJWT
      ? await validateAccessJWT(accessJWT, env)
      : null;
    const isAdminRequest = adminKeyValid || jwtPayload !== null;

    // ── GET endpoints ──────────────────────────────────────────────

    if (request.method === "GET") {
      // GET /api/audit/debug-fetch?url=X — admin only: diagnose what the worker can reach
      if (reqUrl.pathname === "/api/audit/debug-fetch") {
        if (!isAdminRequest) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          });
        }
        const targetUrl = reqUrl.searchParams.get("url");
        if (!targetUrl) {
          return new Response(JSON.stringify({ error: "Missing url param" }), {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          });
        }
        const debugUrlCheck = validateAuditUrl(targetUrl);
        if (!debugUrlCheck.ok) {
          return new Response(JSON.stringify({ error: debugUrlCheck.error }), {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          });
        }
        const origin = new URL(targetUrl).origin;
        const probe = async (u) => {
          try {
            const r = await fetch(u, {
              headers: {
                "User-Agent": "CiteSiteBot/1.0 (+https://citesite.net)",
              },
              redirect: "follow",
            });
            const body = await r.text();
            return {
              status: r.status,
              ok: r.ok,
              bodySnippet: body.slice(0, 300),
              finalUrl: r.url,
            };
          } catch (e) {
            return { status: 0, ok: false, error: e.message };
          }
        };
        const [robotsResult, sitemapResult, sitemapIdxResult] =
          await Promise.all([
            probe(`${origin}/robots.txt`),
            probe(`${origin}/sitemap.xml`),
            probe(`${origin}/sitemap_index.xml`),
          ]);
        return new Response(
          JSON.stringify(
            {
              origin,
              robotsTxt: robotsResult,
              sitemapXml: sitemapResult,
              sitemapIndex: sitemapIdxResult,
            },
            null,
            2,
          ),
          { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
        );
      }

      // GET /api/audit/pending — admin only: list audits awaiting review
      if (reqUrl.pathname === "/api/audit/pending") {
        if (!isAdminRequest) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          });
        }
        const rows = await env.DB.prepare(
          `SELECT a.id, a.order_id, a.url, a.review_status, a.created_at,
                  a.results_json, o.email
           FROM audits a LEFT JOIN orders o ON o.id = a.order_id
           WHERE a.review_status = 'pending_review'
           ORDER BY a.created_at DESC`,
        ).all();
        const audits = (rows.results || []).map(({ results_json, ...row }) => ({
          ...row,
          results: results_json ? JSON.parse(results_json) : null,
        }));
        return new Response(JSON.stringify({ audits }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // GET /api/audit/free-log — admin only: list recent free-tier audits
      if (reqUrl.pathname === "/api/audit/free-log") {
        if (!isAdminRequest) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          });
        }
        const rows = await env.DB.prepare(
          `SELECT id, url, created_at
           FROM audits
           WHERE order_id IS NULL
           ORDER BY created_at DESC
           LIMIT 10`,
        ).all();
        return new Response(JSON.stringify({ audits: rows.results || [] }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // GET /api/audit/results?orderId=X — fetch existing audit for returning user
      if (reqUrl.pathname === "/api/audit/results") {
        const orderId = reqUrl.searchParams.get("orderId");
        if (!orderId) {
          return new Response(JSON.stringify({ error: "Missing orderId" }), {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          });
        }
        const audit = await env.DB.prepare(
          "SELECT * FROM audits WHERE order_id = ? ORDER BY created_at DESC LIMIT 1",
        )
          .bind(orderId)
          .first();
        if (!audit) {
          return new Response(JSON.stringify({ error: "Audit not found" }), {
            status: 404,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          });
        }
        if (audit.review_status !== "approved") {
          return new Response(
            JSON.stringify({
              reviewStatus: "pending_review",
              url: audit.url,
              auditId: audit.id,
            }),
            {
              headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
            },
          );
        }
        const results = JSON.parse(audit.results_json);
        return new Response(
          JSON.stringify({
            auditId: audit.id,
            ...results,
            reviewStatus: "approved",
            tier: "paid",
          }),
          { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ── POST only from here ────────────────────────────────────────

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "POST required" }), {
        status: 405,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // POST /api/audit/approve — admin saves edited results and notifies user
    if (reqUrl.pathname === "/api/audit/approve") {
      if (!isAdminRequest) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      const { auditId, editedResults } = body || {};
      if (!auditId || !editedResults) {
        return new Response(
          JSON.stringify({ error: "Missing auditId or editedResults" }),
          {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          },
        );
      }
      const audit = await env.DB.prepare("SELECT * FROM audits WHERE id = ?")
        .bind(auditId)
        .first();
      if (!audit) {
        return new Response(JSON.stringify({ error: "Audit not found" }), {
          status: 404,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      await env.DB.prepare(
        "UPDATE audits SET results_json = ?, review_status = 'approved' WHERE id = ?",
      )
        .bind(JSON.stringify(editedResults), auditId)
        .run();

      // Email user if the order has an associated email
      if (audit.order_id && env.RESEND_API_KEY) {
        const order = await env.DB.prepare(
          "SELECT email FROM orders WHERE id = ?",
        )
          .bind(audit.order_id)
          .first();
        if (order?.email) {
          const reportUrl = `${env.CITESITE_URL || "https://citesite.net"}/?orderId=${audit.order_id}`;
          const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
  <h2 style="margin-bottom:8px">Your Detailed GEO Audit Report is Ready</h2>
  <p>Your CiteSite audit for <strong>${audit.url}</strong> has been reviewed and is ready to download.</p>
  <p style="text-align:center;margin:24px 0">
    <a href="${reportUrl}" style="background:#1a1a2e;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold">View Report &amp; Download PDF</a>
  </p>
  <p style="color:#555;font-size:14px">Your report includes: executive summary, per-dimension analysis with narratives, quick wins, prioritised actions, competitor insights, 30/60/90-day roadmap, and tool recommendations.</p>
</div>`.trim();
          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${env.RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "CiteSite <noreply@citesite.net>",
                to: order.email,
                subject: "Your CiteSite Detailed Audit Report is Ready",
                html,
              }),
            });
          } catch (err) {
            console.error("Approval email failed:", err);
          }
        }
      }

      return new Response(JSON.stringify({ approved: true }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // POST /api/audit/admin — admin-only full audit, ephemeral (no DB write, no email)
    if (reqUrl.pathname === "/api/audit/admin") {
      if (!isAdminRequest) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      if (!body.url) {
        return new Response(JSON.stringify({ error: "Missing url field" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      if (!env.ANTHROPIC_API_KEY) {
        return new Response(
          JSON.stringify({
            error: "Server not configured: ANTHROPIC_API_KEY missing",
          }),
          {
            status: 500,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          },
        );
      }
      const adminResults = await runAudit(body.url, env, true);
      if (adminResults.error) {
        return new Response(JSON.stringify(adminResults), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          ...adminResults,
          tier: "admin",
          reviewStatus: "approved",
        }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // POST /api/audit/schema-forge — proxy to Anthropic to generate JSON-LD schema for a URL
    if (reqUrl.pathname === "/api/audit/schema-forge") {
      const { url: targetUrl } = body || {};
      if (!targetUrl || typeof targetUrl !== "string" || !targetUrl.trim()) {
        return new Response(JSON.stringify({ error: "URL is required" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      try { new URL(targetUrl); } catch {
        return new Response(JSON.stringify({ error: "Invalid URL" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: env.FREE_AUDIT_MODEL || "claude-haiku-4-5-20251001",
          max_tokens: 2000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: SCHEMA_FORGE_PROMPT(targetUrl.trim()) }],
        }),
      });
      const anthropicData = await anthropicRes.json().catch(() => ({}));
      if (!anthropicRes.ok) {
        console.error("Anthropic schema-forge error", anthropicData);
        return new Response(JSON.stringify({ error: "Schema generation failed" }), {
          status: 502,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      const schema = (anthropicData.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return new Response(JSON.stringify({ schema }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // POST /api/newsletter — newsletter-only signup (homepage / results forms)
    if (reqUrl.pathname === "/api/newsletter") {
      const { email } = body || {};
      if (!email || typeof email !== "string") {
        return new Response(JSON.stringify({ error: "Email is required" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      const t = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) || t.length > 320) {
        return new Response(
          JSON.stringify({ error: "Invalid email address" }),
          {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          },
        );
      }
      try {
        await upsertNewsletterSubscriber(t, env);
      } catch (e) {
        console.error("newsletter upsert failed:", e);
        return new Response(JSON.stringify({ error: "Database error" }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // POST /api/contact — contact form submission
    if (reqUrl.pathname === "/api/contact") {
      const { email, inquiry_type, message, subscribe } = body || {};
      const VALID_TYPES = new Set(["general", "issue", "services"]);
      const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!email || !EMAIL_RE.test(email.trim()) || email.trim().length > 320) {
        return new Response(
          JSON.stringify({ error: "Invalid email address" }),
          {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          },
        );
      }
      if (!inquiry_type || !VALID_TYPES.has(inquiry_type)) {
        return new Response(JSON.stringify({ error: "Invalid inquiry type" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      if (!message || !message.trim()) {
        return new Response(JSON.stringify({ error: "Message is required" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      if (message.trim().length > 2000) {
        return new Response(
          JSON.stringify({
            error: "Message must be 2000 characters or fewer",
          }),
          {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          },
        );
      }

      const trimEmail = email.trim().toLowerCase();
      const trimMsg = message.trim();
      const wantsNews = subscribe === true;
      const contactId = crypto.randomUUID();

      try {
        await env.DB.prepare(
          `INSERT INTO contacts (id, email, inquiry_type, message, subscribed, created_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        )
          .bind(contactId, trimEmail, inquiry_type, trimMsg, wantsNews ? 1 : 0)
          .run();
      } catch (e) {
        console.error("contacts insert failed:", e);
        return new Response(JSON.stringify({ error: "Database error" }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      if (wantsNews) {
        try {
          await upsertNewsletterSubscriber(trimEmail, env);
        } catch (e) {
          console.error("newsletter upsert failed for contact", contactId, e);
        }
      }

      const LABELS = {
        general: "General inquiry",
        issue: "Issue",
        services: "Request for services",
      };
      ctx.waitUntil(
        (async () => {
          if (!env.ADMIN_EMAIL || !env.RESEND_API_KEY) return;
          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${env.RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "CiteSite <noreply@citesite.net>",
                to: env.ADMIN_EMAIL,
                subject: `New contact: ${LABELS[inquiry_type]} from ${trimEmail}`,
                html: `<div style="font-family:sans-serif;max-width:600px">
                  <h2>New Contact Form Submission</h2>
                  <p><b>From:</b> ${escHtml(trimEmail)}</p>
                  <p><b>Type:</b> ${escHtml(LABELS[inquiry_type])}</p>
                  <p><b>Newsletter:</b> ${wantsNews ? "Yes" : "No"}</p>
                  <p><b>Message:</b></p>
                  <pre style="background:#f4f4f4;padding:12px;border-radius:4px;white-space:pre-wrap">${escHtml(trimMsg)}</pre>
                </div>`,
              }),
            });
          } catch (err) {
            console.error("Admin contact email failed:", err);
          }
        })(),
      );

      return new Response(JSON.stringify({ ok: true, id: contactId }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // POST /api/audit or /api/audit/full — run or return existing audit

    const isFullEndpoint = reqUrl.pathname === "/api/audit/full";

    if (!body.url) {
      return new Response(JSON.stringify({ error: "Missing url field" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const urlCheck = validateAuditUrl(body.url);
    if (!urlCheck.ok) {
      return new Response(JSON.stringify({ error: urlCheck.error }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Normalise URL for consistent deduplication lookups
    let normalisedUrl = body.url;
    try {
      normalisedUrl = new URL(body.url).toString();
    } catch {
      // use as-is; runAudit will surface the fetch error
    }

    // Full endpoint requires payment OR admin key
    let order = null;
    if (isFullEndpoint && !isAdminRequest) {
      if (!body.orderId) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      order = await env.DB.prepare(
        "SELECT * FROM orders WHERE id = ? AND status = 'paid'",
      )
        .bind(body.orderId)
        .first();
      if (!order) {
        return new Response(
          JSON.stringify({ error: "Invalid or unpaid order" }),
          {
            status: 402,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          },
        );
      }
    }

    if (!env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "Server not configured: ANTHROPIC_API_KEY missing",
        }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    const isPaidRequest = isFullEndpoint || isAdminRequest;

    // Block repeat free audits — direct user to paid tier
    if (!isPaidRequest) {
      const prior = await env.DB.prepare(
        "SELECT results_json FROM audits WHERE url = ? AND order_id IS NULL ORDER BY created_at DESC LIMIT 1",
      )
        .bind(normalisedUrl)
        .first();
      if (prior) {
        const priorResults = JSON.parse(prior.results_json);
        return new Response(
          JSON.stringify({
            alreadyAudited: true,
            score: priorResults.overallScore,
          }),
          { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
        );
      }
    }

    // For paid orders: return existing audit if one already exists (idempotent)
    if (isPaidRequest && body.orderId) {
      const existingAudit = await env.DB.prepare(
        "SELECT * FROM audits WHERE order_id = ? ORDER BY created_at DESC LIMIT 1",
      )
        .bind(body.orderId)
        .first();
      if (existingAudit) {
        const existingResults = JSON.parse(existingAudit.results_json);
        const isApproved = existingAudit.review_status === "approved";
        const output = isApproved
          ? { ...existingResults, tier: "paid", reviewStatus: "approved" }
          : {
              ...extractCoreFromDetailed(existingResults),
              tier: "paid",
              reviewStatus: "pending_review",
            };
        return new Response(
          JSON.stringify({ auditId: existingAudit.id, ...output }),
          { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
        );
      }
    }

    // Reuse recent free audit for paid tier — ensures score consistency
    if (isPaidRequest && !isAdminRequest) {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const freeAudit = await env.DB.prepare(
        "SELECT * FROM audits WHERE url = ? AND order_id IS NULL AND created_at > ? ORDER BY created_at DESC LIMIT 1",
      )
        .bind(normalisedUrl, cutoff)
        .first();
      if (freeAudit) {
        const auditId = crypto.randomUUID();
        try {
          await env.DB.prepare(
            "INSERT INTO audits (id, order_id, url, results_json, review_status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          )
            .bind(
              auditId,
              body.orderId || null,
              normalisedUrl,
              freeAudit.results_json,
              "pending_review",
              new Date().toISOString(),
            )
            .run();
        } catch (e) {
          console.error("DB insert failed (free reuse):", e);
        }
        const freeResults = JSON.parse(freeAudit.results_json);
        return new Response(
          JSON.stringify({
            auditId,
            ...freeResults,
            tier: "paid",
            reviewStatus: "pending_review",
          }),
          { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
        );
      }
    }

    const results = await runAudit(normalisedUrl, env, isPaidRequest);

    if (results.error) {
      return new Response(JSON.stringify(results), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const auditId = crypto.randomUUID();
    // Non-admin paid audits require admin review before user can download PDF
    const reviewStatus =
      isPaidRequest && !isAdminRequest ? "pending_review" : "approved";
    try {
      await env.DB.prepare(
        "INSERT INTO audits (id, order_id, url, results_json, review_status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
        .bind(
          auditId,
          body.orderId || null,
          normalisedUrl,
          JSON.stringify(results),
          reviewStatus,
          new Date().toISOString(),
        )
        .run();
    } catch (e) {
      console.error("DB insert failed:", e);
    }

    // Notify admin to review — only for paid non-admin audits
    if (isPaidRequest && !isAdminRequest) {
      ctx.waitUntil(
        (async () => {
          try {
            if (env.ADMIN_EMAIL && env.RESEND_API_KEY) {
              const reviewUrl = `${env.CITESITE_URL || "https://citesite.net"}/admin-audit`;
              const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
  <h2>New Audit Pending Review</h2>
  <p>A paid audit for <strong>${body.url}</strong> is ready for your review.</p>
  <p style="color:#555">Customer: ${order?.email || "unknown"}</p>
  <p style="text-align:center;margin:24px 0">
    <a href="${reviewUrl}" style="background:#1a1a2e;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold">Review Audit</a>
  </p>
</div>`.trim();
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${env.RESEND_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  from: "CiteSite <noreply@citesite.net>",
                  to: env.ADMIN_EMAIL,
                  subject: `New audit pending review: ${body.url}`,
                  html,
                }),
              });
            }
          } catch (err) {
            console.error(`Admin notification failed for ${auditId}:`, err);
          }
        })(),
      );
    }

    const output = isPaidRequest
      ? { ...extractCoreFromDetailed(results), tier: "paid", reviewStatus }
      : filterFreeTier(results);

    return new Response(JSON.stringify({ auditId, ...output }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  },
};
