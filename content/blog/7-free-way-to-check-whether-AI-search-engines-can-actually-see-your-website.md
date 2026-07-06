# 7 free ways to check whether AI search engines can actually see your website

Most site owners have run a Google PageSpeed test. Far fewer have checked whether ChatGPT, Perplexity or Google's AI Overviews can actually read, understand and cite their content. That's a different question, and increasingly a more important one.

Generative engine optimisation (GEO) is the discipline of making your website legible to AI systems rather than just crawlable by traditional search bots. The two overlap, but they're not the same thing — a page can rank perfectly well on Google while being invisible to an LLM that's summarising answers rather than indexing pages.

Here are seven free ways to check where you stand, roughly in order of how much each one actually tells you.

### 1. Google's Rich Results Test

This checks whether your structured data validates against Schema.org specifications. It's a useful first pass and it's free, but it only confirms that your markup is syntactically correct — not that it's complete, not that an AI crawler can reach it, and not that it covers the entity types that matter for GEO (Organization, Person, FAQPage and so on).

### 2. Schema.org's own validator

A second opinion on markup validity, useful for catching errors the Rich Results Test misses. Same limitation applies: it tells you your JSON-LD is well-formed, not that it's strategically useful.

### 3. View source vs rendered DOM

Open your homepage, view source, and compare it against what actually renders in the browser. If your schema, headings and core content only appear after JavaScript executes, many AI crawlers will never see them. This is the single most common reason a well-optimised-looking React or Vue site is invisible to generative search — the crawler sees an empty shell. It's free, it takes thirty seconds, and almost nobody does it.

### 4. Ask the AI directly

Query ChatGPT, Perplexity or Claude with a question your site should plausibly answer, and see whether you're cited. This is the most honest test there is, but it's also the least systematic — one favourable answer doesn't tell you why, and one bad answer doesn't tell you what to fix.

### 5. An llms.txt check

A growing number of sites now publish an `llms.txt` file at their root, signalling to AI crawlers what content is available and how it should be interpreted. Checking whether you have one — and whether it's accurate — is a five-minute task that most competitors still haven't done.

### 6. A manual entity audit

Does your About page clearly state who you are? Do you have consistent `sameAs` links connecting your website to your LinkedIn, Crunchbase or other verified profiles? AI systems build confidence in citing you through named entity recognition (NER) and corroboration across sources. A page with no entity signals is much harder for a model to trust, however well-written the content is.

### 7. A weighted, automated audit

Doing the above six manually is informative but slow, and none of them give you a single comparable score across visits. This is the gap CiteSite was built to close: a free, web-based tool that runs your URL through a weighted set of GEO dimensions — structured data coverage, server-side renderability, entity signals, content structure and more — and returns a score with specific, prioritised recommendations.

It doesn't replace the manual checks above; it consolidates them into one pass so you know where to focus first. There's no account required and no data is stored after your report is generated.

### Where to start

If you only have ten minutes, do two things: view source on your homepage to check what's actually reaching crawlers, and run your URL through a free audit to get a structured baseline. Everything else on this list is worth doing eventually, but those two will tell you the most for the least effort.

---

*CiteSite is a free AI visibility audit tool. Run your site at [citesite.net](https://citesite.net).*

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "7 free ways to check whether AI search engines can actually see your website",
  "description": "Seven free methods to check whether your website is visible to AI search engines and generative answer systems, ranked by how much each one actually tells you.",
  "articleBody": "Most site owners have run a Google PageSpeed test. Far fewer have checked whether ChatGPT, Perplexity or Google's AI Overviews can actually read, understand and cite their content. Generative engine optimisation (GEO) is the discipline of making your website legible to AI systems rather than just crawlable by traditional search bots.",
  "author": {
    "@type": "Person",
    "name": "Paul O'Neil",
    "jobTitle": "GEO Specialist",
    "worksFor": {
      "@type": "Organization",
      "name": "CiteSite"
    }
  },
  "keywords": "GEO, generative engine optimisation, AI visibility, AIO, AI Overviews, structured data, JSON-LD, schema markup, llms.txt, AI search",
  "articleSection": "AI Search",
  "publisher": {
    "@type": "Organization",
    "name": "CiteSite"
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://citesite.net/blog/7-free-ways-to-check-ai-visibility"
  }
}
</script>
