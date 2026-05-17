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

const CORE_AUDIT_PROMPT = `You are CiteSite's audit engine. You analyse web pages for SEO and Generative Engine Optimisation (GEO) readiness.

STEP 1 — FETCH AND INSPECT
The user will provide a URL and the HTML source of a page. Before scoring, determine:
- Does the page return substantive HTML server-side, or is it a JavaScript-rendered shell? Flag any divergence.
- Content type: article, product, service, landing, FAQ, listicle, portfolio, homepage.
- Schema present: list every JSON-LD @type found and summarise each.
- Presence of /robots.txt, /sitemap.xml, /llms.txt, /llms-full.txt: copy the boolean values EXACTLY from the "VERIFIED FACTS" block at the top of the user message — they were obtained by live HTTP requests and are authoritative. Never re-derive these from HTML or make assumptions.
- HTTP status, canonical tag, hreflang, mobile viewport, HTTPS.

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
- HTTP status, canonical tag, hreflang, mobile viewport, HTTPS.

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

async function fetchTargetPage(url, htmlLimit = 30000) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "CiteSiteBot/1.0 (+https://citesite.net)" },
      redirect: "follow",
    });
    const html = await res.text();
    const status = res.status;
    return { html: html.slice(0, htmlLimit), status, finalUrl: res.url };
  } catch (err) {
    return { html: null, status: 0, finalUrl: url, error: err.message };
  }
}

async function fetchRobotsTxt(url) {
  try {
    const origin = new URL(url).origin;
    const res = await fetch(`${origin}/robots.txt`);
    if (res.ok) return await res.text();
    return null;
  } catch {
    return null;
  }
}

async function fetchLlmsTxt(url) {
  try {
    const origin = new URL(url).origin;
    const [llms, llmsFull] = await Promise.all([
      fetch(`${origin}/llms.txt`)
        .then((r) => (r.ok ? r.text() : null))
        .catch(() => null),
      fetch(`${origin}/llms-full.txt`)
        .then((r) => (r.ok ? r.text() : null))
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
    const res = await fetch(`${origin}/sitemap.xml`);
    if (res.ok) return await res.text();
    return null;
  } catch {
    return null;
  }
}

async function runAudit(url, env, detailed = false) {
  const htmlLimit = detailed ? 30000 : 15000;
  const [page, robotsTxt, sitemapXml, llmsData] = await Promise.all([
    fetchTargetPage(url, htmlLimit),
    fetchRobotsTxt(url),
    fetchSitemap(url),
    fetchLlmsTxt(url),
  ]);

  if (!page.html) {
    return { error: `Could not fetch page: ${page.error}` };
  }

  const robotsTxtFound = robotsTxt !== null;
  const sitemapFound = sitemapXml !== null;
  const llmsTxtFound = llmsData.llmsTxt !== null;
  const llmsFullTxtFound = llmsData.llmsFullTxt !== null;

  const verifiedFacts = [
    `VERIFIED FACTS — pre-fetched by the server via HTTP; use these exact values verbatim`,
    `in the inspection block. Do NOT re-derive them from the HTML source or make assumptions.`,
    `  inspection.robotsTxt   = ${robotsTxtFound}   [${robotsTxtFound ? "HTTP 200" : "HTTP 404 / not found"}]`,
    `  inspection.sitemap     = ${sitemapFound}   [${sitemapFound ? "HTTP 200" : "HTTP 404 / not found"}]`,
    `  inspection.llmsTxt     = ${llmsTxtFound}   [${llmsTxtFound ? "HTTP 200" : "HTTP 404 / not found"}]`,
    `  inspection.llmsFullTxt = ${llmsFullTxtFound}   [${llmsFullTxtFound ? "HTTP 200" : "HTTP 404 / not found"}]`,
  ].join("\n");

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
    `--- HTML SOURCE (truncated to ${htmlLimit / 1000}k chars) ---`,
    page.html,
  ].join("\n");

  const systemPrompt = detailed ? DETAILED_AUDIT_PROMPT : CORE_AUDIT_PROMPT;
  const maxTokens = detailed ? 20000 : 10000;
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
    return JSON.parse(clean);
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
    // Free checks keep score+detail; paid checks are nulled.
    checks: (dim.checks || []).map((c) =>
      FREE_CHECK_IDS.has(c.id)
        ? c
        : { ...c, score: null, detail: LOCKED_TEXT, locked: true },
    ),
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

    const results = await runAudit(body.url, env, isPaidRequest);

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
          body.url,
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
