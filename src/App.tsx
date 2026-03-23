import React, { useState, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { EventPanel } from './components/EventPanel';
import { LiveGraph } from './components/LiveGraph';
import { SummaryPanel } from './components/SummaryPanel';
import { PriceTrend } from './components/PriceTrend';
import { PolymarketEvent, PolymarketMarket } from './services/polymarket';
import { SimulationData, Variable, Analysis, callLLM, extractJSON, buildPrompts } from './services/llm';

const EMPTY_DATA: SimulationData = {
  scenarios: [],
  nodes: [],
  edges: [],
  summary: '',
  coreActions: [],
};

export default function App() {
  // Input state
  const [hotspot, setHotspot] = useState('');
  const [variables, setVariables] = useState<Variable[]>([]);
  const [targetAssets, setTargetAssets] = useState('');

  // Analysis state
  const [data, setData] = useState<SimulationData>(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  // History
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // Polymarket state
  const [selectedEvent, setSelectedEvent] = useState<PolymarketEvent | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<PolymarketMarket | null>(null);
  const [showTrend, setShowTrend] = useState(false);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const graphRef = useRef<HTMLDivElement>(null);

  const handleSelectEvent = useCallback((event: PolymarketEvent, market: PolymarketMarket) => {
    setSelectedEvent(event);
    setSelectedMarket(market);
    setHotspot(event.title);
    setShowTrend(true);
  }, []);

  const getMarketContext = (): string => {
    if (!selectedMarket) return '';
    const yesIdx = selectedMarket.outcomes.findIndex(o => o.toLowerCase() === 'yes');
    const prob = yesIdx >= 0 ? selectedMarket.outcomePrices[yesIdx] : selectedMarket.outcomePrices[0];
    return `
【Polymarket 市场数据】
事件: ${selectedEvent?.title || selectedMarket.question}
问题: ${selectedMarket.question}
${selectedMarket.groupItemTitle ? `选项: ${selectedMarket.groupItemTitle}` : ''}
市场共识概率: ${(prob * 100).toFixed(1)}%
24h交易量: $${selectedMarket.volume24hr.toLocaleString()}
${selectedMarket.oneDayPriceChange !== null ? `24h变动: ${(selectedMarket.oneDayPriceChange * 100).toFixed(1)}%` : ''}

请对比你的分析与市场共识，如有分歧请解释原因。`;
  };

  const runSimulation = useCallback(async (autoMode: boolean) => {
    if (!hotspot.trim()) { setError('请先输入或选择一个事件'); return; }

    setLoading(true);
    setError(null);
    setShouldAnimate(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    try {
      setLoadingStep('构建分析框架...');
      await new Promise(r => setTimeout(r, 300));

      const marketContext = getMarketContext();
      const { systemPrompt, userPrompt } = buildPrompts(
        hotspot, variables, autoMode ? '' : targetAssets,
        marketContext, !!selectedMarket, autoMode
      );

      setLoadingStep('AI 正在推演因果链...');
      const responseText = await callLLM(systemPrompt, userPrompt, controller.signal);

      setLoadingStep('解析推演结果...');
      const parsed = extractJSON(responseText) as SimulationData;

      if (!parsed.nodes?.length || !parsed.edges?.length) {
        throw new Error('AI 返回的数据不完整');
      }

      // Inject market prob for comparison
      if (selectedMarket && parsed.scenarios.length > 0) {
        const yesIdx = selectedMarket.outcomes.findIndex(o => o.toLowerCase() === 'yes');
        const marketProb = yesIdx >= 0 ? selectedMarket.outcomePrices[yesIdx] : selectedMarket.outcomePrices[0];
        parsed.scenarios[0].marketProb = marketProb;
      }

      // If auto-mode returned suggested assets, update the field
      if (autoMode && parsed.suggestedAssets) {
        setTargetAssets(parsed.suggestedAssets);
      }

      setLoadingStep('渲染传导图...');
      setData(parsed);

      // Save to history
      const analysis: Analysis = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        hotspot,
        data: parsed,
        eventTitle: selectedEvent?.title,
      };
      setAnalyses(prev => [analysis, ...prev]);
      setCurrentIndex(0);

    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('请求超时（90s），请检查 LLM 服务');
      } else {
        setError(err.message || '推演失败');
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      setLoadingStep('');
    }
  }, [hotspot, variables, targetAssets, selectedEvent, selectedMarket]);

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
    const exportData = {
      hotspot,
      timestamp: new Date().toISOString(),
      ...data,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liveboard-${hotspot.slice(0, 20).replace(/\s/g, '_')}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data, hotspot]);

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
          onSelectEvent={handleSelectEvent}
          selectedMarketId={selectedMarket?.id}
          isOpen={sidebarOpen}
        />

        <main className="flex-1 flex flex-col relative overflow-hidden" ref={graphRef}>
          {/* Error toast */}
          {error && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm flex items-center gap-3 backdrop-blur-md">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-300 text-lg leading-none">&times;</button>
            </div>
          )}

          {/* Empty state */}
          {!hasData && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
              <div className="text-5xl opacity-20">🌍</div>
              <div className="text-center">
                <p className="text-lg font-semibold text-slate-400">选择一个事件，开始分析</p>
                <p className="text-sm mt-2 max-w-sm text-slate-600">
                  从左侧 Polymarket 热门事件中选择，或直接输入事件描述，一键生成因果传导图
                </p>
              </div>
            </div>
          )}

          {/* Graph + Trend */}
          {(hasData || loading) && (
            <div className={`flex-1 flex flex-col`}>
              <div className={`flex-1 min-h-0 ${showTrend && selectedMarket ? '' : ''}`}>
                {hasData && <LiveGraph data={data} animate={shouldAnimate} />}
                {loading && !hasData && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <div className="flex gap-1.5 justify-center">
                        {['bg-red-500', 'bg-amber-500', 'bg-orange-500', 'bg-emerald-500'].map((c, i) => (
                          <div key={i} className={`w-2.5 h-2.5 rounded-full ${c} animate-pulse`} style={{ animationDelay: `${i * 200}ms` }} />
                        ))}
                      </div>
                      <p className="text-sm text-slate-400">{loadingStep}</p>
                    </div>
                  </div>
                )}
              </div>
              {showTrend && selectedMarket && hasData && (
                <div className="h-[200px] p-3 border-t border-slate-800/50 bg-[#0a0e1a]">
                  <PriceTrend tokenId={trendTokenId} marketTitle={trendTitle} />
                </div>
              )}
            </div>
          )}

          {/* Summary panel */}
          {hasData && !loading && (
            <SummaryPanel
              summary={data.summary}
              actions={data.coreActions}
              divergenceAnalysis={data.divergenceAnalysis}
              hasMarketData={!!selectedMarket}
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
