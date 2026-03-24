// ─── Types ───

export type NewsTag =
  | '宏观' | '央行' | '地缘' | '贸易'
  | '科技' | '能源' | '医药' | '金融'
  | '地产' | '消费' | '军工' | '新能源'
  | '汽车' | '半导体' | '监管' | '财报';

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  time: string;
  timestamp: number;
  important?: boolean;
  tags: NewsTag[];
  impact: number; // 0-100 影响力评分
}

// ─── Impact scoring (inspired by BettaFish weighted hotness) ───

// Source authority weight
const SOURCE_WEIGHT: Record<string, number> = { '华尔街见闻': 15, '新浪财经': 10 };

// Entity-level keywords that signal high market impact
const HIGH_IMPACT_ENTITIES = [
  '美联储', 'Fed', '央行', '习近平', '特朗普', 'Trump', '拜登',
  '英伟达', 'NVIDIA', '苹果', '特斯拉', '台积电', '华为',
  'OPEC', 'NATO', 'G7', 'G20', 'IMF',
];

const IMPACT_VERBS = [
  '宣布', '发布', '突发', '紧急', '意外', '首次', '历史',
  '暴跌', '暴涨', '崩盘', '熔断', '制裁', '禁止', '加征',
  '降息', '加息', '破产', '收购', '合并', '退市',
];

function scoreImpact(title: string, source: string, important?: boolean, tagCount?: number): number {
  let score = 0;

  // Base: source authority (0-15)
  score += SOURCE_WEIGHT[source] || 5;

  // Entity richness (0-25): more high-profile entities = higher impact
  const entityHits = HIGH_IMPACT_ENTITIES.filter(e => title.includes(e)).length;
  score += Math.min(25, entityHits * 10);

  // Action intensity (0-20): strong verbs signal market-moving events
  const verbHits = IMPACT_VERBS.filter(v => title.includes(v)).length;
  score += Math.min(20, verbHits * 8);

  // Tag richness (0-10): multi-tag = cross-sector impact
  score += Math.min(10, (tagCount || 0) * 4);

  // Important flag from source (0-15)
  if (important) score += 15;

  // Title length penalty: very short titles are usually noise
  if (title.length < 15) score -= 10;

  // Sentiment extremity bonus (0-15): emotionally charged = more impactful
  const extremeWords = ['暴', '崩', '熔断', '历史', '突发', '紧急', '重大', '罕见', '破纪录'];
  if (extremeWords.some(w => title.includes(w))) score += 15;

  return Math.max(0, Math.min(100, score));
}

// ─── Tag classification rules ───

const TAG_RULES: { tag: NewsTag; keywords: string[] }[] = [
  { tag: '央行',   keywords: ['央行', '美联储', 'Fed', '加息', '降息', '利率', 'LPR', '逆回购', '准备金', '货币政策', 'BOJ', 'ECB', '日本央行', '欧央行'] },
  { tag: '宏观',   keywords: ['GDP', 'CPI', 'PPI', 'PMI', '通胀', '就业', '失业', '非农', '经济数据', '财政', '国务院', '发改委', '两会'] },
  { tag: '地缘',   keywords: ['战争', '制裁', '军事', '冲突', '导弹', '打击', '紧张', '停火', '谈判', '乌克兰', '俄罗斯', '以色列', '伊朗', '朝鲜', '台海', '南海'] },
  { tag: '贸易',   keywords: ['关税', '贸易', '进出口', '制裁', '出口管制', '实体清单', '反倾销', 'WTO', '自贸'] },
  { tag: '科技',   keywords: ['AI', '人工智能', '大模型', 'ChatGPT', 'OpenAI', '谷歌', '微软', '苹果', 'Meta', '亚马逊', '数据中心', '云计算', '算力'] },
  { tag: '半导体', keywords: ['芯片', '半导体', '英伟达', 'NVIDIA', '台积电', 'TSMC', 'AMD', '光刻', 'ASML', '华为', '海思', '中芯'] },
  { tag: '能源',   keywords: ['原油', '石油', 'OPEC', '天然气', '煤炭', '油价', '布伦特', 'WTI', '能源', '沙特'] },
  { tag: '新能源', keywords: ['光伏', '锂电', '新能源', '储能', '风电', '氢能', '碳中和', '特斯拉', '比亚迪', '宁德时代'] },
  { tag: '医药',   keywords: ['医药', '药品', '疫苗', '临床', 'FDA', '新药', '医疗', '医保', '集采', '生物'] },
  { tag: '金融',   keywords: ['银行', '保险', '券商', '基金', '信贷', '理财', '信托', '资管', 'IPO', '上市'] },
  { tag: '地产',   keywords: ['房地产', '楼市', '房价', '土地', '拿地', '住建部', '保交楼', '城中村'] },
  { tag: '消费',   keywords: ['消费', '零售', '电商', '白酒', '茅台', '餐饮', '旅游', '免税', '奢侈品'] },
  { tag: '军工',   keywords: ['军工', '国防', '军事', '航天', '导弹', '军费', '军品'] },
  { tag: '汽车',   keywords: ['汽车', '车企', '新车', '销量', '产量', '智驾', '自动驾驶', '造车'] },
  { tag: '监管',   keywords: ['证监会', '银保监', '处罚', '违规', '监管', '审批', '合规', '反垄断', '调查'] },
  { tag: '财报',   keywords: ['财报', '季报', '年报', '业绩', '营收', '净利润', '盈利', '亏损', '分红', '业绩预告', '盈喜', '盈警'] },
];

function classifyTags(title: string): NewsTag[] {
  const tags: NewsTag[] = [];
  for (const rule of TAG_RULES) {
    if (rule.keywords.some(kw => title.includes(kw))) {
      tags.push(rule.tag);
    }
  }
  return tags.slice(0, 3); // max 3 tags
}

// ─── Noise filter: remove market commentary, keep events ───

// Patterns that indicate NOISE (行情播报 / analyst commentary / index data)
const NOISE_PATTERNS = [
  /^[A-Z]股三大指数/,                    // "A股三大指数集体高开"
  /^(沪|深|创业板|科创板)(指|成指).*[涨跌]/,  // "沪指涨0.4%"
  /^中证(转债|500|1000|红利)指数/,
  /^国债期货(开盘|收盘)/,
  /^(港股|美股)(开盘|收盘|午盘)/,
  /板块(走强|走弱|活跃|拉升|下挫|领涨|领跌|反复活跃)/,
  /板块(涨|跌)(幅居|超)/,
  /板块(高开低走|低开高走|异动拉升)/,
  /概念股(震荡|集体|持续)(走强|走弱|拉升|下跌|走高)/,
  /(涨停板|跌停板).*超?\d+(只|家)/,
  /^(华泰|中金|中信|国泰|招商|海通|广发|东方|申万|兴业|光大|平安)(期货|证券)?[：:]/,
  /^(维持|上调|下调|首次).*评级/,
  /(目标价|评级).*(港元|美元)/,
  /^两市(超|共|合计)\d+/,
  /下跌个股超/,
  /^(早盘|尾盘|午盘|盘中)/,
  /公开市场.*净(投放|回笼)/,
  /融资融券/,
  /北向资金/,
  /主力资金/,
  /^恒(指|生)(高开|低开|涨|跌)/,        // "恒指高开1.55%"
  /^人民币兑美元中间价/,                  // routine FX fix
  /涨停，.*跟涨/,                        // "XX涨停，XX跟涨" pattern
  /集体(高开|低开|下挫|跟涨|跟跌)/,
  /纷纷(下挫|跟涨|跟跌|走低|走高)/,
];

function isNoise(title: string): boolean {
  return NOISE_PATTERNS.some(p => p.test(title));
}

// ─── Data sources ───

async function fetchWallstreetcnNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch('/api/wscn/apiv1/content/lives?channel=global-channel&limit=50', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`WSCN ${res.status}`);
    const data = await res.json();

    const items = data?.data?.items || [];
    return items.map((item: any) => {
      const ts = (item.display_time || 0) * 1000;
      const d = new Date(ts);
      const title = (item.title || item.content_text?.slice(0, 100) || '').replace(/<[^>]+>/g, '').trim();
      const tags = classifyTags(title);
      const imp = item.importance === 1 || item.is_important;
      return {
        id: `wscn-${item.id}`,
        title,
        source: '华尔街见闻',
        time: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
        timestamp: ts,
        important: imp,
        tags,
        impact: scoreImpact(title, '华尔街见闻', imp, tags.length),
      };
    }).filter((n: NewsItem) => n.title.length > 6);
  } catch (err) {
    console.warn('Wallstreetcn news fetch failed:', err);
    return [];
  }
}

async function fetchSinaNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch(
      '/api/sina/api/roll/get?pageid=153&lid=2516&num=30&page=1&encode=utf-8',
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) throw new Error(`Sina ${res.status}`);
    const data = await res.json();

    const items = data?.result?.data || [];
    return items.map((item: any) => {
      const ts = (item.ctime || 0) * 1000;
      const d = new Date(ts);
      const title = (item.title || '').replace(/<[^>]+>/g, '').trim();
      const tags = classifyTags(title);
      return {
        id: `sina-${item.oid || item.docid}`,
        title,
        source: '新浪财经',
        time: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
        timestamp: ts,
        tags,
        impact: scoreImpact(title, '新浪财经', false, tags.length),
      };
    }).filter((n: NewsItem) => n.title.length > 6);
  } catch (err) {
    console.warn('Sina news fetch failed:', err);
    return [];
  }
}

// ─── Public API ───

export async function fetchLiveNews(): Promise<NewsItem[]> {
  const [wscn, sina] = await Promise.allSettled([fetchWallstreetcnNews(), fetchSinaNews()]);

  const all: NewsItem[] = [
    ...(wscn.status === 'fulfilled' ? wscn.value : []),
    ...(sina.status === 'fulfilled' ? sina.value : []),
  ];

  // Filter noise, sort by impact (primary) + time (secondary), dedupe
  const filtered = all.filter(n => !isNoise(n.title));
  filtered.sort((a, b) => {
    // High impact news first, then by recency
    const impactDiff = b.impact - a.impact;
    if (Math.abs(impactDiff) > 15) return impactDiff; // significant impact difference wins
    return b.timestamp - a.timestamp; // otherwise sort by time
  });

  const seen = new Set<string>();
  return filtered.filter(n => {
    const key = n.title.slice(0, 15);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Get all unique tags from a news list */
export function extractAllTags(news: NewsItem[]): NewsTag[] {
  const tagSet = new Set<NewsTag>();
  for (const n of news) {
    for (const t of n.tags) tagSet.add(t);
  }
  // Sort by frequency
  const freq = new Map<NewsTag, number>();
  for (const n of news) {
    for (const t of n.tags) freq.set(t, (freq.get(t) || 0) + 1);
  }
  return [...tagSet].sort((a, b) => (freq.get(b) || 0) - (freq.get(a) || 0));
}
