import { describe, it, expect } from 'vitest';
import {
  loadHistory,
  saveToHistory,
  deleteHistoryItem,
  clearHistory,
  getRelativeTime,
} from '../services/historyStore';
import type { Analysis, SimulationData } from '../services/llm';

// --- Helpers ---

function makeMockData(overrides?: Partial<SimulationData>): SimulationData {
  return {
    scenarios: [
      { name: 'Bull', probability: 0.6, rationale: 'Strong earnings' },
      { name: 'Bear', probability: 0.4, rationale: 'Trade war escalation' },
    ],
    nodes: [
      { id: 'h1', label: 'Fed Rate Decision', type: 'hotspot', sentiment: 'neutral' },
      { id: 'v1', label: 'Bond Yields', type: 'variable', sentiment: 'negative' },
      { id: 'i1', label: 'Tech Sector', type: 'impact', sentiment: 'positive' },
      { id: 'a1', label: 'NVDA', type: 'asset', sentiment: 'positive' },
      { id: 'a2', label: 'AAPL', type: 'asset', sentiment: 'neutral' },
    ],
    edges: [
      { source: 'h1', target: 'v1', label: 'drives', weight: 'high' },
      { source: 'v1', target: 'i1', label: 'impacts', weight: 'medium' },
      { source: 'i1', target: 'a1', label: 'benefits', weight: 'high' },
    ],
    summary: 'Test summary',
    coreActions: ['Buy NVDA', 'Sell bonds'],
    ...overrides,
  };
}

function makeMockAnalysis(overrides?: Partial<Analysis>): Analysis {
  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    hotspot: 'Fed Rate Decision',
    data: makeMockData(),
    eventTitle: 'Fed holds rates steady',
    ...overrides,
  };
}

// --- Tests ---

describe('historyStore', () => {
  describe('loadHistory', () => {
    it('returns empty array when no data stored', () => {
      expect(loadHistory()).toEqual([]);
    });

    it('returns empty array when stored data is corrupt', () => {
      localStorage.setItem('liveboard-history', 'not-json!!!');
      expect(loadHistory()).toEqual([]);
    });

    it('loads and sorts items by timestamp descending', () => {
      const items = [
        { id: '1', timestamp: 1000, hotspot: 'a', eventTitle: 'a', data: makeMockData(), meta: { nodeCount: 0, edgeCount: 0, scenarioCount: 0, sectors: [], assets: [], sentiments: {}, chainDepth: 0 } },
        { id: '2', timestamp: 3000, hotspot: 'b', eventTitle: 'b', data: makeMockData(), meta: { nodeCount: 0, edgeCount: 0, scenarioCount: 0, sectors: [], assets: [], sentiments: {}, chainDepth: 0 } },
        { id: '3', timestamp: 2000, hotspot: 'c', eventTitle: 'c', data: makeMockData(), meta: { nodeCount: 0, edgeCount: 0, scenarioCount: 0, sectors: [], assets: [], sentiments: {}, chainDepth: 0 } },
      ];
      localStorage.setItem('liveboard-history', JSON.stringify(items));
      const loaded = loadHistory();
      expect(loaded[0].id).toBe('2');
      expect(loaded[1].id).toBe('3');
      expect(loaded[2].id).toBe('1');
    });

    it('caps loaded items at 50', () => {
      const items = Array.from({ length: 60 }, (_, i) => ({
        id: `id-${i}`,
        timestamp: i * 1000,
        hotspot: `event-${i}`,
        eventTitle: `event-${i}`,
        data: makeMockData(),
        meta: { nodeCount: 0, edgeCount: 0, scenarioCount: 0, sectors: [], assets: [], sentiments: {}, chainDepth: 0 },
      }));
      localStorage.setItem('liveboard-history', JSON.stringify(items));
      expect(loadHistory()).toHaveLength(50);
    });
  });

  describe('saveToHistory', () => {
    it('saves an analysis and returns the history item', () => {
      const analysis = makeMockAnalysis();
      const item = saveToHistory(analysis);

      expect(item.hotspot).toBe(analysis.hotspot);
      expect(item.eventTitle).toBe(analysis.eventTitle);
      expect(item.meta.nodeCount).toBe(5);
      expect(item.meta.edgeCount).toBe(3);
      expect(item.meta.scenarioCount).toBe(2);
      expect(item.meta.assets).toEqual(['NVDA', 'AAPL']);
      expect(item.meta.sentiments.positive).toBe(2);
      expect(item.meta.sentiments.negative).toBe(1);
      expect(item.meta.sentiments.neutral).toBe(2);
    });

    it('persists to localStorage', () => {
      saveToHistory(makeMockAnalysis());
      const raw = localStorage.getItem('liveboard-history');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed).toHaveLength(1);
    });

    it('deduplicates by hotspot (keeps newest)', () => {
      saveToHistory(makeMockAnalysis({ hotspot: 'same-event', timestamp: 1000, id: 'old' }));
      saveToHistory(makeMockAnalysis({ hotspot: 'same-event', timestamp: 2000, id: 'new' }));

      const items = loadHistory();
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('new');
    });

    it('preserves different hotspots', () => {
      saveToHistory(makeMockAnalysis({ hotspot: 'event-A' }));
      saveToHistory(makeMockAnalysis({ hotspot: 'event-B' }));

      expect(loadHistory()).toHaveLength(2);
    });

    it('prunes to 50 max', () => {
      for (let i = 0; i < 55; i++) {
        saveToHistory(makeMockAnalysis({ hotspot: `event-${i}`, timestamp: i * 1000 }));
      }
      expect(loadHistory().length).toBeLessThanOrEqual(50);
    });

    it('computes chainDepth correctly', () => {
      const item = saveToHistory(makeMockAnalysis());
      // 4 types present: hotspot, variable, impact, asset
      expect(item.meta.chainDepth).toBe(4);
    });
  });

  describe('deleteHistoryItem', () => {
    it('removes the specified item', () => {
      saveToHistory(makeMockAnalysis({ hotspot: 'keep-me' }));
      const b = saveToHistory(makeMockAnalysis({ hotspot: 'delete-me' }));

      deleteHistoryItem(b.id);
      const items = loadHistory();
      expect(items).toHaveLength(1);
      expect(items[0].hotspot).toBe('keep-me');
    });

    it('does nothing if id not found', () => {
      saveToHistory(makeMockAnalysis());
      deleteHistoryItem('nonexistent-id');
      expect(loadHistory()).toHaveLength(1);
    });
  });

  describe('clearHistory', () => {
    it('removes all items', () => {
      saveToHistory(makeMockAnalysis({ hotspot: 'a' }));
      saveToHistory(makeMockAnalysis({ hotspot: 'b' }));
      clearHistory();
      expect(loadHistory()).toEqual([]);
    });
  });

  describe('getRelativeTime', () => {
    it('returns "刚刚" for times within 60 seconds', () => {
      expect(getRelativeTime(Date.now() - 30_000)).toBe('刚刚');
    });

    it('returns minutes ago', () => {
      const result = getRelativeTime(Date.now() - 5 * 60 * 1000);
      expect(result).toBe('5分钟前');
    });

    it('returns hours ago', () => {
      const result = getRelativeTime(Date.now() - 3 * 60 * 60 * 1000);
      expect(result).toBe('3小时前');
    });

    it('returns days ago for <7 days', () => {
      const result = getRelativeTime(Date.now() - 2 * 24 * 60 * 60 * 1000);
      expect(result).toBe('2天前');
    });

    it('returns formatted date for 7+ days', () => {
      const result = getRelativeTime(Date.now() - 10 * 24 * 60 * 60 * 1000);
      // Should be a localized date string, not "X天前"
      expect(result).not.toContain('天前');
    });
  });
});
