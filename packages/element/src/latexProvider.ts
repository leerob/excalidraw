type LatexImageResult = {
  image: CanvasImageSource;
  width: number;
  height: number;
} | null;

type LatexMeasureResult = {
  width: number;
  height: number;
};

type LatexImageProviderFn = (
  latex: string,
  fontSize: number,
  color: string,
) => LatexImageResult;

type LatexMeasureProviderFn = (
  latex: string,
  fontSize: number,
) => LatexMeasureResult;

let latexImageProvider: LatexImageProviderFn | null = null;
let latexMeasureProvider: LatexMeasureProviderFn | null = null;

export const setLatexImageProvider = (
  provider: LatexImageProviderFn,
): void => {
  latexImageProvider = provider;
};

export const setLatexMeasureProvider = (
  provider: LatexMeasureProviderFn,
): void => {
  latexMeasureProvider = provider;
};

export const getLatexImageFromProvider = (
  latex: string,
  fontSize: number,
  color: string,
): LatexImageResult => {
  if (!latexImageProvider) {
    return null;
  }
  return latexImageProvider(latex, fontSize, color);
};

export const measureLatexFromProvider = (
  latex: string,
  fontSize: number,
): LatexMeasureResult => {
  if (!latexMeasureProvider) {
    return { width: latex.length * fontSize * 0.6, height: fontSize * 1.5 };
  }
  return latexMeasureProvider(latex, fontSize);
};
