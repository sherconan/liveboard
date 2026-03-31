import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './theme';
import { LocaleProvider } from './i18n';
import App from './App.tsx';
import './index.css';

// ─── Service Worker Registration ───
if ('serviceWorker' in navigator) {
  // Only register in production (Vite sets import.meta.env.DEV)
  if (!import.meta.env.DEV) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available - dispatch custom event for the UI to handle
              window.dispatchEvent(
                new CustomEvent('sw-update-available', { detail: { registration } })
              );
            }
          });
        });

        console.log('[SW] Registered successfully');
      } catch (err) {
        console.warn('[SW] Registration failed:', err);
      }
    });
  } else {
    // In dev mode, unregister any existing SW to avoid caching issues
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((r) => r.unregister());
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <LocaleProvider>
          <App />
        </LocaleProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
