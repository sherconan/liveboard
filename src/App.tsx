import React, { useState, useCallback, useRef } from 'react';
import { Newspaper, Sparkles } from 'lucide-react';
import { Header } from './components/Header';
import { EventPanel } from './components/EventPanel';
import { LiveGraph } from './components/LiveGraph';
import { SummaryPanel } from './components/SummaryPanel';
import { MarketPulse } from './components/MarketPulse';
import { PolymarketMarket, searchEvents } from './services/polymarket';
import { SimulationData, Variable, Analysis, callLLM, extractJSON, buildLayer1Prompt, buildLayer2Prompt, buildLayer3Prompt, buildInsightPrompt } from './services/llm';
import { SwarmResult, runSwarmAnalysis } from './services/swarm';
import { fetchAssetQuotes, QuoteData } from './services/quotes';

const EMPTY_DATA: SimulationData = {
  scenarios: [], nodes: [], edges: [], summary: '', coreActions: [],
};

export default function App() {
  const [hotspot, setHotspot] = useState('');
  const [variables, setVariables] = useState<Variable[]>([]);
  const [targetAssets, setTargetAssets] = useState('');
  const [data, setData] = useState<SimulationData>(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [matchedMarkets, setMatchedMarkets] = useState<PolymarketMarket[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<PolymarketMarket | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [analyzedHotspot, setAnalyzedHotspot] = useState('');
  const [swarmResult, setSwarmResult] = useState<SwarmResult | null>(null);
  const [swarmLoading, setSwarmLoading] = useState(false);
  const [assetQuotes, setAssetQuotes] = useState<Map<string, QuoteData>>(new Map());

  // When user picks a different news, clear old results
  const handleSetHotspot = useCallback((val: string) => {
    setHotspot(val);
    if (val !== analyzedHotspot) {
      setData(EMPTY_DATA);
      setMatchedMarkets([]);
      setSelectedMarket(null);
      setSwarmResult(null);
      setError(null);
    }
  }, [analyzedHotspot]);

  const matchPolymarkets = useCallback(async (queries: string[]) => {
    if (!queries?.length) return;
    try {
      const allMarkets: PolymarketMarket[] = [];
      const seen = new Set<string>();
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
      allMarkets.sort((a, b) => b.volume24hr - a.volume24hr);
      setMatchedMarkets(allMarkets.slice(0, 6));
    } catch {
      setMatchedMarkets([]);
    }
  }, []);

  // Helper: truncate node labels
  const normNodes = (nodes: any[]) => nodes.map((n: any) => ({
    ...n, label: n.label?.length > 10 ? n.label.slice(0, 10) : (n.label || ''),
  }));

  const runSimulation = useCallback(async () => {
    if (!hotspot.trim()) { setError('请输入一条事件性新闻'); return; }
    setLoading(true);
    setError(null);
    setShouldAnimate(true);
    setMatchedMarkets([]);
    setSelectedMarket(null);
    setSwarmResult(null);
    setSwarmLoading(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);

    // ── Launch swarm in parallel (streams each agent as it finishes) ──
    runSwarmAnalysis(hotspot, controller.signal, (partial) => setSwarmResult(partial))
      .then(result => setSwarmResult(result))
      .catch(() => {})
      .finally(() => setSwarmLoading(false));

    // Accumulate nodes/edges across layers
    let allNodes: any[] = [];
    let allEdges: any[] = [];
    let pmQueries: string[] = [];
    let sugAssets = '';

    const pushGraph = (newNodes: any[], newEdges: any[]) => {
      allNodes = [...allNodes, ...normNodes(newNodes)];
      allEdges = [...allEdges, ...newEdges];
      setData({
        scenarios: [],
        nodes: allNodes,
        edges: allEdges,
        summary: '',
        coreActions: [],
        suggestedAssets: sugAssets,
        polymarketQueries: pmQueries,
      });
    };

    try {
      // ── Layer 0+1: Hotspot + Variables (~3-5s) ──
      setLoadingStep('识别事件与变量...');
      const { system: s1, user: u1 } = buildLayer1Prompt(hotspot, variables);
      const r1 = extractJSON(await callLLM(s1, u1, controller.signal, 0));

      if (r1.polymarketQueries) pmQueries = r1.polymarketQueries;
      pushGraph(r1.nodes || [], r1.edges || []);
      setAnalyzedHotspot(hotspot);
      setLoading(false); // ← graph visible now!

      // Fire Polymarket in background
      if (pmQueries.length) matchPolymarkets(pmQueries);

      // ── Layer 2: Impacts (~3-5s) ──
      setLoadingStep('推导传导效应...');
      const { system: s2, user: u2 } = buildLayer2Prompt(hotspot, allNodes);
      const r2 = extractJSON(await callLLM(s2, u2, controller.signal, 0));
      pushGraph(r2.nodes || [], r2.edges || []);

      // ── Layer 3: Assets (~3-5s) ──
      setLoadingStep('确定受影响标的...');
      const { system: s3, user: u3 } = buildLayer3Prompt(hotspot, allNodes, targetAssets);
      const r3 = extractJSON(await callLLM(s3, u3, controller.signal, 0));
      if (r3.suggestedAssets) {
        sugAssets = r3.suggestedAssets;
        setTargetAssets(sugAssets);
      }
      pushGraph(r3.nodes || [], r3.edges || []);

      // ── Fetch real-time quotes for asset nodes (non-blocking) ──
      const assetLabels = allNodes.filter(n => n.type === 'asset').map(n => n.label);
      if (assetLabels.length > 0) {
        fetchAssetQuotes(assetLabels).then(quotes => setAssetQuotes(quotes)).catch(() => {});
      }

      // ── Final: Trading insight (~3-5s) ──
      setLoadingStep('生成交易判断...');
      const { system: s4, user: u4 } = buildInsightPrompt(hotspot, allNodes, allEdges);
      const r4 = extractJSON(await callLLM(s4, u4, controller.signal, 0));

      let summary = r4.summary || '';
      if (summary.length > 50) {
        const t = summary.slice(0, 50);
        const lp = Math.max(t.lastIndexOf('，'), t.lastIndexOf('。'), t.lastIndexOf('！'), t.lastIndexOf('、'));
        summary = lp > 20 ? t.slice(0, lp + 1) : t;
      }

      const fullData: SimulationData = {
        scenarios: r4.scenarios || [],
        nodes: allNodes,
        edges: allEdges,
        summary,
        coreActions: r4.coreActions || [],
        suggestedAssets: sugAssets,
        polymarketQueries: pmQueries,
      };
      setData(fullData);

      // Save history
      setAnalyses(prev => [{
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        hotspot,
        data: fullData,
        eventTitle: hotspot,
      }, ...prev]);
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
    setAnalyzedHotspot(a.hotspot);
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
  }, []);

  const hasData = data.nodes.length > 0;

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
      />

      <div className="flex flex-1 overflow-hidden">
        <EventPanel
          hotspot={hotspot}
          setHotspot={handleSetHotspot}
          onRun={runSimulation}
          loading={loading}
          isOpen={sidebarOpen}
          hasAnalysis={hasData}
          analyzedHotspot={analyzedHotspot}
        />

        <main className="flex-1 flex flex-col relative overflow-hidden">
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
                  从左侧选择一条新闻开始分析
                </p>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  选择实时新闻 → AI 分析因果传导链 → 生成决策图
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
                    {loadingStep || '准备中...'}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    多 Agent 协同分析 · 通常 20-40 秒
                  </p>
                </div>

                {/* Progress steps */}
                <div className="flex justify-center gap-6 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {['识别事件', '推演传导', '确定标的', '交易判断'].map((step, i) => {
                    const keywords = ['识别', '推导', '确定', '交易'];
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
                          {isPast ? '✓' : i + 1}
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
            <div className="flex-1 flex min-h-0">
              <div className="flex-1 min-w-0 relative">
                <LiveGraph data={data} animate={shouldAnimate} assetQuotes={assetQuotes} />
                {/* Step 2 indicator — shows while generating insights after graph is visible */}
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

              {/* Right panel — always visible when analysis exists */}
              <MarketPulse
                matchedMarkets={matchedMarkets}
                selectedMarket={selectedMarket}
                onSelectMarket={handleSelectMarket}
                polymarketQueries={data.polymarketQueries || []}
                suggestedAssets={data.suggestedAssets || targetAssets}
              />
            </div>
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
    </div>
  );
}
