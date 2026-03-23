// Use Vite dev proxy to avoid CORS issues
const GAMMA_BASE = '/api/gamma';
const CLOB_BASE = '/api/clob';

export interface PolymarketEvent {
  id: string;
  slug: string;
  title: string;
  markets: PolymarketMarket[];
  volume: number;
  volume24hr: number;
}

export interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  outcomes: string[];
  outcomePrices: number[];
  volume: number;
  volume24hr: number;
  oneDayPriceChange: number | null;
  clobTokenIds: string[];
  endDate: string;
  description: string;
  active: boolean;
  closed: boolean;
  groupItemTitle?: string;
}

export interface PricePoint {
  t: number;
  p: number;
}

function parseJsonField(raw: string | string[] | null): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function parseNumberField(raw: string | number | null): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') return raw;
  return parseFloat(raw) || 0;
}

function normalizeMarket(m: any): PolymarketMarket {
  const outcomes = parseJsonField(m.outcomes);
  const rawPrices = parseJsonField(m.outcomePrices);
  const outcomePrices = rawPrices.map((p: string | number) =>
    typeof p === 'string' ? parseFloat(p) : p
  );
  const clobTokenIds = parseJsonField(m.clobTokenIds);

  return {
    id: m.id,
    question: m.question || '',
    slug: m.slug || '',
    outcomes,
    outcomePrices,
    volume: parseNumberField(m.volume),
    volume24hr: parseNumberField(m.volume24hr),
    oneDayPriceChange: m.oneDayPriceChange ?? null,
    clobTokenIds,
    endDate: m.endDate || '',
    description: m.description || '',
    active: m.active ?? true,
    closed: m.closed ?? false,
    groupItemTitle: m.groupItemTitle,
  };
}

// Fetch trending events sorted by 24h volume
export async function fetchTrendingEvents(limit = 20): Promise<PolymarketEvent[]> {
  const url = `${GAMMA_BASE}/events?limit=${limit}&active=true&closed=false&order=volume24hr&ascending=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gamma API error: ${res.status}`);
  const data = await res.json();

  return data
    .filter((e: any) => e.markets && e.markets.length > 0)
    .map((e: any) => ({
      id: e.id,
      slug: e.slug || '',
      title: e.title || e.markets?.[0]?.question || 'Unknown',
      markets: (e.markets || []).map(normalizeMarket),
      volume: parseNumberField(e.volume),
      volume24hr: parseNumberField(e.volume24hr),
    }));
}

// Cache top events to avoid repeated API calls
let cachedEvents: PolymarketEvent[] = [];
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getTopEvents(): Promise<PolymarketEvent[]> {
  if (cachedEvents.length > 0 && Date.now() - cacheTime < CACHE_TTL) {
    return cachedEvents;
  }
  // Fetch top 50 events by volume — this is where the real data is
  cachedEvents = await fetchTrendingEvents(50);
  cacheTime = Date.now();
  return cachedEvents;
}

// Search events by keyword — local matching on top events since Gamma _q is broken
export async function searchEvents(query: string, limit = 10): Promise<PolymarketEvent[]> {
  const events = await getTopEvents();
  const keywords = query.toLowerCase().split(/[\s,]+/).filter(w => w.length > 2);

  if (keywords.length === 0) return events.slice(0, limit);

  // Score each event by keyword match count
  const scored = events.map(event => {
    const text = `${event.title} ${event.markets.map(m => m.question + ' ' + (m.groupItemTitle || '')).join(' ')}`.toLowerCase();
    const matches = keywords.filter(kw => text.includes(kw)).length;
    return { event, matches };
  });

  return scored
    .filter(s => s.matches > 0)
    .sort((a, b) => b.matches - a.matches || b.event.volume24hr - a.event.volume24hr)
    .slice(0, limit)
    .map(s => s.event);
}

// Fetch price history for a specific token
export async function fetchPriceHistory(
  tokenId: string,
  interval: '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | 'max' = '1m',
  fidelity = 100
): Promise<PricePoint[]> {
  const url = `${CLOB_BASE}/prices-history?market=${tokenId}&interval=${interval}&fidelity=${fidelity}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CLOB API error: ${res.status}`);
  const data = await res.json();
  return (data.history || []) as PricePoint[];
}

// Fetch midpoint price for a token
export async function fetchMidpoint(tokenId: string): Promise<number> {
  const url = `${CLOB_BASE}/midpoint?token_id=${tokenId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CLOB API error: ${res.status}`);
  const data = await res.json();
  return parseFloat(data.mid) || 0;
}

// Format volume for display
export function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

// Format probability as percentage
export function formatProb(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}
