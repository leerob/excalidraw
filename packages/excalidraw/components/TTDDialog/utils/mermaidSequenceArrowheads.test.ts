import type { Arrowhead } from "@excalidraw/element/types";
import type { MermaidToExcalidrawResult } from "@excalidraw/mermaid-to-excalidraw/dist/interfaces";

import { normalizeSequenceArrowheads } from "./mermaidSequenceArrowheads";

const createArrowElement = (endArrowhead: Arrowhead | null = "arrow") => {
  return {
    type: "arrow",
    startArrowhead: null,
    endArrowhead,
  } as unknown as MermaidToExcalidrawResult["elements"][number];
};

describe("normalizeSequenceArrowheads", () => {
  it("maps `->>` and `-->>` sequence arrows to `triangle`", () => {
    const elements = [
      createArrowElement("arrow"),
      createArrowElement("arrow"),
      createArrowElement("arrow"),
      createArrowElement("arrow"),
    ] as MermaidToExcalidrawResult["elements"];

    const normalizedElements = normalizeSequenceArrowheads({
      mermaidDefinition: `sequenceDiagram
    A ->> B: Wrong Arrow Head
    A -) B: Correct Arrow Head
    A -->> B: Wrong Arrow Head
    A --) B: Correct Arrow Head`,
      elements,
    });

    expect(
      normalizedElements
        .filter((element) => element.type === "arrow")
        .map((element) => element.endArrowhead),
    ).toEqual(["triangle", "arrow", "triangle", "arrow"]);

    expect(elements.map((element) => element.endArrowhead)).toEqual([
      "arrow",
      "arrow",
      "arrow",
      "arrow",
    ]);
  });

  it("returns original elements when arrow count and syntax count mismatch", () => {
    const elements = [
      createArrowElement("arrow"),
      createArrowElement("arrow"),
    ] as MermaidToExcalidrawResult["elements"];

    const normalizedElements = normalizeSequenceArrowheads({
      mermaidDefinition: `sequenceDiagram
    A ->> B: only one arrow`,
      elements,
    });

    expect(normalizedElements).toBe(elements);
  });

  it("returns original elements for non-sequence diagrams", () => {
    const elements = [
      createArrowElement("arrow"),
    ] as MermaidToExcalidrawResult["elements"];

    const normalizedElements = normalizeSequenceArrowheads({
      mermaidDefinition: `flowchart LR
    A --> B`,
      elements,
    });

    expect(normalizedElements).toBe(elements);
  });
});
