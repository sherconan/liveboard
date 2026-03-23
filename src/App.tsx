import React, { useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { LiveGraph } from './components/LiveGraph';
import { SummaryPanel } from './components/SummaryPanel';
import { PriceTrend } from './components/PriceTrend';
import { Loader2, Activity, X } from 'lucide-react';
import { PolymarketEvent, PolymarketMarket } from './services/polymarket';

const LLM_BASE_URL = process.env.LLM_BASE_URL || '/api/llm/v1';
const LLM_API_KEY = process.env.LLM_API_KEY || 'not-needed';
const LLM_MODEL = process.env.LLM_MODEL || 'MiniMax-M2.5';

export interface SimulationData {
  scenarios: { name: string; probability: number; marketProb?: number }[];
  nodes: { id: string; label: string; type: 'hotspot' | 'variable' | 'impact' | 'asset'; sentiment?: 'positive' | 'negative' | 'neutral' }[];
  edges: { source: string; target: string; label: string; weight: 'low' | 'medium' | 'high' | 'critical' }[];
  summary: string;
  coreActions: string[];
  divergenceAnalysis?: string;
}

const DEFAULT_DATA: SimulationData = {
  scenarios: [
    { name: '全球科技股抛售', probability: 75 },
    { name: '能源危机升级', probability: 40 },
    { name: '避险资金涌入', probability: 60 },
  ],
  nodes: [
    { id: 'hotspot', label: '以色列突袭伊朗', type: 'hotspot' },
    { id: 'var1', label: '美联储鹰派', type: 'variable' },
    { id: 'var2', label: '原油供应中断', type: 'variable' },
    { id: 'impact1', label: '美债收益率飙升', type: 'impact' },
    { id: 'impact2', label: '能源价格暴涨', type: 'impact' },
    { id: 'asset1', label: '半导体板块', type: 'asset', sentiment: 'negative' },
    { id: 'asset2', label: '军工板块', type: 'asset', sentiment: 'positive' },
    { id: 'asset3', label: '黄金', type: 'asset', sentiment: 'positive' },
  ],
  edges: [
    { source: 'hotspot', target: 'impact1', label: '地缘风险', weight: 'high' },
    { source: 'hotspot', target: 'impact2', label: '供应威胁', weight: 'critical' },
    { source: 'var1', target: 'impact1', label: '高利率', weight: 'high' },
    { source: 'var2', target: 'impact2', label: '断供风险', weight: 'medium' },
    { source: 'impact1', target: 'asset1', label: '估值受压', weight: 'critical' },
    { source: 'impact2', target: 'asset2', label: '军费增长', weight: 'high' },
    { source: 'impact1', target: 'asset3', label: '避险需求', weight: 'medium' },
  ],
  summary: '双杀局面：地缘避险拉高能源成本，高息环境压制科技估值。军工和黄金成为避风港。',
  coreActions: ['减仓消费类芯片', '关注军工级 FPGA 标的', '增配黄金 ETF', '观察原油期货升水结构'],
};

async function callLLM(systemPrompt: string, userPrompt: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LLM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: [{ type: 'text', text: systemPrompt }] },
        { role: 'user', content: [{ type: 'text', text: userPrompt }] },
      ],
      temperature: 0.7,
    }),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`LLM API 错误 (${res.status}): ${errText || res.statusText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function extractJSON(text: string): any {
  try { return JSON.parse(text); } catch {}

  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1]); } catch {}
  }

  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]); } catch {}
  }

  throw new Error('无法从 AI 回复中解析 JSON，请重试');
}

export default function App() {
  const [hotspot, setHotspot] = useState('以色列突袭伊朗');
  const [variables, setVariables] = useState([{ id: '1', name: '美联储利率', value: '鹰派 (不降息)' }]);
  const [targetAssets, setTargetAssets] = useState('半导体板块, 军工, 黄金');
  const [data, setData] = useState<SimulationData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedEvent, setSelectedEvent] = useState<PolymarketEvent | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<PolymarketMarket | null>(null);
  const [showTrend, setShowTrend] = useState(false);

  const handleSelectEvent = useCallback((event: PolymarketEvent, market: PolymarketMarket) => {
    setSelectedEvent(event);
    setSelectedMarket(market);
    setHotspot(event.title);
    setShowTrend(true);
  }, []);

  const getMarketProbContext = (): string => {
    if (!selectedMarket) return '';
    const yesIdx = selectedMarket.outcomes.findIndex(o => o.toLowerCase() === 'yes');
    const prob = yesIdx >= 0 ? selectedMarket.outcomePrices[yesIdx] : selectedMarket.outcomePrices[0];
    return `
【Polymarket 市场数据参考】
事件: ${selectedEvent?.title || selectedMarket.question}
市场问题: ${selectedMarket.question}
${selectedMarket.groupItemTitle ? `具体选项: ${selectedMarket.groupItemTitle}` : ''}
市场共识概率: ${(prob * 100).toFixed(1)}%（基于真金白银的预测市场定价）
24小时交易量: $${selectedMarket.volume24hr.toLocaleString()}
${selectedMarket.oneDayPriceChange !== null ? `24小时价格变动: ${(selectedMarket.oneDayPriceChange * 100).toFixed(1)}%` : ''}

请在推演中对比你的分析概率与市场共识，如果有显著分歧，请解释原因。`;
  };

  const runSimulation = useCallback(async () => {
    if (!hotspot.trim()) {
      setError('请输入热点事件');
      return;
    }
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const marketContext = getMarketProbContext();

      const systemPrompt = `你是一个资深策略分析师，擅长跨市场逻辑推演。你必须严格以 JSON 格式回复，不要包含任何其他文字。

JSON 格式要求:
{
  "scenarios": [{"name": "场景名称", "probability": 概率数字(0-100)}],
  "nodes": [{"id": "唯一id", "label": "显示名称", "type": "hotspot|variable|impact|asset", "sentiment": "positive|negative|neutral"}],
  "edges": [{"source": "源节点id", "target": "目标节点id", "label": "关系描述", "weight": "low|medium|high|critical"}],
  "summary": "总结文字",
  "coreActions": ["动作1", "动作2"],
  "divergenceAnalysis": "AI与市场分歧分析（如有市场数据时提供）"
}

规则:
- nodes 的 type 只能是 hotspot、variable、impact、asset 四种
- asset 类型的节点必须有 sentiment 字段
- edges 的 weight 只能是 low、medium、high、critical 四种
- 生成至少 6 个节点，形成清晰的因果传导链
- 所有文字内容使用中文
- 只输出 JSON，不要输出任何解释性文字`;

      const userPrompt = `请分析以下场景并输出 JSON:

热点事件: ${hotspot}
用户变量: ${variables.map((v) => `${v.name}: ${v.value}`).join(', ')}
影响标的: ${targetAssets}
${marketContext}

任务:
1. 综合以上信息${selectedMarket ? '以及 Polymarket 市场数据' : ''}，计算传导路径
2. 识别路径中的"断点"（Risk Break）
3. 给出至少3个场景和概率判断
4. 给出至少6个节点和连线，形成清晰的多层传导图
${selectedMarket ? '5. 对比你的分析概率与 Polymarket 市场共识概率，在 divergenceAnalysis 中分析分歧原因' : ''}
${selectedMarket ? '6. scenarios 中请给出你独立判断的概率（不是直接复制市场概率）' : ''}`;

      const responseText = await callLLM(systemPrompt, userPrompt, controller.signal);
      const parsedData = extractJSON(responseText) as SimulationData;

      if (!parsedData.nodes?.length || !parsedData.edges?.length) {
        throw new Error('AI 返回的数据不完整，缺少节点或连线');
      }

      if (selectedMarket) {
        const yesIdx = selectedMarket.outcomes.findIndex(o => o.toLowerCase() === 'yes');
        const marketProb = yesIdx >= 0 ? selectedMarket.outcomePrices[yesIdx] : selectedMarket.outcomePrices[0];
        if (parsedData.scenarios.length > 0) {
          parsedData.scenarios[0].marketProb = marketProb;
        }
      }

      setData(parsedData);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('请求超时（60s），请检查网络或 LLM 服务');
      } else {
        setError(err.message || '推演失败，请重试');
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }, [hotspot, variables, targetAssets, selectedEvent, selectedMarket]);

  const trendTokenId = selectedMarket?.clobTokenIds?.[0] || null;
  const trendTitle = selectedMarket
    ? (selectedMarket.groupItemTitle || selectedMarket.question)
    : '';

  return (
    <div className="flex h-screen bg-[#0a0e1a] text-slate-100 font-sans overflow-hidden">
      <Sidebar
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
      />

      <main className="flex-1 flex flex-col relative">
        <header className="h-14 border-b border-slate-800 flex items-center px-6 justify-between bg-[#0d1220]/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-bold tracking-tight text-slate-100">
              LiveBoard
              <span className="text-slate-500 font-normal text-sm ml-2">实时决策引擎</span>
              <span className="text-red-500/50 font-normal text-xs ml-2">× Polymarket</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {selectedMarket && (
              <button
                onClick={() => setShowTrend(!showTrend)}
                className={`text-xs px-3 py-1.5 rounded-md border transition-all ${
                  showTrend
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                {showTrend ? '隐藏趋势图' : '显示趋势图'}
              </button>
            )}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-amber-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>推演中...</span>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 flex flex-col relative">
          {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-lg text-sm flex items-center gap-3 backdrop-blur-md">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className={`flex-1 flex ${showTrend && selectedMarket ? 'flex-col' : ''}`}>
            <div className={showTrend && selectedMarket ? 'flex-1 min-h-0' : 'flex-1'}>
              <LiveGraph data={data} />
            </div>
            {showTrend && selectedMarket && (
              <div className="h-[220px] p-3 border-t border-slate-800 bg-[#0d1220]">
                <PriceTrend tokenId={trendTokenId} marketTitle={trendTitle} />
              </div>
            )}
          </div>
        </div>

        <SummaryPanel
          summary={data.summary}
          actions={data.coreActions}
          divergenceAnalysis={data.divergenceAnalysis}
          hasMarketData={!!selectedMarket}
        />
      </main>
    </div>
  );
}
