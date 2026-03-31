export type TemplateCategory = 'macro' | 'tech' | 'geopolitics' | 'market' | 'policy';

export interface EventTemplate {
  id: string;
  name: string;
  nameEn: string;
  category: TemplateCategory;
  icon: string;
  template: string;
  templateEn: string;
}

export const CATEGORY_META: Record<TemplateCategory, { label: string; labelEn: string; color: string }> = {
  macro:       { label: '宏观经济', labelEn: 'Macro',        color: '#6366f1' },
  tech:        { label: '科技产业', labelEn: 'Tech',         color: '#3b82f6' },
  geopolitics: { label: '地缘政治', labelEn: 'Geopolitics',  color: '#ef4444' },
  market:      { label: '市场事件', labelEn: 'Market',       color: '#f59e0b' },
  policy:      { label: '政策监管', labelEn: 'Policy',       color: '#10b981' },
};

export const EVENT_TEMPLATES: EventTemplate[] = [
  // ── Macro ──
  {
    id: 'rate-hike',
    name: '央行加息',
    nameEn: 'Rate Hike',
    category: 'macro',
    icon: '📈',
    template: '美联储宣布加息25个基点，联邦基金利率升至5.50%-5.75%区间',
    templateEn: 'Fed announces 25bp rate hike, federal funds rate rises to 5.50%-5.75% range',
  },
  {
    id: 'rate-cut',
    name: '央行降息',
    nameEn: 'Rate Cut',
    category: 'macro',
    icon: '📉',
    template: '中国人民银行宣布下调LPR利率10个基点，一年期LPR降至3.35%',
    templateEn: 'PBOC announces 10bp LPR rate cut, 1-year LPR drops to 3.35%',
  },
  {
    id: 'bank-crisis',
    name: '银行危机',
    nameEn: 'Banking Crisis',
    category: 'macro',
    icon: '🏦',
    template: '大型区域性银行因商业地产贷款坏账激增面临流动性危机，股价暴跌30%',
    templateEn: 'Major regional bank faces liquidity crisis due to surging commercial real estate bad loans, stock plunges 30%',
  },

  // ── Tech ──
  {
    id: 'tech-earnings',
    name: '科技财报',
    nameEn: 'Tech Earnings',
    category: 'tech',
    icon: '💰',
    template: '英伟达发布季度财报，数据中心营收同比增长200%，大幅超出市场预期',
    templateEn: 'NVIDIA reports quarterly earnings, data center revenue up 200% YoY, significantly beating expectations',
  },
  {
    id: 'ai-model-release',
    name: 'AI模型发布',
    nameEn: 'AI Model Release',
    category: 'tech',
    icon: '🤖',
    template: 'OpenAI发布GPT-5模型，推理能力大幅提升，在多项基准测试中达到人类专家水平',
    templateEn: 'OpenAI releases GPT-5 model with major reasoning improvements, achieving expert-level on multiple benchmarks',
  },
  {
    id: 'tech-ipo',
    name: '科技IPO',
    nameEn: 'Tech IPO',
    category: 'tech',
    icon: '🚀',
    template: '字节跳动宣布在港交所启动IPO进程，估值预计超过2000亿美元',
    templateEn: 'ByteDance announces IPO process on HKEX, expected valuation exceeds $200 billion',
  },

  // ── Geopolitics ──
  {
    id: 'geo-conflict',
    name: '地缘冲突',
    nameEn: 'Geopolitical Conflict',
    category: 'geopolitics',
    icon: '⚔️',
    template: '中东地区局势骤然紧张，多国卷入冲突，霍尔木兹海峡通航受到威胁',
    templateEn: 'Middle East tensions escalate sharply, multiple nations drawn into conflict, Strait of Hormuz transit threatened',
  },
  {
    id: 'chip-sanctions',
    name: '芯片制裁',
    nameEn: 'Chip Sanctions',
    category: 'geopolitics',
    icon: '🔒',
    template: '美国商务部宣布扩大对华芯片出口管制，新增多家中国AI企业进入实体清单',
    templateEn: 'US Commerce Dept expands chip export controls on China, adds multiple Chinese AI firms to entity list',
  },
  {
    id: 'oil-crisis',
    name: '石油危机',
    nameEn: 'Oil Crisis',
    category: 'geopolitics',
    icon: '🛢️',
    template: 'OPEC+宣布大幅减产200万桶/日，国际油价单日飙升15%突破100美元/桶',
    templateEn: 'OPEC+ announces major 2M barrel/day production cut, oil prices surge 15% in single day, breaking $100/barrel',
  },

  // ── Market ──
  {
    id: 'trade-war',
    name: '贸易战',
    nameEn: 'Trade War',
    category: 'market',
    icon: '🔥',
    template: '美国宣布对中国进口商品加征新一轮关税，涉及电动汽车、半导体等领域',
    templateEn: 'US announces new round of tariffs on Chinese imports, covering EVs, semiconductors and more',
  },
  {
    id: 'pandemic-outbreak',
    name: '疫情爆发',
    nameEn: 'Pandemic Outbreak',
    category: 'market',
    icon: '🦠',
    template: '世卫组织宣布新型传染病构成国际关注的突发公共卫生事件(PHEIC)',
    templateEn: 'WHO declares new infectious disease a Public Health Emergency of International Concern (PHEIC)',
  },

  // ── Policy ──
  {
    id: 'crypto-regulation',
    name: '加密监管',
    nameEn: 'Crypto Regulation',
    category: 'policy',
    icon: '⚖️',
    template: 'SEC批准首批比特币现货ETF上市交易，加密货币市场迎来重大监管突破',
    templateEn: 'SEC approves first spot Bitcoin ETFs for trading, crypto market sees major regulatory breakthrough',
  },
];

/** Get templates grouped by category in display order */
export function getTemplatesByCategory(): { category: TemplateCategory; templates: EventTemplate[] }[] {
  const order: TemplateCategory[] = ['macro', 'tech', 'geopolitics', 'market', 'policy'];
  return order.map(cat => ({
    category: cat,
    templates: EVENT_TEMPLATES.filter(t => t.category === cat),
  }));
}
