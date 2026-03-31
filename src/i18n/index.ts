import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type Locale = 'zh' | 'en';

const LOCALE_KEY = 'liveboard-locale';

const translations: Record<Locale, Record<string, string>> = {
  zh: {
    // App
    'app.title': 'LiveBoard',
    'app.subtitle': '实时决策引擎',
    'app.subtitle.full': 'Real-time Decision Engine',

    // Header
    'header.offline': '离线模式',
    'header.update': '新版本可用，点击更新',
    'header.analyzing': '分析中...',
    'header.history': '历史',
    'header.history.title': '历史分析',
    'header.compare': '对比',
    'header.compare.title': '对比分析',
    'header.export': '导出分析',
    'header.exportPNG': '导出 PNG',
    'header.exportPDF': '打印 / PDF',
    'header.theme.dark': '切换亮色模式',
    'header.theme.light': '切换暗色模式',
    'header.session.scenarios': '场景',
    'header.session.nodes': '节点',

    // Event Panel
    'event.placeholder': '输入或点选新闻，分析市场传导链...',
    'event.analyze': '分析传导链',
    'event.analyzing': '分析中...',
    'event.reanalyze': '重新分析',
    'event.news.title': '事件快讯',
    'event.news.clear': '清除',
    'event.news.retry': '重试',
    'event.news.empty': '暂无新闻数据',
    'event.news.loadFail': '新闻加载失败',
    'event.news.noTag': '暂无相关新闻',
    'event.news.viewAll': '查看全部',

    // Empty state
    'empty.title': '从左侧选择一条新闻开始分析',
    'empty.subtitle': '选择实时新闻 → AI 分析因果传导链 → 生成决策图',

    // Loading
    'loading.preparing': '准备中...',
    'loading.subtitle': '多 Agent 协同分析 · 通常 20-40 秒',
    'loading.step1': '识别事件',
    'loading.step2': '推演传导',
    'loading.step3': '确定标的',
    'loading.step4': '交易判断',
    'loading.layer1': '识别事件与变量...',
    'loading.layer2': '推导传导效应...',
    'loading.layer3': '确定受影响标的...',
    'loading.insight': '生成交易判断...',

    // Errors
    'error.empty': '请输入一条事件性新闻',
    'error.timeout': '请求超时，请检查 LLM 服务是否运行中',
    'error.network': '无法连接分析引擎，请检查网络连接',
    'error.fail': '推演失败',
    'error.loadFail': '加载失败',

    // Graph node types
    'graph.hotspot': '热点事件',
    'graph.variable': '关键变量',
    'graph.impact': '传导效应',
    'graph.asset': '受影标的',

    // Market Pulse
    'market.social': '社交舆情',
    'market.polymarket': '预测市场',
    'market.social.empty': '暂无相关社交讨论',
    'market.polymarket.empty': '未找到相关预测市场',
    'market.polymarket.hint': 'Polymarket 以欧美事件为主，部分中国新闻可能无法匹配',
    'market.trend.show': '查看概率趋势',
    'market.trend.hide': '收起趋势图',
    'market.trend.select': '选择一个 Polymarket 事件查看概率趋势',
    'market.trend.nodata': '暂无数据',
    'market.sentiment.bullish': '看涨',
    'market.sentiment.bearish': '看跌',
    'market.probability': '概率',

    // Price Trend
    'trend.1d': '1天',
    'trend.1w': '1周',
    'trend.1m': '1月',
    'trend.3m': '3月',

    // Summary Panel
    'summary.title': '推演结论',
    'summary.market': '已融合市场',
    'summary.multiAgent': '多Agent分析',
    'summary.scenario': '场景判断',
    'summary.actions': '操作建议',
    'summary.divergence': 'AI vs 市场分歧',

    // Swarm Panel
    'swarm.analyzing': '多视角分析中...',
    'swarm.title': '多视角 Agent 分析',
    'swarm.depth.initial': '独立分析',
    'swarm.depth.debated': '辩论完成',
    'swarm.depth.reflected': '反思修正',
    'swarm.debate': '投委会辩论',
    'swarm.debate.reflected': '已反思修正',
    'swarm.debate.contradictions': '矛盾点：',
    'swarm.debate.blindSpots': '盲区：',
    'swarm.debate.probingQuestion': '追问：',
    'swarm.consensus': '共识：',
    'swarm.divergence': '分歧：',
    'swarm.risk': '风控警示：',
    'swarm.tooltip.risk': '风险：',
    'swarm.tooltip.action': '操作：',

    // Swarm agents
    'agent.macro': '宏观策略师',
    'agent.sector': '行业研究员',
    'agent.trader': '交易员',
    'agent.risk': '风控官',

    // History Drawer
    'history.title': '历史分析',
    'history.clearConfirm': '确认清除',
    'history.clearAll': '清除全部',
    'history.search': '搜索事件或资产...',
    'history.empty': '暂无历史分析',
    'history.empty.hint': '完成一次分析后，结果会自动保存到这里',
    'history.noMatch': '未找到匹配的记录',
    'history.footer': '点击卡片回放 · 悬浮显示对比按钮 · 最多保留 50 条',
    'history.current': '当前',
    'history.nodes': '节点',
    'history.delete': '删除',

    // Compare Mode
    'compare.title': '对比分析',
    'compare.select': '选择事件...',
    'compare.prompt': '请从上方选择两个事件进行对比',
    'compare.currentAnalysis': '当前分析',
    'compare.nodes': '节点',
    'compare.assets': '资产',
    'compare.chainDepth': '传导层级',
    'compare.nodeCount': '节点数',
    'compare.assetCount': '受影资产',
    'compare.direction': '市场方向',
    'compare.direction.bull': '偏多',
    'compare.direction.bear': '偏空',
    'compare.direction.neutral': '中性',
    'compare.unit.layer': '层',
    'compare.unit.count': '个',
    'compare.overlapSectors': '共同影响领域',
    'compare.overlapAssets': '共同影响资产',
    'compare.radarTitle': '影响维度对比',
    'compare.radar.nodes': '节点数',
    'compare.radar.edges': '连线数',
    'compare.radar.assets': '资产数',
    'compare.radar.sectors': '领域数',
    'compare.radar.positive': '利多',
    'compare.radar.negative': '利空',

    // Probability Comparison
    'prob.title.compare': '概率对比 · AI vs 市场',
    'prob.title.simple': '概率温度计',
    'prob.ai': 'AI 推演',
    'prob.market': '市场共识',
    'prob.agree': 'AI 与市场一致',
    'prob.undervalued': 'AI 认为被低估',
    'prob.overvalued': 'AI 认为被高估',

    // Keyboard Shortcuts
    'shortcut.title': '键盘快捷键',
    'shortcut.analyze': '触发分析',
    'shortcut.history': '打开历史记录',
    'shortcut.exportPNG': '导出 PNG',
    'shortcut.exportPDF': '打印 / PDF',
    'shortcut.escape': '关闭弹窗 / 取消分析',
    'shortcut.focusInput': '聚焦输入框',
    'shortcut.focusInputVim': '聚焦输入框 (Vim 风格)',
    'shortcut.help': '显示快捷键帮助',
    'shortcut.footer': '按 ? 随时打开此面板',

    // Batch mode
    'batch.detected': '批量模式：{count} 条事件',
    'batch.analyzeAll': '批量分析',
    'batch.progress': '正在分析 {current}/{total}...',
    'batch.complete': '批量分析完成',
    'batch.failed': '{count} 条分析失败',
    'batch.tab.overview': '总览',
    'batch.tab.event': '事件 {index}',
    'batch.overview.title': '多事件影响总览',
    'batch.overview.subtitle': '{count} 条事件的综合影响图',

    // Templates
    'template.title': '事件模板',
    'template.subtitle': '选择预设事件快速开始分析',
    'template.search': '搜索模板...',
    'template.category.all': '全部',
    'template.empty': '未找到匹配的模板',
    'template.hint': '点击模板卡片自动填充事件输入框',
    'header.templates': '模板',

    // StockPulse
    'stockpulse.title': 'StockPulse 热点',
    'stockpulse.badge': '来自 StockPulse',

    // Share / Report
    'share.title': '分享分析报告',
    'share.plainText': '纯文本',
    'share.copyMd': '复制 Markdown',
    'share.copyText': '复制纯文本',
    'share.copied': '已复制',
    'share.toast': '已复制到剪贴板',
    'share.chars': '字符',
    'header.share': '分享',

    // Relative time
    'time.justNow': '刚刚',
    'time.minutesAgo': '分钟前',
    'time.hoursAgo': '小时前',
    'time.daysAgo': '天前',
  },
  en: {
    // App
    'app.title': 'LiveBoard',
    'app.subtitle': 'Decision Engine',
    'app.subtitle.full': 'Real-time Decision Engine',

    // Header
    'header.offline': 'Offline',
    'header.update': 'Update available, click to refresh',
    'header.analyzing': 'Analyzing...',
    'header.history': 'History',
    'header.history.title': 'Analysis History',
    'header.compare': 'Compare',
    'header.compare.title': 'Compare Analysis',
    'header.export': 'Export',
    'header.exportPNG': 'Export PNG',
    'header.exportPDF': 'Print / PDF',
    'header.theme.dark': 'Switch to light mode',
    'header.theme.light': 'Switch to dark mode',
    'header.session.scenarios': 'scenarios',
    'header.session.nodes': 'nodes',

    // Event Panel
    'event.placeholder': 'Enter or select news to analyze market transmission...',
    'event.analyze': 'Analyze Chain',
    'event.analyzing': 'Analyzing...',
    'event.reanalyze': 'Re-analyze',
    'event.news.title': 'Breaking News',
    'event.news.clear': 'Clear',
    'event.news.retry': 'Retry',
    'event.news.empty': 'No news data available',
    'event.news.loadFail': 'Failed to load news',
    'event.news.noTag': 'No related news',
    'event.news.viewAll': 'View all',

    // Empty state
    'empty.title': 'Select a news event from the left panel to begin',
    'empty.subtitle': 'Select news → AI analyzes causal chain → Generate decision graph',

    // Loading
    'loading.preparing': 'Preparing...',
    'loading.subtitle': 'Multi-Agent analysis · Usually 20-40 seconds',
    'loading.step1': 'Identify',
    'loading.step2': 'Propagate',
    'loading.step3': 'Assets',
    'loading.step4': 'Insight',
    'loading.layer1': 'Identifying events and variables...',
    'loading.layer2': 'Deriving transmission effects...',
    'loading.layer3': 'Determining affected assets...',
    'loading.insight': 'Generating trading insights...',

    // Errors
    'error.empty': 'Please enter a news event',
    'error.timeout': 'Request timeout, please check if LLM service is running',
    'error.network': 'Cannot connect to analysis engine, check network',
    'error.fail': 'Analysis failed',
    'error.loadFail': 'Load failed',

    // Graph node types
    'graph.hotspot': 'Hotspot',
    'graph.variable': 'Variable',
    'graph.impact': 'Impact',
    'graph.asset': 'Asset',

    // Market Pulse
    'market.social': 'Social Feed',
    'market.polymarket': 'Prediction',
    'market.social.empty': 'No related social discussions',
    'market.polymarket.empty': 'No matching prediction markets',
    'market.polymarket.hint': 'Polymarket mainly covers Western events, some Chinese news may not match',
    'market.trend.show': 'Show price trend',
    'market.trend.hide': 'Hide price trend',
    'market.trend.select': 'Select a Polymarket event to view probability trend',
    'market.trend.nodata': 'No data',
    'market.sentiment.bullish': 'Bullish',
    'market.sentiment.bearish': 'Bearish',
    'market.probability': 'Prob',

    // Price Trend
    'trend.1d': '1D',
    'trend.1w': '1W',
    'trend.1m': '1M',
    'trend.3m': '3M',

    // Summary Panel
    'summary.title': 'Conclusions',
    'summary.market': 'Market integrated',
    'summary.multiAgent': 'Multi-Agent',
    'summary.scenario': 'Scenario Assessment',
    'summary.actions': 'Action Items',
    'summary.divergence': 'AI vs Market Divergence',

    // Swarm Panel
    'swarm.analyzing': 'Multi-perspective analysis...',
    'swarm.title': 'Multi-Agent Analysis',
    'swarm.depth.initial': 'Independent',
    'swarm.depth.debated': 'Debated',
    'swarm.depth.reflected': 'Reflected',
    'swarm.debate': 'Committee Debate',
    'swarm.debate.reflected': 'Reflected',
    'swarm.debate.contradictions': 'Contradictions: ',
    'swarm.debate.blindSpots': 'Blind spots: ',
    'swarm.debate.probingQuestion': 'Follow-up: ',
    'swarm.consensus': 'Consensus: ',
    'swarm.divergence': 'Divergence: ',
    'swarm.risk': 'Risk Alert: ',
    'swarm.tooltip.risk': 'Risk: ',
    'swarm.tooltip.action': 'Action: ',

    // Swarm agents
    'agent.macro': 'Macro Strategist',
    'agent.sector': 'Sector Analyst',
    'agent.trader': 'Trader',
    'agent.risk': 'Risk Officer',

    // History Drawer
    'history.title': 'Analysis History',
    'history.clearConfirm': 'Confirm clear',
    'history.clearAll': 'Clear all',
    'history.search': 'Search events or assets...',
    'history.empty': 'No analysis history',
    'history.empty.hint': 'Results will be automatically saved here after analysis',
    'history.noMatch': 'No matching records found',
    'history.footer': 'Click to replay · Hover for compare · Max 50 entries',
    'history.current': 'Current',
    'history.nodes': 'nodes',
    'history.delete': 'Delete',

    // Compare Mode
    'compare.title': 'Compare Analysis',
    'compare.select': 'Select event...',
    'compare.prompt': 'Select two events above to compare',
    'compare.currentAnalysis': 'Current Analysis',
    'compare.nodes': 'nodes',
    'compare.assets': 'assets',
    'compare.chainDepth': 'Chain Depth',
    'compare.nodeCount': 'Nodes',
    'compare.assetCount': 'Assets',
    'compare.direction': 'Direction',
    'compare.direction.bull': 'Bullish',
    'compare.direction.bear': 'Bearish',
    'compare.direction.neutral': 'Neutral',
    'compare.unit.layer': ' layers',
    'compare.unit.count': '',
    'compare.overlapSectors': 'Common Impact Sectors',
    'compare.overlapAssets': 'Common Impact Assets',
    'compare.radarTitle': 'Impact Dimension Comparison',
    'compare.radar.nodes': 'Nodes',
    'compare.radar.edges': 'Edges',
    'compare.radar.assets': 'Assets',
    'compare.radar.sectors': 'Sectors',
    'compare.radar.positive': 'Bullish',
    'compare.radar.negative': 'Bearish',

    // Probability Comparison
    'prob.title.compare': 'Probability · AI vs Market',
    'prob.title.simple': 'Probability Gauge',
    'prob.ai': 'AI Prediction',
    'prob.market': 'Market Consensus',
    'prob.agree': 'AI agrees with market',
    'prob.undervalued': 'AI sees undervalued',
    'prob.overvalued': 'AI sees overvalued',

    // Keyboard Shortcuts
    'shortcut.title': 'Keyboard Shortcuts',
    'shortcut.analyze': 'Trigger analysis',
    'shortcut.history': 'Open history',
    'shortcut.exportPNG': 'Export PNG',
    'shortcut.exportPDF': 'Print / PDF',
    'shortcut.escape': 'Close overlay / Cancel',
    'shortcut.focusInput': 'Focus input',
    'shortcut.focusInputVim': 'Focus input (vim-style)',
    'shortcut.help': 'Show shortcuts help',
    'shortcut.footer': 'Press ? to open this panel anytime',

    // Batch mode
    'batch.detected': 'Batch mode: {count} events',
    'batch.analyzeAll': 'Analyze All',
    'batch.progress': 'Analyzing {current}/{total}...',
    'batch.complete': 'Batch analysis complete',
    'batch.failed': '{count} failed',
    'batch.tab.overview': 'Overview',
    'batch.tab.event': 'Event {index}',
    'batch.overview.title': 'Multi-Event Impact Overview',
    'batch.overview.subtitle': 'Combined impact graph of {count} events',

    // Templates
    'template.title': 'Event Templates',
    'template.subtitle': 'Select a preset event to quickly start analysis',
    'template.search': 'Search templates...',
    'template.category.all': 'All',
    'template.empty': 'No matching templates found',
    'template.hint': 'Click a template card to populate the event input',
    'header.templates': 'Templates',

    // StockPulse
    'stockpulse.title': 'StockPulse Hotspots',
    'stockpulse.badge': 'From StockPulse',

    // Share / Report
    'share.title': 'Share Analysis Report',
    'share.plainText': 'Plain Text',
    'share.copyMd': 'Copy Markdown',
    'share.copyText': 'Copy Plain Text',
    'share.copied': 'Copied',
    'share.toast': 'Copied to clipboard',
    'share.chars': 'chars',
    'header.share': 'Share',

    // Relative time
    'time.justNow': 'Just now',
    'time.minutesAgo': 'm ago',
    'time.hoursAgo': 'h ago',
    'time.daysAgo': 'd ago',
  },
};

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'zh',
  setLocale: () => {},
  t: (key: string) => key,
});

function getInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (stored === 'zh' || stored === 'en') return stored;
  } catch {}
  return 'zh';
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(LOCALE_KEY, newLocale);
    } catch {}
  }, []);

  const t = useCallback((key: string): string => {
    return translations[locale]?.[key] || translations.zh[key] || key;
  }, [locale]);

  return React.createElement(
    LocaleContext.Provider,
    { value: { locale, setLocale, t } },
    children,
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
