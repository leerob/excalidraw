import {
  setLatexImageProvider,
  setLatexMeasureProvider,
} from "@excalidraw/element";

import {
  getLatexImage,
  measureLatex,
  ensureKatexCssLoaded,
  onLatexRendered,
} from "./latex";

let initialized = false;
let refreshCallback: (() => void) | null = null;

export const initLatexProvider = (onRefresh?: () => void): void => {
  if (onRefresh) {
    refreshCallback = onRefresh;
  }

  if (initialized) {
    return;
  }
  initialized = true;

  ensureKatexCssLoaded();

  setLatexImageProvider((latex, fontSize, color) => {
    const result = getLatexImage(latex, fontSize, color);
    return result;
  });

  setLatexMeasureProvider((latex, fontSize) => {
    return measureLatex(latex, fontSize);
  });

  onLatexRendered(() => {
    if (refreshCallback) {
      refreshCallback();
    }
  });
};
