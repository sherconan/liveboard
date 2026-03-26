/**
 * Real-time market quotes via Eastmoney public API (no key needed)
 * Used to enrich asset nodes with actual prices
 */

export interface QuoteData {
  name: string;
  price: number;
  change: number;     // percentage
  volume?: number;
}

// Common asset → Eastmoney secid mapping
const ASSET_MAP: Record<string, string> = {
  // 指数
  '上证指数': '1.000001', '沪指': '1.000001',
  '深证成指': '0.399001', '深指': '0.399001',
  '创业板指': '0.399006', '创业板': '0.399006',
  '科创50': '1.000688',
  '纳指': '100.NDX', '纳斯达克': '100.NDX',
  '标普500': '100.SPX', 'SPX': '100.SPX', 'SP500': '100.SPX',
  '恒生指数': '100.HSI', '恒指': '100.HSI',
  '日经225': '100.N225', '日经': '100.N225',
  '美元指数': '100.UDI', 'DXY': '100.UDI',

  // 商品
  '黄金': '100.GC', 'GOLD': '100.GC', '金价': '100.GC',
  '原油': '100.CL', 'WTI': '100.CL', '油价': '100.CL',
  '布伦特': '100.OIL',
  '白银': '100.SI',

  // 常见个股 A 股
  '宁德时代': '0.300750',
  '比亚迪': '0.002594',
  '贵州茅台': '1.600519',
  '中国平安': '0.002318',
  '招商银行': '1.600036',
  '中芯国际': '1.688981',
  '中国石油': '1.601857',

  // 美股
  '英伟达': '105.NVDA', 'NVDA': '105.NVDA',
  '苹果': '105.AAPL', 'AAPL': '105.AAPL',
  '特斯拉': '105.TSLA', 'TSLA': '105.TSLA',
  '台积电': '105.TSM', 'TSM': '105.TSM',
  'AMD': '105.AMD',
  '微软': '105.MSFT', 'MSFT': '105.MSFT',
  '谷歌': '105.GOOG', 'GOOG': '105.GOOG',

  // 汇率
  '美元': '100.UDI',
  '日元': '119.USDJPY',
  '欧元': '119.EURUSD',
  '人民币': '119.USDCNY', '人民币汇率': '119.USDCNY',
};

/**
 * Try to find a matching secid for an asset label
 */
function findSecid(label: string): string | null {
  // Exact match
  if (ASSET_MAP[label]) return ASSET_MAP[label];

  // Partial match
  for (const [key, secid] of Object.entries(ASSET_MAP)) {
    if (label.includes(key) || key.includes(label)) return secid;
  }

  return null;
}

/**
 * Fetch quote for a single secid
 */
async function fetchQuote(secid: string): Promise<QuoteData | null> {
  try {
    const res = await fetch(
      `/api/eastmoney/api/qt/stock/get?secid=${secid}&fields=f43,f44,f45,f46,f57,f58,f170`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = (await res.json())?.data;
    if (!data) return null;

    return {
      name: data.f58 || '',
      price: (data.f43 || 0) / 100,
      change: (data.f170 || 0) / 100,
    };
  } catch {
    return null;
  }
}

/**
 * Fallback: use Eastmoney skill API for assets not in our mapping
 */
const EM_KEY = process.env.EASTMONEY_APIKEY || '';

async function fetchQuoteViaSkill(label: string): Promise<QuoteData | null> {
  if (!EM_KEY) return null;
  try {
    const res = await fetch('/api/em-search/finskillshub/api/claw/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': EM_KEY },
      body: JSON.stringify({ toolQuery: `${label}最新价` }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const tables = data?.data?.data?.searchDataResultDTO?.dataTableDTOList || data?.data?.data?.dataTableDTOList || [];
    if (tables.length === 0) return null;

    const t = tables[0];
    const price = parseFloat(t.table?.f2?.[0] || t.rawTable?.f2?.[0] || '0');
    const change = parseFloat(t.table?.f3?.[0] || t.rawTable?.f3?.[0] || '0');
    if (!price) return null;

    return { name: t.entityName || label, price, change };
  } catch {
    return null;
  }
}

/**
 * Batch fetch quotes for multiple asset labels
 * Strategy: try local mapping first, fallback to Eastmoney skill API
 */
export async function fetchAssetQuotes(assetLabels: string[]): Promise<Map<string, QuoteData>> {
  const result = new Map<string, QuoteData>();
  const tasks: Promise<void>[] = [];
  const unmapped: string[] = [];

  for (const label of assetLabels) {
    const secid = findSecid(label);
    if (secid) {
      tasks.push(
        fetchQuote(secid).then(quote => {
          if (quote) result.set(label, quote);
          else unmapped.push(label);
        })
      );
    } else {
      unmapped.push(label);
    }
  }

  await Promise.allSettled(tasks);

  // Fallback: try Eastmoney skill API for unmapped labels
  if (unmapped.length > 0 && EM_KEY) {
    const fallbackTasks = unmapped.slice(0, 5).map(label =>
      fetchQuoteViaSkill(label).then(quote => {
        if (quote) result.set(label, quote);
      })
    );
    await Promise.allSettled(fallbackTasks);
  }

  return result;
}
