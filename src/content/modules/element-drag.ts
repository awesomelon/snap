import { getFeatureLayer, clearFeatureLayer, removeFeatureLayer } from '../overlay-host';

let active = false;

const IGNORE_TAGS = new Set([
  'HTML', 'BODY', 'HEAD', 'SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'BR',
]);

const DRAG_THRESHOLD_SQ = 9; // 3px squared

interface OriginalState {
  cssText: string;
  placeholder: HTMLDivElement;
}

interface PendingDrag {
  el: HTMLElement;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

interface ActiveDrag {
  el: HTMLElement;
  offsetX: number;
  offsetY: number;
}

const movedElements = new Map<HTMLElement, OriginalState>();
let pendingDrag: PendingDrag | null = null;
let activeDrag: ActiveDrag | null = null;
let hoveredEl: HTMLElement | null = null;

function shouldIgnore(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return true;
  if (IGNORE_TAGS.has(el.tagName)) return true;
  if (el.closest('x-ray-overlay')) return true;
  return false;
}

function renderHighlight(el: HTMLElement): void {
  const layer = getFeatureLayer('drag');
  layer.replaceChildren();
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return;

  const box = document.createElement('div');
  box.className = 'xray-drag-highlight';
  box.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;`;
  layer.appendChild(box);
}

function commitDrag(pending: PendingDrag, e: MouseEvent): void {
  const { el, offsetX, offsetY } = pending;
  const rect = el.getBoundingClientRect();
  const computed = getComputedStyle(el);

  if (!movedElements.has(el)) {
    const placeholder = document.createElement('div');
    placeholder.style.cssText =
      `width:${rect.width}px;height:${rect.height}px;` +
      `margin-top:${computed.marginTop};margin-right:${computed.marginRight};` +
      `margin-bottom:${computed.marginBottom};margin-left:${computed.marginLeft};` +
      `visibility:hidden;flex-shrink:${computed.flexShrink};flex-grow:${computed.flexGrow};`;
    el.parentNode?.insertBefore(placeholder, el);
    movedElements.set(el, { cssText: el.style.cssText, placeholder });
  }

  el.style.position = 'fixed';
  el.style.left = `${e.clientX - offsetX}px`;
  el.style.top = `${e.clientY - offsetY}px`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
  el.style.zIndex = '2147483646';
  el.style.margin = '0';
  el.style.boxSizing = 'border-box';

  activeDrag = { el, offsetX, offsetY };
  clearFeatureLayer('drag');
  document.body.style.cursor = 'grabbing';
  document.body.style.userSelect = 'none';
}

function resetAll(): void {
  for (const [el, state] of movedElements) {
    el.style.cssText = state.cssText;
    state.placeholder.remove();
  }
  movedElements.clear();
}

// --- Event handlers ---

function onMouseDown(e: MouseEvent): void {
  if (!active || activeDrag) return;
  const el = e.target as HTMLElement;
  if (shouldIgnore(el)) return;
  e.preventDefault();
  e.stopPropagation();

  const rect = el.getBoundingClientRect();
  pendingDrag = {
    el,
    startX: e.clientX,
    startY: e.clientY,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
  };
}

function onMouseMove(e: MouseEvent): void {
  if (!active) return;

  if (activeDrag) {
    activeDrag.el.style.left = `${e.clientX - activeDrag.offsetX}px`;
    activeDrag.el.style.top = `${e.clientY - activeDrag.offsetY}px`;
    return;
  }

  if (pendingDrag) {
    const dx = e.clientX - pendingDrag.startX;
    const dy = e.clientY - pendingDrag.startY;
    if (dx * dx + dy * dy > DRAG_THRESHOLD_SQ) {
      commitDrag(pendingDrag, e);
      pendingDrag = null;
    }
    return;
  }

  // Hover highlight
  const el = e.target as HTMLElement;
  if (shouldIgnore(el) || el === hoveredEl) return;
  hoveredEl = el;
  renderHighlight(el);
}

function onMouseUp(): void {
  if (activeDrag) {
    activeDrag = null;
    document.body.style.cursor = 'grab';
    document.body.style.userSelect = '';
    clearFeatureLayer('drag');
    hoveredEl = null;
  }
  pendingDrag = null;
}

function onClick(e: MouseEvent): void {
  if (!active) return;
  e.preventDefault();
  e.stopPropagation();
}

function onDragStart(e: DragEvent): void {
  if (!active) return;
  e.preventDefault();
}

function onKeyDown(e: KeyboardEvent): void {
  if (!active) return;
  if (e.key === 'Escape') {
    if (activeDrag) {
      const state = movedElements.get(activeDrag.el);
      if (state) {
        activeDrag.el.style.cssText = state.cssText;
        state.placeholder.remove();
        movedElements.delete(activeDrag.el);
      }
      activeDrag = null;
      pendingDrag = null;
      document.body.style.cursor = 'grab';
      document.body.style.userSelect = '';
    } else {
      pendingDrag = null;
      resetAll();
    }
  }
}

export function activateDrag(): void {
  active = true;
  document.addEventListener('mousedown', onMouseDown, true);
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('mouseup', onMouseUp, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('dragstart', onDragStart, true);
  document.addEventListener('keydown', onKeyDown, true);
  document.body.style.cursor = 'grab';
}

export function deactivateDrag(): void {
  active = false;
  activeDrag = null;
  pendingDrag = null;
  hoveredEl = null;
  document.removeEventListener('mousedown', onMouseDown, true);
  document.removeEventListener('mousemove', onMouseMove, true);
  document.removeEventListener('mouseup', onMouseUp, true);
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('dragstart', onDragStart, true);
  document.removeEventListener('keydown', onKeyDown, true);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  resetAll();
  removeFeatureLayer('drag');
}
