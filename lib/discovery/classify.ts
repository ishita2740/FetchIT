import type { DiscoveredSource } from "@/lib/ai/schema";

/**
 * Classifies a URL domain to the closest FetchIT source type.
 * Used consistently across SerpApi, Tavily, and other discovery providers.
 */
export function classifySourceType(url: string): DiscoveredSource["type"] {
  const hostname = (() => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();

  if (!hostname) return "public_web";

  // Government domains (India and international)
  if (
    hostname.endsWith(".gov") ||
    hostname.endsWith(".gov.in") ||
    hostname.endsWith(".nic.in") ||
    hostname.endsWith(".gov.uk") ||
    hostname.endsWith(".gov.au") ||
    hostname.includes("pib.gov.in") ||
    hostname.includes("startupindia.gov.in") ||
    hostname.includes("dpiit.gov.in")
  ) {
    return "government";
  }

  // Research / academic domains
  if (
    hostname.endsWith(".edu") ||
    hostname.endsWith(".ac.in") ||
    hostname.endsWith(".ac.uk") ||
    hostname.includes("arxiv.org") ||
    hostname.includes("scholar.google") ||
    hostname.includes("researchgate.net") ||
    hostname.includes("pubmed") ||
    hostname.includes("ieee.org") ||
    hostname.includes("springer.com") ||
    hostname.includes("nature.com") ||
    hostname.includes("sciencedirect.com") ||
    hostname.includes("iit.ac.in") ||
    hostname.includes("iisc.ac.in")
  ) {
    return "research";
  }

  // Reputable business & tech news publications
  if (
    hostname.includes("reuters.com") ||
    hostname.includes("bloomberg.com") ||
    hostname.includes("techcrunch.com") ||
    hostname.includes("cnbc.com") ||
    hostname.includes("bbc.com") ||
    hostname.includes("bbc.co.uk") ||
    hostname.includes("nytimes.com") ||
    hostname.includes("theguardian.com") ||
    hostname.includes("economictimes") ||
    hostname.includes("livemint.com") ||
    hostname.includes("moneycontrol.com") ||
    hostname.includes("ndtv.com") ||
    hostname.includes("thehindu.com") ||
    hostname.includes("hindustantimes.com") ||
    hostname.includes("inc42.com") ||
    hostname.includes("yourstory.com") ||
    hostname.includes("entrackr.com") ||
    hostname.includes("forbes.com") ||
    hostname.includes("fortune.com") ||
    hostname.includes("financialexpress.com")
  ) {
    return "news";
  }

  // Documentation / wikis
  if (
    hostname.includes("wikipedia.org") ||
    hostname.includes("docs.") ||
    hostname.includes("documentation") ||
    hostname.includes("wiki") ||
    hostname.includes("github.com") ||
    hostname.includes("huggingface.co")
  ) {
    return "documentation";
  }

  // Public datasets / company registries / databases
  if (
    hostname.includes("kaggle.com") ||
    hostname.includes("data.gov") ||
    hostname.includes("dataworld") ||
    hostname.includes("statista.com") ||
    hostname.includes("worldbank.org") ||
    hostname.includes("un.org") ||
    hostname.includes("census") ||
    hostname.includes("crunchbase.com") ||
    hostname.includes("tracxn.com") ||
    hostname.includes("pitchbook.com") ||
    hostname.includes("zaubacorp.com")
  ) {
    return "public_dataset";
  }

  return "public_web";
}
