import {
  setLatexImageProvider,
  setLatexMeasureProvider,
} from "@excalidraw/element";

import { getLatexImage, measureLatex, onLatexRendered } from "./latex";

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

  setLatexImageProvider((latex, fontSize, color) => {
    const result = getLatexImage(latex, fontSize, color);
    if (!result) {
      return null;
    }
    return {
      image: result.image,
      width: result.width,
      height: result.height,
    };
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
