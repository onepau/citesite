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

  try {
    // Split JWT
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode header to find key ID
    const header = JSON.parse(atob(headerB64.replace(/-/g, "+").replace(/_/g, "/")));

    // Fetch Cloudflare Access public keys
    const certsUrl = `https://${env.CF_ACCESS_TEAM_DOMAIN}.cloudflareaccess.com/cdn-cgi/access/certs`;
    const certsRes = await fetch(certsUrl);
    if (!certsRes.ok) return null;
    const { keys } = await certsRes.json();

    // Find the matching key
    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) return null;

    // Import the public key
    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Verify signature
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const sigBuf = Uint8Array.from(
      atob(signatureB64.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, sigBuf, data);
    if (!valid) return null;

    // Decode and check payload
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));

    // Check expiry
    if (payload.exp && payload.exp < Date.now() / 1000) return null;

    // Check audience matches our Access application
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (env.CF_ACCESS_AUD && !aud.includes(env.CF_ACCESS_AUD)) return null;

    return payload; // Valid — return the decoded claims
  } catch (e) {
    console.error("JWT validation error:", e);
    return null;
  }
}


/* ═══════════════════════════════════════════════════════════════════
   Also update the CORS_HEADERS constant to allow the JWT header:
   ═══════════════════════════════════════════════════════════════════ */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key, Cf-Access-Jwt-Assertion",
};


/* ═══════════════════════════════════════════════════════════════════
   After deploying, set these environment variables:

   npx wrangler secret put CF_ACCESS_TEAM_DOMAIN
   # Enter your team name, e.g.: citesite

   npx wrangler secret put CF_ACCESS_AUD
   # Enter the Application Audience tag from Zero Trust dashboard
   ═══════════════════════════════════════════════════════════════════ */



const AUDIT_SYSTEM_PROMPT = `You are CiteSite's principal-level audit consultant — 15 years of experience producing consulting-grade GEO/SEO reports indistinguishable from a CHF 500 paid audit. Prioritise depth over brevity. Every recommendation must include effort (Low/Medium/High), impact (Low/Medium/High), and an estimated traffic or ranking lift where evidence permits. Use British English throughout. Ground every claim in evidence fetched from the page; if evidence is missing, say so explicitly rather than inferring.

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
    SSR vs CSR, robots.txt directives (including AI-bot rules for GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot), sitemap, canonical, response codes, llms.txt, HTTPS, mobile rendering.
    0-30: AI bots see empty or broken content.
    31-60: crawlable with friction.
    61-85: cleanly crawlable.
    86-100: cleanly crawlable with explicit AI-bot allowances and llms.txt support.

(B) Content structure and passage-level retrievability — 20%
    Semantic HTML, heading hierarchy, self-contained paragraphs, definitional opening sentence, lists, tables, Q&A blocks, chunk-level answerability.
    0-30: wall of text, no structure.
    31-60: some structure but weak chunk answerability.
    61-85: well-structured, answer-ready.
    86-100: purpose-built for passage retrieval.

(C) Structured data and machine-readable signals — 15%
    JSON-LD @type(s), required and recommended properties, @graph, Schema.org validity, author, publisher, datePublished, dateModified, sameAs, mentions, Open Graph, Twitter Card.
    0-30: none or broken.
    31-60: present but incomplete.
    61-85: valid and appropriate.
    86-100: comprehensive multi-type graph with full E-E-A-T signalling.

(D) E-E-A-T and citability signals — 15%
    Named author with bio, Person and Organization schema, outbound citations, original data, about/contact pages, sameAs links, reviews and press mentions.
    0-30: anonymous, no sourcing.
    31-60: some attribution.
    61-85: clear authorship and sourcing.
    86-100: fully verifiable expertise with linked credentials.

(E) Content quality and topical completeness — 15%
    Depth relative to query intent, adjacent entity coverage, originality, freshness, primary research.
    0-30: thin or duplicative.
    31-60: adequate but generic.
    61-85: comprehensive and substantive.
    86-100: original, authoritative, definitional for the query.

(F) On-page technical SEO — 15%
    Title tag, meta description, H1, image alt text, internal linking, URL structure, Core Web Vitals signals, mobile viewport.
    0-30: multiple fundamentals missing.
    31-60: basics covered but weak.
    61-85: well-executed.
    86-100: polished across all fundamentals.

STEP 3 — OVERALL SCORE
Weighted average of the six dimensions, rounded to the nearest integer.

STEP 4 — FINDINGS AND RECOMMENDATIONS
- Three critical issues (highest-impact blockers), each with a concrete fix and, where possible, a code snippet.
- Five specific improvements ranked by impact-to-effort ratio, each tied to an observation from Step 2. Each includes an estimatedTrafficLift where evidence permits (e.g. "+5-15% organic over 90 days").
- One signature recommendation: the single change that would most improve AI citability for this page.

STEP 5 — CONSULTING-GRADE DEPTH (mandatory)
For each of the six dimensions in STEP 2, additionally produce a "narrative", "quickWins", and "prioritizedActions":
- narrative: 2-3 paragraphs of prose analysis referencing specific page elements you observed
- quickWins: 3-5 changes implementable in under one working day
- prioritizedActions: 4-8 actions, each with { action, effort: Low|Medium|High, impact: Low|Medium|High, estimatedTrafficLift? }

Also produce these top-level fields:
- executiveSummary: 3-5 paragraphs suitable for a C-suite reader, covering what was found, the critical risk, and the top-3 opportunities
- competitorInsights: { benchmark: one sentence naming an industry/Top-10 benchmark relevant to this content type, gaps: 4-6 specific gaps versus that benchmark }
- roadmap: { thirtyDay, sixtyDay, ninetyDay } — each an array of 4-6 prioritised actions
- toolRecommendations: 6-10 specific named tools (e.g. "Screaming Frog — crawl audit") each with a one-line rationale tied to issues found on this site

CONSTRAINTS
- Do not estimate Domain Authority, backlink counts, niche-relevance percentages, or anchor text distribution.
- Use specific element names, property names, and HTML or JSON-LD snippets in recommendations.

RESPONSE FORMAT
Respond ONLY with valid JSON matching this structure (no markdown, no preamble):
{
  "inspection": {
    "contentType": "article",
    "rendering": "ssr",
    "https": true,
    "canonical": "https://example.com/page",
    "mobileViewport": true,
    "hreflang": [],
    "schemas": [{ "type": "Article", "summary": "..." }],
    "robotsTxt": true,
    "sitemap": true,
    "llmsTxt": false,
    "criticalBlocker": null
  },
  "dimensions": [
    {
      "id": "crawlability",
      "dimension": "A",
      "name": "Crawlability & Retrievability",
      "weight": 0.20,
      "score": 72,
      "confidence": "high",
      "observations": ["Observation 1…", "Observation 2…"],
      "checks": [
        { "id": "ssr-csr", "name": "Server-side rendering", "score": 18, "maxPoints": 20, "detail": "…" }
      ],
      "narrative": "Two to three paragraphs of analysis tied to elements found on the page…",
      "quickWins": ["…", "…"],
      "prioritizedActions": [
        { "action": "…", "effort": "Medium", "impact": "High", "estimatedTrafficLift": "+10-15% organic over 90 days" }
      ]
    }
  ],
  "overallScore": 65,
  "executiveSummary": "Three to five paragraphs of C-suite summary…",
  "criticalIssues": [
    { "title": "…", "description": "…", "fix": "…", "codeSnippet": "…" }
  ],
  "improvements": [
    { "rank": 1, "dimension": "A", "title": "…", "description": "…", "impact": "high", "effort": "low", "estimatedTrafficLift": "+5-10%" }
  ],
  "signatureRecommendation": { "title": "…", "description": "…", "codeSnippet": "…" },
  "competitorInsights": {
    "benchmark": "Top-10 ranking pages in this niche average 1,800 words and 8 H2 sections.",
    "gaps": ["…", "…"]
  },
  "roadmap": {
    "thirtyDay": ["…", "…"],
    "sixtyDay": ["…", "…"],
    "ninetyDay": ["…", "…"]
  },
  "toolRecommendations": [
    "Screaming Frog — crawl audit to surface the missing canonical tags identified above",
    "Ahrefs — backlink graph analysis to verify the citation coverage gap"
  ]
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

async function runAudit(url, env) {
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
    `--- HTML SOURCE (truncated to 60k chars) ---`,
    page.html,
  ].join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: AUDIT_SYSTEM_PROMPT,
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

    // Check for admin access: either admin key header OR valid Cloudflare Access JWT
    const adminKeyValid = request.headers.get("X-Admin-Key") === env.ADMIN_KEY;
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

    const results = await runAudit(body.url, env);

    // Return error immediately if audit failed
    if (results.error) {
      return new Response(JSON.stringify(results), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Store audit in DB
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
      // Don't fail the request, but log the error
    }

    // Return full or filtered results
    const isFull = isFullEndpoint || isAdminRequest;
    const output = isFull
      ? { ...results, tier: "paid" }
      : filterFreeTier(results);

    return new Response(JSON.stringify({ auditId, ...output }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  },
};