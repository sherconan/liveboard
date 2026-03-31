import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import { useLocale } from '../i18n';
import {
  EventTemplate,
  TemplateCategory,
  CATEGORY_META,
  getTemplatesByCategory,
} from '../data/eventTemplates';

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (text: string) => void;
}

export function TemplateSelector({ isOpen, onClose, onSelect }: TemplateSelectorProps) {
  const { t, locale } = useLocale();
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const isZh = locale === 'zh';
  const grouped = getTemplatesByCategory();

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setActiveCategory('all');
      // Small delay for animation
      const timer = setTimeout(() => searchRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleSelect = useCallback((tpl: EventTemplate) => {
    const text = isZh ? tpl.template : tpl.templateEn;
    onSelect(text);
    onClose();
    // Focus the event input after selecting
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLTextAreaElement>('#liveboard-event-input');
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
  }, [isZh, onSelect, onClose]);

  // Filter logic
  const filteredGroups = grouped
    .filter(g => activeCategory === 'all' || g.category === activeCategory)
    .map(g => ({
      ...g,
      templates: g.templates.filter(tpl => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          tpl.name.toLowerCase().includes(q) ||
          tpl.nameEn.toLowerCase().includes(q) ||
          tpl.template.toLowerCase().includes(q) ||
          tpl.templateEn.toLowerCase().includes(q)
        );
      }),
    }))
    .filter(g => g.templates.length > 0);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 transition-opacity duration-200"
        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="pointer-events-auto w-full max-w-2xl max-h-[80vh] rounded-2xl overflow-hidden flex flex-col animate-fade-up"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                {t('template.title')}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {t('template.subtitle')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search + Category Tabs */}
          <div className="px-5 pt-3 pb-2 shrink-0 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                placeholder={t('template.search')}
              />
            </div>

            {/* Category tabs */}
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setActiveCategory('all')}
                className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-all"
                style={{
                  background: activeCategory === 'all' ? 'var(--accent)' : 'var(--bg-input)',
                  color: activeCategory === 'all' ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${activeCategory === 'all' ? 'var(--accent)' : 'transparent'}`,
                }}
              >
                {t('template.category.all')}
              </button>
              {(Object.keys(CATEGORY_META) as TemplateCategory[]).map(cat => {
                const meta = CATEGORY_META[cat];
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(isActive ? 'all' : cat)}
                    className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-all"
                    style={{
                      background: isActive ? meta.color : 'var(--bg-input)',
                      color: isActive ? '#fff' : meta.color,
                      border: `1px solid ${isActive ? meta.color : 'transparent'}`,
                    }}
                  >
                    {isZh ? meta.label : meta.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Template grid */}
          <div className="flex-1 overflow-y-auto px-5 pb-5 min-h-0 scrollbar-thin">
            {filteredGroups.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <Search className="w-6 h-6 mb-2" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t('template.empty')}
                </p>
              </div>
            )}

            {filteredGroups.map(group => {
              const meta = CATEGORY_META[group.category];
              return (
                <div key={group.category} className="mt-4 first:mt-2">
                  {/* Category header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded"
                      style={{ background: `${meta.color}18`, color: meta.color }}
                    >
                      {isZh ? meta.label : meta.labelEn}
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'var(--border-light)' }} />
                  </div>

                  {/* Cards grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.templates.map(tpl => (
                      <button
                        key={tpl.id}
                        onClick={() => handleSelect(tpl)}
                        className="text-left p-3 rounded-xl transition-all group"
                        style={{
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-light)',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = meta.color;
                          e.currentTarget.style.boxShadow = `0 0 0 1px ${meta.color}33`;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'var(--border-light)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-base leading-none">{tpl.icon}</span>
                          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {isZh ? tpl.name : tpl.nameEn}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                          {isZh ? tpl.template : tpl.templateEn}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer hint */}
          <div className="px-5 py-2.5 text-center shrink-0" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-sidebar)' }}>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {t('template.hint')}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
