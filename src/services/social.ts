export interface SocialPost {
  id: string;
  title: string;
  body?: string;
  score: number; // upvotes / likes
  comments: number;
  sentiment?: 'Bullish' | 'Bearish' | 'neutral';
  source: 'Reddit' | 'StockTwits';
  subreddit?: string;
  symbol?: string;
  url?: string;
  time: string; // relative, e.g. "2h ago"
  timestamp: number;
}

// ─── Reddit ───

const FINANCE_SUBS = ['wallstreetbets', 'stocks', 'investing', 'options'];

async function searchReddit(query: string): Promise<SocialPost[]> {
  try {
    const subs = FINANCE_SUBS.join('+');
    const url = `/api/reddit/r/${subs}/search.json?q=${encodeURIComponent(query)}&sort=relevance&t=week&limit=8&restrict_sr=on`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Reddit ${res.status}`);
    const data = await res.json();

    return (data?.data?.children || []).map((item: any) => {
      const d = item.data;
      const ts = (d.created_utc || 0) * 1000;
      return {
        id: `reddit-${d.id}`,
        title: d.title || '',
        body: d.selftext?.slice(0, 120) || undefined,
        score: d.score || 0,
        comments: d.num_comments || 0,
        source: 'Reddit' as const,
        subreddit: d.subreddit,
        url: `https://reddit.com${d.permalink}`,
        time: formatRelativeTime(ts),
        timestamp: ts,
      };
    }).filter((p: SocialPost) => p.title.length > 5);
  } catch (err) {
    console.warn('Reddit search failed:', err);
    return [];
  }
}

// ─── StockTwits ───

async function fetchStockTwits(symbol: string): Promise<SocialPost[]> {
  try {
    const url = `/api/stocktwits/api/2/streams/symbol/${encodeURIComponent(symbol)}.json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`StockTwits ${res.status}`);
    const data = await res.json();

    return (data?.messages || []).slice(0, 6).map((m: any) => {
      const ts = new Date(m.created_at).getTime();
      const sentimentRaw = m.entities?.sentiment?.basic;
      return {
        id: `st-${m.id}`,
        title: (m.body || '').slice(0, 120),
        score: m.likes?.total || 0,
        comments: m.conversation?.replies || 0,
        sentiment: sentimentRaw === 'Bullish' ? 'Bullish' : sentimentRaw === 'Bearish' ? 'Bearish' : 'neutral',
        source: 'StockTwits' as const,
        symbol: symbol,
        time: formatRelativeTime(ts),
        timestamp: ts,
      };
    }).filter((p: SocialPost) => p.title.length > 5);
  } catch (err) {
    console.warn(`StockTwits ${symbol} failed:`, err);
    return [];
  }
}

// ─── Public API ───

/**
 * Fetch social sentiment for a set of queries and symbols.
 * queries = English search terms from AI analysis (e.g. ["NVIDIA earnings", "Fed rate"])
 * symbols = ticker symbols from AI (e.g. ["NVDA", "AAPL", "GLD"])
 */
export async function fetchSocialSentiment(
  queries: string[],
  symbols: string[],
): Promise<SocialPost[]> {
  const jobs: Promise<SocialPost[]>[] = [];

  // Reddit: search with each query
  for (const q of queries.slice(0, 3)) {
    jobs.push(searchReddit(q));
  }

  // StockTwits: fetch for each symbol
  for (const sym of symbols.slice(0, 4)) {
    // Only fetch for clean ticker symbols (letters only, 1-5 chars)
    if (/^[A-Z]{1,5}$/.test(sym)) {
      jobs.push(fetchStockTwits(sym));
    }
  }

  const results = await Promise.allSettled(jobs);
  const all: SocialPost[] = [];
  const seen = new Set<string>();

  for (const r of results) {
    if (r.status === 'fulfilled') {
      for (const post of r.value) {
        // Dedupe by title prefix
        const key = post.title.slice(0, 30).toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          all.push(post);
        }
      }
    }
  }

  // Sort: Reddit by score, StockTwits by time, interleave
  all.sort((a, b) => b.score - a.score || b.timestamp - a.timestamp);
  return all.slice(0, 20);
}

// ─── Helpers ───

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

/**
 * Extract ticker symbols from AI-generated asset text.
 * e.g. "英伟达NVDA, 台积电TSM, 黄金GLD" → ["NVDA", "TSM", "GLD"]
 */
export function extractSymbols(assetText: string): string[] {
  const matches = assetText.match(/\b[A-Z]{1,5}\b/g) || [];
  // Filter out common non-ticker words
  const exclude = new Set(['AI', 'US', 'EU', 'UK', 'CEO', 'CFO', 'IPO', 'ETF', 'GDP', 'CPI', 'PPI', 'PMI', 'FED', 'USD', 'EUR', 'JPY', 'CNY']);
  return [...new Set(matches.filter(m => !exclude.has(m)))];
}
