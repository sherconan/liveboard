const LLM_BASE_URL = process.env.LLM_BASE_URL || '/api/llm/v1';
const LLM_API_KEY = process.env.LLM_API_KEY || 'local-bridge';
const LLM_MODEL = process.env.LLM_MODEL || 'claude-sonnet-4-6';

export interface SimulationData {
  scenarios: { name: string; probability: number; rationale: string; marketProb?: number }[];
  nodes: { id: string; label: string; type: 'hotspot' | 'variable' | 'impact' | 'asset'; sentiment?: 'positive' | 'negative' | 'neutral'; detail?: string }[];
  edges: { source: string; target: string; label: string; weight: 'low' | 'medium' | 'high' | 'critical' }[];
  summary: string;
  coreActions: string[];
  divergenceAnalysis?: string;
  suggestedAssets?: string;
  polymarketQueries?: string[];
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

export async function callLLM(systemPrompt: string, userPrompt: string, signal?: AbortSignal, retries = 1): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
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
          temperature: 0.5,
        }),
        signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`LLM API 错误 (${res.status}): ${errText || res.statusText}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      if (!content) throw new Error('AI 返回空内容');
      return content;
    } catch (err: any) {
      lastError = err;
      if (err.name === 'AbortError' || attempt >= retries) throw err;
      // Wait before retry
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  throw lastError || new Error('LLM 调用失败');
}

export function extractJSON(text: string): any {
  try { return JSON.parse(text); } catch {}
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) { try { return JSON.parse(fenceMatch[1]); } catch {} }
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) { try { return JSON.parse(braceMatch[0]); } catch {} }
  throw new Error('无法从 AI 回复中解析 JSON，请重试');
}

/**
 * Build prompts using the autoresearch pattern:
 * - Clear structure with immutable schema
 * - Few-shot example for quality calibration
 * - Explicit quality criteria (like evaluate_report.py)
 * - Polymarket query generation for smart matching
 */
export function buildPrompts(
  hotspot: string,
  variables: Variable[],
  targetAssets: string,
  marketContext: string,
  hasMarket: boolean,
  isAutoMode: boolean,
) {
  const systemPrompt = `你是一个顶级宏观策略分析师。给定一条事件性新闻，你的任务是构建**因果传导链**：从事件出发，经过关键变量和传导机制，最终影响到具体金融资产。

## 输出格式

严格输出 JSON，不要有任何其他文字。Schema:

{
  "scenarios": [
    {"name": "场景名", "probability": 0-100, "rationale": "为什么是这个概率，一句话"}
  ],
  "nodes": [
    {"id": "唯一英文id", "label": "中文名称(≤8字)", "type": "hotspot|variable|impact|asset", "sentiment": "positive|negative|neutral", "detail": "一句话解释此节点的含义"}
  ],
  "edges": [
    {"source": "源id", "target": "目标id", "label": "传导机制(≤6字)", "weight": "low|medium|high|critical"}
  ],
  "summary": "交易员风格的一句话判断，必须≤40个中文字，像喊单不像研报",
  "coreActions": ["具体操作建议，带标的和方向"],
  "divergenceAnalysis": "AI与市场共识的分歧分析(如有市场数据)",
  "suggestedAssets": "推荐关注的资产，逗号分隔",
  "polymarketQueries": ["用于搜索Polymarket的英文关键词，3-5个，要命中主流预测市场"]
}

## 传导链构建规则

1. **层级结构**（必须严格遵守）:
   - Layer 0 - hotspot: 核心事件，1-2个节点
   - Layer 1 - variable: 关键变量/前提条件，2-3个节点（如"美联储态度"、"原油库存"）
   - Layer 2 - impact: 传导效应/中间影响，3-4个节点（如"实际利率上行"、"美元走强"）
   - Layer 3 - asset: 具体受影标的，4-6个节点（必须有sentiment）

2. **连线规则**:
   - hotspot → variable 或 impact（事件触发）
   - variable → impact（条件传导）
   - impact → asset（影响落地）
   - impact → impact 可以有（二阶传导）
   - 不允许反向连线（asset → impact）
   - 每条边的 label 必须说明**传导机制**，不是简单重复节点名
   - weight: critical=核心传导路径, high=主要路径, medium=次要路径, low=微弱关联

3. **质量标准**（自我检查）:
   - 节点总数 10-16 个，边总数 10-20 条
   - 每个 asset 节点必须有至少一条入边
   - summary 必须≤40字！像交易员喊单："Fed鹰派超预期，做空纳指，做多美元黄金"。超过40字是严重错误
   - coreActions 必须具体到标的+方向+理由，例如"减仓纳指ETF(QQQ)，美元走强压制估值"
   - 不要笼统地说"关注风险"这种废话

4. **polymarketQueries 生成规则**:
   - 输出3-5个英文搜索词，用于在Polymarket上搜索相关预测市场
   - 优先使用事件中的核心实体（人名、国家、组织）
   - 例如新闻"美联储加息"→ queries: ["Federal Reserve", "interest rate", "Fed rate hike"]
   - 例如新闻"台海紧张"→ queries: ["Taiwan", "China Taiwan conflict", "US China"]
   - 避免太具体的长句，要命中Polymarket上真实存在的市场

## Few-shot 示例

新闻："英伟达Q2财报营收超预期，数据中心收入同比增长154%"

正确的传导链:
- hotspot: "英伟达财报超预期" → (AI需求验证) → impact: "AI算力需求确认"
- hotspot → (供应链拉动) → impact: "台积电先进制程满产"
- variable: "科技股估值水平(30x+)" → (估值容忍度) → impact: "高估值能否持续"
- impact: "AI算力需求确认" → (直接受益) → asset: "英伟达NVDA" (positive)
- impact: "台积电先进制程满产" → (供应商受益) → asset: "台积电TSM" (positive)
- impact: "AI算力需求确认" → (竞争加剧) → asset: "AMD" (positive)
- impact: "高估值能否持续" → (资金分流) → asset: "传统IT服务" (negative)

错误示例:
- ❌ 节点label太长："英伟达第二季度财务报告显示营收超出市场预期" → ✅ "英伟达财报超预期"
- ❌ 边label重复节点名："英伟达→台积电" label="英伟达影响台积电" → ✅ label="供应链拉动"
- ❌ 没有传导的直接跳跃：hotspot直连asset → ✅ 必须经过impact层
- ❌ summary像论文摘要 → ✅ summary像交易员判断`;

  const userPrompt = `## 新闻事件

${hotspot}

${variables.length > 0 ? `## 用户指定的关键变量\n${variables.map(v => `- ${v.name}: ${v.value}`).join('\n')}` : ''}

${targetAssets ? `## 用户指定的关注标的\n${targetAssets}` : '## 请自动识别最相关的金融资产（中美股票、商品、货币、指数等）'}

${marketContext}

请构建完整的因果传导链，输出JSON。`;

  return { systemPrompt, userPrompt };
}

/**
 * Layer-by-layer graph generation prompts.
 * Each call is small → fast response (~3-5s each).
 */

/** Layer 1: hotspot + variables + initial edges */
export function buildLayer1Prompt(hotspot: string, variables: Variable[]) {
  const system = `你是宏观策略分析师。从新闻事件提取核心事件节点和关键变量。
严格输出JSON，无其他文字:
{
  "nodes": [
    {"id":"英文id","label":"≤8字中文","type":"hotspot","detail":"一句话"},
    {"id":"英文id","label":"≤8字中文","type":"variable","detail":"一句话"}
  ],
  "edges": [{"source":"id","target":"id","label":"≤6字传导机制","weight":"high|critical"}],
  "polymarketQueries": ["英文搜索词3-5个"]
}
要求: 1-2个hotspot + 2-3个variable + 它们之间的边。`;
  const user = `新闻：${hotspot}${variables.length > 0 ? `\n变量：${variables.map(v => `${v.name}=${v.value}`).join(', ')}` : ''}\n输出JSON。`;
  return { system, user };
}

/** Layer 2: given layer1 nodes, add impacts + their edges */
export function buildLayer2Prompt(hotspot: string, layer1Nodes: any[]) {
  const existing = layer1Nodes.map(n => `${n.id}(${n.label})`).join(', ');
  const system = `你是宏观策略分析师。已有事件+变量节点，现在推导传导效应。
严格输出JSON:
{
  "nodes": [{"id":"英文id","label":"≤8字中文","type":"impact","detail":"一句话"}],
  "edges": [{"source":"已有或新id","target":"已有或新id","label":"≤6字","weight":"low|medium|high|critical"}]
}
要求: 新增3-4个impact节点 + 从已有节点到impact的边 + impact之间的二阶传导边。`;
  const user = `新闻：${hotspot}\n已有节点：${existing}\n输出新增的impact层JSON。`;
  return { system, user };
}

/** Layer 3: given all nodes so far, add assets + edges + suggested assets */
export function buildLayer3Prompt(hotspot: string, allNodes: any[], targetAssets: string) {
  const existing = allNodes.map(n => `${n.id}(${n.label},${n.type})`).join(', ');
  const system = `你是宏观策略分析师。已有事件→变量→传导效应，现在确定受影响的资产标的。
严格输出JSON:
{
  "nodes": [{"id":"英文id","label":"≤8字中文","type":"asset","sentiment":"positive|negative|neutral","detail":"一句话"}],
  "edges": [{"source":"impact的id","target":"asset的id","label":"≤6字","weight":"low|medium|high|critical"}],
  "suggestedAssets": "所有资产逗号分隔(含英文ticker)"
}
要求: 4-6个asset节点,每个必须有sentiment和至少1条入边。`;
  const user = `新闻：${hotspot}\n已有节点：${existing}${targetAssets ? `\n关注标的：${targetAssets}` : '\n自动识别标的'}\n输出JSON。`;
  return { system, user };
}

/** Final: generate trading insight from complete graph */
export function buildInsightPrompt(hotspot: string, nodes: any[], edges: any[]) {
  const graphDesc = nodes.map((n: any) => `[${n.type}] ${n.label}`).join(', ');
  const system = `你是顶级交易员。已有因果传导图，给出交易判断。
严格输出JSON:
{
  "scenarios": [{"name":"场景名","probability":0-100,"rationale":"一句话"}],
  "summary": "≤40字喊单风格判断",
  "coreActions": ["具体操作:标的+方向+理由"]
}
summary≤40字!像喊单。coreActions具体到标的。`;
  const user = `新闻：${hotspot}\n图：${graphDesc}\n输出JSON。`;
  return { system, user };
}
