const LLM_BASE_URL = process.env.LLM_BASE_URL || '/api/llm/v1';
const LLM_API_KEY = process.env.LLM_API_KEY || 'not-needed';
const LLM_MODEL = process.env.LLM_MODEL || 'claude-sonnet-4-6';

export interface SimulationData {
  scenarios: { name: string; probability: number; marketProb?: number }[];
  nodes: { id: string; label: string; type: 'hotspot' | 'variable' | 'impact' | 'asset'; sentiment?: 'positive' | 'negative' | 'neutral' }[];
  edges: { source: string; target: string; label: string; weight: 'low' | 'medium' | 'high' | 'critical' }[];
  summary: string;
  coreActions: string[];
  divergenceAnalysis?: string;
  suggestedAssets?: string;
}

export interface Variable {
  id: string;
  name: string;
  value: string;
}

export interface Analysis {
  id: string;
  timestamp: number;
  hotspot: string;
  data: SimulationData;
  eventTitle?: string;
}

export async function callLLM(systemPrompt: string, userPrompt: string, signal?: AbortSignal): Promise<string> {
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

export function extractJSON(text: string): any {
  try { return JSON.parse(text); } catch {}
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) { try { return JSON.parse(fenceMatch[1]); } catch {} }
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) { try { return JSON.parse(braceMatch[0]); } catch {} }
  throw new Error('无法从 AI 回复中解析 JSON，请重试');
}

export function buildPrompts(
  hotspot: string,
  variables: Variable[],
  targetAssets: string,
  marketContext: string,
  hasMarket: boolean,
  isAutoMode: boolean,
) {
  const systemPrompt = `你是一个资深策略分析师，擅长跨市场逻辑推演。你必须严格以 JSON 格式回复，不要包含任何其他文字。

JSON 格式要求:
{
  "scenarios": [{"name": "场景名称", "probability": 概率数字(0-100)}],
  "nodes": [{"id": "唯一id", "label": "显示名称", "type": "hotspot|variable|impact|asset", "sentiment": "positive|negative|neutral"}],
  "edges": [{"source": "源节点id", "target": "目标节点id", "label": "关系描述", "weight": "low|medium|high|critical"}],
  "summary": "一段100字以内的总结",
  "coreActions": ["动作1", "动作2", "动作3"],
  "divergenceAnalysis": "AI与市场分歧分析（如有市场数据时提供）"${isAutoMode ? ',\n  "suggestedAssets": "你推荐关注的资产,用逗号分隔"' : ''}
}

规则:
- nodes 的 type 只能是 hotspot、variable、impact、asset 四种
- hotspot: 核心事件，1-2个
- variable: 关键变量/条件，2-3个
- impact: 传导效应/中间影响，2-4个
- asset: 受影响标的（必须有 sentiment: positive/negative/neutral），3-5个
- edges 连接上述节点，weight 为 low/medium/high/critical
- 生成 8-15 个节点，形成清晰的多层因果传导链
- summary 要简洁有力，像交易员的一句话判断
- coreActions 给出3-5个具体可操作的建议
- 所有文字使用中文
- 只输出 JSON`;

  const userPrompt = `请分析以下场景并输出 JSON:

热点事件: ${hotspot}
${variables.length > 0 ? `关键变量: ${variables.map(v => `${v.name}=${v.value}`).join(', ')}` : ''}
${targetAssets ? `重点关注标的: ${targetAssets}` : '请自动识别最可能受影响的资产类别和具体标的'}
${marketContext}

任务:
1. 从热点事件出发，构建完整的因果传导链
2. 识别传导路径中的关键变量和断点
3. 给出至少3个可能场景及概率
4. 评估对具体资产的影响方向和程度
${hasMarket ? '5. 对比你的分析概率与 Polymarket 市场共识，分析分歧原因' : ''}
${isAutoMode ? '6. 在 suggestedAssets 字段推荐你认为最值得关注的5-8个资产' : ''}`;

  return { systemPrompt, userPrompt };
}
