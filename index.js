const SITE = "https://citesite.net";

let _manifest = null;

async function fetchManifest(env, request) {
  if (_manifest) return _manifest;
  try {
    const url = new URL("/blog-manifest.json", request.url);
    const res = await env.ASSETS.fetch(new Request(url));
    _manifest = res.ok ? await res.json() : [];
  } catch {
    _manifest = [];
  }
  return _manifest;
}

const postUrlFor = (slug) => `${SITE}/blog/${slug}`;

function buildArticleSchema(post) {
  const postUrl = postUrlFor(post.slug);
  const { extraNodes = [], ...extra } = post.schema || {};
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${postUrl}#article`,
        headline: post.title,
        description: post.excerpt,
        datePublished: post.date,
        articleSection: post.category,
        author: {
          "@type": "Organization",
          "@id": `${SITE}/#organization`,
          name: "CiteSite",
          url: SITE,
        },
        ...extra,
        publisher: {
          "@type": "Organization",
          "@id": `${SITE}/#organization`,
          name: "CiteSite",
          logo: { "@type": "ImageObject", url: `${SITE}/favicon.svg` },
        },
        mainEntityOfPage: { "@type": "WebPage", "@id": postUrl },
        url: postUrl,
        isPartOf: { "@id": `${SITE}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE },
          {
            "@type": "ListItem",
            position: 2,
            name: "Blog",
            item: `${SITE}/blog`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: post.title,
            item: postUrl,
          },
        ],
      },
      ...extraNodes,
    ],
  };
}

function ea(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function safeJSON(obj) {
  return JSON.stringify(obj).replace(/<\//g, "<\\/");
}

// --- Route metadata ---

const NAV = `<header><nav><a href="/">CiteSite</a><a href="/blog">Blog</a><a href="/about">About</a><a href="/faq">FAQ</a></nav></header>`;

const HOME_META = {
  title: "CiteSite — SEO & GEO audit for the AI search era",
  description:
    "See how AI search engines see your website. Free SEO, GEO and AIO audit across six weighted dimensions. No signup or subscription required.",
  canonical: `${SITE}/`,
  schemas: [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "CiteSite",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "SEO Tool",
      operatingSystem: "Web",
      url: SITE,
      description:
        "Free SEO, GEO and AIO audit tool that analyses any URL across six weighted dimensions for AI search discoverability. No signup or subscription required.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: [
        "GEO audit",
        "AIO score",
        "Structured data analysis",
        "E-E-A-T evaluation",
        "Entity signal audit",
        "AI crawler accessibility check",
      ],
      publisher: {
        "@type": "Organization",
        name: "CiteSite",
        url: SITE,
      },
    },
  ],
};

const HOME_BODY = `
${NAV}
<main>
<h1>Free GEO, SEO and AIO audit for the AI search era</h1>
<p>CiteSite analyses any website across six weighted dimensions and tells you how AI search systems — including Google AI Overviews, Perplexity and ChatGPT — are likely to discover, understand and cite it. The audit runs in seconds. No payment or subscription required.</p>
<h2>What CiteSite measures</h2>
<p>Modern search has split into two tracks: traditional link-based ranking and AI-generated citation. Most SEO tools only address the first. CiteSite addresses both. The audit evaluates six dimensions that determine whether an AI system will treat your page as a citable source:</p>
<ul>
<li><strong>Structured data</strong> — the presence, completeness and validity of JSON-LD schema markup. Tells AI systems who you are and what your content describes.</li>
<li><strong>Content quality</strong> — clarity, depth and answerability. AI systems prefer content that directly answers questions in complete, well-structured prose.</li>
<li><strong>E-E-A-T signals</strong> — visible evidence of experience, expertise, authoritativeness and trustworthiness. The same framework Google's quality raters use.</li>
<li><strong>Entity coherence</strong> — how clearly the site establishes its named entities and their relationships to other known entities in the web graph.</li>
<li><strong>Technical accessibility</strong> — whether AI crawlers can actually read the page: SSR status, robots.txt, llms.txt, and response headers.</li>
<li><strong>Metadata quality</strong> — title tags, meta descriptions and Open Graph completeness. The first layer of signal any crawler reads.</li>
</ul>
<h2>Why GEO and AIO matter now</h2>
<p>In a traditional search result, ranking on page one is the goal. In AI search, the goal is different: you need to be the source an AI chooses to cite. Being cited in an AI Overview or a Perplexity response is increasingly where discovery happens — and traditional SEO tools do not measure citation readiness. CiteSite does.</p>
<h2>How to use CiteSite</h2>
<p>Enter any URL into the audit tool above. CiteSite fetches the page, evaluates it against the six-dimension rubric and returns a scored report with prioritised recommendations. Each recommendation links directly to the relevant schema type, content change or technical fix required.</p>
</main>
<footer><p></p></footer>
`;

const ABOUT_META = {
  title: "About CiteSite",
  description:
    "CiteSite audits websites for AI search discoverability across six weighted dimensions.",
  canonical: `${SITE}/about`,
  schemas: [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "CiteSite",
      url: SITE,
      description:
        "CiteSite builds tools and content for AI search discoverability.",
      foundingLocation: { "@type": "Place", name: "Switzerland" },
    },
  ],
};

const ABOUT_BODY = `
${NAV}
<main>
<h1>About CiteSite</h1>
<p>CiteSite is a free GEO, SEO and AIO audit tool — no signup or subscription required — that analyses any URL across six weighted dimensions for AI search discoverability. The audit evaluates structured data, content quality, E-E-A-T signals, entity coherence, technical accessibility and metadata quality to determine how AI search systems are likely to discover, understand and cite the page.</p>
<h2>Why CiteSite exists</h2>
<p>Search is changing faster than most SEO tooling can track. As AI Overviews, Perplexity citations and ChatGPT recommendations become a primary discovery channel, the signals that determine visibility are fundamentally different from those that governed link-based ranking. Most audit tools still measure the old signals. CiteSite measures the new ones.</p>
<h2>About the tool</h2>
<p>CiteSite evaluates submitted URLs across six weighted dimensions: structured data, content quality, E-E-A-T signals, entity coherence, technical accessibility and metadata quality. The audit is powered by the Anthropic Claude API and returns dimension scores alongside prioritised, actionable recommendations.</p>
<p>CiteSite is free to use and requires no account or API key.</p>
<h2>About Paul O'Neil</h2>
<p>Paul O'Neil is a communications professional and amateur landscape photographer based in Lausanne, Switzerland. His photography work is published at <a href="https://pauloneilphotography.com">pauloneilphotography.com</a>. His work in the GEO and AIO space includes building audit tools, publishing research on structured data and AI search, and running a newsletter series on generative engine optimisation for a LinkedIn professional audience.</p>
</main>
<footer><p><a href="/">Run an audit</a> · <a href="/faq">FAQ</a> · <a href="https://pauloneilphotography.com">Paul O'Neil Photography</a></p></footer>
`;

const FAQ_META = {
  title: "CiteSite FAQ — GEO audits, AIO scores and AI search explained",
  description:
    "Answers to common questions about GEO audits, AIO scores, structured data and how CiteSite analyses websites for AI search discoverability.",
  canonical: `${SITE}/faq`,
  schemas: [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      name: "CiteSite FAQ",
      url: `${SITE}/faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "What is a GEO audit?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A GEO (Generative Engine Optimisation) audit analyses how well a website is structured to be discovered, understood and cited by AI-powered search systems such as Google AI Overviews, Perplexity and ChatGPT. It evaluates dimensions including structured data, content clarity, E-E-A-T signals, entity coherence and crawler accessibility — the factors that determine whether an AI system treats a page as a trustworthy source.",
          },
        },
        {
          "@type": "Question",
          name: "What is an AIO score?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "An AIO (AI Overview Optimisation) score measures how likely a webpage is to be selected and cited in an AI-generated search response. CiteSite calculates this score across six weighted dimensions: structured data, content quality, E-E-A-T signals, entity coherence, technical accessibility and metadata quality. Each dimension contributes to a weighted overall score.",
          },
        },
        {
          "@type": "Question",
          name: "Is CiteSite free to use?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. CiteSite is completely free. Enter any URL and receive a full GEO, SEO and AIO audit with dimension scores and prioritised recommendations. No account, email address or credit card is required.",
          },
        },
        {
          "@type": "Question",
          name: "How does CiteSite analyse a website?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "CiteSite fetches the submitted URL, extracts the page content and structured data, then passes both to the Claude API (by Anthropic) alongside a structured six-dimension audit rubric. The model evaluates each dimension, assigns a score with a confidence level, and returns prioritised recommendations with specific remediation steps.",
          },
        },
        {
          "@type": "Question",
          name: "What are the six audit dimensions?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "CiteSite audits websites across: (1) Structured data — the presence and quality of JSON-LD schema markup; (2) Content quality — clarity, depth and answerability for AI systems; (3) E-E-A-T signals — visible evidence of experience, expertise, authoritativeness and trustworthiness; (4) Entity coherence — how clearly the site establishes its named entities and relationships; (5) Technical accessibility — crawler access, SSR status, robots.txt and llms.txt; (6) Metadata quality — title tags, meta descriptions and Open Graph completeness.",
          },
        },
        {
          "@type": "Question",
          name: "How does structured data affect AI search visibility?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Structured data — implemented via JSON-LD schema markup — converts ambiguous HTML into explicit, machine-readable facts. AI search systems use these facts to identify entities, verify claims and determine whether to cite a page. Without schema, an AI system must infer what a page is about from its unstructured text. With schema, the facts are stated directly: who the author is, what the content describes, when it was published and how it relates to other entities. This directness significantly increases citation probability.",
          },
        },
        {
          "@type": "Question",
          name: "How is CiteSite different from traditional SEO tools?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Traditional SEO tools optimise for keyword rankings in link-based search engines by measuring backlinks, keyword density and technical crawl health. CiteSite optimises for answerability — the probability that an AI system selects your page as a cited source in a generated response. This requires measuring different signals: entity clarity, schema depth, E-E-A-T credibility and content structure. The two approaches complement each other; CiteSite is not a replacement for traditional SEO auditing but addresses the layer above it.",
          },
        },
      ],
    },
  ],
};

const FAQ_BODY = `
${NAV}
<main>
<h1>Frequently asked questions</h1>
<section><h2>What is a GEO audit?</h2><p>A GEO (Generative Engine Optimisation) audit analyses how well a website is structured to be discovered, understood and cited by AI-powered search systems such as Google AI Overviews, Perplexity and ChatGPT. It evaluates dimensions including structured data, content clarity, E-E-A-T signals, entity coherence and crawler accessibility — the factors that determine whether an AI system treats a page as a trustworthy source.</p></section>
<section><h2>What is an AIO score?</h2><p>An AIO (AI Overview Optimisation) score measures how likely a webpage is to be selected and cited in an AI-generated search response. CiteSite calculates this score across six weighted dimensions: structured data, content quality, E-E-A-T signals, entity coherence, technical accessibility and metadata quality.</p></section>
<section><h2>Is CiteSite free to use?</h2><p>Yes. CiteSite is completely free. Enter any URL and receive a full GEO, SEO and AIO audit with dimension scores and prioritised recommendations. No account, email address or credit card is required.</p></section>
<section><h2>How does CiteSite analyse a website?</h2><p>CiteSite fetches the submitted URL, extracts the page content and structured data, then passes both to the Claude API (by Anthropic) alongside a structured six-dimension audit rubric. The model evaluates each dimension, assigns a score with a confidence level, and returns prioritised recommendations with specific remediation steps.</p></section>
<section><h2>What are the six audit dimensions?</h2><ol><li><strong>Structured data</strong> — the presence and quality of JSON-LD schema markup.</li><li><strong>Content quality</strong> — clarity, depth and answerability for AI systems.</li><li><strong>E-E-A-T signals</strong> — visible evidence of experience, expertise, authoritativeness and trustworthiness.</li><li><strong>Entity coherence</strong> — how clearly the site establishes its named entities and relationships.</li><li><strong>Technical accessibility</strong> — crawler access, SSR status, robots.txt and llms.txt.</li><li><strong>Metadata quality</strong> — title tags, meta descriptions and Open Graph completeness.</li></ol></section>
<section><h2>How does structured data affect AI search visibility?</h2><p>Structured data — implemented via JSON-LD schema markup — converts ambiguous HTML into explicit, machine-readable facts. AI search systems use these facts to identify entities, verify claims and decide whether to cite a page. Without schema, an AI system must infer what a page is about from unstructured text. With it, the facts are stated directly: who the author is, what the content describes, when it was published and how it relates to other entities in the graph. This directness significantly increases citation probability.</p></section>
<section><h2>How is CiteSite different from traditional SEO tools?</h2><p>Traditional SEO tools optimise for keyword rankings by measuring backlinks, keyword density and technical crawl health. CiteSite optimises for answerability — the probability that an AI system selects your page as a cited source. This requires measuring different signals: entity clarity, schema depth, E-E-A-T credibility and content structure. The two approaches are complementary: CiteSite addresses the layer that traditional tools do not cover.</p></section>
</main>
<footer><p><a href="/">Run an audit</a> · <a href="/about">About CiteSite</a> · <a href="https://pauloneilphotography.com">Paul O'Neil Photography</a></p></footer>
`;

/* Crawlers get the pre-rendered body injected into #root; browsers get the
   untouched shell so React's mount never wipes visible content (zero CLS).
   Lighthouse is deliberately NOT matched — it must measure what users see.
   An empty UA is treated as a crawler (plain fetchers, curl, etc.). */
const CRAWLER_UA_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|twitter|linkedin|pinterest|embedly|quora|skype|vkshare|claude|anthropic|perplexity|gptbot|chatgpt/i;

function isCrawler(request) {
  const ua = request.headers.get("User-Agent") || "";
  return ua === "" || CRAWLER_UA_RE.test(ua);
}

function injectMeta(shell, meta, bodyHtml, includeBody) {
  const headTags = [
    `<link rel="canonical" href="${ea(meta.canonical)}" />`,
    ...meta.schemas.map(
      (s) =>
        `<script type="application/ld+json" data-schema="dynamic">${safeJSON(s)}<\/script>`,
    ),
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${ea(meta.title)}" />`,
    `<meta property="og:description" content="${ea(meta.description)}" />`,
    `<meta property="og:url" content="${ea(meta.canonical)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${ea(meta.title)}" />`,
    `<meta name="twitter:description" content="${ea(meta.description)}" />`,
  ].join("");

  const rewriter = new HTMLRewriter()
    .on("title", {
      element(el) {
        el.setInnerContent(meta.title);
      },
    })
    .on('meta[name="description"]', {
      element(el) {
        el.setAttribute("content", meta.description);
      },
    })
    .on("head", {
      element(el) {
        el.append(headTags, { html: true });
      },
    });

  if (includeBody) {
    rewriter.on("#root", {
      element(el) {
        el.setInnerContent(bodyHtml, { html: true });
      },
    });
  }

  return rewriter.transform(shell);
}

// --- Blog pages ---

const BLOG_FOOTER = `<footer><p><a href="/">Run an audit</a> · <a href="/blog">Blog</a> · <a href="/about">About CiteSite</a> · <a href="/faq">FAQ</a></p></footer>`;

function postListHtml(posts) {
  return `<ul>${posts
    .map(
      (p) =>
        `<li><a href="/blog/${ea(p.slug)}">${ea(p.title)}</a>` +
        (p.date
          ? ` <time datetime="${ea(p.date)}">${ea(p.date.slice(0, 10))}</time>`
          : "") +
        (p.excerpt ? `<p>${ea(p.excerpt)}</p>` : "") +
        `</li>`,
    )
    .join("")}</ul>`;
}

function blogIndexMeta(posts) {
  const blogUrl = `${SITE}/blog`;
  return {
    title: "Blog — SEO, GEO and AI search guides | CiteSite",
    description:
      "Guides, research and platform updates on SEO, generative engine optimisation (GEO) and AI search visibility from CiteSite.",
    canonical: blogUrl,
    schemas: [
      {
        "@context": "https://schema.org",
        "@type": "Blog",
        "@id": `${SITE}/#blog`,
        name: "CiteSite Blog",
        url: blogUrl,
        publisher: { "@id": `${SITE}/#organization` },
        blogPost: posts.map((p) => ({
          "@type": "BlogPosting",
          headline: p.title,
          url: postUrlFor(p.slug),
          datePublished: p.date,
        })),
      },
    ],
  };
}

function blogIndexBody(posts) {
  return (
    `${NAV}<main><h1>CiteSite blog</h1>` +
    `<p>Guides, research and platform updates on SEO, generative engine optimisation (GEO) and AI search visibility.</p>` +
    `${postListHtml(posts)}</main>${BLOG_FOOTER}`
  );
}

// Serve the SPA shell with a real 404 status (the app renders its own view)
function notFound(shell) {
  const headers = new Headers(shell.headers);
  return new Response(shell.body, { status: 404, headers });
}

// --- Local price (display currency) ---
// The visitor's country comes from Cloudflare (request.cf.country), so no
// third-party IP lookup is needed. Rates are the ECB daily reference rates
// (EUR-based), converted to per-CHF and cached at the edge for six hours.

const ECB_RATES_URL =
  "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";

const COUNTRY_CURRENCY = {
  ...Object.fromEntries(
    "AT BE BG HR CY EE FI FR DE GR IE IT LV LT LU MT NL PT SK SI ES AD MC SM VA ME XK"
      .split(" ")
      .map((c) => [c, "EUR"]),
  ),
  CH: "CHF", LI: "CHF", US: "USD", GB: "GBP", JP: "JPY", CN: "CNY",
  AU: "AUD", CA: "CAD", NZ: "NZD", HK: "HKD", SG: "SGD", IN: "INR",
  KR: "KRW", BR: "BRL", MX: "MXN", ZA: "ZAR", TR: "TRY", PL: "PLN",
  SE: "SEK", NO: "NOK", DK: "DKK", CZ: "CZK", IL: "ILS", TH: "THB",
  PH: "PHP", ID: "IDR", MY: "MYR", HU: "HUF", RO: "RON", IS: "ISK",
};

async function chfRate(currency) {
  const res = await fetch(ECB_RATES_URL, {
    cf: { cacheTtl: 21600, cacheEverything: true },
  });
  if (!res.ok) return null;
  const xml = await res.text();
  const eurTo = (code) => {
    const m = xml.match(new RegExp(`currency='${code}' rate='([\\d.]+)'`));
    return m ? Number(m[1]) : null;
  };
  const eurChf = eurTo("CHF");
  const eurX = currency === "EUR" ? 1 : eurTo(currency);
  return eurChf && eurX ? eurX / eurChf : null;
}

async function localPriceResponse(request) {
  const chf = { currency: "CHF", rate: 1 };
  let body = chf;
  try {
    const currency = COUNTRY_CURRENCY[request.cf?.country] || null;
    if (currency && currency !== "CHF") {
      const rate = await chfRate(currency);
      if (rate > 0 && Number.isFinite(rate)) body = { currency, rate };
    }
  } catch {
    body = chf;
  }
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, max-age=3600",
    },
  });
}

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://*.googletagmanager.com https://*.google-analytics.com https://www.clarity.ms https://scripts.clarity.ms",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://api.citesite.net https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://stats.g.doubleclick.net https://*.clarity.ms",
  "worker-src 'self' blob:",
  "frame-src https://www.googletagmanager.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const SECURITY_HEADERS = {
  "Content-Security-Policy": CSP,
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
  // HTML responses differ by user-agent (crawlers get pre-rendered #root)
  if ((headers.get("Content-Type") || "").includes("text/html")) {
    headers.append("Vary", "User-Agent");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Admin CMS loads Decap from unpkg.com — exempt from the main site CSP
    if (url.pathname === "/admin" || url.pathname === "/admin/") {
      return handleRequest(request, env);
    }
    return withSecurityHeaders(await handleRequest(request, env));
  },
};

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, "") || "/";

  // Admin CMS — serve Decap CMS shell directly, not the React SPA
  // Fetch /admin/ (directory URL) not /admin/index.html — Cloudflare Assets
  // redirects explicit index.html requests to the directory URL, which would
  // loop back through the worker.
  if (pathname === "/admin") {
    return env.ASSETS.fetch(
      new Request(new URL("/admin/", request.url), request),
    );
  }

  // Display-currency lookup for the pricing UI
  if (pathname === "/api/local-price") return localPriceResponse(request);

  // Static assets (have file extensions) — pass through directly
  if (/\.\w+$/.test(pathname)) return env.ASSETS.fetch(request);

  // Fetch the SPA shell — request "/" so ASSETS serves dist/index.html
  // directly without the /index.html → / canonical redirect it would emit.
  const shell = await env.ASSETS.fetch(
    new Request(new URL("/", request.url), request),
  );

  const includeBody = isCrawler(request);

  // Legacy post URLs (/?post=<slug>) → permanent redirect to /blog/<slug>
  const legacySlug = url.searchParams.get("post");
  if (legacySlug) {
    const posts = await fetchManifest(env, request);
    if (posts.some((p) => p.slug === legacySlug)) {
      return Response.redirect(postUrlFor(legacySlug), 301);
    }
    return notFound(shell);
  }

  // Blog index: /blog
  if (pathname === "/blog") {
    const posts = await fetchManifest(env, request);
    return injectMeta(
      shell,
      blogIndexMeta(posts),
      blogIndexBody(posts),
      includeBody,
    );
  }

  // Blog post: /blog/<slug>
  const postMatch = pathname.match(/^\/blog\/([^/]+)$/);
  if (postMatch) {
    const posts = await fetchManifest(env, request);
    const post = posts.find((p) => p.slug === postMatch[1]);
    if (!post) return notFound(shell);

    const postUrl = postUrlFor(post.slug);
    const title = `${post.title} — CiteSite`;

    const rewriter = new HTMLRewriter()
      .on("title", {
        element(el) {
          el.setInnerContent(title);
        },
      })
      .on('meta[name="description"]', {
        element(el) {
          el.setAttribute("content", post.excerpt);
        },
      })
      .on("head", {
        element(el) {
          el.append(
            `<link rel="canonical" href="${ea(postUrl)}" />` +
              `<script type="application/ld+json" data-schema="dynamic">${safeJSON(buildArticleSchema(post))}<\/script>` +
              `<meta property="og:type" content="article" />` +
              `<meta property="og:title" content="${ea(title)}" />` +
              `<meta property="og:description" content="${ea(post.excerpt)}" />` +
              `<meta property="og:url" content="${ea(postUrl)}" />` +
              `<meta name="twitter:card" content="summary_large_image" />` +
              `<meta name="twitter:title" content="${ea(title)}" />` +
              `<meta name="twitter:description" content="${ea(post.excerpt)}" />`,
            { html: true },
          );
        },
      });

    if (includeBody) {
      const others = posts.filter((p) => p.slug !== post.slug).slice(0, 5);
      rewriter.on("#root", {
        element(el) {
          el.setInnerContent(
            `${NAV}<main><p><a href="/blog">← All posts</a></p>` +
              `<article>${/<h1[\s>]/i.test(post.html) ? "" : `<h1>${ea(post.title)}</h1>`}` +
              `<p><time datetime="${ea(post.date)}">${ea(post.date.slice(0, 10))}</time> · ${ea(post.category)}</p>` +
              `${post.html}</article>` +
              `<aside><h2>More from the CiteSite blog</h2>${postListHtml(others)}</aside></main>` +
              BLOG_FOOTER,
            { html: true },
          );
        },
      });
    }

    return rewriter.transform(shell);
  }

  if (pathname === "/") {
    const posts = await fetchManifest(env, request);
    const latest =
      `<section><h2>Latest from the blog</h2>${postListHtml(posts.slice(0, 5))}` +
      `<p><a href="/blog">All posts</a></p></section>`;
    return injectMeta(
      shell,
      HOME_META,
      HOME_BODY.replace("</main>", `${latest}</main>`),
      includeBody,
    );
  }
  if (pathname === "/about")
    return injectMeta(shell, ABOUT_META, ABOUT_BODY, includeBody);
  if (pathname === "/faq")
    return injectMeta(shell, FAQ_META, FAQ_BODY, includeBody);

  // All other routes (including /admin-audit) — serve the SPA shell as-is
  return shell;
}
