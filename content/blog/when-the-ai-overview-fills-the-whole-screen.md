---
title: "When the AI Overview fills the whole screen: auto-expanding answers and
  what still earns a click"
date: 2026-09-26T13:00:00.000+02:00
category: Algorithm Updates
excerpt: Google is testing AI Overviews that load fully expanded, and the
  average one is already taller than a screen. Which content still earns a click
  when the answer pushes every organic result below the fold?
readTime: 6 min
featured: false
---
![](/images/blog/citesite-ai-overview.png)

````
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "When the AI Overview fills the whole screen: auto-expanding answers and what still earns a click",
      "description": "Google is testing AI Overviews that load fully expanded, and the average one is already taller than a screen. Which content still earns a click when the answer pushes every organic result below the fold?",
      "datePublished": "2026-09-26",
      "dateModified": "2026-09-26",
      "keywords": "AI Overviews, auto-expanding AI Overviews, zero-click search, click-through rate, AI citations, Search Console, generative engine optimisation",
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
        { "@type": "Thing", "name": "Google AI Overviews" },
        { "@type": "Thing", "name": "Zero-click search" },
        { "@type": "Thing", "name": "Click-through rate" }
      ],
      "mentions": [
        {
          "@type": "Organization",
          "name": "Google",
          "url": "https://www.google.com"
        },
        {
          "@type": "Organization",
          "name": "BrightEdge",
          "url": "https://www.brightedge.com"
        },
        {
          "@type": "Organization",
          "name": "Similarweb",
          "url": "https://www.similarweb.com"
        },
        {
          "@type": "Organization",
          "name": "Seer Interactive",
          "url": "https://www.seerinteractive.com"
        },
        {
          "@type": "Organization",
          "name": "Shopify",
          "url": "https://www.shopify.com"
        },
        { "@type": "Organization", "name": "Previsible" },
        {
          "@type": "NewsMediaOrganization",
          "name": "USA Today",
          "url": "https://www.usatoday.com"
        }
      ],
      "citation": [
        "https://9to5google.com/2026/08/31/google-search-ai-overviews-bigger/",
        "https://www.harridigital.co.uk/blog/google-september-2026-update-ai-overviews-expansion",
        "https://www.brightedge.com/resources/weekly-ai-search-insights",
        "https://www.digitalapplied.com/blog/similarweb-ai-overviews-43-percent-adoption",
        "https://thestacc.com/blog/google-ai-overview-statistics/",
        "https://searchengineland.com/shopify-ai-referrals-up-organic-search-leads-traffic-484962",
        "https://searchengineland.com/mastering-generative-engine-optimization-in-2026-full-guide-469142",
        "https://www.seroundtable.com/sept-2026-google-webmaster-report-41979.html",
        "https://ahrefs.com/blog/most-cited-domains-ai-overviews/",
        "https://www.semrush.com/blog/how-to-measure-ai-share-of-voice/",
        "https://searchengineland.com/usa-today-search-pressure-487003",
        "https://digiday.com/media/usa-today-co-is-reformatting-content-to-attract-more-ai-licensing-deals/"
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What are auto-expanding AI Overviews?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It's a Google test in which, for some queries, the full AI Overview loads automatically instead of a short summary behind a Show more button, pushing organic results further down the page. Google hasn't disclosed which queries trigger it."
          }
        },
        {
          "@type": "Question",
          "name": "How much do AI Overviews reduce clicks?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Seer Interactive data shows organic click-through rates falling 34–61% when an AI Overview is present, though pages cited in the Overview earn about 35% more clicks than uncited pages on the same results page."
          }
        },
        {
          "@type": "Question",
          "name": "What content still gets clicks when AI Overviews appear?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Content an AI summary can't replace: tools and calculators, original data, first-hand reviews and experience, transactions, in-depth material for high-stakes decisions, and downloadable or ongoing resources."
          }
        },
        {
          "@type": "Question",
          "name": "How should I measure performance when AI Overviews take most of the page?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Track AI feature impressions in Search Console's generative-AI reports, monitor citation share rather than rank alone, and connect AI visibility to conversions rather than sessions."
          }
        }
      ]
    }
  ]
}
```

````

*For twenty-five years, the fight in search was to reach the top of the page. For a growing share of queries, the top of the page is now all Google, and so is most of the rest.*

Google is widening a test of **auto-expanding AI Overviews**. For some queries, the full AI-generated answer now loads immediately instead of a short summary behind a "Show more" button, pushing traditional results further down the page. Google says expansion happens "where our systems determine it's most useful", but hasn't said which queries trigger it or how often ([9to5Google](https://9to5google.com/2026/08/31/google-search-ai-overviews-bigger/)). It's also bringing its generative-UI layer, which builds custom visual and interactive answers, from AI Mode into AI Overviews ([Harri Digital](https://www.harridigital.co.uk/blog/google-september-2026-update-ai-overviews-expansion)).

This is the sharpest version yet of the [zero-click search](/blog/article-what-is-zero-click-search) problem. It's worth looking at what the data says, and at what kinds of content still earn a visit when the answer takes up the whole screen.

## The numbers behind the squeeze

* **AI Overviews are everywhere.** Similarweb puts them on **43%** of searches, up from roughly 15% a year earlier ([Digital Applied, reporting TechCrunch](https://www.digitalapplied.com/blog/similarweb-ai-overviews-43-percent-adoption)); other trackers put the figure at around 48–50%. BrightEdge reports AI Overview coverage up **58% year on year**.
* **They're already bigger than a screen.** According to BrightEdge, the average AI Overview now takes up **more than a full viewport** before any scrolling, so the first organic result sits completely below the fold ([BrightEdge](https://www.brightedge.com/resources/weekly-ai-search-insights)). Auto-expansion makes that worse.
* **Clicks fall sharply.** Seer Interactive's data shows organic click-through rates falling **34–61%** when an AI Overview is present ([thestacc](https://thestacc.com/blog/google-ai-overview-statistics/)).
* **Even citation doesn't guarantee a visit.** A browsing study of a panel of 900 US adults found users clicked through to a source cited inside an AI Overview in only **about 1% of sessions** where one appeared.
* **But being cited still beats not being cited.** Pages cited in an AI Overview earn around **35% more clicks** than uncited pages on the same results page.

So the maths has changed. Fewer people click, and they're choosier about what they click on. The question isn't how to get the click back. It's which content still gives people a reason to leave the answer.

## What gets summarised, and what still gets clicked

This is our reading of the data rather than a formal study, but the pattern is consistent. An AI answer is very good at replacing content that is **self-contained and generic**, and poor at replacing content that is **specific, interactive or trusted in its own right**.

**Content that tends to get summarised and buried:**

* Definitions and "what is…" explainers
* Simple facts, dates, conversions and specifications
* Generic how-to steps that are the same on every site
* Listicles that recombine information available elsewhere

**Content that still gives people a reason to click:**

* **Tools and calculators.** An AI can describe a mortgage calculator; it can't be yours.
* **Original data and research.** People click to check the source, especially for figures they intend to reuse. Being the primary source is also what gets you cited in the first place, as we explain in [What the research actually says about GEO](/blog/what-the-research-actually-says-about-geo).
* **First-hand experience, reviews and opinion.** The summary tells you what people think; the click tells you what *this* person found.
* **Transactions.** Buying, booking and signing up still happen on your site.
* **Depth for high-stakes decisions.** Detailed comparisons, case studies and documentation that someone needs to read in full before committing.
* **Downloadable and ongoing assets.** Templates, datasets, newsletters and communities.

## Make the clicks you do get count

With fewer visits, each one matters more, and AI-referred visitors are often high-intent. Shopify's Q2 data found **AI-referred storefront sessions up 197% year on year**, with AI-referred shoppers converting at **roughly twice the rate** of organic visitors in research-heavy categories. Organic search still sent more total traffic, though ([Search Engine Land](https://searchengineland.com/shopify-ai-referrals-up-organic-search-leads-traffic-484962)).

But there's a catch. Previsible's analysis of 6.77 million AI-driven sessions across 166 sites found that ChatGPT sends about **28.8% of its referrals to sites' internal search pages** rather than to the page that actually answers the question ([Search Engine Land](https://searchengineland.com/mastering-generative-engine-optimization-in-2026-full-guide-469142)). If your site search results page is an afterthought, a large share of your most valuable new visitors is landing on it. Make sure it loads fast, works without JavaScript for crawlers, and shows useful results and clear next steps.

## Measure what's actually happening

If you report organic performance on clicks and sessions alone, auto-expanding Overviews will look like a slow-motion disaster, and you won't be able to tell which content is still working. At minimum:

* **Use Search Console's generative-AI reports.** They now cover AI Overviews, AI Mode and AI in Discover worldwide ([Search Engine Roundtable](https://www.seroundtable.com/sept-2026-google-webmaster-report-41979.html)). Track impressions in AI features separately from classic results.
* **Track citation, not just rank.** Ahrefs' monthly list of the [50 most-cited websites in AI Overviews](https://ahrefs.com/blog/most-cited-domains-ai-overviews/) is a useful benchmark for which domains Google favours in your category.
* **Tie visibility to outcomes.** Vendors are starting to connect AI share of voice to conversions: Semrush published a walkthrough in September for combining AI citation and sentiment data with GA4 conversion metrics ([Semrush](https://www.semrush.com/blog/how-to-measure-ai-share-of-voice/)).
* **Expect volatility.** AI features change weekly. Before you react to a drop, run through our [verification checklist](/blog/your-ai-visibility-can-vanish-overnight).

## What publishers are doing about it

USA Today offers a rare, concrete example. In response to sustained pressure from AI Overviews and falling search referrals, it replaced its audience team with three new desks: Central Production, Content Pillars Audience and Strategic Platforms. It's reformatting content to attract AI licensing deals and monitoring what gets cited in AI Overviews ([Search Engine Land](https://searchengineland.com/usa-today-search-pressure-487003), [Digiday](https://digiday.com/media/usa-today-co-is-reformatting-content-to-attract-more-ai-licensing-deals/)). Most businesses won't restructure a newsroom, but the principle scales: treat AI answers as a channel with its own strategy, not as a traffic leak to be mourned.

## Frequently asked questions

**What are auto-expanding AI Overviews?** It's a Google test in which, for some queries, the full AI Overview loads automatically instead of a short summary behind a "Show more" button. It pushes organic results further down the page. Google hasn't disclosed which queries trigger it.

**How much do AI Overviews reduce clicks?** Seer Interactive data shows organic click-through rates falling 34–61% when an AI Overview is present, though pages cited in the Overview earn about 35% more clicks than uncited pages on the same results page.

**What content still gets clicks when AI Overviews appear?** Content an AI summary can't replace: tools and calculators, original data, first-hand reviews and experience, transactions, in-depth material for high-stakes decisions, and downloadable or ongoing resources.

**How should I measure performance when AI Overviews take most of the page?** Track AI feature impressions in Search Console's generative-AI reports, monitor citation share rather than rank alone, and connect AI visibility to conversions rather than sessions.

## The kicker

Google has spent a quarter of a century sending people somewhere else. Auto-expanding Overviews are the clearest sign yet that, for a growing share of questions, it would rather they stayed. You can't win back the click for questions an answer fully resolves. You can make sure that when someone does need more than the answer, the thing they need is on your site.

*Want to know whether your pages are built to be cited, and worth clicking? [Run a free CiteSite audit](/).*

*Sources: [9to5Google: Google is making AI Overviews even bigger on some search queries](https://9to5google.com/2026/08/31/google-search-ai-overviews-bigger/); [Harri Digital: Google September 2026 update, AI Overviews expansion explained](https://www.harridigital.co.uk/blog/google-september-2026-update-ai-overviews-expansion); [BrightEdge weekly AI search insights](https://www.brightedge.com/resources/weekly-ai-search-insights); [Digital Applied: Similarweb AI Overviews at 43% adoption](https://www.digitalapplied.com/blog/similarweb-ai-overviews-43-percent-adoption); [thestacc: Google AI Overviews statistics](https://thestacc.com/blog/google-ai-overview-statistics/); [Search Engine Land: Shopify AI referrals up, organic search still leads](https://searchengineland.com/shopify-ai-referrals-up-organic-search-leads-traffic-484962); [Search Engine Land: mastering generative engine optimization in 2026 (Previsible data)](https://searchengineland.com/mastering-generative-engine-optimization-in-2026-full-guide-469142); [Search Engine Roundtable: September 2026 Google webmaster report](https://www.seroundtable.com/sept-2026-google-webmaster-report-41979.html); [Ahrefs: the 50 most-cited websites in Google AI Overviews](https://ahrefs.com/blog/most-cited-domains-ai-overviews/); [Semrush: how to measure AI share of voice](https://www.semrush.com/blog/how-to-measure-ai-share-of-voice/); [Search Engine Land: USA Today and search pressure](https://searchengineland.com/usa-today-search-pressure-487003); [Digiday: USA Today Co. reformatting content for AI licensing deals](https://digiday.com/media/usa-today-co-is-reformatting-content-to-attract-more-ai-licensing-deals/).*

- - -

## SEO metadata

* **Primary keyword:** auto-expanding AI Overviews
* **Secondary keywords:** AI Overviews click-through rate, zero-click search 2026, content that gets clicks, AI Overviews below the fold, Search Console AI reports
* **Meta description:** Google is testing AI Overviews that load fully expanded, pushing organic results below the fold. Which content still earns a click, and how to measure it.

## Schema markup
