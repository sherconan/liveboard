import { SimulationData, Analysis } from './llm';

const STORAGE_KEY = 'liveboard-history';
const MAX_ITEMS = 50;

export interface HistoryItem {
  id: string;
  timestamp: number;
  hotspot: string;
  eventTitle: string;
  data: SimulationData;
  /** Source system that initiated this analysis (e.g. 'stockpulse') */
  source?: string;
  /** Compact metadata for quick display without parsing full data */
  meta: {
    nodeCount: number;
    edgeCount: number;
    scenarioCount: number;
    sectors: string[];       // unique impact labels
    assets: string[];        // asset node labels
    sentiments: Record<string, number>; // positive/negative/neutral counts
    chainDepth: number;      // max transmission levels
  };
}

function extractMeta(data: SimulationData): HistoryItem['meta'] {
  const impacts = data.nodes.filter(n => n.type === 'impact').map(n => n.label);
  const assets = data.nodes.filter(n => n.type === 'asset').map(n => n.label);
  const sentiments: Record<string, number> = { positive: 0, negative: 0, neutral: 0 };
  data.nodes.forEach(n => {
    if (n.sentiment && sentiments[n.sentiment] !== undefined) {
      sentiments[n.sentiment]++;
    }
  });

  // Calculate chain depth by finding longest path through type layers
  const typeLayers = ['hotspot', 'variable', 'impact', 'asset'];
  const usedLayers = new Set(data.nodes.map(n => n.type));
  const chainDepth = typeLayers.filter(t => usedLayers.has(t as any)).length;

  return {
    nodeCount: data.nodes.length,
    edgeCount: data.edges.length,
    scenarioCount: data.scenarios.length,
    sectors: impacts,
    assets,
    sentiments,
    chainDepth,
  };
}

/** Load all history items from localStorage */
export function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const items: HistoryItem[] = JSON.parse(raw);
    return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

/** Save a new analysis to history */
export function saveToHistory(analysis: Analysis, source?: string): HistoryItem {
  const items = loadHistory();
  const item: HistoryItem = {
    id: analysis.id || crypto.randomUUID(),
    timestamp: analysis.timestamp || Date.now(),
    hotspot: analysis.hotspot,
    eventTitle: analysis.eventTitle || analysis.hotspot,
    data: analysis.data,
    source,
    meta: extractMeta(analysis.data),
  };

  // Deduplicate by hotspot (keep newest)
  const filtered = items.filter(i => i.hotspot !== item.hotspot);
  const updated = [item, ...filtered].slice(0, MAX_ITEMS);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // If storage is full, prune aggressively
    const pruned = updated.slice(0, 20);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
    } catch {
      // Give up silently
    }
  }

  return item;
}

/** Delete a history item by id */
export function deleteHistoryItem(id: string): void {
  const items = loadHistory().filter(i => i.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** Clear all history */
export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Get relative time string - locale aware */
export function getRelativeTime(timestamp: number, locale?: string): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const isEn = locale === 'en';

  if (seconds < 60) return isEn ? 'Just now' : '刚刚';
  if (minutes < 60) return isEn ? `${minutes}m ago` : `${minutes}分钟前`;
  if (hours < 24) return isEn ? `${hours}h ago` : `${hours}小时前`;
  if (days < 7) return isEn ? `${days}d ago` : `${days}天前`;
  return new Date(timestamp).toLocaleDateString(isEn ? 'en-US' : 'zh-CN', { month: 'short', day: 'numeric' });
}
