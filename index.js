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

function buildArticleSchema(post) {
  const postUrl = `${SITE}/?post=${post.slug}`;
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
          { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/` },
          {
            "@type": "ListItem",
            position: 3,
            name: post.title,
            item: `${SITE}/?post=${post.slug}`,
          },
        ],
      },
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
const HOMEPAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CiteSite — SEO &amp; GEO audit for the AI search era</title>
  <meta name="description" content="See how AI search engines see your website. Free SEO, GEO and AIO audit across six weighted dimensions. No signup or subscription required." />
  <link rel="canonical" href="https://citesite.net/" />

  <!-- SoftwareApplication schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "CiteSite",
    "applicationCategory": "BusinessApplication",
    "applicationSubCategory": "SEO Tool",
    "operatingSystem": "Web",
    "url": "https://citesite.net",
    "description": "Free SEO, GEO and AIO audit tool that analyses any URL across six weighted dimensions for AI search discoverability. No signup or subscription required.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "GEO audit",
      "AIO score",
      "Structured data analysis",
      "E-E-A-T evaluation",
      "Entity signal audit",
      "AI crawler accessibility check"
    ],
    "publisher": {
      "@type": "Organization",
      "name": "CiteSite",
      "url": "https://citesite.net"
    },
    "sameAs": []
  }
  </script>

  <!-- Organization schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "CiteSite",
    "url": "https://citesite.net",
    "description": "CiteSite builds tools and content for AI search discoverability. The flagship product audits websites for GEO and AIO readiness.",
    
  }
  </script>

  <!-- Your existing CSS bundle — update path to match your Vite build output -->
  <link rel="stylesheet" href="/assets/index.css" />
</head>
<body>
  <div id="root">
    <!-- Pre-rendered content — React hydrates over this -->
    <header>
      <nav>
        <a href="/">CiteSite</a>
        <a href="/about">About</a>
        <a href="/faq">FAQ</a>
      </nav>
    </header>

    <main>
      <h1>Free GEO, SEO and AIO audit for the AI search era</h1>

      <p>
        CiteSite analyses any website across six weighted dimensions and tells you
        how AI search systems — including Google AI Overviews, Perplexity and
        ChatGPT — are likely to discover, understand and cite it. The audit runs
        in seconds. No payment or subscription required.
      </p>

      <h2>What CiteSite measures</h2>

      <p>
        Modern search has split into two tracks: traditional link-based ranking
        and AI-generated citation. Most SEO tools only address the first. CiteSite
        addresses both. The audit evaluates six dimensions that determine whether
        an AI system will treat your page as a citable source:
      </p>

      <ul>
        <li>
          <strong>Structured data</strong> — the presence, completeness and
          validity of JSON-LD schema markup. Tells AI systems who you are and
          what your content describes.
        </li>
        <li>
          <strong>Content quality</strong> — clarity, depth and answerability.
          AI systems prefer content that directly answers questions in complete,
          well-structured prose.
        </li>
        <li>
          <strong>E-E-A-T signals</strong> — visible evidence of experience,
          expertise, authoritativeness and trustworthiness. The same framework
          Google's quality raters use.
        </li>
        <li>
          <strong>Entity coherence</strong> — how clearly the site establishes
          its named entities and their relationships to other known entities
          in the web graph.
        </li>
        <li>
          <strong>Technical accessibility</strong> — whether AI crawlers can
          actually read the page: SSR status, robots.txt, llms.txt, and
          response headers.
        </li>
        <li>
          <strong>Metadata quality</strong> — title tags, meta descriptions and
          Open Graph completeness. The first layer of signal any crawler reads.
        </li>
      </ul>

      <h2>Why GEO and AIO matter now</h2>

      <p>
        In a traditional search result, ranking on page one is the goal.
        In AI search, the goal is different: you need to be the source an AI
        chooses to cite. Being cited in an AI Overview or a Perplexity response
        is increasingly where discovery happens — and traditional SEO tools
        do not measure citation readiness. CiteSite does.
      </p>

      <h2>How to use CiteSite</h2>

      <p>
        Enter any URL into the audit tool above. CiteSite fetches the page,
        evaluates it against the six-dimension rubric and returns a scored
        report with prioritised recommendations. Each recommendation links
        directly to the relevant schema type, content change or technical
        fix required.
      </p>
    </main>

    <footer>
      <p>
      </p>
    </footer>
  </div>

  <!-- React bundle — update src to your actual Vite build output hash -->
  <script type="module" src="/assets/index.js"></script>
</body>
</html>`;

const ABOUT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>About CiteSite</title>
  <meta name="description" content="CiteSite audits websites for AI search discoverability across six weighted dimensions." />
  <link rel="canonical" href="https://citesite.net/about" />

  <!-- Person schema -->
  <script type="application/ld+json">
  </script>

  <!-- Organization schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "CiteSite",
    "url": "https://citesite.net",
    "description": "CiteSite builds tools and content for AI search discoverability.",
    "foundingLocation": {
      "@type": "Place",
      "name": "Switzerland"
    },
    "sameAs": []
  }
  </script>

  <link rel="stylesheet" href="/assets/index.css" />
</head>
<body>
  <div id="root">
    <header>
      <nav>
        <a href="/">CiteSite</a>
        <a href="/about">About</a>
        <a href="/faq">FAQ</a>
      </nav>
    </header>

    <main>
      <h1>About CiteSite</h1>

      <p>
        CiteSite is a free GEO, SEO and AIO audit tool - no signup or subscription required - that analyses any URL across six weighted dimensions for AI search discoverability. The audit evaluates structured data, content quality, E-E-A-T signals, entity coherence, technical accessibility and metadata quality to determine how AI search systems are likely to discover, understand and cite the page. 
      </p>

      <h2>Why CiteSite exists</h2>

      <p>
        Search is changing faster than most SEO tooling can track. As AI Overviews,
        Perplexity citations and ChatGPT recommendations become a primary discovery
        channel, the signals that determine visibility are fundamentally different
        from those that governed link-based ranking. Most audit tools still measure
        the old signals. CiteSite measures the new ones.
      </p>

      <h2>About the tool</h2>

      <p>
        CiteSite evaluates submitted URLs across six weighted dimensions:
        structured data, content quality, E-E-A-T signals, entity coherence,
        technical accessibility and metadata quality. The audit is powered by
        the Anthropic Claude API and returns dimension scores alongside
        prioritised, actionable recommendations.
      </p>

      <p>
        CiteSite is free to use and requires no account or API key.
      </p>

      <h2>About Paul O'Neil</h2>

      <p>
        Paul O'Neil is a communications professional and amateur landscape photographer based in Lausanne, Switzerland. His photography work is published at
        <a href="https://pauloneilphotography.com">pauloneilphotography.com</a>.
        His work in the GEO and AIO space includes building audit tools,
        publishing research on structured data and AI search, and running
        a newsletter series on generative engine optimisation for a LinkedIn
        professional audience.
      </p>
    </main>

    <footer>
      <p>
        <a href="/">Run an audit</a> ·
        <a href="/faq">FAQ</a> ·
        <a href="https://pauloneilphotography.com">Paul O'Neil Photography</a>
      </p>
    </footer>
  </div>

  <script type="module" src="/assets/index.js"></script>
</body>
</html>`;

const FAQ_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CiteSite FAQ — GEO audits, AIO scores and AI search explained</title>
  <meta name="description" content="Answers to common questions about GEO audits, AIO scores, structured data and how CiteSite analyses websites for AI search discoverability." />
  <link rel="canonical" href="https://citesite.net/faq" />

  <!-- FAQPage schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "name": "CiteSite FAQ",
    "url": "https://citesite.net/faq",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is a GEO audit?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A GEO (Generative Engine Optimisation) audit analyses how well a website is structured to be discovered, understood and cited by AI-powered search systems such as Google AI Overviews, Perplexity and ChatGPT. It evaluates dimensions including structured data, content clarity, E-E-A-T signals, entity coherence and crawler accessibility — the factors that determine whether an AI system treats a page as a trustworthy source."
        }
      },
      {
        "@type": "Question",
        "name": "What is an AIO score?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "An AIO (AI Overview Optimisation) score measures how likely a webpage is to be selected and cited in an AI-generated search response. CiteSite calculates this score across six weighted dimensions: structured data, content quality, E-E-A-T signals, entity coherence, technical accessibility and metadata quality. Each dimension contributes to a weighted overall score."
        }
      },
      {
        "@type": "Question",
        "name": "Is CiteSite free to use?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. CiteSite is completely free. Enter any URL and receive a full GEO, SEO and AIO audit with dimension scores and prioritised recommendations. No account, email address or credit card is required."
        }
      },
      {
        "@type": "Question",
        "name": "How does CiteSite analyse a website?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "CiteSite fetches the submitted URL, extracts the page content and structured data, then passes both to the Claude API (by Anthropic) alongside a structured six-dimension audit rubric. The model evaluates each dimension, assigns a score with a confidence level, and returns prioritised recommendations with specific remediation steps."
        }
      },
      {
        "@type": "Question",
        "name": "What are the six audit dimensions?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "CiteSite audits websites across: (1) Structured data — the presence and quality of JSON-LD schema markup; (2) Content quality — clarity, depth and answerability for AI systems; (3) E-E-A-T signals — visible evidence of experience, expertise, authoritativeness and trustworthiness; (4) Entity coherence — how clearly the site establishes its named entities and relationships; (5) Technical accessibility — crawler access, SSR status, robots.txt and llms.txt; (6) Metadata quality — title tags, meta descriptions and Open Graph completeness."
        }
      },
      {
        "@type": "Question",
        "name": "How does structured data affect AI search visibility?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Structured data — implemented via JSON-LD schema markup — converts ambiguous HTML into explicit, machine-readable facts. AI search systems use these facts to identify entities, verify claims and determine whether to cite a page. Without schema, an AI system must infer what a page is about from its unstructured text. With schema, the facts are stated directly: who the author is, what the content describes, when it was published and how it relates to other entities. This directness significantly increases citation probability."
        }
      },
      {
        "@type": "Question",
        "name": "How is CiteSite different from traditional SEO tools?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Traditional SEO tools optimise for keyword rankings in link-based search engines by measuring backlinks, keyword density and technical crawl health. CiteSite optimises for answerability — the probability that an AI system selects your page as a cited source in a generated response. This requires measuring different signals: entity clarity, schema depth, E-E-A-T credibility and content structure. The two approaches complement each other; CiteSite is not a replacement for traditional SEO auditing but addresses the layer above it."
        }
      }
    ]
  }
  </script>

  <link rel="stylesheet" href="/assets/index.css" />
</head>
<body>
  <div id="root">
    <header>
      <nav>
        <a href="/">CiteSite</a>
        <a href="/about">About</a>
        <a href="/faq">FAQ</a>
      </nav>
    </header>

    <main>
      <h1>Frequently asked questions</h1>

      <section>
        <h2>What is a GEO audit?</h2>
        <p>
          A GEO (Generative Engine Optimisation) audit analyses how well a website
          is structured to be discovered, understood and cited by AI-powered search
          systems such as Google AI Overviews, Perplexity and ChatGPT. It evaluates
          dimensions including structured data, content clarity, E-E-A-T signals,
          entity coherence and crawler accessibility — the factors that determine
          whether an AI system treats a page as a trustworthy source.
        </p>
      </section>

      <section>
        <h2>What is an AIO score?</h2>
        <p>
          An AIO (AI Overview Optimisation) score measures how likely a webpage
          is to be selected and cited in an AI-generated search response. CiteSite
          calculates this score across six weighted dimensions: structured data,
          content quality, E-E-A-T signals, entity coherence, technical
          accessibility and metadata quality.
        </p>
      </section>

      <section>
        <h2>Is CiteSite free to use?</h2>
        <p>
          Yes. CiteSite is completely free. Enter any URL and receive a full GEO,
          SEO and AIO audit with dimension scores and prioritised recommendations.
          No account, email address or credit card is required.
        </p>
      </section>

      <section>
        <h2>How does CiteSite analyse a website?</h2>
        <p>
          CiteSite fetches the submitted URL, extracts the page content and
          structured data, then passes both to the Claude API (by Anthropic)
          alongside a structured six-dimension audit rubric. The model evaluates
          each dimension, assigns a score with a confidence level, and returns
          prioritised recommendations with specific remediation steps.
        </p>
      </section>

      <section>
        <h2>What are the six audit dimensions?</h2>
        <p>
          CiteSite audits websites across six dimensions:
        </p>
        <ol>
          <li><strong>Structured data</strong> — the presence and quality of JSON-LD schema markup.</li>
          <li><strong>Content quality</strong> — clarity, depth and answerability for AI systems.</li>
          <li><strong>E-E-A-T signals</strong> — visible evidence of experience, expertise, authoritativeness and trustworthiness.</li>
          <li><strong>Entity coherence</strong> — how clearly the site establishes its named entities and relationships.</li>
          <li><strong>Technical accessibility</strong> — crawler access, SSR status, robots.txt and llms.txt.</li>
          <li><strong>Metadata quality</strong> — title tags, meta descriptions and Open Graph completeness.</li>
        </ol>
      </section>

      <section>
        <h2>How does structured data affect AI search visibility?</h2>
        <p>
          Structured data — implemented via JSON-LD schema markup — converts
          ambiguous HTML into explicit, machine-readable facts. AI search systems
          use these facts to identify entities, verify claims and decide whether
          to cite a page. Without schema, an AI system must infer what a page is
          about from unstructured text. With it, the facts are stated directly:
          who the author is, what the content describes, when it was published and
          how it relates to other entities in the graph. This directness
          significantly increases citation probability.
        </p>
      </section>

      <section>
        <h2>How is CiteSite different from traditional SEO tools?</h2>
        <p>
          Traditional SEO tools optimise for keyword rankings by measuring
          backlinks, keyword density and technical crawl health. CiteSite optimises
          for answerability — the probability that an AI system selects your page
          as a cited source. This requires measuring different signals: entity
          clarity, schema depth, E-E-A-T credibility and content structure.
          The two approaches are complementary: CiteSite addresses the layer that
          traditional tools do not cover.
        </p>
      </section>
    </main>

    <footer>
      <p>
        <a href="/">Run an audit</a> ·
        <a href="/about">About CiteSite</a> ·
        <a href="https://pauloneilphotography.com">Paul O'Neil Photography</a>
      </p>
    </footer>
  </div>

  <script type="module" src="/assets/index.js"></script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, '') || '/';

    if (pathname === '/') {
      return new Response(HOMEPAGE_HTML, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }

    if (pathname === '/about') {
      return new Response(ABOUT_HTML, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }

    if (pathname === '/faq') {
      return new Response(FAQ_HTML, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }

    // Static assets (have file extensions) — pass through directly
    return env.ASSETS.fetch(request);
  }

    // Fetch the SPA shell for all route-level requests
    const shell = await env.ASSETS.fetch(
    new Request(new URL("/index.html", request.url), request),
  );

  // Admin panel — no SEO injection needed
  if(url.pathname === "/admin-audit") return shell;

  const postSlug = url.searchParams.get("post");

  // Blog post: /?post=<slug>
  if(postSlug) {
    const posts = await fetchManifest(env, request);
    const post = posts.find((p) => p.slug === postSlug);
    if (!post) return shell;

    const postUrl = `${SITE}/?post=${post.slug}`;
    const title = `${post.title} — CiteSite`;

    return new HTMLRewriter()
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
            `<script type="application/ld+json" data-schema="dynamic">${JSON.stringify(buildArticleSchema(post))}</script>` +
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
      })
      .on("#root", {
        element(el) {
          el.setInnerContent(`<article>${post.html}</article>`, {
            html: true,
          });
        },
      })
      .transform(shell);
  }

    // Homepage — static schema already in index.html; add OG/Twitter tags
    const homeTitle = "CiteSite — SEO & GEO Audit for the AI Search era";
  const homeDesc =
    "See how AI search engines see your website. Free SEO, GEO and AIO audit across six weighted dimensions.";

  return new HTMLRewriter()
    .on("head", {
      element(el) {
        el.append(
          `<meta property="og:type" content="website" />` +
          `<meta property="og:title" content="${ea(homeTitle)}" />` +
          `<meta property="og:description" content="${ea(homeDesc)}" />` +
          `<meta property="og:url" content="${ea(`${SITE}/`)}" />` +
          `<meta name="twitter:card" content="summary_large_image" />` +
          `<meta name="twitter:title" content="${ea(homeTitle)}" />` +
          `<meta name="twitter:description" content="${ea(homeDesc)}" />`,
          { html: true },
        );
      },
    })
    .transform(shell);
},
};
