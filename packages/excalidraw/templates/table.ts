import { randomId, COLOR_PALETTE } from "@excalidraw/common";

import { newElement, newLinearElement } from "@excalidraw/element";

import { pointFrom } from "@excalidraw/math";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

const DEFAULT_CELL_WIDTH = 120;
const DEFAULT_CELL_HEIGHT = 40;
const DEFAULT_ROWS = 4;
const DEFAULT_COLS = 4;

export const generateTable = ({
  rows = DEFAULT_ROWS,
  cols = DEFAULT_COLS,
  cellWidth = DEFAULT_CELL_WIDTH,
  cellHeight = DEFAULT_CELL_HEIGHT,
  x = 0,
  y = 0,
}: {
  rows?: number;
  cols?: number;
  cellWidth?: number;
  cellHeight?: number;
  x?: number;
  y?: number;
} = {}): readonly NonDeletedExcalidrawElement[] => {
  const groupId = randomId();
  const totalWidth = cols * cellWidth;
  const totalHeight = rows * cellHeight;

  const commonProps = {
    fillStyle: "solid" as const,
    opacity: 100,
    roughness: 0,
    strokeColor: COLOR_PALETTE.black,
    strokeStyle: "solid" as const,
    strokeWidth: 1,
    locked: false,
    roundness: null,
  };

  const elements: NonDeletedExcalidrawElement[] = [];

  const headerRow = newElement({
    type: "rectangle",
    x,
    y,
    width: totalWidth,
    height: cellHeight,
    backgroundColor: COLOR_PALETTE.blue[0],
    groupIds: [groupId],
    ...commonProps,
  });
  elements.push(headerRow);

  const outerRect = newElement({
    type: "rectangle",
    x,
    y,
    width: totalWidth,
    height: totalHeight,
    backgroundColor: "transparent",
    groupIds: [groupId],
    ...commonProps,
  });
  elements.push(outerRect);

  for (let row = 1; row < rows; row++) {
    const line = newLinearElement({
      type: "line",
      x,
      y: y + row * cellHeight,
      width: totalWidth,
      height: 0,
      points: [pointFrom(0, 0), pointFrom(totalWidth, 0)],
      groupIds: [groupId],
      ...commonProps,
      backgroundColor: "transparent",
    });
    elements.push(line);
  }

  for (let col = 1; col < cols; col++) {
    const line = newLinearElement({
      type: "line",
      x: x + col * cellWidth,
      y,
      width: 0,
      height: totalHeight,
      points: [pointFrom(0, 0), pointFrom(0, totalHeight)],
      groupIds: [groupId],
      ...commonProps,
      backgroundColor: "transparent",
    });
    elements.push(line);
  }

  return elements;
};
