import React, { useState, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { EventPanel } from './components/EventPanel';
import { LiveGraph } from './components/LiveGraph';
import { SummaryPanel } from './components/SummaryPanel';
import { PriceTrend } from './components/PriceTrend';
import { PolymarketMarket, searchEvents } from './services/polymarket';
import { SimulationData, Variable, Analysis, callLLM, extractJSON, buildPrompts } from './services/llm';

const EMPTY_DATA: SimulationData = {
  scenarios: [], nodes: [], edges: [], summary: '', coreActions: [],
};

export default function App() {
  // Input
  const [hotspot, setHotspot] = useState('');
  const [variables, setVariables] = useState<Variable[]>([]);
  const [targetAssets, setTargetAssets] = useState('');

  // Analysis
  const [data, setData] = useState<SimulationData>(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  // History
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // Polymarket (auto-matched after analysis, not the entry point)
  const [matchedMarkets, setMatchedMarkets] = useState<PolymarketMarket[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<PolymarketMarket | null>(null);
  const [showTrend, setShowTrend] = useState(false);

  // UI
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Search Polymarket using AI-generated English queries
  const matchPolymarkets = useCallback(async (queries: string[]) => {
    if (!queries?.length) return;
    try {
      const allMarkets: PolymarketMarket[] = [];
      const seen = new Set<string>();

      // Search with each query, deduplicate
      for (const query of queries.slice(0, 4)) {
        try {
          const events = await searchEvents(query, 5);
          for (const e of events) {
            for (const m of e.markets) {
              if (!seen.has(m.id) && m.volume24hr > 1000) {
                seen.add(m.id);
                allMarkets.push(m);
              }
            }
          }
        } catch {}
      }

      // Sort by volume (most liquid = most reliable) and take top 6
      allMarkets.sort((a, b) => b.volume24hr - a.volume24hr);
      setMatchedMarkets(allMarkets.slice(0, 6));
    } catch {
      setMatchedMarkets([]);
    }
  }, []);

  const runSimulation = useCallback(async () => {
    if (!hotspot.trim()) { setError('请输入一条事件性新闻'); return; }

    setLoading(true);
    setError(null);
    setShouldAnimate(true);
    setMatchedMarkets([]);
    setSelectedMarket(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
      // Step 1: AI analysis (generates transmission chain + Polymarket search queries)
      setLoadingStep('AI 正在分析传导链...');
      const isAutoMode = !targetAssets.trim();
      const { systemPrompt, userPrompt } = buildPrompts(
        hotspot, variables, targetAssets, '', false, isAutoMode,
      );

      const responseText = await callLLM(systemPrompt, userPrompt, controller.signal);

      setLoadingStep('解析推演结果...');
      const parsed = extractJSON(responseText) as SimulationData;

      if (!parsed.nodes?.length || !parsed.edges?.length) {
        throw new Error('AI 返回数据不完整，请重试');
      }

      if (isAutoMode && parsed.suggestedAssets) {
        setTargetAssets(parsed.suggestedAssets);
      }

      // Step 2: Use AI-generated queries to search Polymarket (non-blocking)
      setLoadingStep('匹配 Polymarket 预测市场...');
      if (parsed.polymarketQueries?.length) {
        // Fire and forget - don't block rendering for Polymarket
        matchPolymarkets(parsed.polymarketQueries).then(() => {
          // After Polymarket data arrives, we could re-inject probabilities
          // but for now, just show them in the sidebar
        });
      }

      // Post-processing: enforce quality constraints the LLM might miss
      if (parsed.summary && parsed.summary.length > 50) {
        // Truncate at last punctuation within limit
        const truncated = parsed.summary.slice(0, 50);
        const lastPunc = Math.max(truncated.lastIndexOf('，'), truncated.lastIndexOf('。'), truncated.lastIndexOf('！'), truncated.lastIndexOf('、'));
        parsed.summary = lastPunc > 20 ? truncated.slice(0, lastPunc + 1) : truncated;
      }
      // Ensure node labels are short
      parsed.nodes = parsed.nodes.map(n => ({
        ...n,
        label: n.label.length > 10 ? n.label.slice(0, 10) : n.label,
      }));

      setLoadingStep('渲染传导图...');
      setData(parsed);

      // Save history
      const analysis: Analysis = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        hotspot,
        data: parsed,
        eventTitle: hotspot,
      };
      setAnalyses(prev => [analysis, ...prev]);
      setCurrentIndex(0);

    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('请求超时，请检查 LLM 服务是否运行中');
      } else {
        setError(err.message || '推演失败');
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      setLoadingStep('');
    }
  }, [hotspot, variables, targetAssets, matchPolymarkets]);

  const loadAnalysis = useCallback((index: number) => {
    const a = analyses[index];
    if (!a) return;
    setCurrentIndex(index);
    setData(a.data);
    setHotspot(a.hotspot);
    setShouldAnimate(false);
  }, [analyses]);

  const handleExport = useCallback(() => {
    if (!data.nodes.length) return;
    const blob = new Blob([JSON.stringify({ hotspot, timestamp: new Date().toISOString(), ...data }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liveboard-${hotspot.slice(0, 20).replace(/\s/g, '_')}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data, hotspot]);

  const handleSelectMarket = useCallback((m: PolymarketMarket) => {
    setSelectedMarket(m);
    setShowTrend(true);
  }, []);

  const trendTokenId = selectedMarket?.clobTokenIds?.[0] || null;
  const trendTitle = selectedMarket?.groupItemTitle || selectedMarket?.question || '';
  const hasData = data.nodes.length > 0;

  return (
    <div className="flex flex-col h-screen bg-[#080c16] text-slate-100 font-sans overflow-hidden">
      <Header
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        loading={loading}
        loadingStep={loadingStep}
        analyses={analyses}
        currentIndex={currentIndex}
        onSelectAnalysis={loadAnalysis}
        onExport={handleExport}
      />

      <div className="flex flex-1 overflow-hidden">
        <EventPanel
          hotspot={hotspot}
          setHotspot={setHotspot}
          variables={variables}
          setVariables={setVariables}
          targetAssets={targetAssets}
          setTargetAssets={setTargetAssets}
          scenarios={data.scenarios}
          onRun={runSimulation}
          loading={loading}
          isOpen={sidebarOpen}
          matchedMarkets={matchedMarkets}
          onSelectMarket={handleSelectMarket}
          selectedMarketId={selectedMarket?.id}
        />

        <main className="flex-1 flex flex-col relative overflow-hidden">
          {error && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm flex items-center gap-3 backdrop-blur-md">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-300 text-lg leading-none">&times;</button>
            </div>
          )}

          {/* Empty state */}
          {!hasData && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-5">
              <div className="text-5xl opacity-15">📰</div>
              <div className="text-center max-w-md">
                <p className="text-lg font-semibold text-slate-400">输入一条新闻，看它如何传导到市场</p>
                <p className="text-sm mt-2 text-slate-600 leading-relaxed">
                  输入事件性新闻 → AI 分析因果传导链 → 自动匹配 Polymarket 概率 → 生成可视化决策图
                </p>
              </div>
            </div>
          )}

          {/* Loading overlay — always visible when loading */}
          {loading && (
            <div className="absolute inset-0 z-40 bg-[#080c16]/90 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center space-y-6 max-w-md">
                {/* Animated graph icon */}
                <div className="relative mx-auto w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-2 border-red-500/20 animate-ping" />
                  <div className="absolute inset-2 rounded-full border-2 border-amber-500/30 animate-ping [animation-delay:400ms]" />
                  <div className="absolute inset-4 rounded-full border-2 border-emerald-500/30 animate-ping [animation-delay:800ms]" />
                  <div className="absolute inset-0 flex items-center justify-center text-3xl">🔍</div>
                </div>

                {/* Step text */}
                <div>
                  <p className="text-lg font-semibold text-slate-200">{loadingStep || '准备中...'}</p>
                  <p className="text-xs text-slate-500 mt-2">通过 Claude 分析，通常需要 15-30 秒</p>
                </div>

                {/* Step indicators */}
                <div className="flex flex-col gap-2 text-left mx-auto w-64">
                  {[
                    { key: '分析', label: 'AI 推演因果传导链' },
                    { key: '解析', label: '解析结构化结果' },
                    { key: 'Polymarket', label: '匹配 Polymarket 市场' },
                    { key: '渲染', label: '渲染传导图' },
                  ].map((step, i) => {
                    const isActive = loadingStep.includes(step.key);
                    const isPast = loadingStep && !isActive &&
                      ['匹配', '分析', '解析', '渲染'].indexOf(step.key) <
                      ['匹配', '分析', '解析', '渲染'].findIndex(k => loadingStep.includes(k));
                    return (
                      <div key={i} className={`flex items-center gap-3 text-sm transition-all duration-300 ${isActive ? 'text-slate-200' : isPast ? 'text-slate-500' : 'text-slate-700'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isActive ? 'bg-red-500/20 text-red-400 ring-2 ring-red-500/30' :
                          isPast ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-600'
                        }`}>
                          {isPast ? '✓' : i + 1}
                        </div>
                        <span>{step.label}</span>
                        {isActive && <span className="text-red-400 animate-pulse text-xs">●</span>}
                      </div>
                    );
                  })}
                </div>

                {/* Event being analyzed */}
                <div className="text-xs text-slate-600 bg-slate-800/50 rounded-lg px-4 py-2 mx-auto max-w-xs truncate">
                  📰 {hotspot}
                </div>
              </div>
            </div>
          )}

          {/* Graph + Trend */}
          {hasData && (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 min-h-0">
                <LiveGraph data={data} animate={shouldAnimate} />
              </div>
              {showTrend && selectedMarket && (
                <div className="h-[200px] p-3 border-t border-slate-800/50 bg-[#0a0e1a]">
                  <PriceTrend tokenId={trendTokenId} marketTitle={trendTitle} />
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          {hasData && !loading && (
            <SummaryPanel
              summary={data.summary}
              actions={data.coreActions}
              divergenceAnalysis={data.divergenceAnalysis}
              hasMarketData={matchedMarkets.length > 0}
              showTrend={showTrend && !!selectedMarket}
              onToggleTrend={() => setShowTrend(!showTrend)}
              hasTrendData={!!selectedMarket}
            />
          )}
        </main>
      </div>
    </div>
  );
}
