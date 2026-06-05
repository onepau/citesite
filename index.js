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
