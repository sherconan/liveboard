/**
 * Swarm Intelligence Module — inspired by MiroFish + BettaFish
 *
 * Phase 1: 4 analyst agents analyze independently (parallel)
 * Phase 2: Host/Moderator LLM finds contradictions, asks probing questions (BettaFish debate)
 * Phase 3: Agents reflect on blind spots and refine (BettaFish reflection loop)
 */

import { callLLM, extractJSON } from './llm';

// ─── Agent Personas ───

export interface AgentPersona {
  id: string;
  name: string;
  role: string;
  emoji: string;
  stance: 'aggressive' | 'cautious' | 'neutral' | 'contrarian';
  focus: string;
  color: string;
}

export const ANALYST_AGENTS: AgentPersona[] = [
  {
    id: 'macro',
    name: '宏观策略师',
    role: '全球宏观对冲基金策略师，擅长跨资产联动和央行政策分析',
    emoji: '🌍',
    stance: 'neutral',
    focus: '宏观传导路径、利率/汇率/大宗商品联动',
    color: '#6366f1',
  },
  {
    id: 'sector',
    name: '行业研究员',
    role: '头部券商行业分析师，深耕产业链上下游',
    emoji: '🔬',
    stance: 'aggressive',
    focus: '产业链影响、个股弹性、行业比较优势',
    color: '#3b82f6',
  },
  {
    id: 'trader',
    name: '交易员',
    role: '华尔街自营交易桌资深交易员，关注短期博弈和仓位',
    emoji: '⚡',
    stance: 'aggressive',
    focus: '短期价格驱动、市场情绪、资金流向、事件博弈',
    color: '#f59e0b',
  },
  {
    id: 'risk',
    name: '风控官',
    role: '大型资管公司首席风控官，专注尾部风险和黑天鹅',
    emoji: '🛡️',
    stance: 'contrarian',
    focus: '被忽视的风险、反面论据、极端情景、对冲策略',
    color: '#ef4444',
  },
];

// ─── Types ───

export interface AgentView {
  agentId: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  oneLiner: string;
  keyRisk: string;
  topPick: string;
  reasoning: string;
}

export interface DebateResult {
  contradictions: string;  // 矛盾点
  blindSpots: string;      // 盲区
  probingQuestion: string; // 追问
}

export interface SwarmResult {
  views: AgentView[];
  debate?: DebateResult;
  consensus: string;
  divergence: string;
  riskAlert?: string;
  confidenceScore: number;
  depth: 'initial' | 'debated' | 'reflected'; // how deep the analysis went
}

// ─── Phase 1: Independent Agent Analysis ───

function buildAgentPrompt(persona: AgentPersona, news: string): { system: string; user: string } {
  const system = `你是${persona.name}（${persona.role}）。
你的分析风格：${persona.stance === 'aggressive' ? '激进，敢于下重注' : persona.stance === 'cautious' ? '谨慎，注重安全边际' : persona.stance === 'contrarian' ? '逆向思维，专找市场盲点' : '客观均衡'}。
你的关注重点：${persona.focus}。

给定一条新闻事件，请用你的专业视角独立分析。严格输出JSON：
{
  "direction": "bullish|bearish|neutral",
  "confidence": 0-100,
  "oneLiner": "≤30字核心判断，像交易员喊单",
  "keyRisk": "你认为市场最可能忽视的风险，一句话",
  "topPick": "最推荐的一个操作（标的+方向+理由）",
  "reasoning": "2-3句分析逻辑，简洁有力"
}

要求：
- 从你的专业角度出发，不要泛泛而谈
- confidence 要诚实：把握大就高，看不清就低
- 如果你是风控官(contrarian)，要专门找反面论据和被忽视的风险
- oneLiner 必须≤30字`;

  const user = `新闻事件：${news}\n\n请分析并输出JSON。`;
  return { system, user };
}

async function runAgent(persona: AgentPersona, news: string, signal?: AbortSignal): Promise<AgentView | null> {
  try {
    const { system, user } = buildAgentPrompt(persona, news);
    const response = await callLLM(system, user, signal, 0);
    const parsed = extractJSON(response);
    return {
      agentId: persona.id,
      direction: parsed.direction || 'neutral',
      confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
      oneLiner: (parsed.oneLiner || '').slice(0, 40),
      keyRisk: parsed.keyRisk || '',
      topPick: parsed.topPick || '',
      reasoning: parsed.reasoning || '',
    };
  } catch (err) {
    console.warn(`Agent ${persona.id} failed:`, err);
    return null;
  }
}

// ─── Phase 2: Debate Host (BettaFish ForumEngine pattern) ───

async function runDebate(news: string, views: AgentView[], signal?: AbortSignal): Promise<DebateResult | null> {
  if (views.length < 2) return null;

  const viewsSummary = views.map(v => {
    const agent = ANALYST_AGENTS.find(a => a.id === v.agentId);
    return `【${agent?.name}】方向=${v.direction}，置信度=${v.confidence}%\n判断：${v.oneLiner}\n逻辑：${v.reasoning}\n风险：${v.keyRisk}\n操作：${v.topPick}`;
  }).join('\n\n');

  const system = `你是一位资深投资委员会主席，负责主持分析师辩论。你的任务不是给出自己的观点，而是：
1. 找出分析师之间的**矛盾和分歧**
2. 指出所有人都**忽视的盲区**（二阶效应、低概率高影响事件、时间维度）
3. 提出一个**犀利的追问**，迫使分析师重新审视假设

严格输出JSON：
{
  "contradictions": "分析师之间最核心的矛盾，以及为什么会有这个分歧，2-3句",
  "blindSpots": "所有分析师都没考虑到的角度或风险，2-3句",
  "probingQuestion": "一个能改变分析结论的犀利追问，1句"
}`;

  const user = `## 新闻事件
${news}

## 各分析师观点
${viewsSummary}

请找出矛盾、盲区，并提出追问。`;

  try {
    const response = await callLLM(system, user, signal, 0);
    return extractJSON(response) as DebateResult;
  } catch (err) {
    console.warn('Debate host failed:', err);
    return null;
  }
}

// ─── Phase 3: Reflection Loop (BettaFish reflection pattern) ───

async function runReflection(
  persona: AgentPersona,
  news: string,
  originalView: AgentView,
  debate: DebateResult,
  signal?: AbortSignal,
): Promise<AgentView | null> {
  const system = `你是${persona.name}（${persona.role}）。
你刚才对一条新闻做了初步分析，现在投委会主席提出了质疑。请反思你的分析是否有盲区，然后给出修正后的判断。

你的初步判断：
- 方向: ${originalView.direction}, 置信度: ${originalView.confidence}%
- 判断: ${originalView.oneLiner}
- 逻辑: ${originalView.reasoning}

投委会指出的矛盾: ${debate.contradictions}
投委会指出的盲区: ${debate.blindSpots}
投委会追问: ${debate.probingQuestion}

请重新审视后输出修正版JSON（格式同前）。如果你认为原判断没问题，可以保持不变但要解释为什么不需要修改。`;

  const user = `新闻事件：${news}\n\n请反思并输出修正后的JSON。`;

  try {
    const response = await callLLM(system, user, signal, 0);
    const parsed = extractJSON(response);
    return {
      agentId: persona.id,
      direction: parsed.direction || originalView.direction,
      confidence: Math.min(100, Math.max(0, parsed.confidence ?? originalView.confidence)),
      oneLiner: (parsed.oneLiner || originalView.oneLiner).slice(0, 40),
      keyRisk: parsed.keyRisk || originalView.keyRisk,
      topPick: parsed.topPick || originalView.topPick,
      reasoning: parsed.reasoning || originalView.reasoning,
    };
  } catch {
    return originalView; // fallback to original if reflection fails
  }
}

// ─── Synthesize ───

function synthesize(views: AgentView[], debate?: DebateResult | null): Omit<SwarmResult, 'views' | 'debate' | 'depth'> {
  if (views.length === 0) {
    return { consensus: '', divergence: '', confidenceScore: 0 };
  }

  const dirCount = { bullish: 0, bearish: 0, neutral: 0 };
  let totalConf = 0;
  for (const v of views) {
    dirCount[v.direction]++;
    totalConf += v.confidence;
  }

  const avgConf = Math.round(totalConf / views.length);
  const majorDir = dirCount.bullish > dirCount.bearish ? 'bullish' : dirCount.bearish > dirCount.bullish ? 'bearish' : 'neutral';
  const majorCount = Math.max(dirCount.bullish, dirCount.bearish, dirCount.neutral);

  const dirLabel = majorDir === 'bullish' ? '看多' : majorDir === 'bearish' ? '看空' : '中性';
  const consensus = majorCount >= 3
    ? `${majorCount}/${views.length} 位分析师${dirLabel}，共识较强`
    : majorCount === 2
      ? `${majorCount}/${views.length} 位分析师${dirLabel}，存在分歧`
      : '各方观点分散，无明确共识';

  const riskAgent = views.find(v => v.agentId === 'risk');
  const divergentViews = views.filter(v => v.direction !== majorDir);
  const divergence = divergentViews.length > 0
    ? `${divergentViews.map(v => ANALYST_AGENTS.find(a => a.id === v.agentId)?.name).join('、')}持不同观点：${divergentViews.map(v => v.oneLiner).join('；')}`
    : '所有分析师观点一致';

  const riskAlert = riskAgent ? riskAgent.keyRisk : undefined;

  return { consensus, divergence, riskAlert, confidenceScore: avgConf };
}

// ─── Public API ───

/**
 * Full swarm pipeline:
 * 1. Parallel agent analysis (~5s)
 * 2. Debate host finds contradictions (~3s)
 * 3. Agents reflect and refine (~5s)
 *
 * Streams partial results via onUpdate callback.
 */
export async function runSwarmAnalysis(
  news: string,
  signal?: AbortSignal,
  onUpdate?: (partial: SwarmResult) => void,
): Promise<SwarmResult> {
  // Phase 1: Independent analysis — stream each agent as it completes
  const initialViews: AgentView[] = [];

  const agentPromises = ANALYST_AGENTS.map(agent =>
    runAgent(agent, news, signal).then(view => {
      if (view) {
        initialViews.push(view);
        // Emit partial result as each agent finishes
        onUpdate?.({
          views: [...initialViews],
          depth: 'initial',
          ...synthesize([...initialViews]),
        });
      }
    })
  );
  await Promise.allSettled(agentPromises);

  if (initialViews.length < 2) {
    return { views: initialViews, depth: 'initial' as const, ...synthesize(initialViews) };
  }

  // Phase 2: Debate host
  const debate = await runDebate(news, initialViews, signal);
  const phase2Result: SwarmResult = {
    views: initialViews,
    debate: debate || undefined,
    depth: 'debated',
    ...synthesize(initialViews, debate),
  };
  onUpdate?.(phase2Result);

  if (!debate) return phase2Result;

  // Phase 3: Reflection loop (parallel)
  const reflectionResults = await Promise.allSettled(
    initialViews.map(view => {
      const persona = ANALYST_AGENTS.find(a => a.id === view.agentId);
      if (!persona) return Promise.resolve(view);
      return runReflection(persona, news, view, debate, signal);
    })
  );

  const reflectedViews: AgentView[] = [];
  for (let i = 0; i < reflectionResults.length; i++) {
    const r = reflectionResults[i];
    if (r.status === 'fulfilled' && r.value) {
      reflectedViews.push(r.value);
    } else {
      reflectedViews.push(initialViews[i]); // fallback
    }
  }

  const finalResult: SwarmResult = {
    views: reflectedViews,
    debate: debate || undefined,
    depth: 'reflected',
    ...synthesize(reflectedViews, debate),
  };
  onUpdate?.(finalResult);

  return finalResult;
}
