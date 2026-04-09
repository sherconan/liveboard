import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useLocale } from '../i18n';

interface EventSearchProps {
  /** Callback with matching node IDs to highlight */
  onHighlight: (matchedIds: string[]) => void;
  /** Node id-to-label mapping */
  nodeMap: { id: string; label: string; type: string }[];
}

export function EventSearch({ onHighlight, nodeMap }: EventSearchProps) {
  const { t } = useLocale();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [matchCount, setMatchCount] = useState(0);

  const handleSearch = useCallback((val: string) => {
    setQuery(val);
    if (!val.trim()) {
      onHighlight([]);
      setMatchCount(0);
      return;
    }
    const q = val.toLowerCase();
    const matched = nodeMap.filter(n =>
      n.label.toLowerCase().includes(q) || n.type.toLowerCase().includes(q)
    );
    setMatchCount(matched.length);
    onHighlight(matched.map(n => n.id));
  }, [nodeMap, onHighlight]);

  const handleClear = useCallback(() => {
    setQuery('');
    onHighlight([]);
    setMatchCount(0);
  }, [onHighlight]);

  // Keyboard shortcut: / to focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !focused && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focused]);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <div
        className="flex items-center gap-2 flex-1 px-3 py-1.5 rounded-lg transition-all text-xs"
        style={{
          background: 'var(--bg-input)',
          border: focused ? '1px solid var(--accent)' : '1px solid var(--border)',
          boxShadow: focused ? '0 0 0 2px rgba(59,130,246,0.15)' : 'none',
        }}
      >
        <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => handleSearch(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent outline-none text-xs"
          style={{ color: 'var(--text-primary)' }}
          placeholder={t('search.placeholder')}
        />
        {query && (
          <>
            <span className="text-[10px] shrink-0 px-1.5 py-0.5 rounded-full font-medium"
              style={{
                background: matchCount > 0 ? 'var(--accent-soft)' : 'var(--danger-soft)',
                color: matchCount > 0 ? 'var(--accent)' : 'var(--danger)',
              }}
            >
              {matchCount} {t('search.matches')}
            </span>
            <button
              onClick={handleClear}
              className="p-0.5 rounded transition-colors shrink-0"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
      {!query && (
        <kbd
          className="text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0"
          style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          /
        </kbd>
      )}
    </div>
  );
}
