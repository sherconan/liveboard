<div align="center">

# :zap: LiveBoard

**事件驱动实时决策引擎 — 新闻 → 因果传导链 → 市场影响 → 操作建议**

[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Vite 6](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev)
[![CI](https://github.com/sherconan/liveboard/actions/workflows/ci.yml/badge.svg)](https://github.com/sherconan/liveboard/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

---

## Overview

金融市场的每一次波动背后都有因果链：**事件 → 变量 → 传导 → 资产影响**。

LiveBoard 将这条隐形的链条可视化。输入一条新闻事件，AI 自动构建完整的多层因果传导图，匹配 Polymarket 预测市场概率数据，并给出具体的操作建议。

**适用人群：** 金融分析师、投资经理、事件驱动交易者，以及任何需要快速理解"一条新闻如何影响市场"的人。

---

## Features

- **一键因果分析** — 输入新闻事件，Claude AI 自动识别关键变量、传导路径和受影响资产
- **多层因果传导图** — ReactFlow + dagre 自动布局，四层结构（hotspot → variable → impact → asset），逐层动画展开
- **Polymarket 预测市场集成** — AI 生成英文搜索关键词，自动匹配 Top 50 预测市场，对比 AI 分析 vs 市场共识
- **概率对比可视化** — AI 推演概率与 Polymarket 博弈概率的雷达图对比，高亮显著分歧
- **历史回放 (History Replay)** — 自动保存每次分析结果，支持搜索、回放、迷你图预览
- **对比模式 (Compare Mode)** — 并排对比两次分析的因果图和概率，雷达图叠加显示差异
- **实时行情注入** — 东方财富 API 实时行情，资产节点自动标注价格和涨跌幅
- **多源新闻聚合** — 华尔街见闻 + 新浪财经 + Bocha Web Search + 东方财富，4源并行抓取
- **智能影响力评分** — 基于来源权重、实体关键词、紧急度的复合评分系统
- **节点悬停详情** — 鼠标悬停查看每个节点的详细解释和影响逻辑
- **JSON 导出** — 完整分析结果一键导出

---

## Architecture

```
用户输入新闻事件
    │
    ▼
┌──────────────────────────────────────────┐
│  Claude AI (via claude-code-bridge:8080) │
│                                          │
│  ├─ 构建因果传导链 (nodes + edges)        │
│  ├─ 场景概率判断 (scenarios)              │
│  ├─ 操作建议 (coreActions)               │
│  └─ Polymarket 搜索词 (polymarketQueries)│
└──────────────┬───────────────────────────┘
               │
    ┌──────────┴──────────┐
    ▼                     ▼
┌──────────┐    ┌──────────────────┐
│Polymarket│    │  News Aggregator  │
│Gamma API │    │  (4 sources)      │
│ 概率匹配  │    │  WSCN / Sina /    │
│          │    │  Bocha / Eastmoney│
└────┬─────┘    └────────┬─────────┘
     │                   │
     └─────────┬─────────┘
               ▼
┌──────────────────────────────────────────┐
│           Frontend Rendering             │
│                                          │
│  ReactFlow + dagre   逐层动画因果图       │
│  Recharts            概率趋势 / 雷达对比  │
│  Eastmoney API       资产节点实时行情      │
│  History Store       分析记录持久化        │
└──────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- **Node.js 18+**
- **claude-code-bridge** 运行在 `localhost:8080`（提供 Claude API 代理）

### Install & Run

```bash
git clone git@github.com:sherconan/liveboard.git
cd liveboard
npm install
cp .env.example .env   # 编辑配置
npm run dev             # 访问 http://localhost:3001
```

---

## Configuration

`.env` 文件配置项：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `LLM_BASE_URL` | LLM API 路径 | `/api/llm/v1` |
| `LLM_API_KEY` | Bridge 认证密钥 | `local-bridge` |
| `LLM_MODEL` | Claude 模型 | `claude-sonnet-4-6` |
| `LLM_PROXY_TARGET` | claude-code-bridge 地址 | `http://localhost:8080` |
| `BOCHA_API_KEY` | Bocha Web Search API Key（可选） | — |

> **端口约定：** 前端 `3001`，claude-code-bridge `8080`

---

## Usage

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | 启动开发服务器 (port 3001) |
| `npm run build` | 生产构建 |
| `npm run preview` | 预览生产构建 |
| `npm run test` | 运行 Vitest 测试 |
| `npm run lint` | TypeScript 类型检查 |
| `npm run clean` | 清理 dist 目录 |

### Workflow

1. 在顶部输入框粘贴一条新闻标题或事件描述
2. AI 分析 15-30 秒后，因果传导图逐层动画展开
3. 左侧面板查看 Polymarket 匹配结果和概率对比
4. 底部面板查看总结、操作建议和分歧分析
5. 点击 History 图标查看历史记录，或进入 Compare Mode 对比两次分析

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript 5.8 + Vite 6 |
| Graph Visualization | ReactFlow + @dagrejs/dagre (auto-layout) |
| Charts | Recharts (probability trends, radar comparison) |
| Animation | Framer Motion (layer-by-layer reveal) |
| Styling | Tailwind CSS 4 |
| LLM | Claude (via claude-code-bridge proxy) |
| Market Data | Polymarket Gamma API, Eastmoney Quotes API |
| News Sources | 华尔街见闻, 新浪财经, Bocha Web Search, 东方财富 |
| Testing | Vitest + React Testing Library |

---

## Project Structure

```
liveboard/
├── src/
│   ├── App.tsx                        # 主应用：状态管理、分析流程编排
│   ├── components/
│   │   ├── Header.tsx                 # 顶栏：新闻输入、历史、导出
│   │   ├── EventPanel.tsx             # 侧栏：Polymarket 匹配、概率对比
│   │   ├── LiveGraph.tsx              # 因果传导图 (dagre 布局 + 逐层动画)
│   │   ├── SummaryPanel.tsx           # 底栏：结论、操作建议、分歧分析
│   │   ├── HistoryDrawer.tsx          # 历史记录抽屉 (搜索/回放/删除)
│   │   ├── CompareMode.tsx            # 对比模式 (并排因果图 + 雷达图)
│   │   ├── MarketPulse.tsx            # 市场脉搏实时行情
│   │   ├── PriceTrend.tsx             # Polymarket 概率趋势图
│   │   ├── ProbabilityComparison.tsx  # AI vs 市场概率可视化
│   │   └── SwarmPanel.tsx             # Swarm 多代理面板
│   ├── services/
│   │   ├── llm.ts                     # LLM 调用、Prompt 工程、JSON 解析
│   │   ├── polymarket.ts              # Polymarket API 封装 (Top50 本地匹配)
│   │   ├── news.ts                    # 4源新闻聚合 + 影响力评分
│   │   ├── quotes.ts                  # 东方财富实时行情 API
│   │   ├── historyStore.ts            # 分析历史 localStorage 持久化
│   │   ├── social.ts                  # 社交媒体情绪
│   │   └── swarm.ts                   # Swarm 多代理编排
│   ├── main.tsx
│   ├── index.css
│   └── theme.tsx
├── docs/
│   └── LiveBoard-事件驱动实时决策引擎.docx
├── .env.example
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Prompt Engineering

借鉴 autoresearch 方法论，Prompt 设计遵循：

- **固定 Schema** — 严格的 JSON 输出格式，包含 nodes、edges、scenarios、coreActions
- **Few-shot 示例** — 提供正确和错误的示例，校准 AI 输出质量
- **质量标准** — 明确的节点数量、分层要求（4层）、label 长度限制（<=40字）
- **Polymarket Query 生成** — AI 在分析时自动生成 >=3 条英文搜索词，用于匹配预测市场
- **后处理截断** — 对 LLM 输出做长度校验，超限自动截断

---

## Development

```bash
# Install dependencies
npm install

# Run dev server with hot reload
npm run dev

# Type check
npm run lint

# Run tests
npm run test

# Build for production
npm run build
```

---

## License

[MIT](LICENSE)
