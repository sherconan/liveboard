import { useMemo, useState, useCallback } from 'react';
import { Newspaper, Sparkles } from 'lucide-react';
import { Header } from './components/Header';
import { EventPanel } from './components/EventPanel';
import { LiveGraph } from './components/LiveGraph';
import { SummaryPanel } from './components/SummaryPanel';
import { MarketPulse } from './components/MarketPulse';
import { HistoryDrawer } from './components/HistoryDrawer';
import { CompareMode } from './components/CompareMode';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BatchResults } from './components/BatchResults';
import { ShortcutsHelpModal } from './components/ShortcutsHelpModal';
import { TemplateSelector } from './components/TemplateSelector';
import { ShareModal } from './components/ShareModal';
import { useAnalysis } from './hooks/useAnalysis';
import { useKeyboardShortcuts, buildShortcutRegistry } from './hooks/useKeyboardShortcuts';
import { exportToPNG, exportToPDF } from './services/exportService';
import { useLocale } from './i18n';

export default function App() {
  const { t } = useLocale();

  const {
    sidebarOpen, setSidebarOpen,
    hotspot, setHotspot, data, loading, loadingStep, error, setError,
    shouldAnimate, analyses, currentIndex, matchedMarkets, selectedMarket,
    analyzedHotspot, swarmResult, swarmLoading, assetQuotes, targetAssets,
    historyItems, historyOpen, compareOpen,
    compareLeft, setCompareLeft, compareRight, setCompareRight,
    eventSource, setEventSource,
    hasData,
    batchState, runBatchSimulation, setBatchActiveTab, clearBatch,
    runSimulation, loadAnalysis, handleExport,
    handleSelectMarket, handleReplayHistory, handleCompareFromHistory, refreshHistory,
    navigate,
  } = useAnalysis();

  // ── Keyboard shortcuts ──
  const shortcutRegistry = useMemo(() => {
    const reg = buildShortcutRegistry();

    reg.analyze.handler = () => runSimulation();
    reg.history.handler = () => {
      if (historyOpen) navigate('/');
      else navigate('/history');
    };
    reg.exportPNG.handler = () => exportToPNG('liveboard-main-content');
    reg.exportPDF.handler = () => exportToPDF();
    reg.escape.handler = () => {
      if (historyOpen || compareOpen) navigate('/');
      if (loading) setError(null);
    };
    reg.focusInput.handler = () => {
      const el = document.querySelector<HTMLTextAreaElement>('#liveboard-event-input');
      el?.focus();
    };
    reg.focusInputVim.handler = reg.focusInput.handler;

    return reg;
  }, [runSimulation, historyOpen, compareOpen, loading, navigate, setError]);

  const { helpOpen, setHelpOpen } = useKeyboardShortcuts(shortcutRegistry);

  // ── Share modal ──
  const [shareOpen, setShareOpen] = useState(false);
  const shareReportData = useMemo(() => {
    if (!hasData || !analyzedHotspot) return null;
    return {
      hotspot: analyzedHotspot,
      timestamp: analyses[currentIndex]?.timestamp || Date.now(),
      data,
      matchedMarkets: matchedMarkets?.map(m => ({
        question: m.question || m.title || '',
        yes_probability: m.yes_probability ?? m.outcomePrices?.[0] ?? 0,
      })),
    };
  }, [hasData, analyzedHotspot, data, analyses, currentIndex, matchedMarkets]);

  // ── Template selector ──
  const [templateOpen, setTemplateOpen] = useState(false);
  const handleTemplateSelect = useCallback((text: string) => {
    setHotspot(text);
  }, [setHotspot]);

  return (
    <div className="grain-overlay flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}>
      <Header
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        loading={loading}
        loadingStep={loadingStep}
        analyses={analyses}
        currentIndex={currentIndex}
        onSelectAnalysis={loadAnalysis}
        onExport={handleExport}
        historyCount={historyItems.length}
        onOpenHistory={() => navigate('/history')}
        onOpenCompare={() => { setCompareLeft(null); setCompareRight(null); navigate('/compare'); }}
        onOpenTemplates={() => setTemplateOpen(true)}
        onOpenShare={() => setShareOpen(true)}
        hasAnalysis={hasData}
        shortcutRegistry={shortcutRegistry}
      />

      <div id="liveboard-main-content" className="flex flex-1 overflow-hidden">
        <EventPanel
          hotspot={hotspot}
          setHotspot={setHotspot}
          onRun={runSimulation}
          onRunBatch={runBatchSimulation}
          loading={loading}
          isOpen={sidebarOpen}
          hasAnalysis={hasData}
          analyzedHotspot={analyzedHotspot}
        />

        <main className="flex-1 flex flex-col relative overflow-hidden">
          {/* Event Bridge source badge */}
          {eventSource === 'stockpulse' && (
            <div className="absolute top-3 right-3 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md text-[11px] font-medium"
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: 'rgb(59,130,246)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              {t('stockpulse.badge')}
              <button
                onClick={() => setEventSource(null)}
                className="ml-1 opacity-50 hover:opacity-100 text-xs leading-none"
              >&times;</button>
            </div>
          )}

          {/* Batch results tab bar */}
          <BatchResults
            batchState={batchState}
            onSelectTab={setBatchActiveTab}
            onClose={clearBatch}
          />

          {error && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm flex items-center gap-3 backdrop-blur-md"
              style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger)' }}
            >
              <span>{error}</span>
              <button onClick={() => setError(null)} className="opacity-60 hover:opacity-100 text-lg leading-none">&times;</button>
            </div>
          )}

          {/* Empty state */}
          {!hasData && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
                <Newspaper className="w-7 h-7 text-blue-500/50" />
              </div>
              <div className="text-center max-w-md">
                <p className="text-lg font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  {t('empty.title')}
                </p>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {t('empty.subtitle')}
                </p>
              </div>
            </div>
          )}

          {/* Cinematic loading overlay */}
          {loading && !hasData && (
            <div className="loading-overlay absolute inset-0 z-40 flex items-center justify-center">
              <div className="text-center space-y-8 max-w-sm animate-fade-up">
                {/* Radar rings */}
                <div className="relative mx-auto w-20 h-20">
                  <div className="absolute inset-0 rounded-full border border-blue-500/20 animate-pulse-ring" />
                  <div className="absolute inset-1 rounded-full border border-blue-500/15 animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
                  <div className="absolute inset-2 rounded-full border border-blue-500/10 animate-pulse-ring" style={{ animationDelay: '1s' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center glass">
                      <Sparkles className="w-5 h-5 text-blue-500 animate-float" />
                    </div>
                  </div>
                </div>

                {/* Step text */}
                <div className="space-y-2">
                  <p className="text-base font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    {loadingStep || t('loading.preparing')}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {t('loading.subtitle')}
                  </p>
                </div>

                {/* Progress steps */}
                <div className="flex justify-center gap-6 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {[t('loading.step1'), t('loading.step2'), t('loading.step3'), t('loading.step4')].map((step, i) => {
                    const keywords = [t('loading.layer1').slice(0, 2), t('loading.layer2').slice(0, 2), t('loading.layer3').slice(0, 2), t('loading.insight').slice(0, 2)];
                    const isActive = loadingStep.includes(keywords[i]);
                    const isPast = loadingStep && !isActive &&
                      keywords.findIndex(k => loadingStep.includes(k)) > i;
                    return (
                      <div key={i} className="flex flex-col items-center gap-1.5">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold transition-all duration-500"
                          style={{
                            background: isActive ? 'var(--accent)' : isPast ? 'var(--success)' : 'var(--bg-input)',
                            color: isActive || isPast ? '#fff' : 'var(--text-muted)',
                            boxShadow: isActive ? '0 0 12px rgba(59,130,246,0.4)' : 'none',
                          }}
                        >
                          {isPast ? '\u2713' : i + 1}
                        </div>
                        <span className={isActive ? 'font-medium' : ''} style={{ color: isActive ? 'var(--accent)' : undefined }}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Event badge */}
                <div className="glass rounded-full px-4 py-2 mx-auto max-w-xs truncate text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {hotspot}
                </div>
              </div>
            </div>
          )}

          {/* Graph + Market Pulse right panel */}
          {hasData && (
            <ErrorBoundary fallbackTitle="图表渲染出错">
              <div className="flex-1 flex min-h-0">
                <div className="flex-1 min-w-0 relative">
                  <LiveGraph data={data} animate={shouldAnimate} assetQuotes={assetQuotes} />
                  {loadingStep && !loading && (
                    <div
                      className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md text-xs font-medium"
                      style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', color: 'var(--accent)' }}
                    >
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      {loadingStep}
                    </div>
                  )}
                </div>

                <MarketPulse
                  matchedMarkets={matchedMarkets}
                  selectedMarket={selectedMarket}
                  onSelectMarket={handleSelectMarket}
                  polymarketQueries={data.polymarketQueries || []}
                  suggestedAssets={data.suggestedAssets || targetAssets}
                />
              </div>
            </ErrorBoundary>
          )}

          {/* Summary panel at bottom */}
          {hasData && !loading && (
            <SummaryPanel
              summary={data.summary}
              actions={data.coreActions}
              divergenceAnalysis={data.divergenceAnalysis}
              hasMarketData={matchedMarkets.length > 0}
              swarmResult={swarmResult}
              swarmLoading={swarmLoading}
            />
          )}
        </main>
      </div>

      {/* History Drawer */}
      <ErrorBoundary fallbackTitle="历史记录加载出错">
        <HistoryDrawer
          isOpen={historyOpen}
          onClose={() => navigate('/')}
          items={historyItems}
          onReplay={handleReplayHistory}
          onCompare={handleCompareFromHistory}
          onHistoryChange={refreshHistory}
          currentHotspot={analyzedHotspot}
        />
      </ErrorBoundary>

      {/* Compare Mode */}
      <ErrorBoundary fallbackTitle="对比模式加载出错">
        <CompareMode
          isOpen={compareOpen}
          onClose={() => navigate('/')}
          leftItem={compareLeft}
          rightItem={compareRight}
          allItems={historyItems}
          currentData={hasData ? data : null}
          currentHotspot={analyzedHotspot}
          onSelectLeft={setCompareLeft}
          onSelectRight={setCompareRight}
        />
      </ErrorBoundary>

      {/* Keyboard shortcuts help modal */}
      <ShortcutsHelpModal
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        registry={shortcutRegistry}
      />

      {/* Event template selector */}
      <TemplateSelector
        isOpen={templateOpen}
        onClose={() => setTemplateOpen(false)}
        onSelect={handleTemplateSelect}
      />

      {/* Share report modal */}
      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        reportData={shareReportData}
      />
    </div>
  );
}
