import { mountKeyboardHandler, unmountKeyboardHandler, replaceSelection } from './drag/selection-state';
import { initDragCore, teardownDragCore, nudgeElement } from './drag/drag-core';
import { removeFeatureLayer } from '../overlay-host';

export function activateDrag(): void {
  mountKeyboardHandler(nudgeElement);
  initDragCore();
}

export function deactivateDrag(): void {
  teardownDragCore();
  unmountKeyboardHandler();
  replaceSelection(null);
  removeFeatureLayer('drag');
}
