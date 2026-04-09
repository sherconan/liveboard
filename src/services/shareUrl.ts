import type { SimulationData } from './llm';

/**
 * Compress and encode graph state into a URL-safe string.
 * Uses a minimal representation to keep URLs reasonable.
 */
function encodeGraphState(hotspot: string, data: SimulationData): string {
  const minimal = {
    h: hotspot,
    s: data.scenarios.map(s => ({ n: s.name, p: s.probability })),
    n: data.nodes.map(n => ({ i: n.id, l: n.label, t: n.type, s: n.sentiment })),
    e: data.edges.map(e => ({ s: e.source, t: e.target, l: e.label, w: e.weight })),
    sm: data.summary?.slice(0, 200),
    a: data.coreActions?.slice(0, 3),
  };
  const json = JSON.stringify(minimal);
  // Base64 encode (URL-safe)
  const encoded = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return encoded;
}

/**
 * Decode graph state from URL parameter.
 */
export function decodeGraphState(encoded: string): { hotspot: string; data: SimulationData } | null {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
    const json = decodeURIComponent(escape(atob(padded)));
    const minimal = JSON.parse(json);

    return {
      hotspot: minimal.h || '',
      data: {
        scenarios: (minimal.s || []).map((s: any) => ({ name: s.n, probability: s.p, rationale: '' })),
        nodes: (minimal.n || []).map((n: any) => ({ id: n.i, label: n.l, type: n.t, sentiment: n.s })),
        edges: (minimal.e || []).map((e: any) => ({ source: e.s, target: e.t, label: e.l, weight: e.w })),
        summary: minimal.sm || '',
        coreActions: minimal.a || [],
      },
    };
  } catch {
    return null;
  }
}

/**
 * Generate a shareable URL with encoded graph state.
 */
export function generateShareUrl(hotspot: string, data: SimulationData): string {
  const encoded = encodeGraphState(hotspot, data);
  const url = new URL(window.location.href);
  url.pathname = '/';
  url.searchParams.set('share', encoded);
  return url.toString();
}

/**
 * Copy text to clipboard and return success status.
 */
export async function copyShareUrl(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  }
}
