---
title: "Is your site blocking AI search without knowing it? Checking your AI crawler settings in autumn 2026"
date: 2026-09-28T09:00:00.000+02:00
category: Technical Guide
excerpt: Cloudflare changed its AI bot defaults on 15 September and Google is adding a separate AI Overviews opt-out. Here's how to check what AI search engines can actually reach, and what you give up by blocking them.
readTime: 7 min
featured: false
---

![A website behind three glowing turnstiles for search, agent and training crawlers: the search gate is open while the agent and training gates are padlocked](/images/blog/is-your-site-blocking-ai-search-without-knowing-it.png "Search, agent and training crawlers now pass through separate gates")

_Three separate switches now decide whether AI search engines can read your content: your robots.txt, your CDN and Google's own settings. Most sites have deliberately set one of them. Some have set none._

For most of the web's history, "can search engines see my site?" had a one-line answer: check robots.txt. That stopped being true this summer. Between a change to Cloudflare's defaults, a new opt-out from Google and a steady rise in AI crawler traffic, whether ChatGPT, Claude, Perplexity or Google's AI Overviews can reach your pages now depends on several settings that live in different places, owned by different people and often left at their defaults.

This is a practical guide to finding those settings, understanding what each controls and deciding, deliberately, what you want AI systems to be able to do with your content.

## What changed this summer

**Cloudflare split AI traffic into three categories.** Cloudflare now sorts AI bot traffic into _Search_, _Agent_ and _Training_. Under its new defaults, which took effect on 15 September, Agent and Training bots are blocked by default on ad-bearing pages for new domains. Search crawlers are treated separately, so a site can allow AI search while refusing model training. Cloudflare sits in front of a very large share of the web, so this one change shifts many sites' behaviour without anyone touching a config file. ([Cloudflare blog](https://blog.cloudflare.com/content-independence-day-ai-options/), [Cloudflare changelog](https://developers.cloudflare.com/changelog/post/2026-07-01-ai-traffic-options/))

**Google is adding an AI-only opt-out.** Google is adding a setting that lets site owners keep their content out of AI Overviews and AI Mode specifically, without blocking regular Search or its AI training crawlers. At the same time, Search Console's generative-AI performance reports, covering AI Overviews, AI Mode and AI in Discover, completed their worldwide rollout on 31 August. ([Search Engine Roundtable](https://www.seroundtable.com/sept-2026-google-webmaster-report-41979.html))

**AI crawlers are busier, and most sites haven't decided anything.** GPTBot traffic is reportedly up 305% year on year ([Passionfruit](https://www.getpassionfruit.com/blog/javascript-rendering-and-ai-crawlers-can-llms-read-your-spa)), yet BrightEdge's tracking finds that only 19% of sites have specific crawl rules for ChatGPT's bots ([BrightEdge](https://www.brightedge.com/resources/weekly-ai-search-insights)). The other 81% are running on whatever their CMS, host or CDN happens to do.

## The three layers that decide what AI can see

It helps to think of AI access as three layers, checked in this order.

### Layer 1: robots.txt (what you ask for)

robots.txt is a request, not a lock, but the major AI companies say they respect it, and each now runs several crawlers with different jobs. The distinction that matters most is **search versus training**:

- **OpenAI:** `OAI-SearchBot` fetches pages for ChatGPT search results; `GPTBot` collects content for model training; `ChatGPT-User` fetches a page when a user asks ChatGPT to visit it. ([OpenAI crawler documentation](https://platform.openai.com/docs/bots))
- **Google:** `Googlebot` feeds Search, _including_ AI Overviews and AI Mode. `Google-Extended` is a separate token that controls use of your content for Gemini model training and grounding; it does not remove you from Search or AI Overviews. ([Google crawler documentation](https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers))
- **Anthropic and Perplexity** follow a similar pattern, with separate agents for training, search indexing and user-initiated fetches. Check each company's current documentation, because the agent names change more often than you'd hope.

The most common mistake we see is a blanket block, often copied from a 2023 "block the AI scrapers" guide, that shuts out the _search_ crawlers along with the training ones. The result is a site that has opted out of being cited while believing it has only opted out of being trained on.

### Layer 2: your CDN or firewall (what actually gets through)

This is the layer most site owners forget, because it doesn't live in the codebase. Your robots.txt can welcome `OAI-SearchBot` while Cloudflare's bot management, a WAF rule or a "block AI bots" toggle turned on during a scraping panic quietly returns a 403.

If you're on Cloudflare, open **Security → Bots** (the exact labels vary by plan) and check how the Search, Agent and Training categories are set for your zone. If your domain was added recently, the new defaults may apply. On other CDNs and hosts, look for bot-management or "AI crawler" settings, and check your server logs for 403 or 429 responses served to known AI user agents.

### Layer 3: platform controls (what gets shown)

Even when a crawler can fetch your page, the platform decides how your content may appear. On Google, that means the existing snippet controls (`nosnippet`, `data-nosnippet` and `max-snippet`), which also govern what can be quoted in AI Overviews, and soon the dedicated AI Overviews/AI Mode opt-out.

## The trade-off nobody mentions: opting out has a price

Blocking AI features isn't free. Tracking data published in August shows that **Top Stories carousels now render inside AI Overviews** for trending US news queries, which means a publisher that opts out of AI features may also lose that placement ([Search Engine Land](https://searchengineland.com/ai-overview-data-51000-tracked-events-485080)). The line between "AI answer" and "search result" is getting blurrier, and an opt-out designed to protect content may also cut off traffic you actually want.

That doesn't mean everyone should allow everything. Publishers negotiating licensing deals, sites with paywalled content and businesses with genuine scraping problems all have good reasons to be selective. The point is to make the decision on purpose, with the costs in view.

## A 20-minute AI access audit

1. **Read your robots.txt as a crawler would.** Visit `yourdomain.com/robots.txt` and list every AI-related user agent it mentions. For each one, write down whether it's a search, training or user-fetch crawler, and whether that matches what you intend.
2. **Check the CDN layer.** Log in to Cloudflare (or your CDN/host) and note the current AI bot settings. Pay special attention if the domain was set up recently.
3. **Test with a real user agent.** From a terminal, request a key page while identifying as an AI crawler, for example `curl -I -A "OAI-SearchBot" https://yourdomain.com/your-page`. A `200` is good; a `403` means something between you and the crawler is saying no. (Some firewalls also verify crawler IP ranges, so treat a `200` here as necessary rather than sufficient.)
4. **Search your server logs** for GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot and Googlebot. If a crawler you've allowed never appears, or appears only with error responses, you have a problem.
5. **Look at Search Console's generative-AI reports.** Now that they're available worldwide, they're the most direct evidence of whether your pages are appearing in AI Overviews and AI Mode at all.
6. **Write down your policy** in one sentence, such as "We allow AI search and user fetches, and block training." Then check that all three layers actually implement it.

Once access is sorted, the next question is whether crawlers can read what they fetch. Many can't run JavaScript, which we cover in [GPTBot can't see your JavaScript](/blog/gptbot-cant-see-your-javascript). For the broader checklist, see [7 free ways to check whether AI search engines can actually see your website](/blog/7-free-way-to-check-whether-AI-search-engines-can-actually-see-your-website), and for the case for signposting your content to AI crawlers, [the importance of having an llms.txt file](/blog/the-importance-of-having-an-llms-txt-file).

## Frequently asked questions

**Does blocking GPTBot remove my site from ChatGPT search?** Not on its own. OpenAI uses `GPTBot` for training and `OAI-SearchBot` for search, so you can block one and allow the other. But a CDN or firewall rule that blocks AI bots in general may block both.

**Does blocking Google-Extended remove me from AI Overviews?** No. AI Overviews and AI Mode draw on Google's normal Search index, which is crawled by Googlebot. Google-Extended controls use of your content for Gemini training and grounding. Google is adding a separate control for AI Overviews and AI Mode specifically.

**What did Cloudflare change on 15 September 2026?** Cloudflare now classifies AI bot traffic as Search, Agent or Training, and blocks Agent and Training bots by default on ad-bearing pages for new domains. Existing settings should be reviewed rather than assumed.

**Should I block AI crawlers?** It depends on your business model. Blocking training crawlers while allowing search crawlers is a common middle ground. Blocking AI search features entirely can cost visibility, including, for news publishers, Top Stories placements that now appear inside AI Overviews.

## The kicker

For twenty-five years, the web's welcome mat was a text file. It still matters, but it now shares the doorway with a CDN dashboard and a Google toggle, and they don't always agree. The sites that come out of this well won't necessarily be the ones that let every bot in. They'll be the ones that know exactly which bots they've let in, and why.

_Want to know how your site looks to AI crawlers right now? [Run a free CiteSite audit](/): it checks crawler access, server-side renderability and structured data in one pass._

_Sources: [Cloudflare: new AI traffic options for all customers](https://blog.cloudflare.com/content-independence-day-ai-options/); [Cloudflare changelog: new options to manage AI traffic](https://developers.cloudflare.com/changelog/post/2026-07-01-ai-traffic-options/); [Search Engine Roundtable: September 2026 Google webmaster report](https://www.seroundtable.com/sept-2026-google-webmaster-report-41979.html); [BrightEdge weekly AI search insights](https://www.brightedge.com/resources/weekly-ai-search-insights); [Search Engine Land: AI Overview data from 51,000 tracked events](https://searchengineland.com/ai-overview-data-51000-tracked-events-485080); [Passionfruit: JavaScript rendering and AI crawlers](https://www.getpassionfruit.com/blog/javascript-rendering-and-ai-crawlers-can-llms-read-your-spa); [OpenAI crawler documentation](https://platform.openai.com/docs/bots); [Google common crawlers documentation](https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers)._

---

## SEO metadata

- **Primary keyword:** AI crawler settings
- **Secondary keywords:** block AI crawlers, Cloudflare AI bots, OAI-SearchBot vs GPTBot, Google-Extended, AI Overviews opt-out, robots.txt for AI
- **Meta description:** Cloudflare changed its AI bot defaults on 15 September and Google is adding an AI Overviews opt-out. How to check what AI search engines can reach.

## Schema markup

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Is your site blocking AI search without knowing it? Checking your AI crawler settings in autumn 2026",
      "description": "Cloudflare changed its AI bot defaults on 15 September and Google is adding a separate AI Overviews opt-out. How to check what AI search engines can reach, and what you give up by blocking them.",
      "datePublished": "2026-09-26",
      "dateModified": "2026-09-26",
      "keywords": "AI crawler settings, robots.txt, GPTBot, OAI-SearchBot, Google-Extended, Cloudflare AI bots, AI Overviews opt-out, generative engine optimisation",
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
        { "@type": "Thing", "name": "Web crawler" },
        { "@type": "Thing", "name": "robots.txt" },
        { "@type": "Thing", "name": "Generative engine optimization" }
      ],
      "mentions": [
        {
          "@type": "Organization",
          "name": "Cloudflare",
          "url": "https://www.cloudflare.com"
        },
        {
          "@type": "Organization",
          "name": "OpenAI",
          "url": "https://openai.com"
        },
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
          "@type": "SoftwareApplication",
          "name": "Google Search Console",
          "url": "https://search.google.com/search-console"
        }
      ],
      "citation": [
        "https://blog.cloudflare.com/content-independence-day-ai-options/",
        "https://developers.cloudflare.com/changelog/post/2026-07-01-ai-traffic-options/",
        "https://www.seroundtable.com/sept-2026-google-webmaster-report-41979.html",
        "https://www.brightedge.com/resources/weekly-ai-search-insights",
        "https://searchengineland.com/ai-overview-data-51000-tracked-events-485080",
        "https://platform.openai.com/docs/bots",
        "https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers"
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Does blocking GPTBot remove my site from ChatGPT search?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Not on its own. OpenAI uses GPTBot for training and OAI-SearchBot for search, so you can block one and allow the other. A CDN or firewall rule that blocks AI bots in general may block both."
          }
        },
        {
          "@type": "Question",
          "name": "Does blocking Google-Extended remove me from AI Overviews?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. AI Overviews and AI Mode draw on Google's normal Search index, crawled by Googlebot. Google-Extended controls use of content for Gemini training and grounding. Google is adding a separate control for AI Overviews and AI Mode specifically."
          }
        },
        {
          "@type": "Question",
          "name": "What did Cloudflare change on 15 September 2026?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Cloudflare now classifies AI bot traffic as Search, Agent or Training, and blocks Agent and Training bots by default on ad-bearing pages for new domains."
          }
        },
        {
          "@type": "Question",
          "name": "Should I block AI crawlers?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It depends on your business model. Blocking training crawlers while allowing search crawlers is a common middle ground. Blocking AI search features entirely can cost visibility, including Top Stories placements that now appear inside AI Overviews."
          }
        }
      ]
    }
  ]
}
```
