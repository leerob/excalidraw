import {
  getFontFamilyString,
  getFontString,
  getVerticalOffset,
  isRTL,
  isTestEnv,
} from "@excalidraw/common";

import { mathjax } from "mathjax-full/js/mathjax";
import { TeX } from "mathjax-full/js/input/tex";
import { MathML } from "mathjax-full/js/input/mathml";
import { SVG } from "mathjax-full/js/output/svg";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html";
import { SerializedMmlVisitor } from "mathjax-full/js/core/MmlTree/SerializedMmlVisitor";

import "mathjax-full/js/input/tex/ams/AmsConfiguration";
import "mathjax-full/js/input/tex/boldsymbol/BoldsymbolConfiguration";

import type { ExcalidrawTextElement, FontString } from "./types";

export const LATEX_IMAGE_LOADED_EVENT = "excalidraw:latex-image-loaded";

type MathDelimiter = "$" | "$$" | "\\(";

type ParsedTextRun =
  | {
      kind: "text";
      text: string;
    }
  | {
      kind: "math";
      expression: string;
      source: string;
    };

type TextRunLayout =
  | {
      kind: "text";
      text: string;
      width: number;
      height: number;
    }
  | {
      kind: "math";
      source: string;
      width: number;
      height: number;
      svgMarkup: string | null;
    };

type LineLayout = {
  runs: TextRunLayout[];
  width: number;
  height: number;
  rtl: boolean;
};

type TextLayout = {
  lines: LineLayout[];
  width: number;
  height: number;
  lineHeightPx: number;
};

type MathMetrics = {
  width: number;
  height: number;
  svgMarkup: string | null;
};

type MathJaxContext = {
  adaptor: ReturnType<typeof liteAdaptor>;
  texHtml: ReturnType<typeof mathjax.document>;
  mmlSvg: ReturnType<typeof mathjax.document>;
  visitor: SerializedMmlVisitor;
};

let mathJaxContext: MathJaxContext | null = null;
let measurementCanvas: HTMLCanvasElement | null = null;
let measurementHost: HTMLDivElement | null = null;
let shouldDispatchMathImageLoaded = false;

const latexMarkupCache = new Map<string, string>();
const mathMetricsCache = new Map<string, MathMetrics>();
const textLayoutCache = new Map<string, TextLayout>();

const latexImageCache = new Map<string, HTMLImageElement>();
const latexImageLoadPromises = new Map<string, Promise<HTMLImageElement>>();
const failedLatexImageKeys = new Set<string>();

const getMathJaxContext = () => {
  if (mathJaxContext) {
    return mathJaxContext;
  }

  const adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);

  const tex = new TeX({
    packages: ["base", "ams", "boldsymbol"],
  });
  const mml = new MathML();
  const svg = new SVG({
    // Avoid global IDs in nested SVG fragments.
    fontCache: "none",
  });
  const texHtml = mathjax.document("", { InputJax: tex });
  const mmlSvg = mathjax.document("", { InputJax: mml, OutputJax: svg });
  const visitor = new SerializedMmlVisitor();

  mathJaxContext = {
    adaptor,
    texHtml,
    mmlSvg,
    visitor,
  };

  return mathJaxContext;
};

const getMeasurementContext = () => {
  if (typeof document === "undefined") {
    return null;
  }
  if (!measurementCanvas) {
    measurementCanvas = document.createElement("canvas");
  }
  return measurementCanvas.getContext("2d");
};

const getMeasurementHost = () => {
  if (typeof document === "undefined") {
    return null;
  }
  if (!measurementHost || !measurementHost.isConnected) {
    measurementHost = document.createElement("div");
    Object.assign(measurementHost.style, {
      position: "fixed",
      left: "-100000px",
      top: "-100000px",
      visibility: "hidden",
      pointerEvents: "none",
      whiteSpace: "pre",
      lineHeight: "1",
    });
    document.body.appendChild(measurementHost);
  }
  return measurementHost;
};

const isEscaped = (text: string, index: number) => {
  let backslashes = 0;
  let cursor = index - 1;
  while (cursor >= 0 && text[cursor] === "\\") {
    backslashes++;
    cursor--;
  }
  return backslashes % 2 === 1;
};

const getDelimiterLength = (delimiter: MathDelimiter) =>
  delimiter === "\\(" ? 2 : delimiter.length;

const getCloser = (delimiter: MathDelimiter) =>
  delimiter === "\\(" ? "\\)" : delimiter;

const getOpenerAt = (
  line: string,
  index: number,
): { delimiter: MathDelimiter; token: string } | null => {
  if (line.startsWith("\\(", index) && !isEscaped(line, index)) {
    return { delimiter: "\\(", token: "\\(" };
  }
  if (line.startsWith("$$", index) && !isEscaped(line, index)) {
    return { delimiter: "$$", token: "$$" };
  }
  if (line[index] === "$" && !isEscaped(line, index)) {
    return { delimiter: "$", token: "$" };
  }
  return null;
};

const isCloserAt = (line: string, index: number, delimiter: MathDelimiter) => {
  const closer = getCloser(delimiter);
  return line.startsWith(closer, index) && !isEscaped(line, index);
};

const unescapePlainText = (value: string) => {
  return value
    .replace(/\\\$/g, "$")
    .replace(/\\\\\(/g, "\\(")
    .replace(/\\\\\)/g, "\\)");
};

const parseLatexLine = (line: string): ParsedTextRun[] => {
  const runs: ParsedTextRun[] = [];
  let textBuffer = "";
  let expressionBuffer = "";
  let sourceBuffer = "";
  let activeDelimiter: MathDelimiter | null = null;
  let openerToken = "";
  let cursor = 0;

  const flushText = () => {
    if (textBuffer) {
      runs.push({ kind: "text", text: textBuffer });
      textBuffer = "";
    }
  };

  while (cursor < line.length) {
    if (activeDelimiter === null) {
      const opener = getOpenerAt(line, cursor);
      if (opener) {
        flushText();
        activeDelimiter = opener.delimiter;
        openerToken = opener.token;
        expressionBuffer = "";
        sourceBuffer = openerToken;
        cursor += getDelimiterLength(activeDelimiter);
        continue;
      }
      textBuffer += line[cursor];
      cursor++;
      continue;
    }

    if (isCloserAt(line, cursor, activeDelimiter)) {
      const closer = getCloser(activeDelimiter);
      const closerLength = getDelimiterLength(activeDelimiter);
      sourceBuffer += closer;

      if (expressionBuffer.trim().length) {
        runs.push({
          kind: "math",
          expression: expressionBuffer,
          source: sourceBuffer,
        });
      } else {
        textBuffer += sourceBuffer;
      }

      activeDelimiter = null;
      openerToken = "";
      expressionBuffer = "";
      sourceBuffer = "";
      cursor += closerLength;
      continue;
    }

    expressionBuffer += line[cursor];
    sourceBuffer += line[cursor];
    cursor++;
  }

  if (activeDelimiter !== null) {
    textBuffer += `${openerToken}${expressionBuffer}`;
  }

  flushText();
  return runs;
};

const normalizeLineBreaks = (text: string) => text.replace(/\r\n?/g, "\n");

const getLineHeightInPx = (
  fontSize: ExcalidrawTextElement["fontSize"],
  lineHeight: ExcalidrawTextElement["lineHeight"],
) => fontSize * lineHeight;

const measurePlainTextWidth = (text: string, font: FontString) => {
  const context = getMeasurementContext();
  if (!context) {
    return text.length;
  }
  context.font = font;
  const width = context.measureText(text).width;
  if (isTestEnv()) {
    return width * 10;
  }
  return width;
};

const parseMathMarkup = (markup: string) => {
  if (typeof DOMParser === "undefined") {
    return null;
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(markup, "text/html");
  const container = doc.body.firstElementChild;
  if (!container) {
    return null;
  }
  return container;
};

const getLatexMarkup = (expression: string) => {
  const cached = latexMarkupCache.get(expression);
  if (cached) {
    return cached;
  }

  try {
    const { adaptor, texHtml, mmlSvg, visitor } = getMathJaxContext();
    const mml = visitor.visitTree(texHtml.convert(expression, { display: false }));
    const markup = adaptor.outerHTML(mmlSvg.convert(mml));
    latexMarkupCache.set(expression, markup);
    return markup;
  } catch {
    return null;
  }
};

const getMathMetrics = (expression: string, fontSize: number): MathMetrics => {
  const key = `${fontSize}:${expression}`;
  const cached = mathMetricsCache.get(key);
  if (cached) {
    return cached;
  }

  const fallback: MathMetrics = {
    width: Math.max(1, expression.length * (isTestEnv() ? 10 : fontSize * 0.6)),
    height: Math.max(1, fontSize),
    svgMarkup: null,
  };

  const markup = getLatexMarkup(expression);
  if (!markup) {
    mathMetricsCache.set(key, fallback);
    return fallback;
  }

  const host = getMeasurementHost();
  const parsedContainer = parseMathMarkup(markup);
  if (!host || !parsedContainer) {
    const noDomMetrics = { ...fallback, svgMarkup: null };
    mathMetricsCache.set(key, noDomMetrics);
    return noDomMetrics;
  }

  host.style.fontSize = `${fontSize}px`;
  host.replaceChildren(parsedContainer as Node);
  const svg = parsedContainer.querySelector("svg");
  const target = svg || parsedContainer;
  const rect = target.getBoundingClientRect();
  host.replaceChildren();

  const metrics: MathMetrics = {
    width: rect.width || fallback.width,
    height: rect.height || fallback.height,
    svgMarkup: svg?.outerHTML || null,
  };

  mathMetricsCache.set(key, metrics);
  return metrics;
};

const createLayoutCacheKey = (
  text: string,
  font: FontString,
  lineHeight: ExcalidrawTextElement["lineHeight"],
) => `${font}::${lineHeight}::${text}`;

const getHorizontalOffset = (
  textAlign: ExcalidrawTextElement["textAlign"],
  elementWidth: number,
  lineWidth: number,
) => {
  if (textAlign === "center") {
    return (elementWidth - lineWidth) / 2;
  }
  if (textAlign === "right") {
    return elementWidth - lineWidth;
  }
  return 0;
};

const getLatexAwareLayout = ({
  text,
  font,
  fontSize,
  lineHeight,
}: {
  text: string;
  font: FontString;
  fontSize: number;
  lineHeight: ExcalidrawTextElement["lineHeight"];
}): TextLayout => {
  const key = createLayoutCacheKey(text, font, lineHeight);
  const cached = textLayoutCache.get(key);
  if (cached) {
    return cached;
  }

  const normalized = normalizeLineBreaks(text);
  const rawLines = normalized.split("\n");
  const lineHeightPx = getLineHeightInPx(fontSize, lineHeight);

  const lines = rawLines.map((line): LineLayout => {
    const parsedRuns = parseLatexLine(line);
    const runs: TextRunLayout[] = [];
    let width = 0;
    let maxHeight = lineHeightPx;

    if (!parsedRuns.length) {
      return {
        runs: [
          {
            kind: "text",
            text: "",
            width: 0,
            height: lineHeightPx,
          },
        ],
        width: 0,
        height: lineHeightPx,
        rtl: isRTL(line),
      };
    }

    for (const run of parsedRuns) {
      if (run.kind === "text") {
        const value = unescapePlainText(run.text);
        const runWidth = measurePlainTextWidth(value, font);
        runs.push({
          kind: "text",
          text: value,
          width: runWidth,
          height: lineHeightPx,
        });
        width += runWidth;
        continue;
      }

      const metrics = getMathMetrics(run.expression, fontSize);
      runs.push({
        kind: "math",
        source: run.source,
        width: metrics.width,
        height: metrics.height,
        svgMarkup: metrics.svgMarkup,
      });
      width += metrics.width;
      maxHeight = Math.max(maxHeight, metrics.height);
    }

    return {
      runs,
      width,
      height: maxHeight,
      rtl: isRTL(line),
    };
  });

  const width = lines.reduce((max, line) => Math.max(max, line.width), 0);
  const height = lines.reduce((sum, line) => sum + line.height, 0);
  const layout = {
    lines,
    width,
    height,
    lineHeightPx,
  };
  textLayoutCache.set(key, layout);
  return layout;
};

const toMathImageKey = ({
  svgMarkup,
  color,
  width,
  height,
}: {
  svgMarkup: string;
  color: string;
  width: number;
  height: number;
}) => {
  const normalizedWidth = Math.round(width * 1000) / 1000;
  const normalizedHeight = Math.round(height * 1000) / 1000;
  return `${color}|${normalizedWidth}|${normalizedHeight}|${svgMarkup}`;
};

const scheduleMathImageLoadedEvent = () => {
  if (typeof window === "undefined" || shouldDispatchMathImageLoaded) {
    return;
  }
  shouldDispatchMathImageLoaded = true;
  window.requestAnimationFrame(() => {
    shouldDispatchMathImageLoaded = false;
    window.dispatchEvent(new CustomEvent(LATEX_IMAGE_LOADED_EVENT));
  });
};

const serializeSvgForImage = ({
  svgMarkup,
  color,
  width,
  height,
}: {
  svgMarkup: string;
  color: string;
  width: number;
  height: number;
}) => {
  if (typeof DOMParser === "undefined" || typeof XMLSerializer === "undefined") {
    return null;
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
  const svg = doc.documentElement;
  if (svg.nodeName !== "svg") {
    return null;
  }
  if (!svg.getAttribute("xmlns")) {
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  svg.setAttribute("width", `${width}`);
  svg.setAttribute("height", `${height}`);
  svg.setAttribute("color", color);
  const style = svg.getAttribute("style");
  svg.setAttribute("style", `${style ? `${style};` : ""}color:${color};`);
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svg);
};

const loadLatexImage = async ({
  svgMarkup,
  color,
  width,
  height,
}: {
  svgMarkup: string;
  color: string;
  width: number;
  height: number;
}) => {
  const key = toMathImageKey({ svgMarkup, color, width, height });
  const cached = latexImageCache.get(key);
  if (cached) {
    return cached;
  }
  if (failedLatexImageKeys.has(key)) {
    throw new Error("latex image load failed");
  }
  const inFlight = latexImageLoadPromises.get(key);
  if (inFlight) {
    return inFlight;
  }

  const serializedSvg = serializeSvgForImage({ svgMarkup, color, width, height });
  if (!serializedSvg) {
    failedLatexImageKeys.add(key);
    throw new Error("failed to serialize latex svg");
  }

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      latexImageCache.set(key, image);
      latexImageLoadPromises.delete(key);
      scheduleMathImageLoadedEvent();
      resolve(image);
    };
    image.onerror = () => {
      latexImageLoadPromises.delete(key);
      failedLatexImageKeys.add(key);
      reject(new Error("failed to decode latex image"));
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      serializedSvg,
    )}`;
  });

  latexImageLoadPromises.set(key, promise);
  return promise;
};

export const containsLatexMath = (text: string) => {
  if (!text.includes("$") && !text.includes("\\(")) {
    return false;
  }
  const normalized = normalizeLineBreaks(text);
  const lines = normalized.split("\n");
  return lines.some((line) =>
    parseLatexLine(line).some((run) => run.kind === "math"),
  );
};

export const measureLatexText = (
  text: string,
  font: FontString,
  lineHeight: ExcalidrawTextElement["lineHeight"],
): { width: number; height: number } | null => {
  if (!containsLatexMath(text)) {
    return null;
  }
  const fontSize = parseFloat(font);
  if (!Number.isFinite(fontSize) || fontSize <= 0) {
    return null;
  }
  const layout = getLatexAwareLayout({
    text,
    font,
    fontSize,
    lineHeight,
  });
  return {
    width: layout.width,
    height: layout.height,
  };
};

export const drawLatexTextOnCanvas = ({
  element,
  context,
  color,
}: {
  element: ExcalidrawTextElement;
  context: CanvasRenderingContext2D;
  color: string;
}) => {
  if (!containsLatexMath(element.text)) {
    return true;
  }

  const font = getFontString(element);
  const layout = getLatexAwareLayout({
    text: element.text,
    font,
    fontSize: element.fontSize,
    lineHeight: element.lineHeight,
  });
  const baseLineHeight = layout.lineHeightPx;
  const verticalOffset = getVerticalOffset(
    element.fontFamily,
    element.fontSize,
    baseLineHeight,
  );

  const rtl = isRTL(element.text);
  const shouldTemporarilyAttach = rtl && !context.canvas.isConnected;
  if (shouldTemporarilyAttach) {
    document.body.appendChild(context.canvas);
  }
  context.canvas.setAttribute("dir", rtl ? "rtl" : "ltr");

  context.save();
  context.font = font;
  context.fillStyle = color;
  context.textAlign = "left";

  let cursorY = 0;
  let isReady = true;

  for (const line of layout.lines) {
    let cursorX = getHorizontalOffset(element.textAlign, element.width, line.width);
    const baselineY =
      cursorY + (line.height - baseLineHeight) / 2 + verticalOffset;

    for (const run of line.runs) {
      if (run.kind === "text") {
        if (run.text) {
          context.fillText(run.text, cursorX, baselineY);
        }
        cursorX += run.width;
        continue;
      }

      if (!run.svgMarkup) {
        context.fillText(run.source, cursorX, baselineY);
        cursorX += run.width;
        continue;
      }

      const key = toMathImageKey({
        svgMarkup: run.svgMarkup,
        color,
        width: run.width,
        height: run.height,
      });
      const image = latexImageCache.get(key);
      const runY = cursorY + (line.height - run.height) / 2;

      if (image) {
        context.drawImage(image, cursorX, runY, run.width, run.height);
      } else {
        isReady = false;
        void loadLatexImage({
          svgMarkup: run.svgMarkup,
          color,
          width: run.width,
          height: run.height,
        }).catch(() => undefined);
        context.fillText(run.source, cursorX, baselineY);
      }

      cursorX += run.width;
    }

    cursorY += line.height;
  }

  context.restore();
  if (shouldTemporarilyAttach) {
    context.canvas.remove();
  }

  return isReady;
};

export const renderLatexTextToSvg = ({
  svgRoot,
  parentNode,
  element,
  color,
}: {
  svgRoot: SVGElement;
  parentNode: SVGElement;
  element: ExcalidrawTextElement;
  color: string;
}) => {
  if (!containsLatexMath(element.text)) {
    return false;
  }

  const font = getFontString(element);
  const layout = getLatexAwareLayout({
    text: element.text,
    font,
    fontSize: element.fontSize,
    lineHeight: element.lineHeight,
  });
  const baseLineHeight = layout.lineHeightPx;
  const verticalOffset = getVerticalOffset(
    element.fontFamily,
    element.fontSize,
    baseLineHeight,
  );

  let cursorY = 0;

  for (const line of layout.lines) {
    let cursorX = getHorizontalOffset(element.textAlign, element.width, line.width);
    const baselineY =
      cursorY + (line.height - baseLineHeight) / 2 + verticalOffset;

    for (const run of line.runs) {
      if (run.kind === "text") {
        const textNode = svgRoot.ownerDocument.createElementNS(
          "http://www.w3.org/2000/svg",
          "text",
        );
        textNode.textContent = run.text;
        textNode.setAttribute("x", `${cursorX}`);
        textNode.setAttribute("y", `${baselineY}`);
        textNode.setAttribute("font-family", getFontFamilyString(element));
        textNode.setAttribute("font-size", `${element.fontSize}px`);
        textNode.setAttribute("fill", color);
        textNode.setAttribute("direction", line.rtl ? "rtl" : "ltr");
        textNode.setAttribute("text-anchor", line.rtl ? "end" : "start");
        textNode.setAttribute("style", "white-space: pre;");
        textNode.setAttribute("dominant-baseline", "alphabetic");
        parentNode.appendChild(textNode);
        cursorX += run.width;
        continue;
      }

      if (!run.svgMarkup) {
        const fallbackNode = svgRoot.ownerDocument.createElementNS(
          "http://www.w3.org/2000/svg",
          "text",
        );
        fallbackNode.textContent = run.source;
        fallbackNode.setAttribute("x", `${cursorX}`);
        fallbackNode.setAttribute("y", `${baselineY}`);
        fallbackNode.setAttribute("font-family", getFontFamilyString(element));
        fallbackNode.setAttribute("font-size", `${element.fontSize}px`);
        fallbackNode.setAttribute("fill", color);
        fallbackNode.setAttribute("style", "white-space: pre;");
        fallbackNode.setAttribute("dominant-baseline", "alphabetic");
        parentNode.appendChild(fallbackNode);
        cursorX += run.width;
        continue;
      }

      if (typeof DOMParser === "undefined") {
        cursorX += run.width;
        continue;
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(run.svgMarkup, "image/svg+xml");
      const parsedSvg = doc.documentElement;
      if (parsedSvg.nodeName !== "svg") {
        cursorX += run.width;
        continue;
      }

      parsedSvg.setAttribute("x", `${cursorX}`);
      parsedSvg.setAttribute("y", `${cursorY + (line.height - run.height) / 2}`);
      parsedSvg.setAttribute("width", `${run.width}`);
      parsedSvg.setAttribute("height", `${run.height}`);
      parsedSvg.setAttribute("color", color);
      const style = parsedSvg.getAttribute("style");
      parsedSvg.setAttribute("style", `${style ? `${style};` : ""}color:${color};`);

      const imported = svgRoot.ownerDocument.importNode(parsedSvg, true);
      if (!(imported instanceof Element)) {
        cursorX += run.width;
        continue;
      }
      if (!imported.getAttribute("xmlns")) {
        imported.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      }
      parentNode.appendChild(imported);
      cursorX += run.width;
    }

    cursorY += line.height;
  }

  return true;
};

export const preloadLatexImagesForTextElements = async ({
  elements,
  getColor,
}: {
  elements: readonly ExcalidrawTextElement[];
  getColor: (element: ExcalidrawTextElement) => string;
}) => {
  const preloadTasks: Promise<unknown>[] = [];

  for (const element of elements) {
    if (!containsLatexMath(element.text)) {
      continue;
    }
    const color = getColor(element);
    const font = getFontString(element);
    const layout = getLatexAwareLayout({
      text: element.text,
      font,
      fontSize: element.fontSize,
      lineHeight: element.lineHeight,
    });

    for (const line of layout.lines) {
      for (const run of line.runs) {
        if (run.kind !== "math" || !run.svgMarkup) {
          continue;
        }
        preloadTasks.push(
          loadLatexImage({
            svgMarkup: run.svgMarkup,
            color,
            width: run.width,
            height: run.height,
          }).catch(() => undefined),
        );
      }
    }
  }

  await Promise.all(preloadTasks);
};
