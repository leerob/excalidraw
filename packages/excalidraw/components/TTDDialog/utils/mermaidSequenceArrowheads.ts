import type { Arrowhead } from "@excalidraw/element/types";

import type { MermaidToExcalidrawResult } from "@excalidraw/mermaid-to-excalidraw/dist/interfaces";

const SEQUENCE_ARROW_TOKEN_TO_END_ARROWHEAD = [
  ["-->>", "triangle"],
  ["->>", "triangle"],
  ["--)", "arrow"],
  ["-)", "arrow"],
  ["--x", "arrow"],
  ["-x", "arrow"],
  ["-->", null],
  ["->", null],
] as const satisfies readonly (readonly [string, Arrowhead | null])[];

const isSequenceDiagramDefinition = (mermaidDefinition: string) => {
  const lines = mermaidDefinition.split(/\r?\n/);
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("%%")) {
      continue;
    }
    return trimmedLine.startsWith("sequenceDiagram");
  }
  return false;
};

const getArrowheadOverridesFromSequenceDefinition = (
  mermaidDefinition: string,
) => {
  const overrides: (Arrowhead | null)[] = [];
  const lines = mermaidDefinition.split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("%%")) {
      continue;
    }

    const lineBeforeLabel = trimmedLine.split(":")[0];
    const mapping = SEQUENCE_ARROW_TOKEN_TO_END_ARROWHEAD.find(([token]) =>
      lineBeforeLabel.includes(token),
    );

    if (mapping) {
      overrides.push(mapping[1]);
    }
  }

  return overrides;
};

export const normalizeSequenceArrowheads = ({
  mermaidDefinition,
  elements,
}: {
  mermaidDefinition: string;
  elements: MermaidToExcalidrawResult["elements"];
}): MermaidToExcalidrawResult["elements"] => {
  if (!isSequenceDiagramDefinition(mermaidDefinition)) {
    return elements;
  }

  const arrowElements = elements.filter((element) => element.type === "arrow");
  if (!arrowElements.length) {
    return elements;
  }

  const arrowheadOverrides =
    getArrowheadOverridesFromSequenceDefinition(mermaidDefinition);
  if (arrowheadOverrides.length !== arrowElements.length) {
    return elements;
  }

  let arrowIndex = 0;
  return elements.map((element) => {
    if (element.type !== "arrow") {
      return element;
    }

    const override = arrowheadOverrides[arrowIndex++];
    if (override === undefined || element.endArrowhead === override) {
      return element;
    }

    return {
      ...element,
      endArrowhead: override,
    };
  });
};
