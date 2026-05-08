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

    const header = JSON.parse(atob(headerB64.replace(/-/g, "+").replace(/_/g, "/")));

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
      ["verify"]
    );

    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const sigBuf = Uint8Array.from(
      atob(signatureB64.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, sigBuf, data);
    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));

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
    env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()) : DEFAULT_ALLOWED_ORIGINS
  );
  const origin = request.headers.get("Origin");
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key, Cf-Access-Jwt-Assertion",
    "Vary": "Origin",
  };
  if (origin && allowed.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
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
- Presence of /robots.txt, /sitemap.xml, /llms.txt, /llms-full.txt references.
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
- Presence of /robots.txt, /sitemap.xml, /llms.txt, /llms-full.txt references.
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
  "dimensions": [ { "id": "...", "narrative": "...", "quickWins": [...], "prioritizedActions": [...] } ],
  "overallScore": 65,
  "executiveSummary": "...",
  "criticalIssues": [...],
  "improvements": [...],
  "signatureRecommendation": { ... },
  "competitorInsights": { "benchmark": "...", "gaps": [...] },
  "roadmap": { "thirtyDay": [...], "sixtyDay": [...], "ninetyDay": [...] },
  "toolRecommendations": [...]
}`;

async function fetchTargetPage(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "CiteSiteBot/1.0 (+https://citesite.net)" },
      redirect: "follow",
    });
    const html = await res.text();
    const status = res.status;
    return { html: html.slice(0, 30000), status, finalUrl: res.url };
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
      fetch(`${origin}/llms.txt`).then(r => r.ok ? r.text() : null).catch(() => null),
      fetch(`${origin}/llms-full.txt`).then(r => r.ok ? r.text() : null).catch(() => null),
    ]);
    return { llmsTxt: llms, llmsFullTxt: llmsFull };
  } catch {
    return { llmsTxt: null, llmsFullTxt: null };
  }
}

async function runAudit(url, env, detailed = false) {
  const [page, robotsTxt, llmsData] = await Promise.all([
    fetchTargetPage(url),
    fetchRobotsTxt(url),
    fetchLlmsTxt(url),
  ]);

  if (!page.html) {
    return { error: `Could not fetch page: ${page.error}` };
  }

  const userMessage = [
    `Audit this page:`,
    ``,
    `URL: ${url}`,
    `Final URL: ${page.finalUrl}`,
    `HTTP Status: ${page.status}`,
    ``,
    `--- robots.txt ---`,
    robotsTxt || "(not found or inaccessible)",
    ``,
    `--- llms.txt ---`,
    llmsData.llmsTxt || "(not found)",
    ``,
    `--- llms-full.txt ---`,
    llmsData.llmsFullTxt || "(not found)",
    ``,
    `--- HTML SOURCE (truncated to 30k chars) ---`,
    page.html,
  ].join("\n");

  const systemPrompt = detailed ? DETAILED_AUDIT_PROMPT : CORE_AUDIT_PROMPT;
  const maxTokens = detailed ? 12000 : 6000;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return { error: `Anthropic API error: ${response.status} — ${err}` };
  }

  const data = await response.json();
  const text = data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  try {
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return { error: "Failed to parse audit response", raw: text };
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
  "ssr-csr", "sitemap", "canonical", "https", "mobile",
  "semantic-html", "heading-hierarchy", "lists-tables",
  "jsonld-present", "og-tags", "twitter-card",
  "title-tag", "meta-desc", "h1", "img-alt", "url-structure",
]);

const LOCKED_TEXT = "Unlock with full report";

function filterFreeTier(results) {
  if (results.error) return results;

  const filteredDimensions = (results.dimensions || []).map((dim) => ({
    ...dim,
    // Score, name, weight, dimension letter, confidence stay visible.
    // Show only the FIRST observation as a taste; rest gated.
    observations: Array.isArray(dim.observations) && dim.observations.length > 0
      ? [dim.observations[0]]
      : [],
    // Free checks keep score+detail; paid checks are nulled.
    checks: (dim.checks || []).map((c) =>
      FREE_CHECK_IDS.has(c.id)
        ? c
        : { ...c, score: null, detail: LOCKED_TEXT, locked: true }
    ),
    // STEP 5 fields stripped entirely for free tier.
    narrative: undefined,
    quickWins: undefined,
    prioritizedActions: undefined,
  }));

  // First critical issue: title + description visible; fix + code locked.
  const firstIssue = results.criticalIssues?.[0];
  const filteredCriticalIssues = firstIssue
    ? [{
        title: firstIssue.title,
        description: firstIssue.description,
        fix: LOCKED_TEXT,
        codeSnippet: null,
        locked: true,
      }]
    : [];

  // First improvement: title + dimension visible; description/impact/effort locked.
  const firstImprov = results.improvements?.[0];
  const filteredImprovements = firstImprov
    ? [{
        rank: firstImprov.rank,
        dimension: firstImprov.dimension,
        title: firstImprov.title,
        description: LOCKED_TEXT,
        impact: null,
        effort: null,
        estimatedTrafficLift: null,
        locked: true,
      }]
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
      description: "Order your bespoke audit to reveal the signature recommendation.",
      locked: true,
    },
    competitorInsights: null,
    roadmap: null,
    toolRecommendations: null,
    tier: "free",
  };
}

export default {
  async fetch(request, env) {
    const CORS_HEADERS = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "POST required" }), {
        status: 405,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }


    const url = new URL(request.url);
    const isFullEndpoint = url.pathname === "/api/audit/full";

    // Admin access: either valid admin key OR valid Cloudflare Access JWT.
    // Empty/unset ADMIN_KEY must NOT match any header value, including missing.
    const submittedKey = request.headers.get("X-Admin-Key");
    const adminKeyValid = !!env.ADMIN_KEY && submittedKey === env.ADMIN_KEY;
    const accessJWT = request.headers.get("Cf-Access-Jwt-Assertion");
    const jwtPayload = accessJWT ? await validateAccessJWT(accessJWT, env) : null;
    const isAdminRequest = adminKeyValid || jwtPayload !== null;


    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (!body.url) {
      return new Response(JSON.stringify({ error: "Missing url field" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Full endpoint requires payment verification OR admin key
    if (isFullEndpoint && !isAdminRequest) {
      if (!body.orderId) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      // Verify order exists and is paid
      const order = await env.DB.prepare(
        "SELECT * FROM orders WHERE id = ? AND status = 'paid'"
      ).bind(body.orderId).first();

      if (!order) {
        return new Response(JSON.stringify({ error: "Invalid or unpaid order" }), {
          status: 402,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
    }

    // Validate Anthropic API key is configured
    if (!env.ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "Server not configured: ANTHROPIC_API_KEY missing" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Determine if this is a paid request
    const isPaidRequest = isFullEndpoint || isAdminRequest;

    // Always generate core audit first (fast, returns immediately)
    const results = await runAudit(body.url, env, false);

    // Return error immediately if audit failed
    if (results.error) {
      return new Response(JSON.stringify(results), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Store audit in DB with core results
    const auditId = crypto.randomUUID();
    try {
      await env.DB.prepare(
        "INSERT INTO audits (id, order_id, url, results_json, created_at) VALUES (?, ?, ?, ?, ?)"
      ).bind(
        auditId,
        body.orderId || null,
        body.url,
        JSON.stringify(results),
        new Date().toISOString()
      ).run();
    } catch (e) {
      console.error("DB insert failed:", e);
    }

    // For paid audits, trigger async detailed generation in background
    if (isPaidRequest) {
      env.waitUntil(
        (async () => {
          try {
            const detailedResults = await runAudit(body.url, env, true);
            if (!detailedResults.error) {
              await env.DB.prepare(
                "UPDATE audits SET results_json = ? WHERE id = ?"
              ).bind(JSON.stringify(detailedResults), auditId).run();
              console.log(`Detailed audit generated for ${auditId}`);
            }
          } catch (err) {
            console.error(`Detailed audit generation failed for ${auditId}:`, err);
          }
        })()
      );
    }

    // Return results with appropriate tier and filtering
    const output = isPaidRequest
      ? { ...results, tier: "paid" }
      : filterFreeTier(results);

    return new Response(JSON.stringify({ auditId, ...output }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  },
};