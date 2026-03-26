import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.LLM_BASE_URL': JSON.stringify(env.LLM_BASE_URL || ''),
      'process.env.LLM_API_KEY': JSON.stringify(env.LLM_API_KEY || ''),
      'process.env.LLM_MODEL': JSON.stringify(env.LLM_MODEL || ''),
      'process.env.BOCHA_API_KEY': JSON.stringify(env.BOCHA_API_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api/gamma': {
          target: 'https://gamma-api.polymarket.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/gamma/, ''),
        },
        '/api/clob': {
          target: 'https://clob.polymarket.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/clob/, ''),
        },
        '/api/llm': {
          target: env.LLM_PROXY_TARGET || 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/llm/, ''),
        },
        '/api/wscn': {
          target: 'https://api-one.wallstcn.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/wscn/, ''),
          headers: {
            'Referer': 'https://wallstreetcn.com/',
          },
        },
        '/api/sina': {
          target: 'https://feed.mix.sina.com.cn',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/sina/, ''),
          headers: {
            'Referer': 'https://finance.sina.com.cn/',
          },
        },
        '/api/reddit': {
          target: 'https://www.reddit.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/reddit/, ''),
          headers: {
            'User-Agent': 'LiveBoard/1.0',
          },
        },
        '/api/stocktwits': {
          target: 'https://api.stocktwits.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/stocktwits/, ''),
          headers: {
            'User-Agent': 'LiveBoard/1.0',
          },
        },
      },
    },
  };
});
