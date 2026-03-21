import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock overlay-host — return a fresh in-DOM layer every call
vi.mock('../../src/content/overlay-host', () => {
  let layerEl: HTMLDivElement | null = null;
  return {
    getFeatureLayer: () => {
      if (!layerEl || !layerEl.isConnected) {
        layerEl = document.createElement('div');
        layerEl.id = 'mock-layer';
        document.body.appendChild(layerEl);
      }
      return layerEl;
    },
  };
});

const {
  replaceSelection,
  toggleSelected,
  getSelected,
  clearSelectionHighlight,
  refreshSelectionHighlight,
  mountKeyboardHandler,
  unmountKeyboardHandler,
  setSelected,
} = await import('../../src/content/modules/drag/selection-state');

function mockEl(left = 10, top = 20, width = 100, height = 50): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  el.getBoundingClientRect = () => ({
    left, top, width, height,
    right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}),
  });
  return el;
}

describe('selection-state', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    unmountKeyboardHandler();
  });

  afterEach(() => {
    unmountKeyboardHandler();
  });

  // --- getSelected returns Set ---

  describe('getSelected', () => {
    it('returns empty Set initially', () => {
      const sel = getSelected();
      expect(sel).toBeInstanceOf(Set);
      expect(sel.size).toBe(0);
    });
  });

  // --- replaceSelection ---

  describe('replaceSelection', () => {
    it('selects a single element', () => {
      const el = mockEl();
      replaceSelection(el);
      expect(getSelected().has(el)).toBe(true);
      expect(getSelected().size).toBe(1);
    });

    it('clears previous selection and selects new', () => {
      const el1 = mockEl(10, 10);
      const el2 = mockEl(50, 50);
      replaceSelection(el1);
      replaceSelection(el2);
      expect(getSelected().has(el1)).toBe(false);
      expect(getSelected().has(el2)).toBe(true);
      expect(getSelected().size).toBe(1);
    });

    it('clears all selection when set to null', () => {
      const el = mockEl();
      replaceSelection(el);
      replaceSelection(null);
      expect(getSelected().size).toBe(0);
    });
  });

  // --- setSelected (backward-compat alias) ---

  describe('setSelected', () => {
    it('works as replaceSelection alias', () => {
      const el = mockEl();
      setSelected(el);
      expect(getSelected().has(el)).toBe(true);
      setSelected(null);
      expect(getSelected().size).toBe(0);
    });
  });

  // --- toggleSelected ---

  describe('toggleSelected', () => {
    it('adds element to selection', () => {
      const el = mockEl();
      toggleSelected(el);
      expect(getSelected().has(el)).toBe(true);
    });

    it('removes element from selection if already selected', () => {
      const el = mockEl();
      toggleSelected(el);
      toggleSelected(el);
      expect(getSelected().has(el)).toBe(false);
    });

    it('supports multiple elements', () => {
      const el1 = mockEl(10, 10);
      const el2 = mockEl(50, 50);
      const el3 = mockEl(100, 100);
      toggleSelected(el1);
      toggleSelected(el2);
      toggleSelected(el3);
      expect(getSelected().size).toBe(3);
      toggleSelected(el2);
      expect(getSelected().size).toBe(2);
      expect(getSelected().has(el2)).toBe(false);
    });
  });

  // --- Multiple highlight rendering ---

  describe('highlight rendering', () => {
    it('creates highlight box for each selected element', () => {
      const el1 = mockEl(10, 10);
      const el2 = mockEl(50, 50);
      toggleSelected(el1);
      toggleSelected(el2);
      const layer = document.getElementById('mock-layer');
      const boxes = layer?.querySelectorAll('.xray-drag-selected') ?? [];
      expect(boxes.length).toBe(2);
    });

    it('removes highlight box when element is deselected', () => {
      const el1 = mockEl(10, 10);
      const el2 = mockEl(50, 50);
      toggleSelected(el1);
      toggleSelected(el2);
      toggleSelected(el1); // deselect el1
      const layer = document.getElementById('mock-layer');
      const boxes = layer?.querySelectorAll('.xray-drag-selected') ?? [];
      expect(boxes.length).toBe(1);
    });
  });

  // --- clearSelectionHighlight ---

  describe('clearSelectionHighlight', () => {
    it('does not throw when no selection exists', () => {
      expect(() => clearSelectionHighlight()).not.toThrow();
    });

    it('removes all highlight boxes', () => {
      const el1 = mockEl(10, 10);
      const el2 = mockEl(50, 50);
      toggleSelected(el1);
      toggleSelected(el2);
      clearSelectionHighlight();
      const layer = document.getElementById('mock-layer');
      const boxes = layer?.querySelectorAll('.xray-drag-selected') ?? [];
      expect(boxes.length).toBe(0);
    });
  });

  // --- refreshSelectionHighlight ---

  describe('refreshSelectionHighlight', () => {
    it('does not throw when no selection exists', () => {
      expect(() => refreshSelectionHighlight()).not.toThrow();
    });

    it('updates highlight positions for all selected elements', () => {
      const el = mockEl(10, 20, 100, 50);
      replaceSelection(el);
      // Simulate position change
      el.getBoundingClientRect = () => ({
        left: 30, top: 40, width: 100, height: 50,
        right: 130, bottom: 90, x: 30, y: 40, toJSON: () => ({}),
      });
      refreshSelectionHighlight();
      const layer = document.getElementById('mock-layer');
      const box = layer?.querySelector('.xray-drag-selected') as HTMLElement;
      expect(box?.style.left).toBe('30px');
      expect(box?.style.top).toBe('40px');
    });
  });

  // --- Keyboard handler ---

  describe('mountKeyboardHandler', () => {
    it('calls move callback for each selected element on arrow key', () => {
      const el1 = mockEl(10, 10);
      const el2 = mockEl(50, 50);
      const moveCb = vi.fn();
      mountKeyboardHandler(moveCb);
      toggleSelected(el1);
      toggleSelected(el2);

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
      document.dispatchEvent(event);
      expect(moveCb).toHaveBeenCalledTimes(2);
      expect(moveCb).toHaveBeenCalledWith(el1, 1, 0);
      expect(moveCb).toHaveBeenCalledWith(el2, 1, 0);
    });

    it('uses step=10 with shift key for all selected', () => {
      const el = mockEl();
      const moveCb = vi.fn();
      mountKeyboardHandler(moveCb);
      replaceSelection(el);

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true });
      document.dispatchEvent(event);
      expect(moveCb).toHaveBeenCalledWith(el, 0, 10);
    });

    it('ignores non-arrow keys', () => {
      const el = mockEl();
      const moveCb = vi.fn();
      mountKeyboardHandler(moveCb);
      replaceSelection(el);

      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      document.dispatchEvent(event);
      expect(moveCb).not.toHaveBeenCalled();
    });

    it('does nothing when no element selected', () => {
      const moveCb = vi.fn();
      mountKeyboardHandler(moveCb);
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
      document.dispatchEvent(event);
      expect(moveCb).not.toHaveBeenCalled();
    });
  });

  // --- unmountKeyboardHandler ---

  describe('unmountKeyboardHandler', () => {
    it('clears selection and stops listening', () => {
      const el = mockEl();
      const moveCb = vi.fn();
      mountKeyboardHandler(moveCb);
      replaceSelection(el);
      unmountKeyboardHandler();

      expect(getSelected().size).toBe(0);

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
      document.dispatchEvent(event);
      expect(moveCb).not.toHaveBeenCalled();
    });
  });
});
