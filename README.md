<div align="center">

# LiveBoard

**新闻事件 → 因果传导链 → 市场影响 → 操作建议**

事件驱动的实时决策引擎，将新闻转化为可视化的因果传导图

[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

---

## 核心理念

金融市场的每一次波动背后都有因果链：**事件 → 变量 → 传导 → 资产影响**。

LiveBoard 将这条隐形的链条可视化：输入一条新闻，AI 自动构建完整的因果传导图，并匹配 Polymarket 预测市场数据作为概率参考。

## 功能

- **一键分析** — 输入新闻事件，AI 自动识别关键变量、传导路径和受影资产
- **因果传导图** — dagre 自动布局的多层因果图（事件→变量→传导→标的），逐层动画展开
- **Polymarket 集成** — AI 生成搜索关键词，自动匹配相关预测市场，对比 AI 分析 vs 市场共识
- **概率对比** — AI 推演概率与 Polymarket 博弈概率的可视化对比，标注显著分歧
- **分析历史** — 自动保存每次推演，可回看对比
- **节点详情** — 鼠标悬停查看每个节点的详细解释
- **导出** — JSON 格式导出分析结果

## 架构

```
新闻事件 (用户输入)
    ↓
Claude AI (via claude-code-bridge)
    ├→ 构建因果传导链 (nodes + edges)
    ├→ 场景概率判断 (scenarios)
    ├→ 操作建议 (coreActions)
    └→ Polymarket 搜索词 (polymarketQueries)
         ↓
    Polymarket Gamma API
    ├→ 自动匹配相关预测市场
    └→ 概率数据注入侧边栏
         ↓
    可视化渲染
    ├→ ReactFlow + dagre 布局
    ├→ 逐层动画展开
    └→ Recharts 概率趋势图
```

## 快速开始

```bash
# 前置条件: Node.js 18+, claude-code-bridge 在 8080 端口运行
npm install
cp .env.example .env
npm run dev
# 访问 http://localhost:3001
```

## 配置

`.env` 文件：

```bash
LLM_BASE_URL=/api/llm/v1
LLM_API_KEY=local-bridge          # claude-code-bridge 默认 key
LLM_MODEL=claude-sonnet-4-6       # 推荐模型
LLM_PROXY_TARGET=http://localhost:8080  # bridge 地址
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | React 19 + TypeScript + Vite 6 |
| 图可视化 | ReactFlow + @dagrejs/dagre |
| 图表 | Recharts |
| 动画 | Framer Motion |
| 样式 | Tailwind CSS 4 |
| LLM | Claude (via claude-code-bridge) |
| 数据 | Polymarket Gamma API + CLOB API |

## 项目结构

```
src/
├── App.tsx                    # 主应用：状态管理、分析流程编排
├── services/
│   ├── llm.ts                 # LLM 调用、Prompt 工程、JSON 解析
│   └── polymarket.ts          # Polymarket API 封装
├── components/
│   ├── Header.tsx             # 顶栏：历史、导出
│   ├── EventPanel.tsx         # 侧栏：新闻输入、Polymarket 匹配、概率对比
│   ├── LiveGraph.tsx          # 因果传导图（dagre 布局 + 逐层动画）
│   ├── SummaryPanel.tsx       # 底栏：结论、操作建议、分歧分析
│   ├── PriceTrend.tsx         # Polymarket 概率趋势图
│   └── ProbabilityComparison.tsx  # AI vs 市场概率对比
```

## Prompt 工程

借鉴 autoresearch 模式，Prompt 设计遵循：
- **固定 Schema** — 严格的 JSON 输出格式，AI 不能偏离
- **Few-shot 示例** — 提供正确和错误的示例，校准输出质量
- **质量标准** — 明确的节点数量、分层要求、label 长度限制
- **Polymarket Query 生成** — AI 在分析时顺便生成英文搜索词，用于后续匹配预测市场

## License

MIT
