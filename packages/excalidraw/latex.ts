import katex from "katex";

type LatexCacheEntry = {
  image: HTMLImageElement;
  width: number;
  height: number;
  loaded: boolean;
};

const latexImageCache = new Map<string, LatexCacheEntry>();

let katexCssStripped: string | null = null;

const getKatexCssWithoutFonts = async (): Promise<string> => {
  if (katexCssStripped) {
    return katexCssStripped;
  }
  try {
    const cssModule = await import("katex/dist/katex.min.css?raw");
    katexCssStripped = cssModule.default.replace(
      /@font-face\s*\{[^}]*\}/g,
      "",
    );
  } catch {
    katexCssStripped = getMinimalKatexCss();
  }
  return katexCssStripped;
};

const getMinimalKatexCss = (): string => {
  return `
.katex{font:normal 1.21em KaTeX_Main,Times New Roman,serif;line-height:1.2;text-indent:0;text-rendering:auto}
.katex *{-ms-high-contrast-adjust:none!important;border-color:currentColor}
.katex .katex-html{display:inline-block}
.katex .base{position:relative;display:inline-block;white-space:nowrap;width:-webkit-min-content;width:-moz-min-content;width:min-content}
.katex .strut{display:inline-block}
.katex .textbf{font-weight:700}
.katex .textit{font-style:italic}
.katex .textrm{font-family:KaTeX_Main,Times New Roman,serif}
.katex .textsf{font-family:KaTeX_SansSerif,Arial,sans-serif}
.katex .texttt{font-family:KaTeX_Typewriter,Courier New,monospace}
.katex .mathnormal{font-family:KaTeX_Math,Times New Roman,serif;font-style:italic}
.katex .mathit{font-family:KaTeX_Main,Times New Roman,serif;font-style:italic}
.katex .mathrm{font-style:normal}
.katex .mathbf{font-family:KaTeX_Main,Times New Roman,serif;font-weight:700}
.katex .boldsymbol{font-family:KaTeX_Math,Times New Roman,serif;font-weight:700;font-style:italic}
.katex .amsrm{font-family:KaTeX_AMS,Times New Roman,serif}
.katex .mathbb{font-family:KaTeX_AMS,Times New Roman,serif}
.katex .mathcal{font-family:KaTeX_Caligraphic,cursive}
.katex .mathfrak{font-family:KaTeX_Fraktur,Old English Text MT,serif}
.katex .mathscr{font-family:KaTeX_Script,Segoe Script,cursive}
.katex .mathsf{font-family:KaTeX_SansSerif,Arial,sans-serif}
.katex .mathtt{font-family:KaTeX_Typewriter,Courier New,monospace}
.katex .mord+.mop{margin-left:.16667em}
.katex .mord+.mbin{margin-left:.22222em}
.katex .mord+.mrel{margin-left:.27778em}
.katex .mord+.minner{margin-left:.16667em}
.katex .mop+.mord{margin-left:.16667em}
.katex .mop+.mop{margin-left:.16667em}
.katex .mop+.mrel{margin-left:.27778em}
.katex .mop+.minner{margin-left:.16667em}
.katex .mbin+.mord{margin-left:.22222em}
.katex .mbin+.mop{margin-left:.22222em}
.katex .mbin+.mopen{margin-left:.22222em}
.katex .mbin+.minner{margin-left:.22222em}
.katex .mrel+.mord{margin-left:.27778em}
.katex .mrel+.mop{margin-left:.27778em}
.katex .mrel+.mopen{margin-left:.27778em}
.katex .mrel+.minner{margin-left:.27778em}
.katex .mclose+.mop{margin-left:.16667em}
.katex .mclose+.mbin{margin-left:.22222em}
.katex .mclose+.mrel{margin-left:.27778em}
.katex .mclose+.minner{margin-left:.16667em}
.katex .mpunct+.mord{margin-left:.16667em}
.katex .mpunct+.mop{margin-left:.16667em}
.katex .mpunct+.mrel{margin-left:.16667em}
.katex .mpunct+.mopen{margin-left:.16667em}
.katex .mpunct+.mpunct{margin-left:.16667em}
.katex .mpunct+.minner{margin-left:.16667em}
.katex .minner+.mord{margin-left:.16667em}
.katex .minner+.mop{margin-left:.16667em}
.katex .minner+.mbin{margin-left:.22222em}
.katex .minner+.mrel{margin-left:.27778em}
.katex .minner+.mopen{margin-left:.16667em}
.katex .minner+.mpunct{margin-left:.16667em}
.katex .minner+.minner{margin-left:.16667em}
.katex .mclose+.mclose{margin-left:0}
.katex .vlist-t{display:inline-table;table-layout:fixed;border-collapse:collapse}
.katex .vlist-r{display:table-row}
.katex .vlist{display:table-cell;vertical-align:bottom;position:relative}
.katex .vlist>span{display:block;height:0;position:relative}
.katex .vlist>span>span{display:inline-block}
.katex .vlist-s{display:table-cell;vertical-align:bottom;font-size:1px;width:2px;min-width:2px}
.katex .vlist-t2{margin-right:-2px}
.katex .msupsub{text-align:left}
.katex .mfrac>span>span{text-align:center}
.katex .mfrac .frac-line{display:inline-block;width:100%;border-bottom-style:solid}
.katex .mfrac .frac-line,.katex .overline .overline-line,.katex .underline .underline-line,.katex .hline,.katex .hdashline,.katex .rule{min-height:1px}
.katex .overline .overline-line,.katex .underline .underline-line{display:inline-block;width:100%;border-bottom-style:solid}
.katex .sqrt>.root{margin-left:.27777778em;margin-right:-.55555556em}
.katex .sizing,.katex .fontsize-ensurer{display:inline-block}
.katex .nulldelimiter{display:inline-block;width:.12em}
.katex .delimsizing.size1{font-family:KaTeX_Size1,Times New Roman,serif}
.katex .delimsizing.size2{font-family:KaTeX_Size2,Times New Roman,serif}
.katex .delimsizing.size3{font-family:KaTeX_Size3,Times New Roman,serif}
.katex .delimsizing.size4{font-family:KaTeX_Size4,Times New Roman,serif}
.katex .delimsizing.mult .delim-size1>span{font-family:KaTeX_Size1,Times New Roman,serif}
.katex .delimsizing.mult .delim-size4>span{font-family:KaTeX_Size4,Times New Roman,serif}
.katex .op-symbol{position:relative}
.katex .op-symbol.small-op{font-family:KaTeX_Size1,Times New Roman,serif}
.katex .op-symbol.large-op{font-family:KaTeX_Size2,Times New Roman,serif}
.katex .accent>.vlist-t{text-align:center}
.katex .resetsize.size1{font-size:.5em}
.katex .resetsize.size2{font-size:.6em}
.katex .resetsize.size3{font-size:.7em}
.katex .resetsize.size4{font-size:.8em}
.katex .resetsize.size5{font-size:.9em}
.katex .resetsize.size6{font-size:1em}
.katex .resetsize.size7{font-size:1.2em}
.katex .resetsize.size8{font-size:1.44em}
.katex .resetsize.size9{font-size:1.728em}
.katex .resetsize.size10{font-size:2.074em}
.katex .resetsize.size11{font-size:2.488em}
.katex .katex-html>.newline{display:block}
  `.trim();
};

const getCacheKey = (
  latex: string,
  fontSize: number,
  color: string,
): string => {
  return `${fontSize}::${color}::${latex}`;
};

const getKatexHtml = (latex: string): string => {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode: latex.includes("\\\\") || latex.includes("\\begin"),
      output: "htmlAndMathml",
    });
  } catch {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false,
      output: "htmlAndMathml",
    });
  }
};

export const measureLatex = (
  latex: string,
  fontSize: number,
): { width: number; height: number } => {
  if (!latex.trim()) {
    return { width: 10, height: fontSize * 1.2 };
  }

  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.visibility = "hidden";
  container.style.top = "-9999px";
  container.style.left = "-9999px";
  container.style.fontSize = `${fontSize}px`;
  document.body.appendChild(container);

  try {
    const html = getKatexHtml(latex);
    container.innerHTML = html;

    const rect = container.getBoundingClientRect();
    return {
      width: Math.max(10, Math.ceil(rect.width) + 8),
      height: Math.max(fontSize, Math.ceil(rect.height) + 4),
    };
  } catch {
    return { width: 10, height: fontSize * 1.2 };
  } finally {
    document.body.removeChild(container);
  }
};

let loadedKatexCssInPage = false;

export const ensureKatexCssLoaded = (): void => {
  if (loadedKatexCssInPage) {
    return;
  }
  loadedKatexCssInPage = true;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css";
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
};

const latexRenderCallbacks = new Set<() => void>();

export const onLatexRendered = (callback: () => void): (() => void) => {
  latexRenderCallbacks.add(callback);
  return () => latexRenderCallbacks.delete(callback);
};

const notifyLatexRendered = (): void => {
  latexRenderCallbacks.forEach((cb) => {
    try {
      cb();
    } catch {
      // ignore
    }
  });
};

export const getLatexImage = (
  latex: string,
  fontSize: number,
  color: string,
): LatexCacheEntry | null => {
  const key = getCacheKey(latex, fontSize, color);
  const cached = latexImageCache.get(key);

  if (cached) {
    return cached.loaded ? cached : null;
  }

  renderLatexToImage(latex, fontSize, color);
  return null;
};

const renderLatexToImage = async (
  latex: string,
  fontSize: number,
  color: string,
): Promise<void> => {
  const key = getCacheKey(latex, fontSize, color);
  if (latexImageCache.has(key)) {
    return;
  }

  const { width, height } = measureLatex(latex, fontSize);
  const html = getKatexHtml(latex);
  const css = await getKatexCssWithoutFonts();

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:${fontSize}px;color:${color};line-height:1.2;">
      <style>${css}</style>
      ${html}
    </div>
  </foreignObject>
</svg>`;

  const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  const entry: LatexCacheEntry = { image: img, width, height, loaded: false };
  latexImageCache.set(key, entry);

  img.onload = () => {
    entry.loaded = true;
    URL.revokeObjectURL(url);
    notifyLatexRendered();
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    latexImageCache.delete(key);
  };
  img.src = url;
};

export const clearLatexCache = (): void => {
  latexImageCache.clear();
};
