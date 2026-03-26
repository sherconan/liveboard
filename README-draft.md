# Liveboard

Built with Vite, TypeScript, Express. JavaScript/TypeScript project.

![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat-square&logo=vite&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white) ![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)

---

## Features

- React-based interactive UI
- Interactive node-based graph visualization
- Data visualization with charts
- Express.js backend
- Tailwind CSS styling
- Smooth animations with Framer Motion
- AI/LLM integration
- Full TypeScript support

---

## Tech Stack

JavaScript/TypeScript | Vite | TypeScript | Express | React

---

## Quick Start

**1. Clone the repository**

```bash
git clone git@github.com:sherconan/liveboard.git
cd liveboard
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure environment**

```bash
cp .env.example .env
# Edit .env with your configuration
```

**4. Run**

```bash
npm run dev
```

---

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | `vite --port=3001 --host=0.0.0.0` |
| `npm run build` | `vite build` |
| `npm run preview` | `vite preview` |
| `npm run clean` | `rm -rf dist` |
| `npm run lint` | `tsc --noEmit` |

---

## Project Structure

```
liveboard/
├── docs/
│   └── LiveBoard-事件驱动实时决策引擎.docx
├── src/
│   ├── components/
│   │   ├── EventPanel.tsx
│   │   ├── Header.tsx
│   │   ├── LiveGraph.tsx
│   │   ├── MarketPulse.tsx
│   │   ├── PriceTrend.tsx
│   │   ├── ProbabilityComparison.tsx
│   │   ├── SummaryPanel.tsx
│   │   └── SwarmPanel.tsx
│   ├── services/
│   │   ├── llm.ts
│   │   ├── news.ts
│   │   ├── polymarket.ts
│   │   ├── social.ts
│   │   └── swarm.ts
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── theme.tsx
├── index.html
├── metadata.json
├── package-lock.json
├── package.json
├── README.md
├── tsconfig.json
└── vite.config.ts
```

---

## Key Dependencies

**Runtime**: `@dagrejs/dagre`, `@google/genai`, `@tailwindcss/vite`, `@vitejs/plugin-react`, `clsx`, `dotenv`, `express`, `framer-motion`, `lucide-react`, `motion`, `react`, `react-dom`, `reactflow`, `recharts`, `tailwind-merge` *and 1 more*

**Dev**: `@types/express`, `@types/node`, `autoprefixer`, `tailwindcss`, `tsx`, `typescript`, `vite`

