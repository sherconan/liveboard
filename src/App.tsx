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

  // Auto-match Polymarket markets for the event
  const matchPolymarkets = useCallback(async (eventText: string) => {
    try {
      // Extract key terms from the event for Polymarket search
      const keywords = eventText
        .replace(/[，。、！？]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 1)
        .slice(0, 3)
        .join(' ');

      if (!keywords) return;

      const events = await searchEvents(keywords, 5);
      const markets = events.flatMap(e => e.markets).slice(0, 6);
      setMatchedMarkets(markets);
    } catch {
      // Polymarket matching is best-effort, don't block on failure
      setMatchedMarkets([]);
    }
  }, []);

  const getMarketContext = (): string => {
    if (matchedMarkets.length === 0) return '';

    const marketLines = matchedMarkets.slice(0, 3).map(m => {
      const yesIdx = m.outcomes.findIndex(o => o.toLowerCase() === 'yes');
      const prob = yesIdx >= 0 ? m.outcomePrices[yesIdx] : m.outcomePrices[0];
      return `- "${m.groupItemTitle || m.question}": ${(prob * 100).toFixed(1)}%`;
    }).join('\n');

    return `
【Polymarket 预测市场参考数据】
以下是与该事件相关的预测市场定价（基于真金白银的博弈）：
${marketLines}

请在分析中参考这些市场共识概率。如果你的判断与市场有显著分歧，请在 divergenceAnalysis 中说明原因。`;
  };

  const runSimulation = useCallback(async () => {
    if (!hotspot.trim()) { setError('请输入一条事件性新闻'); return; }

    setLoading(true);
    setError(null);
    setShouldAnimate(true);
    setMatchedMarkets([]);
    setSelectedMarket(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    try {
      // Step 1: Match Polymarket data (concurrent with prompt building)
      setLoadingStep('匹配预测市场数据...');
      const marketPromise = matchPolymarkets(hotspot);

      // Wait a bit for Polymarket data, but don't block
      await Promise.race([
        marketPromise,
        new Promise(r => setTimeout(r, 3000)),
      ]);

      // Step 2: Build and send LLM request
      setLoadingStep('AI 正在分析传导链...');
      const marketContext = getMarketContext();
      const isAutoMode = !targetAssets.trim();
      const { systemPrompt, userPrompt } = buildPrompts(
        hotspot, variables, targetAssets, marketContext, matchedMarkets.length > 0, isAutoMode,
      );

      const responseText = await callLLM(systemPrompt, userPrompt, controller.signal);

      setLoadingStep('解析推演结果...');
      const parsed = extractJSON(responseText) as SimulationData;

      if (!parsed.nodes?.length || !parsed.edges?.length) {
        throw new Error('AI 返回的数据不完整，请重试');
      }

      // Inject market prob into first scenario for comparison
      if (matchedMarkets.length > 0 && parsed.scenarios.length > 0) {
        const m = matchedMarkets[0];
        const yesIdx = m.outcomes.findIndex(o => o.toLowerCase() === 'yes');
        parsed.scenarios[0].marketProb = yesIdx >= 0 ? m.outcomePrices[yesIdx] : m.outcomePrices[0];
      }

      if (isAutoMode && parsed.suggestedAssets) {
        setTargetAssets(parsed.suggestedAssets);
      }

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
        setError('请求超时（90s），请检查 LLM 服务');
      } else {
        setError(err.message || '推演失败');
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      setLoadingStep('');
    }
  }, [hotspot, variables, targetAssets, matchedMarkets, matchPolymarkets]);

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

          {/* Loading state */}
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
