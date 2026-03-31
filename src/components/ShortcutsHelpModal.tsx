import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { ShortcutRegistry, getShortcutDisplay } from '../hooks/useKeyboardShortcuts';
import { useLocale } from '../i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  registry: ShortcutRegistry;
}

export function ShortcutsHelpModal({ isOpen, onClose, registry }: Props) {
  const { t } = useLocale();

  if (!isOpen) return null;

  const shortcuts = [
    registry.analyze,
    registry.focusInput,
    registry.focusInputVim,
    registry.history,
    registry.exportPNG,
    registry.exportPDF,
    registry.escape,
    registry.helpModal,
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-[101] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-2xl overflow-hidden animate-fade-up"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent-soft)' }}
              >
                <Keyboard className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              </div>
              <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {t('shortcut.title')}
              </span>
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

          {/* Shortcut list */}
          <div className="px-5 py-3 space-y-1">
            {shortcuts.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2.5 px-2 rounded-lg transition-colors"
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {t(s.descKey)}
                </span>
                <kbd
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono font-medium"
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  {getShortcutDisplay(s)}
                </kbd>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            className="px-5 py-3 text-center"
            style={{ borderTop: '1px solid var(--border-light)' }}
          >
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {t('shortcut.footer')}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
