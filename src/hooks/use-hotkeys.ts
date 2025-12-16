
"use client";

import { useEffect, useCallback } from 'react';

type HotkeyMap = Map<string, (event: KeyboardEvent) => void>;

export function useHotkeys(hotkeys: HotkeyMap) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!event.key) {
      return;
    }
    const key = event.key.toLowerCase();
    
    // Ignore standalone modifier keys or if an input is focused
    if (["control", "alt", "shift", "meta"].includes(key) || (event.target as HTMLElement).closest('input, textarea, select')) {
      return;
    }

    const ctrl = event.ctrlKey || event.metaKey; // For Mac's Cmd key
    const alt = event.altKey;
    const shift = event.shiftKey;

    let hotkeyString = "";

    if (ctrl) hotkeyString += "ctrl+";
    if (alt) hotkeyString += "alt+";
    if (shift) hotkeyString += "shift+";
    
    hotkeyString += key;
    
    const callback = hotkeys.get(hotkeyString);

    if (callback) {
      event.preventDefault();
      event.stopPropagation();
      callback(event);
    }
  }, [hotkeys]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
