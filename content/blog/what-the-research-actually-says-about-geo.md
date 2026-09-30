---
title: "What the research actually says about GEO (and what it doesn't)"
date: 2026-09-30T12:00:00.000+02:00
category: Strategy
excerpt: A survey of 45 GEO studies, a 252,000-trial citation experiment and 17 million AI citations point to a smaller, sturdier set of levers than most GEO checklists suggest. Here's what the evidence supports, and what it doesn't.
readTime: 6 min
featured: true
---

![A magnifying glass focuses on three connected icons (a document, a target and a rising chart) while scattered checklist, star and tag icons drift out of focus](/images/blog/what-the-research-actually-says-about-geo.png "The evidence points to a few sturdy levers, not a long checklist")

_The GEO industry has produced a great many checklists. The research community has produced rather fewer certainties. It's worth knowing the difference before you spend next quarter's content budget._

Generative engine optimisation grew up fast, and much of its received wisdom arrived before the evidence did. Add statistics. Add quotations. Add schema. Write longer. Rewrite for "citability". Some of that advice holds up. Some of it doesn't. This summer brought the most rigorous look yet at which is which.

## The state of the evidence: messier than the checklists suggest

In July, researchers published _Optimizing Visibility in Generative Engines: A Critical Survey of Generative Engine Optimization (2023–2026)_, reviewing **45 studies** published between November 2023 and July 2026 ([arXiv](https://arxiv.org/abs/2607.14035)). Its headline conclusions are sobering:

- **The field doesn't yet agree on terms, metrics or standards of evidence.** Different studies measure "visibility" in incompatible ways, which makes many results hard to compare.
- **No technique reviewed shows a stable, long-term effect across platforms.** Tactics that work on one engine, one month, in one experimental set-up often fail to transfer.
- **Generic heuristics transfer poorly**, and gains can be eroded by competition: when everyone applies the same trick, nobody benefits.
- **Citation-oriented rewrites can actually harm retrieval.** Editing a page to look more "citable" can make it less likely to be found in the first place.

The one robust finding? Content that has _already been retrieved_ can causally influence whether it gets cited. That points to a two-stage process, and it's the key to most of what follows.

## Two gates, not one

Think of an AI answer as having two gates. First, your page has to be **retrieved**: found and pulled into the pool of candidate sources. Then it has to be **cited**: chosen from that pool to support the answer.

One large factorial experiment highlighted in the survey, **252,000 controlled trials across six LLMs and 18 content factors**, tested what decides the second gate. Its conclusion: **relevance and position** are the primary determinants of which source gets cited first. Citation behaves like a bottleneck _after_ retrieval, and it rewards the source that most directly answers the question, most prominently ([arXiv survey](https://arxiv.org/abs/2607.14035)).

That's consistent with the survey: topical relevance and the position of the answer within the context are the most reproducible levers. It's also a fairly unglamorous result. The most reliable way to be cited is to answer the question clearly, early and precisely.

## What the large-scale data adds

Lab experiments are one thing; the live web is another. Two large studies from Ahrefs this summer fill in the picture:

- **Freshness matters.** Across **17 million citations on seven AI platforms**, AI assistants showed a preference for fresher content ([Ahrefs](https://ahrefs.com/blog/do-ai-assistants-prefer-to-cite-fresh-content/)).
- **Adding schema alone didn't move citations.** In a study of **1,885 pages that added JSON-LD**, Ahrefs found no meaningful uplift in AI citations ([Ahrefs](https://ahrefs.com/blog/schema-ai-citations/)).

That second finding deserves an honest word from us. We've argued that [JSON-LD is the hidden layer behind AI visibility](/blog/from-seo-to-geo-why-json-ld-is-the-hidden-layer-behind-ai-visibility), and we still think structured data matters. It tells machines unambiguously what a page is, who wrote it and which entities it's about, which helps with accuracy, entity recognition and eligibility for rich results. But the evidence says it isn't a citation lever in its own right. Schema helps AI systems get your facts right; it doesn't persuade them to choose you.

Meanwhile, on the content side, Search Engine Land's analysis found that the **theme of a blog post predicts LLM traffic more reliably than almost any other variable**, and that **shorter posts built around unique data outperform long "comprehensive" guides** ([Search Engine Land](https://searchengineland.com/seo-geo-gap-ai-search-traffic-organic-traffic-478731)). Length, it turns out, is not a proxy for citability.

## What this means in practice

Pulling the threads together, here's what the evidence currently supports, from strongest to weakest:

1. **Be the most relevant answer.** Relevance is the one lever every study agrees on. Pick narrower questions you can answer better than anyone, rather than broad topics you can only answer as well as everyone.
2. **Put the answer first.** Position matters. Lead with the direct answer, the key figure or the definition, then elaborate.
3. **Get retrieved before you worry about being cited.** Technical access, rendering and ordinary search visibility come first. You can't win the second gate without passing the first. (See [Is your site blocking AI search without knowing it?](/blog/is-your-site-blocking-ai-search-without-knowing-it) and [GPTBot can't see your JavaScript](/blog/gptbot-cant-see-your-javascript).)
4. **Keep important pages fresh.** Update and re-date content when facts genuinely change.
5. **Publish something only you have.** Original data, first-hand experience and specific examples. This is the thread running through the Search Engine Land findings and through [E-E-A-T](/blog/e-e-a-t-the-credibility-layer).
6. **Treat schema as hygiene, not a hack.** Implement it properly for accuracy and entity clarity; don't expect it to lift citations on its own.
7. **Be sceptical of "citation rewrites".** Rewriting pages to game AI citation risks harming retrieval, and Google's [June 2026 spam update](https://searchengineland.com/google-releases-june-2026-spam-update-481002) explicitly brought AI manipulation tactics into scope. We looked at the darker side of this in [GEO as a threat surface](/blog/geo-as-a-threat-surface).

And one organisational finding worth noting: in Semrush's 2026 AI Visibility Index, **81% of organisations that run SEO and AI visibility as one workflow** reported more traffic or leads from AI platforms, against **36%** of those managing the two separately ([Semrush](https://www.semrush.com/news/463141-semrush-releases-expanded-2026-ai-visibility-index-analyzing-126-million-ai-search-prompts/)). That's a survey correlation, not proof of cause, but it matches Google's own position that GEO is, in large part, [good SEO applied to a new surface](/blog/what-is-geo).

## Frequently asked questions

**What actually gets content cited by AI search engines?** The most consistent research finding is that relevance and position matter most: the source that answers the question most directly, and most prominently, tends to be cited first. Content must first be retrieved, so technical accessibility and search visibility come before citation.

**Does adding schema markup increase AI citations?** A 2026 Ahrefs study of 1,885 pages that added JSON-LD found no meaningful citation uplift. Structured data still helps AI systems interpret pages and entities accurately, but it isn't a citation lever on its own.

**Do AI assistants prefer fresh content?** Yes. Ahrefs' analysis of 17 million citations across seven AI platforms found a preference for fresher content.

**Are long-form guides better for GEO?** Not necessarily. Search Engine Land's analysis found shorter posts built around unique data outperformed long "comprehensive" guides, and that topic predicted LLM traffic better than length.

**Is there proof that GEO techniques work?** A 2026 survey of 45 GEO studies found no technique with a stable, long-term effect across platforms. The most reliable levers are relevance and the position of the answer, not platform-specific tricks.

## The kicker

After two and a half years and 45 studies, the most reproducible finding in generative engine optimisation is that you should answer the question, clearly, near the top of the page. It's not the sexy answer the industry was hoping for, but it has the considerable advantage of being true.

_Want to know how your pages score on the fundamentals that the evidence supports? [Run a free CiteSite audit](/)._

_Sources: [Optimizing Visibility in Generative Engines: A Critical Survey of Generative Engine Optimization (2023–2026), arXiv 2607.14035](https://arxiv.org/abs/2607.14035); [Ahrefs: do AI assistants prefer to cite fresh content?](https://ahrefs.com/blog/do-ai-assistants-prefer-to-cite-fresh-content/); [Ahrefs: does schema markup increase AI citations?](https://ahrefs.com/blog/schema-ai-citations/); [Search Engine Land: the SEO–GEO gap](https://searchengineland.com/seo-geo-gap-ai-search-traffic-organic-traffic-478731); [Semrush: 2026 AI Visibility Index](https://www.semrush.com/news/463141-semrush-releases-expanded-2026-ai-visibility-index-analyzing-126-million-ai-search-prompts/)._

---

## SEO metadata

- **Primary keyword:** GEO research
- **Secondary keywords:** what gets cited by AI, does schema increase AI citations, generative engine optimization evidence, AI citation study, GEO myths
- **Meta description:** 45 GEO studies, a 252,000-trial experiment and 17 million AI citations: what the evidence says actually gets content cited by AI search, and what doesn't.

## Schema markup

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "What the research actually says about GEO (and what it doesn't)",
      "description": "A survey of 45 GEO studies, a 252,000-trial citation experiment and 17 million AI citations point to a smaller, sturdier set of levers than most GEO checklists suggest.",
      "datePublished": "2026-09-26",
      "dateModified": "2026-09-26",
      "keywords": "generative engine optimisation, GEO research, AI citations, relevance, content freshness, schema markup, JSON-LD, AI search",
      "author": {
        "@type": "Person",
        "name": "Paul O'Neil",
        "jobTitle": "GEO strategist",
        "worksFor": {
          "@type": "Organization",
          "@id": "https://citesite.net/#organization",
          "name": "CiteSite"
        }
      },
      "about": [
        { "@type": "Thing", "name": "Generative engine optimization" },
        { "@type": "Thing", "name": "Retrieval-augmented generation" },
        { "@type": "Thing", "name": "Citation" }
      ],
      "mentions": [
        {
          "@type": "ScholarlyArticle",
          "name": "Optimizing Visibility in Generative Engines: A Critical Survey of Generative Engine Optimization (2023–2026)",
          "url": "https://arxiv.org/abs/2607.14035"
        },
        {
          "@type": "Organization",
          "name": "Ahrefs",
          "url": "https://ahrefs.com"
        },
        {
          "@type": "Organization",
          "name": "Semrush",
          "url": "https://www.semrush.com"
        }
      ],
      "citation": [
        "https://arxiv.org/abs/2607.14035",
        "https://ahrefs.com/blog/do-ai-assistants-prefer-to-cite-fresh-content/",
        "https://ahrefs.com/blog/schema-ai-citations/",
        "https://searchengineland.com/seo-geo-gap-ai-search-traffic-organic-traffic-478731",
        "https://www.semrush.com/news/463141-semrush-releases-expanded-2026-ai-visibility-index-analyzing-126-million-ai-search-prompts/"
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What actually gets content cited by AI search engines?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The most consistent research finding is that relevance and position matter most: the source that answers the question most directly, and most prominently, tends to be cited first. Content must first be retrieved, so technical accessibility and search visibility come before citation."
          }
        },
        {
          "@type": "Question",
          "name": "Does adding schema markup increase AI citations?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A 2026 Ahrefs study of 1,885 pages that added JSON-LD found no meaningful citation uplift. Structured data still helps AI systems interpret pages and entities accurately, but it isn't a citation lever on its own."
          }
        },
        {
          "@type": "Question",
          "name": "Do AI assistants prefer fresh content?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Ahrefs' analysis of 17 million citations across seven AI platforms found a preference for fresher content."
          }
        },
        {
          "@type": "Question",
          "name": "Are long-form guides better for GEO?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Not necessarily. Search Engine Land's analysis found shorter posts built around unique data outperformed long comprehensive guides, and that topic predicted LLM traffic better than length."
          }
        },
        {
          "@type": "Question",
          "name": "Is there proof that GEO techniques work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A 2026 survey of 45 GEO studies found no technique with a stable, long-term effect across platforms. The most reliable levers are relevance and the position of the answer, not platform-specific tricks."
          }
        }
      ]
    }
  ]
}
```
