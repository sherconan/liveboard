import html2canvas from 'html2canvas';

/**
 * Export a DOM element as a PNG image download.
 * Targets the graph + summary area by element ID.
 */
export async function exportToPNG(elementId: string, filename?: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`[exportService] Element #${elementId} not found`);
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-page').trim() || '#f3f5f9',
      scale: 2, // retina quality
      useCORS: true,
      logging: false,
      // Ignore certain elements that don't render well
      ignoreElements: (el) => {
        return el.classList?.contains('no-export') || false;
      },
    });

    const link = document.createElement('a');
    const ts = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
    link.download = filename || `liveboard-${ts}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error('[exportService] PNG export failed:', err);
    throw err;
  }
}

/**
 * Trigger the browser's print dialog with clean print styles.
 * The print CSS in index.css handles hiding nav, expanding graph, etc.
 */
export function exportToPDF(): void {
  window.print();
}
