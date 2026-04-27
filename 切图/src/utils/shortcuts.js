export function registerShortcuts(handlers) {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

    if (e.ctrlKey && e.key === 'v') {
      e.preventDefault();
      handlers.onPaste?.();
      return;
    }

    if (e.key === 'Escape') {
      handlers.onEscape?.();
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      handlers.onDelete?.();
      return;
    }

    if (handlers.onArrowKeys && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      handlers.onArrowKeys(e.key, step);
      return;
    }

    if (e.key === '1' && !e.ctrlKey && !e.altKey) handlers.onSwitchMode?.('single');
    if (e.key === '2' && !e.ctrlKey && !e.altKey) handlers.onSwitchMode?.('batch');
    if (e.key === '3' && !e.ctrlKey && !e.altKey) handlers.onSwitchMode?.('split');
    if (e.key === '4' && !e.ctrlKey && !e.altKey) handlers.onSwitchMode?.('merge');
  });

  document.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handlers.onPasteImage?.(file);
        break;
      }
    }
  });
}
