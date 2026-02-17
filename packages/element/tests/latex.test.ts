import { getFontString } from "@excalidraw/common";

import { containsLatexMath } from "../src/latex";
import { measureText } from "../src/textMeasurements";
import { wrapText } from "../src/textWrapping";

import type { ExcalidrawTextElement } from "../src/types";

describe("latex support", () => {
  const font = getFontString({
    fontFamily: 1,
    fontSize: 20,
  });
  const lineHeight = 1.25 as ExcalidrawTextElement["lineHeight"];

  it("detects paired dollar delimiters", () => {
    expect(containsLatexMath("$x^2 + y^2$")).toBe(true);
    expect(containsLatexMath("area = $\\pi r^2$")).toBe(true);
  });

  it("detects desktop delimiters", () => {
    expect(containsLatexMath("\\(x^2 + y^2\\)")).toBe(true);
  });

  it("ignores unmatched delimiters", () => {
    expect(containsLatexMath("$x^2 + y^2")).toBe(false);
    expect(containsLatexMath("price is $5")).toBe(false);
  });

  it("does not wrap latex-delimited text", () => {
    const latexText = "sum is $\\sum_{i=1}^{n} i$ and grows";
    expect(wrapText(latexText, font, 40)).toBe(latexText);
  });

  it("measures latex text without crashing", () => {
    const metrics = measureText("energy: $E = mc^2$", font, lineHeight);
    expect(metrics.width).toBeGreaterThan(0);
    expect(metrics.height).toBeGreaterThan(0);
  });
});
