import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatVolume, formatProb, fetchTrendingEvents, fetchPriceHistory, fetchMidpoint } from '../services/polymarket';

// --- Pure utility tests (no mocking needed) ---

describe('polymarket utilities', () => {
  describe('formatVolume', () => {
    it('formats millions', () => {
      expect(formatVolume(5_500_000)).toBe('$5.5M');
    });

    it('formats thousands', () => {
      expect(formatVolume(12_300)).toBe('$12.3K');
    });

    it('formats small values', () => {
      expect(formatVolume(42)).toBe('$42');
    });

    it('formats exactly 1M boundary', () => {
      expect(formatVolume(1_000_000)).toBe('$1.0M');
    });

    it('formats exactly 1K boundary', () => {
      expect(formatVolume(1_000)).toBe('$1.0K');
    });
  });

  describe('formatProb', () => {
    it('formats 0.85 as 85.0%', () => {
      expect(formatProb(0.85)).toBe('85.0%');
    });

    it('formats 0 as 0.0%', () => {
      expect(formatProb(0)).toBe('0.0%');
    });

    it('formats 1 as 100.0%', () => {
      expect(formatProb(1)).toBe('100.0%');
    });

    it('handles decimal precision', () => {
      expect(formatProb(0.333)).toBe('33.3%');
    });
  });
});

// --- API tests with fetch mocking ---

describe('polymarket API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchTrendingEvents', () => {
    it('constructs correct URL with default limit', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);

      await fetchTrendingEvents();
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/gamma/events?limit=20&active=true&closed=false&order=volume24hr&ascending=false')
      );
    });

    it('constructs correct URL with custom limit', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);

      await fetchTrendingEvents(5);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('limit=5')
      );
    });

    it('parses events with markets correctly', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => [{
          id: 'ev1',
          slug: 'test-event',
          title: 'Will X happen?',
          volume: '5000000',
          volume24hr: '100000',
          markets: [{
            id: 'm1',
            question: 'Will X happen by July?',
            slug: 'x-happen',
            outcomes: '["Yes","No"]',
            outcomePrices: '["0.65","0.35"]',
            volume: 3000000,
            volume24hr: 50000,
            oneDayPriceChange: null,
            clobTokenIds: '["token1","token2"]',
            endDate: '2026-07-01',
            description: 'Test market',
            active: true,
            closed: false,
          }],
        }],
      } as Response);

      const events = await fetchTrendingEvents();
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Will X happen?');
      expect(events[0].markets[0].outcomePrices).toEqual([0.65, 0.35]);
      expect(events[0].markets[0].outcomes).toEqual(['Yes', 'No']);
    });

    it('filters out events with no markets', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => [
          { id: 'ev1', title: 'Has markets', markets: [{ id: 'm1', outcomes: '[]', outcomePrices: '[]' }] },
          { id: 'ev2', title: 'No markets', markets: [] },
        ],
      } as Response);

      const events = await fetchTrendingEvents();
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Has markets');
    });

    it('throws on non-OK response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      await expect(fetchTrendingEvents()).rejects.toThrow('Gamma API error: 500');
    });
  });

  describe('fetchPriceHistory', () => {
    it('constructs correct URL', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ history: [] }),
      } as Response);

      await fetchPriceHistory('token123', '1w', 50);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/clob/prices-history?market=token123&interval=1w&fidelity=50')
      );
    });

    it('returns history array', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ history: [{ t: 1000, p: 0.65 }, { t: 2000, p: 0.70 }] }),
      } as Response);

      const history = await fetchPriceHistory('token123');
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual({ t: 1000, p: 0.65 });
    });

    it('throws on error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      await expect(fetchPriceHistory('bad-token')).rejects.toThrow('CLOB API error: 404');
    });
  });

  describe('fetchMidpoint', () => {
    it('parses midpoint value', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ mid: '0.72' }),
      } as Response);

      const mid = await fetchMidpoint('token123');
      expect(mid).toBe(0.72);
    });

    it('returns 0 for invalid mid', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ mid: 'not-a-number' }),
      } as Response);

      const mid = await fetchMidpoint('token123');
      expect(mid).toBe(0);
    });
  });
});
