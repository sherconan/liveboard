/**
 * StockPulse Event Bridge client
 * Fetches hot events from StockPulse backend via proxy
 */

export interface BridgeEvent {
  title: string;
  summary: string;
  source: string;
  timestamp: string;
  related_tickers: string[];
  severity: 'high' | 'medium' | 'low';
  category: string;
  market_impact: { ticker: string; change: number }[];
}

export async function fetchStockPulseEvents(limit = 5): Promise<BridgeEvent[]> {
  try {
    const res = await fetch(`/api/stockpulse/events/latest?limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  } catch {
    // StockPulse may not be running — fail silently
    return [];
  }
}
