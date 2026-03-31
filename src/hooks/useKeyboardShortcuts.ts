import { useEffect, useCallback, useState } from 'react';

export interface ShortcutDef {
  /** Display key combo, e.g. "Ctrl+Enter" */
  keys: string;
  /** macOS display key combo, e.g. "Cmd+Enter" */
  keysMac: string;
  /** i18n key for the description */
  descKey: string;
  /** Actual handler — set externally */
  handler: () => void;
}

export interface ShortcutRegistry {
  analyze: ShortcutDef;
  history: ShortcutDef;
  exportPNG: ShortcutDef;
  exportPDF: ShortcutDef;
  escape: ShortcutDef;
  focusInput: ShortcutDef;
  focusInputVim: ShortcutDef;
  helpModal: ShortcutDef;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

export function useKeyboardShortcuts(registry: ShortcutRegistry) {
  const [helpOpen, setHelpOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const mod = isMac ? e.metaKey : e.ctrlKey;
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    // ? — help modal (only when not typing in input)
    if (e.key === '?' && !isInput && !mod) {
      e.preventDefault();
      setHelpOpen(prev => !prev);
      return;
    }

    // Escape — always works
    if (e.key === 'Escape') {
      if (helpOpen) {
        setHelpOpen(false);
        return;
      }
      registry.escape.handler();
      return;
    }

    // Ctrl/Cmd+Enter — analyze
    if (e.key === 'Enter' && mod) {
      e.preventDefault();
      registry.analyze.handler();
      return;
    }

    // Ctrl/Cmd+H — history
    if (e.key === 'h' && mod) {
      e.preventDefault();
      registry.history.handler();
      return;
    }

    // Ctrl/Cmd+E — export PNG
    if (e.key === 'e' && mod) {
      e.preventDefault();
      registry.exportPNG.handler();
      return;
    }

    // Ctrl/Cmd+P — print/PDF
    if (e.key === 'p' && mod) {
      e.preventDefault();
      registry.exportPDF.handler();
      return;
    }

    // Ctrl/Cmd+K — focus input
    if (e.key === 'k' && mod) {
      e.preventDefault();
      registry.focusInput.handler();
      return;
    }

    // / — focus input (vim-style, only when not in input)
    if (e.key === '/' && !isInput && !mod) {
      e.preventDefault();
      registry.focusInputVim.handler();
      return;
    }
  }, [registry, helpOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { helpOpen, setHelpOpen };
}

/** Get the display key for the current platform */
export function getShortcutDisplay(def: ShortcutDef): string {
  return isMac ? def.keysMac : def.keys;
}

/** Build the default shortcut registry with noop handlers */
export function buildShortcutRegistry(): ShortcutRegistry {
  const noop = () => {};
  return {
    analyze: { keys: 'Ctrl+Enter', keysMac: '⌘+Enter', descKey: 'shortcut.analyze', handler: noop },
    history: { keys: 'Ctrl+H', keysMac: '⌘+H', descKey: 'shortcut.history', handler: noop },
    exportPNG: { keys: 'Ctrl+E', keysMac: '⌘+E', descKey: 'shortcut.exportPNG', handler: noop },
    exportPDF: { keys: 'Ctrl+P', keysMac: '⌘+P', descKey: 'shortcut.exportPDF', handler: noop },
    escape: { keys: 'Esc', keysMac: 'Esc', descKey: 'shortcut.escape', handler: noop },
    focusInput: { keys: 'Ctrl+K', keysMac: '⌘+K', descKey: 'shortcut.focusInput', handler: noop },
    focusInputVim: { keys: '/', keysMac: '/', descKey: 'shortcut.focusInputVim', handler: noop },
    helpModal: { keys: '?', keysMac: '?', descKey: 'shortcut.help', handler: noop },
  };
}
