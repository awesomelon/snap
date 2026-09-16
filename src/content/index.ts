import { isMessage, swallowDisconnect } from '../shared/messages';
import type { FeatureId } from '../shared/types';
import { activateDrag, deactivateDrag } from './modules/element-drag';
import { activateCssEditor, deactivateCssEditor } from './modules/element-css-editor';
import { activateOverlay, deactivateOverlay } from './modules/design-overlay';

const activeFeatures = new Set<FeatureId>();

const featureMap: Record<FeatureId, { activate: () => void; deactivate: () => void }> = {
  drag: { activate: activateDrag, deactivate: deactivateDrag },
  'css-editor': { activate: activateCssEditor, deactivate: deactivateCssEditor },
  overlay: { activate: () => { activateOverlay(); }, deactivate: deactivateOverlay },
};

chrome.runtime.sendMessage({ type: 'CONTENT_READY' }).catch(swallowDisconnect);

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (!isMessage(message)) return;

  switch (message.type) {
    case 'TOGGLE_FEATURE': {
      const { feature, enabled } = message;
      const mod = featureMap[feature];
      if (enabled) {
        mod.activate();
        activeFeatures.add(feature);
      } else {
        mod.deactivate();
        activeFeatures.delete(feature);
      }
      chrome.runtime.sendMessage({
        type: 'FEATURE_STATE_CHANGED',
        feature,
        enabled,
      }).catch(swallowDisconnect);
      break;
    }
  }
});
