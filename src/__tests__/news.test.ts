import { describe, it, expect } from 'vitest';
import { extractAllTags, type NewsItem } from '../services/news';

// We test the pure functions exported from news.ts.
// fetchLiveNews makes real HTTP calls so we test extractAllTags and
// verify the module's type exports are correct.

function makeNewsItem(overrides: Partial<NewsItem>): NewsItem {
  return {
    id: 'test-1',
    title: 'Test news',
    source: 'Test',
    time: '10:30',
    timestamp: Date.now(),
    tags: [],
    impact: 50,
    ...overrides,
  };
}

describe('news service', () => {
  describe('extractAllTags', () => {
    it('returns empty array for empty news list', () => {
      expect(extractAllTags([])).toEqual([]);
    });

    it('returns unique tags sorted by frequency', () => {
      const news: NewsItem[] = [
        makeNewsItem({ id: '1', tags: ['科技', '半导体'] }),
        makeNewsItem({ id: '2', tags: ['科技', '宏观'] }),
        makeNewsItem({ id: '3', tags: ['科技'] }),
      ];
      const tags = extractAllTags(news);
      // '科技' appears 3 times, should be first
      expect(tags[0]).toBe('科技');
      expect(tags).toContain('半导体');
      expect(tags).toContain('宏观');
    });

    it('does not duplicate tags', () => {
      const news: NewsItem[] = [
        makeNewsItem({ id: '1', tags: ['央行'] }),
        makeNewsItem({ id: '2', tags: ['央行'] }),
      ];
      const tags = extractAllTags(news);
      expect(tags).toEqual(['央行']);
    });

    it('preserves all tags from multi-tag items', () => {
      const news: NewsItem[] = [
        makeNewsItem({ id: '1', tags: ['地缘', '贸易', '能源'] }),
      ];
      const tags = extractAllTags(news);
      expect(tags).toHaveLength(3);
    });
  });

  describe('NewsItem type shape', () => {
    it('has required fields', () => {
      const item = makeNewsItem({ tags: ['宏观'] });
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('source');
      expect(item).toHaveProperty('time');
      expect(item).toHaveProperty('timestamp');
      expect(item).toHaveProperty('tags');
      expect(item).toHaveProperty('impact');
    });
  });
});
