import katex from "katex";
import "katex/dist/katex.min.css";

type LatexCacheEntry = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
};

const latexCanvasCache = new Map<string, LatexCacheEntry>();

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
  container.style.lineHeight = "1.2";
  document.body.appendChild(container);

  try {
    const html = getKatexHtml(latex);
    container.innerHTML = html;

    const katexEl = container.querySelector(".katex");
    if (katexEl) {
      const rect = katexEl.getBoundingClientRect();
      return {
        width: Math.max(10, Math.ceil(rect.width) + 4),
        height: Math.max(fontSize, Math.ceil(rect.height) + 4),
      };
    }

    const rect = container.getBoundingClientRect();
    return {
      width: Math.max(10, Math.ceil(rect.width) + 4),
      height: Math.max(fontSize, Math.ceil(rect.height) + 4),
    };
  } catch {
    return { width: latex.length * fontSize * 0.6, height: fontSize * 1.5 };
  } finally {
    document.body.removeChild(container);
  }
};

export const ensureKatexCssLoaded = (): void => {
  // KaTeX CSS is imported at the top of this file
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
): { image: HTMLCanvasElement; width: number; height: number } | null => {
  if (!latex.trim()) {
    return null;
  }

  const key = getCacheKey(latex, fontSize, color);
  const cached = latexCanvasCache.get(key);

  if (cached) {
    return { image: cached.canvas, width: cached.width, height: cached.height };
  }

  renderLatexToCanvas(latex, fontSize, color);
  return null;
};

const renderLatexToCanvas = (
  latex: string,
  fontSize: number,
  color: string,
): void => {
  const key = getCacheKey(latex, fontSize, color);
  if (latexCanvasCache.has(key)) {
    return;
  }

  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.top = "-9999px";
  container.style.left = "-9999px";
  container.style.fontSize = `${fontSize}px`;
  container.style.color = color;
  container.style.lineHeight = "1.2";
  container.style.background = "transparent";
  document.body.appendChild(container);

  try {
    const html = getKatexHtml(latex);
    container.innerHTML = html;

    const katexEl = container.querySelector(".katex") as HTMLElement | null;
    const targetEl = katexEl || container;
    const rect = targetEl.getBoundingClientRect();

    const width = Math.max(10, Math.ceil(rect.width) + 4);
    const height = Math.max(fontSize, Math.ceil(rect.height) + 4);

    const dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement("canvas");
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    drawDomToCanvas(targetEl, ctx, rect.left, rect.top);

    const entry: LatexCacheEntry = { canvas, width, height };
    latexCanvasCache.set(key, entry);

    requestAnimationFrame(() => {
      notifyLatexRendered();
    });
  } catch {
    // Silent fail - fallback rendering will be used
  } finally {
    document.body.removeChild(container);
  }
};

const drawDomToCanvas = (
  element: Element,
  ctx: CanvasRenderingContext2D,
  offsetX: number,
  offsetY: number,
): void => {
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
  );

  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const text = node.textContent;
    if (!text || !text.trim()) {
      continue;
    }

    const parentEl = node.parentElement;
    if (!parentEl) {
      continue;
    }

    const style = window.getComputedStyle(parentEl);
    if (style.display === "none" || style.visibility === "hidden") {
      continue;
    }

    const ariaHidden = parentEl.closest("[aria-hidden='true']");
    const mathml = parentEl.closest("math");
    if (mathml && ariaHidden) {
      continue;
    }

    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = range.getClientRects();

    if (rects.length === 0) {
      continue;
    }

    const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    ctx.font = font;
    ctx.fillStyle = style.color;
    ctx.textBaseline = "top";

    for (const r of rects) {
      const x = r.left - offsetX;
      const y = r.top - offsetY;
      ctx.fillText(text, x, y);
    }
  }

  drawBordersAndLines(element, ctx, offsetX, offsetY);
};

const drawBordersAndLines = (
  element: Element,
  ctx: CanvasRenderingContext2D,
  offsetX: number,
  offsetY: number,
): void => {
  const allElements = element.querySelectorAll("*");
  for (const el of allElements) {
    const style = window.getComputedStyle(el);

    if (style.display === "none" || style.visibility === "hidden") {
      continue;
    }

    if (
      style.borderBottomWidth &&
      parseFloat(style.borderBottomWidth) > 0 &&
      style.borderBottomStyle !== "none"
    ) {
      const rect = el.getBoundingClientRect();
      const x = rect.left - offsetX;
      const y = rect.bottom - offsetY;
      const width = rect.width;
      const borderWidth = parseFloat(style.borderBottomWidth);

      ctx.strokeStyle = style.borderBottomColor || style.color;
      ctx.lineWidth = Math.max(borderWidth, 0.5);
      ctx.beginPath();
      ctx.moveTo(x, y - borderWidth / 2);
      ctx.lineTo(x + width, y - borderWidth / 2);
      ctx.stroke();
    }
  }
};

export const clearLatexCache = (): void => {
  latexCanvasCache.clear();
};
