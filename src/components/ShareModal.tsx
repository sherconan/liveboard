import React, { useState, useCallback, useEffect } from 'react';
import { X, Copy, Check, FileText, AlignLeft } from 'lucide-react';
import { generateMarkdownReport, generatePlainText, copyToClipboard, ReportData } from '../services/reportGenerator';
import { useLocale } from '../i18n';

type Format = 'markdown' | 'plaintext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: ReportData | null;
}

export function ShareModal({ isOpen, onClose, reportData }: ShareModalProps) {
  const { t } = useLocale();
  const [format, setFormat] = useState<Format>('markdown');
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(false);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      setToast(false);
    }
  }, [isOpen]);

  const reportText = React.useMemo(() => {
    if (!reportData) return '';
    return format === 'markdown'
      ? generateMarkdownReport(reportData)
      : generatePlainText(reportData);
  }, [reportData, format]);

  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard(reportText);
    if (success) {
      setCopied(true);
      setToast(true);
      setTimeout(() => setCopied(false), 2000);
      setTimeout(() => setToast(false), 2500);
    }
  }, [reportText]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen || !reportData) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="pointer-events-auto w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl overflow-hidden animate-fade-up"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3.5 shrink-0"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('share.title')}
            </h2>
            <div className="flex items-center gap-2">
              {/* Format toggle */}
              <div
                className="flex rounded-lg overflow-hidden text-[11px]"
                style={{ border: '1px solid var(--border)' }}
              >
                <button
                  onClick={() => setFormat('markdown')}
                  className="flex items-center gap-1 px-2.5 py-1.5 transition-colors"
                  style={{
                    background: format === 'markdown' ? 'var(--accent)' : 'transparent',
                    color: format === 'markdown' ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  <FileText className="w-3 h-3" />
                  Markdown
                </button>
                <button
                  onClick={() => setFormat('plaintext')}
                  className="flex items-center gap-1 px-2.5 py-1.5 transition-colors"
                  style={{
                    background: format === 'plaintext' ? 'var(--accent)' : 'transparent',
                    color: format === 'plaintext' ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  <AlignLeft className="w-3 h-3" />
                  {t('share.plainText')}
                </button>
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
          </div>

          {/* Report preview */}
          <div className="flex-1 overflow-y-auto p-5">
            <pre
              className="text-xs leading-relaxed whitespace-pre-wrap font-mono rounded-xl p-4"
              style={{
                background: 'var(--bg-input)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-light)',
              }}
            >
              {reportText}
            </pre>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-5 py-3.5 shrink-0"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {reportText.length.toLocaleString()} {t('share.chars')}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                background: copied ? 'var(--success)' : 'var(--accent)',
                color: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  {t('share.copied')}
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  {format === 'markdown' ? t('share.copyMd') : t('share.copyText')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl text-xs font-medium backdrop-blur-md animate-fade-up"
          style={{
            background: 'var(--success)',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          {t('share.toast')}
        </div>
      )}
    </>
  );
}
