import katex from "katex";

let katexCssInline: string | null = null;

/**
 * Load and cache the KaTeX CSS (without @font-face rules) for embedding
 * in SVG foreignObject images. Font references are stripped because
 * they can't resolve inside SVG images loaded from blob URLs.
 * KaTeX falls back to Times New Roman / serif which is standard for math.
 */
const getKatexCss = (): string => {
  if (katexCssInline !== null) {
    return katexCssInline;
  }

  try {
    // Collect the KaTeX CSS from stylesheets loaded on the page.
    // The CSS is imported in the app entry (katex/dist/katex.min.css).
    const sheets = document.styleSheets;
    let css = "";
    for (let i = 0; i < sheets.length; i++) {
      try {
        const rules = sheets[i].cssRules;
        for (let j = 0; j < rules.length; j++) {
          const rule = rules[j];
          if (
            rule.cssText.includes(".katex") ||
            rule.cssText.includes("katex")
          ) {
            if (!rule.cssText.startsWith("@font-face")) {
              css += rule.cssText + "\n";
            }
          }
        }
      } catch {
        // CORS or security restriction on stylesheet, skip
      }
    }
    if (css.length > 0) {
      katexCssInline = css;
      return css;
    }
  } catch {
    // Fallback if stylesheets not accessible
  }

  // Minimal fallback CSS for KaTeX rendering
  katexCssInline = `
    .katex { font: normal 1.21em KaTeX_Main, "Times New Roman", serif; line-height: 1.2; text-indent: 0; text-rendering: auto; }
    .katex .base { display: inline-block; white-space: nowrap; width: min-content; position: relative; }
    .katex .strut { display: inline-block; }
    .katex .mfrac > span > span { text-align: center; }
    .katex .mfrac .frac-line { display: inline-block; width: 100%; border-bottom-style: solid; min-height: 1px; }
    .katex .vlist-t { display: inline-table; table-layout: fixed; border-collapse: collapse; }
    .katex .vlist-r { display: table-row; }
    .katex .vlist { display: table-cell; vertical-align: bottom; position: relative; }
    .katex .vlist > span { display: block; height: 0; position: relative; }
    .katex .vlist > span > span { display: inline-block; }
    .katex .vlist > span > .pstrut { overflow: hidden; width: 0; }
    .katex .vlist-t2 { margin-right: -2px; }
    .katex .vlist-s { display: table-cell; vertical-align: bottom; font-size: 1px; width: 2px; min-width: 2px; }
    .katex .msupsub { text-align: left; }
    .katex .mspace { display: inline-block; }
    .katex .katex-mathml { position: absolute; clip: rect(1px, 1px, 1px, 1px); padding: 0; border: 0; height: 1px; width: 1px; overflow: hidden; }
    .katex .sqrt > .root { margin-left: 0.2777777778em; margin-right: -0.5555555556em; }
    .katex .mathnormal { font-family: KaTeX_Math, "Times New Roman", serif; font-style: italic; }
    .katex .mathit { font-family: KaTeX_Main, "Times New Roman", serif; font-style: italic; }
    .katex svg { fill: currentColor; stroke: currentColor; fill-rule: nonzero; fill-opacity: 1; stroke-width: 1; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 4; stroke-dasharray: none; stroke-dashoffset: 0; stroke-opacity: 1; display: block; height: inherit; position: absolute; width: 100%; }
    .katex svg path { stroke: none; }
    .katex .stretchy { display: block; overflow: hidden; position: relative; width: 100%; }
    .katex .nulldelimiter { display: inline-block; width: 0.12em; }
    .katex .op-symbol.small-op { font-family: KaTeX_Size1; }
    .katex .op-symbol.large-op { font-family: KaTeX_Size2; }
    .katex .rule { display: inline-block; border: 0 solid; position: relative; }
    .katex .overline .overline-line, .katex .underline .underline-line { display: inline-block; width: 100%; border-bottom-style: solid; min-height: 1px; }
    .katex-display { display: block; margin: 1em 0; text-align: center; }
    .katex-display > .katex { display: block; text-align: center; white-space: nowrap; }
    .katex-display > .katex > .katex-html { display: block; position: relative; }
  `;
  return katexCssInline;
};

const latexImageCache = new Map<
  string,
  { image: HTMLImageElement; width: number; height: number }
>();

const getCacheKey = (
  latex: string,
  fontSize: number,
  color: string,
): string => {
  return `${latex}::${fontSize}::${color}`;
};

/**
 * Check if a text element should be rendered as LaTeX.
 */
export const isLatexText = (
  element: { customData?: Record<string, any> } | null | undefined,
): boolean => {
  return element?.customData?.isLatex === true;
};

/**
 * Measure the dimensions of rendered LaTeX by rendering to a hidden DOM node.
 */
export const measureLatex = (
  latex: string,
  fontSize: number,
): { width: number; height: number } => {
  if (typeof document === "undefined") {
    return { width: 100, height: fontSize * 1.5 };
  }

  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.visibility = "hidden";
  container.style.fontSize = `${fontSize}px`;
  container.style.lineHeight = "1.2";
  container.style.display = "inline-block";
  container.style.whiteSpace = "nowrap";
  container.style.pointerEvents = "none";
  document.body.appendChild(container);

  try {
    katex.render(latex, container, {
      throwOnError: false,
      displayMode: true,
      output: "html",
      trust: true,
    });

    const rect = container.getBoundingClientRect();
    const width = Math.ceil(rect.width) + 8;
    const height = Math.ceil(rect.height) + 8;
    return { width: Math.max(width, 24), height: Math.max(height, 20) };
  } catch {
    return { width: 100, height: Math.ceil(fontSize * 1.5) };
  } finally {
    document.body.removeChild(container);
  }
};

/**
 * Build an SVG string containing a foreignObject with KaTeX-rendered HTML
 * and inline CSS. This SVG can be loaded as an image for canvas rendering.
 */
const buildLatexSvg = (
  latex: string,
  fontSize: number,
  color: string,
  width: number,
  height: number,
): string => {
  let htmlContent: string;
  try {
    htmlContent = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: true,
      output: "html",
      trust: true,
    });
  } catch {
    htmlContent = `<span style="color:red;">LaTeX Error</span>`;
  }

  const css = getKatexCss();

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml"
         style="font-size:${fontSize}px;color:${color};line-height:1.2;display:flex;align-items:center;justify-content:center;width:${width}px;height:${height}px;overflow:hidden;">
      <style>${css}</style>
      ${htmlContent}
    </div>
  </foreignObject>
</svg>`;
};

/**
 * Get a cached rendered Image for a LaTeX expression.
 * Returns the cached image immediately if available.
 * Otherwise starts loading and calls onLoad when ready.
 */
export const getOrLoadLatexImage = (
  latex: string,
  fontSize: number,
  color: string,
  onLoad?: () => void,
): { image: HTMLImageElement; width: number; height: number } | null => {
  const cacheKey = getCacheKey(latex, fontSize, color);
  const cached = latexImageCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const { width, height } = measureLatex(latex, fontSize);
  const svgString = buildLatexSvg(latex, fontSize, color, width, height);

  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    latexImageCache.set(cacheKey, { image: img, width, height });
    URL.revokeObjectURL(url);
    onLoad?.();
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
  };
  img.src = url;

  return null;
};

/**
 * Build an SVG foreignObject node for embedding in SVG export.
 */
export const createLatexSvgExportNode = (
  doc: Document,
  latex: string,
  fontSize: number,
  color: string,
  width: number,
  height: number,
): SVGForeignObjectElement => {
  const fo = doc.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
  fo.setAttribute("width", `${width}`);
  fo.setAttribute("height", `${height}`);

  let htmlContent: string;
  try {
    htmlContent = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: true,
      output: "html",
      trust: true,
    });
  } catch {
    htmlContent = `<span style="color:red;">LaTeX Error</span>`;
  }

  const div = doc.createElementNS("http://www.w3.org/1999/xhtml", "div");
  div.setAttribute(
    "style",
    `font-size:${fontSize}px;color:${color};line-height:1.2;display:flex;align-items:center;justify-content:center;width:${width}px;height:${height}px;overflow:hidden;`,
  );

  const style = doc.createElementNS("http://www.w3.org/1999/xhtml", "style");
  style.textContent = getKatexCss();
  div.appendChild(style);

  const contentWrapper = doc.createElementNS(
    "http://www.w3.org/1999/xhtml",
    "span",
  );
  contentWrapper.innerHTML = htmlContent;
  div.appendChild(contentWrapper);

  fo.appendChild(div);
  return fo;
};

/**
 * Clear all LaTeX caches (useful when theme changes, etc.).
 */
export const clearLatexCache = () => {
  latexImageCache.clear();
  katexCssInline = null;
};
