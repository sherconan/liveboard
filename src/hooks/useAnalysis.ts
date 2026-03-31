import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { PolymarketMarket, searchEvents } from '../services/polymarket';
import {
  SimulationData, Variable, Analysis,
  callLLM, extractJSON,
  buildLayer1Prompt, buildLayer2Prompt, buildLayer3Prompt, buildInsightPrompt,
} from '../services/llm';
import { SwarmResult, runSwarmAnalysis } from '../services/swarm';
import { fetchAssetQuotes, QuoteData } from '../services/quotes';
import { HistoryItem, loadHistory, saveToHistory } from '../services/historyStore';
import { classifyError } from '../components/ErrorFallback';
import { useLocale } from '../i18n';

const EMPTY_DATA: SimulationData = {
  scenarios: [], nodes: [], edges: [], summary: '', coreActions: [],
};

export interface BatchResult {
  event: string;
  status: 'fulfilled' | 'rejected';
  data?: SimulationData;
  error?: string;
}

export interface BatchState {
  active: boolean;
  events: string[];
  progress: number;
  total: number;
  results: BatchResult[];
  activeTab: number; // -1 = overview, 0..n = individual event
}

// Helper: truncate node labels
const normNodes = (nodes: any[]) => nodes.map((n: any) => ({
  ...n, label: n.label?.length > 10 ? n.label.slice(0, 10) : (n.label || ''),
}));

export function useAnalysis() {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // ── State ──
  const [hotspot, setHotspotRaw] = useState('');
  const [variables] = useState<Variable[]>([]);
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
  const [analyzedHotspot, setAnalyzedHotspot] = useState('');
  const [swarmResult, setSwarmResult] = useState<SwarmResult | null>(null);
  const [swarmLoading, setSwarmLoading] = useState(false);
  const [assetQuotes, setAssetQuotes] = useState<Map<string, QuoteData>>(new Map());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // History & Compare
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [compareLeft, setCompareLeft] = useState<HistoryItem | null>(null);
  const [compareRight, setCompareRight] = useState<HistoryItem | null>(null);

  // Derive overlay state from current route
  const historyOpen = location.pathname === '/history';
  const compareOpen = location.pathname === '/compare';

  // Event bridge: source tracking
  const [eventSource, setEventSource] = useState<string | null>(null);

  // Batch mode
  const [batchState, setBatchState] = useState<BatchState>({
    active: false, events: [], progress: 0, total: 0, results: [], activeTab: -1,
  });

  // Load history on mount
  useEffect(() => {
    setHistoryItems(loadHistory());
  }, []);

  // Event bridge: read URL params on mount
  const pendingBridgeRun = useRef(false);
  useEffect(() => {
    if (location.pathname === '/analyze') {
      const eventParam = searchParams.get('event');
      const sourceParam = searchParams.get('source');
      if (eventParam) {
        setHotspotRaw(eventParam);
        if (sourceParam) setEventSource(sourceParam);
        pendingBridgeRun.current = true;
        navigate('/', { replace: true });
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshHistory = useCallback(() => {
    setHistoryItems(loadHistory());
  }, []);

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

  // When user picks a different news, clear old results
  const setHotspot = useCallback((val: string) => {
    setHotspotRaw(val);
    if (val !== analyzedHotspot) {
      setData(EMPTY_DATA);
      setMatchedMarkets([]);
      setSelectedMarket(null);
      setSwarmResult(null);
      setError(null);
    }
  }, [analyzedHotspot]);

  const runSimulation = useCallback(async () => {
    if (!hotspot.trim()) { setError(t('error.empty')); return; }
    setLoading(true);
    setError(null);
    setShouldAnimate(true);
    setMatchedMarkets([]);
    setSelectedMarket(null);
    setSwarmResult(null);
    setSwarmLoading(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);

    // Launch swarm in parallel
    runSwarmAnalysis(hotspot, controller.signal, (partial) => setSwarmResult(partial))
      .then(result => setSwarmResult(result))
      .catch(() => {})
      .finally(() => setSwarmLoading(false));

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
      // Layer 0+1
      setLoadingStep(t('loading.layer1'));
      const { system: s1, user: u1 } = buildLayer1Prompt(hotspot, variables, locale);
      const r1 = extractJSON(await callLLM(s1, u1, controller.signal, 0));

      if (r1.polymarketQueries) pmQueries = r1.polymarketQueries;
      pushGraph(r1.nodes || [], r1.edges || []);
      setAnalyzedHotspot(hotspot);
      setLoading(false);

      if (pmQueries.length) matchPolymarkets(pmQueries);

      // Layer 2
      setLoadingStep(t('loading.layer2'));
      const { system: s2, user: u2 } = buildLayer2Prompt(hotspot, allNodes, locale);
      const r2 = extractJSON(await callLLM(s2, u2, controller.signal, 0));
      pushGraph(r2.nodes || [], r2.edges || []);

      // Layer 3
      setLoadingStep(t('loading.layer3'));
      const { system: s3, user: u3 } = buildLayer3Prompt(hotspot, allNodes, targetAssets, locale);
      const r3 = extractJSON(await callLLM(s3, u3, controller.signal, 0));
      if (r3.suggestedAssets) {
        sugAssets = r3.suggestedAssets;
        setTargetAssets(sugAssets);
      }
      pushGraph(r3.nodes || [], r3.edges || []);

      // Fetch real-time quotes
      const assetLabels = allNodes.filter(n => n.type === 'asset').map(n => n.label);
      if (assetLabels.length > 0) {
        fetchAssetQuotes(assetLabels).then(quotes => setAssetQuotes(quotes)).catch(() => {});
      }

      // Final: Trading insight
      setLoadingStep(t('loading.insight'));
      const { system: s4, user: u4 } = buildInsightPrompt(hotspot, allNodes, allEdges, locale);
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

      const analysis: Analysis = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        hotspot,
        data: fullData,
        eventTitle: hotspot,
      };
      setAnalyses(prev => [analysis, ...prev]);
      setCurrentIndex(0);
      saveToHistory(analysis, eventSource || undefined);
      refreshHistory();

    } catch (err: any) {
      const errorType = classifyError(err);
      if (errorType === 'timeout') {
        setError(t('error.timeout'));
      } else if (errorType === 'network') {
        setError(t('error.network'));
      } else {
        setError(err.message || t('error.fail'));
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      setLoadingStep('');
    }
  }, [hotspot, variables, targetAssets, matchPolymarkets, t, locale, eventSource, refreshHistory]);

  // ── Batch analysis ──
  const runBatchSimulation = useCallback(async () => {
    const lines = hotspot.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) { runSimulation(); return; }

    setLoading(true);
    setError(null);
    setShouldAnimate(true);
    setBatchState({ active: true, events: lines, progress: 0, total: lines.length, results: [], activeTab: -1 });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000);

    const runSingleEvent = async (event: string): Promise<BatchResult> => {
      try {
        let allNodes: any[] = [];
        let allEdges: any[] = [];
        let sugAssets = '';
        let pmQueries: string[] = [];

        const pushGraph = (newNodes: any[], newEdges: any[]) => {
          allNodes = [...allNodes, ...normNodes(newNodes)];
          allEdges = [...allEdges, ...newEdges];
        };

        const { system: s1, user: u1 } = buildLayer1Prompt(event, variables, locale);
        const r1 = extractJSON(await callLLM(s1, u1, controller.signal, 0));
        if (r1.polymarketQueries) pmQueries = r1.polymarketQueries;
        pushGraph(r1.nodes || [], r1.edges || []);

        const { system: s2, user: u2 } = buildLayer2Prompt(event, allNodes, locale);
        const r2 = extractJSON(await callLLM(s2, u2, controller.signal, 0));
        pushGraph(r2.nodes || [], r2.edges || []);

        const { system: s3, user: u3 } = buildLayer3Prompt(event, allNodes, targetAssets, locale);
        const r3 = extractJSON(await callLLM(s3, u3, controller.signal, 0));
        if (r3.suggestedAssets) sugAssets = r3.suggestedAssets;
        pushGraph(r3.nodes || [], r3.edges || []);

        const { system: s4, user: u4 } = buildInsightPrompt(event, allNodes, allEdges, locale);
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

        return { event, status: 'fulfilled', data: fullData };
      } catch (err: any) {
        return { event, status: 'rejected', error: err.message || 'Analysis failed' };
      }
    };

    try {
      // Run all events in parallel (max 3 concurrent)
      const results: BatchResult[] = [];
      const batchSize = 3;
      for (let i = 0; i < lines.length; i += batchSize) {
        const batch = lines.slice(i, i + batchSize);
        const batchPromises = batch.map(event => runSingleEvent(event));
        const batchResults = await Promise.allSettled(batchPromises);

        for (const r of batchResults) {
          if (r.status === 'fulfilled') {
            results.push(r.value);
          } else {
            results.push({ event: batch[results.length - (i > 0 ? results.length : 0)] || 'unknown', status: 'rejected', error: r.reason?.message });
          }
        }

        setBatchState(prev => ({
          ...prev,
          progress: Math.min(i + batchSize, lines.length),
          results: [...results],
        }));
        setLoadingStep(t('batch.progress').replace('{current}', String(Math.min(i + batchSize, lines.length))).replace('{total}', String(lines.length)));
      }

      // Build combined overview graph
      const allOverviewNodes: any[] = [];
      const allOverviewEdges: any[] = [];
      const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled' && r.data) {
          const color = COLORS[idx % COLORS.length];
          const prefix = `e${idx}_`;
          for (const n of r.data.nodes) {
            allOverviewNodes.push({ ...n, id: prefix + n.id, eventIndex: idx, eventColor: color });
          }
          for (const e of r.data.edges) {
            allOverviewEdges.push({ ...e, source: prefix + e.source, target: prefix + e.target, eventIndex: idx, eventColor: color });
          }
        }
      });

      const overviewData: SimulationData = {
        scenarios: [],
        nodes: allOverviewNodes,
        edges: allOverviewEdges,
        summary: results.filter(r => r.status === 'fulfilled').map((r, i) => `[${i + 1}] ${r.data?.summary || ''}`).join(' '),
        coreActions: [],
      };
      setData(overviewData);
      setAnalyzedHotspot(lines[0]);

      // Save each successful result to history
      for (const r of results) {
        if (r.status === 'fulfilled' && r.data) {
          const analysis: Analysis = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            hotspot: r.event,
            data: r.data,
            eventTitle: r.event,
          };
          saveToHistory(analysis, eventSource || undefined);
        }
      }
      refreshHistory();

      setBatchState(prev => ({ ...prev, active: true, progress: lines.length, results }));

    } catch (err: any) {
      setError(err.message || t('error.fail'));
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      setLoadingStep('');
    }
  }, [hotspot, variables, targetAssets, t, locale, eventSource, refreshHistory, runSimulation]);

  const setBatchActiveTab = useCallback((tab: number) => {
    setBatchState(prev => {
      if (!prev.active) return prev;
      if (tab === -1) {
        // Show overview - rebuild combined graph
        const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
        const allNodes: any[] = [];
        const allEdges: any[] = [];
        prev.results.forEach((r, idx) => {
          if (r.status === 'fulfilled' && r.data) {
            const color = COLORS[idx % COLORS.length];
            const prefix = `e${idx}_`;
            for (const n of r.data.nodes) allNodes.push({ ...n, id: prefix + n.id, eventIndex: idx, eventColor: color });
            for (const e of r.data.edges) allEdges.push({ ...e, source: prefix + e.source, target: prefix + e.target, eventIndex: idx, eventColor: color });
          }
        });
        setData({
          scenarios: [], nodes: allNodes, edges: allEdges,
          summary: prev.results.filter(r => r.status === 'fulfilled').map((r, i) => `[${i + 1}] ${r.data?.summary || ''}`).join(' '),
          coreActions: [],
        });
      } else {
        const result = prev.results[tab];
        if (result?.status === 'fulfilled' && result.data) {
          setData(result.data);
        }
      }
      return { ...prev, activeTab: tab };
    });
  }, []);

  const clearBatch = useCallback(() => {
    setBatchState({ active: false, events: [], progress: 0, total: 0, results: [], activeTab: -1 });
  }, []);

  // Once hotspot is set from bridge, trigger analysis
  useEffect(() => {
    if (pendingBridgeRun.current && hotspot.trim()) {
      pendingBridgeRun.current = false;
      runSimulation();
    }
  }, [hotspot]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAnalysis = useCallback((index: number) => {
    const a = analyses[index];
    if (!a) return;
    setCurrentIndex(index);
    setData(a.data);
    setHotspotRaw(a.hotspot);
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

  const handleReplayHistory = useCallback((item: HistoryItem) => {
    setData(item.data);
    setHotspotRaw(item.hotspot);
    setAnalyzedHotspot(item.hotspot);
    setShouldAnimate(false);
    setMatchedMarkets([]);
    setSelectedMarket(null);
    setSwarmResult(null);
    setError(null);
  }, []);

  const handleCompareFromHistory = useCallback((item: HistoryItem) => {
    setCompareLeft(item);
    setCompareRight(null);
    navigate('/compare');
  }, [navigate]);

  const hasData = data.nodes.length > 0;

  return {
    // State
    sidebarOpen, setSidebarOpen,
    hotspot, setHotspot,
    data, loading, loadingStep, error, setError,
    shouldAnimate,
    analyses, currentIndex,
    matchedMarkets, selectedMarket,
    analyzedHotspot,
    swarmResult, swarmLoading,
    assetQuotes,
    targetAssets,

    // History & Compare
    historyItems, historyOpen, compareOpen,
    compareLeft, setCompareLeft,
    compareRight, setCompareRight,

    // Event bridge
    eventSource, setEventSource,

    // Derived
    hasData,

    // Batch
    batchState, runBatchSimulation, setBatchActiveTab, clearBatch,

    // Actions
    runSimulation, loadAnalysis, handleExport,
    handleSelectMarket, handleReplayHistory,
    handleCompareFromHistory, refreshHistory,

    // Navigation helpers
    navigate,
  };
}
