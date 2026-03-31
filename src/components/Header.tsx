import React from 'react';
import { Activity, PanelLeftClose, PanelLeft, Clock, Download, ChevronDown, Sun, Moon, GitCompare, History, WifiOff, RefreshCw, Image, Printer, BookOpen, Share2 } from 'lucide-react';
import { Analysis } from '../services/llm';
import { useTheme } from '../theme';
import { useLocale } from '../i18n';
import { LanguageSwitch } from './LanguageSwitch';
import { exportToPNG, exportToPDF } from '../services/exportService';
import { ShortcutRegistry, getShortcutDisplay } from '../hooks/useKeyboardShortcuts';

// ─── Online status hook ───
function useOnlineStatus() {
  const [online, setOnline] = React.useState(navigator.onLine);
  React.useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  return online;
}

// ─── SW update hook ───
function useServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const [registration, setRegistration] = React.useState<ServiceWorkerRegistration | null>(null);

  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setUpdateAvailable(true);
      setRegistration(detail.registration);
    };
    window.addEventListener('sw-update-available', handler);
    return () => window.removeEventListener('sw-update-available', handler);
  }, []);

  const applyUpdate = React.useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, [registration]);

  return { updateAvailable, applyUpdate };
}

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  loading: boolean;
  loadingStep: string;
  analyses: Analysis[];
  currentIndex: number;
  onSelectAnalysis: (index: number) => void;
  onExport: () => void;
  historyCount: number;
  onOpenHistory: () => void;
  onOpenCompare: () => void;
  onOpenTemplates: () => void;
  onOpenShare?: () => void;
  hasAnalysis?: boolean;
  shortcutRegistry?: ShortcutRegistry;
}

export function Header({
  sidebarOpen, setSidebarOpen,
  loading, loadingStep,
  analyses, currentIndex,
  onSelectAnalysis, onExport,
  historyCount, onOpenHistory, onOpenCompare, onOpenTemplates,
  onOpenShare, hasAnalysis,
  shortcutRegistry,
}: HeaderProps) {
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const { toggle, isDark } = useTheme();
  const { t, locale } = useLocale();
  const isOnline = useOnlineStatus();
  const { updateAvailable, applyUpdate } = useServiceWorkerUpdate();

  return (
    <header
      className="h-12 flex items-center px-4 gap-3 z-30 select-none shrink-0"
      style={{
        background: 'var(--bg-header)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="p-1.5 rounded-lg transition-colors"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
      </button>

      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
          <Activity className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {t('app.title')}
        </span>
        <span className="text-[10px] font-medium hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
          {t('app.subtitle.full')}
        </span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 ml-4">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse [animation-delay:300ms]" />
          </div>
          <span className="text-xs text-blue-500">{loadingStep || t('header.analyzing')}</span>
        </div>
      )}

      {/* Offline indicator */}
      {!isOnline && (
        <div className="flex items-center gap-1.5 ml-3 px-2.5 py-1 rounded-full text-xs font-medium"
          style={{ background: 'var(--warning-soft)', color: 'var(--warning)', border: '1px solid var(--warning)' }}
        >
          <WifiOff className="w-3 h-3" />
          <span>{t('header.offline')}</span>
        </div>
      )}

      {/* SW update toast */}
      {updateAvailable && (
        <button
          onClick={applyUpdate}
          className="flex items-center gap-1.5 ml-3 px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
          style={{ background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid var(--success)' }}
        >
          <RefreshCw className="w-3 h-3" />
          <span>{t('header.update')}</span>
        </button>
      )}

      <div className="flex-1" />

      {/* Templates */}
      <button
        onClick={onOpenTemplates}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        title={t('header.templates')}
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t('header.templates')}</span>
      </button>

      {/* Language switch */}
      <LanguageSwitch />

      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="p-1.5 rounded-lg transition-colors"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        title={isDark ? t('header.theme.dark') : t('header.theme.light')}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* History drawer trigger */}
      <button
        onClick={onOpenHistory}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors relative"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        title={`${t('header.history.title')}${shortcutRegistry ? ` (${getShortcutDisplay(shortcutRegistry.history)})` : ''}`}
      >
        <History className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t('header.history')}</span>
        {historyCount > 0 && (
          <span className="text-[9px] px-1 py-0.5 rounded-full font-bold min-w-[16px] text-center"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {historyCount}
          </span>
        )}
      </button>

      {/* Compare mode trigger */}
      {historyCount >= 2 && (
        <button
          onClick={onOpenCompare}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title={t('header.compare.title')}
        >
          <GitCompare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('header.compare')}</span>
        </button>
      )}

      {analyses.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{t('header.history')} ({analyses.length})</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
          </button>

          {historyOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setHistoryOpen(false)} />
              <div
                className="absolute right-0 top-full mt-1 w-72 rounded-xl z-50 overflow-hidden"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                <div className="max-h-64 overflow-y-auto">
                  {analyses.map((a, i) => (
                    <button
                      key={a.id}
                      onClick={() => { onSelectAnalysis(i); setHistoryOpen(false); }}
                      className="w-full text-left px-4 py-3 transition-colors"
                      style={{
                        borderBottom: '1px solid var(--border-light)',
                        background: i === currentIndex ? 'var(--accent-soft)' : 'transparent',
                        borderLeft: i === currentIndex ? '2px solid var(--accent)' : '2px solid transparent',
                      }}
                      onMouseEnter={e => { if (i !== currentIndex) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={e => { if (i !== currentIndex) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{a.hotspot}</div>
                      <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                        {new Date(a.timestamp).toLocaleTimeString(locale === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        {' · '}{a.data.scenarios.length} {t('header.session.scenarios')}{' · '}{a.data.nodes.length} {t('header.session.nodes')}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Share report */}
      {onOpenShare && (
        <button
          onClick={onOpenShare}
          disabled={!hasAnalysis}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors no-export"
          style={{
            color: hasAnalysis ? 'var(--text-secondary)' : 'var(--text-muted)',
            opacity: hasAnalysis ? 1 : 0.4,
            cursor: hasAnalysis ? 'pointer' : 'not-allowed',
          }}
          onMouseEnter={e => { if (hasAnalysis) e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title={t('header.share')}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('header.share')}</span>
        </button>
      )}

      {/* Export PNG */}
      <button
        onClick={() => exportToPNG('liveboard-main-content')}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors no-export"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        title={`${t('header.exportPNG')}${shortcutRegistry ? ` (${getShortcutDisplay(shortcutRegistry.exportPNG)})` : ''}`}
      >
        <Image className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">PNG</span>
      </button>

      {/* Print / PDF */}
      <button
        onClick={exportToPDF}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors no-export"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        title={`${t('header.exportPDF')}${shortcutRegistry ? ` (${getShortcutDisplay(shortcutRegistry.exportPDF)})` : ''}`}
      >
        <Printer className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">PDF</span>
      </button>

      {/* JSON Export */}
      <button
        onClick={onExport}
        className="p-1.5 rounded-lg transition-colors no-export"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        title={t('header.export')}
      >
        <Download className="w-4 h-4" />

      </button>
    </header>
  );
}
