import { randomId } from "@excalidraw/common";
import { convertToExcalidrawElements } from "@excalidraw/element";

import type { ExcalidrawElementSkeleton } from "@excalidraw/element";
import type { ExcalidrawElement } from "@excalidraw/element/types";

const CSV_DELIMITER = ",";

const MIN_TABLE_ROWS = 2;
const MIN_TABLE_COLUMNS = 2;

const CELL_HEIGHT = 64;
const MIN_CELL_WIDTH = 120;
const MAX_CELL_WIDTH = 320;
const CELL_HORIZONTAL_PADDING = 40;
const AVERAGE_CHAR_WIDTH = 9;

const HEADER_BACKGROUND_COLOR = "#e9ecef";
const HEADER_TEXT_COLOR = "#495057";
const BODY_TEXT_COLOR = "#1f2937";

const parseCSVRows = (text: string): string[][] | null => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];

    if (char === '"') {
      if (inQuotes && text[index + 1] === '"') {
        currentCell += '"';
        index++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === CSV_DELIMITER) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      currentRow.push(currentCell.trim());
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";

      if (char === "\r" && text[index + 1] === "\n") {
        index++;
      }
      continue;
    }

    currentCell += char;
  }

  if (inQuotes) {
    return null;
  }

  currentRow.push(currentCell.trim());
  rows.push(currentRow);

  while (rows.length > 0 && rows[rows.length - 1].every((cell) => !cell)) {
    rows.pop();
  }

  return rows;
};

export const parseCSVTable = (text: string): string[][] | null => {
  const normalizedText = text.trim();

  if (
    !normalizedText ||
    !normalizedText.includes(CSV_DELIMITER) ||
    !/[\r\n]/.test(normalizedText)
  ) {
    return null;
  }

  const rows = parseCSVRows(normalizedText);

  if (!rows || rows.length < MIN_TABLE_ROWS) {
    return null;
  }

  const columnCount = rows[0]?.length || 0;

  if (
    columnCount < MIN_TABLE_COLUMNS ||
    !rows.every((row) => row.length === columnCount)
  ) {
    return null;
  }

  if (!rows.some((row) => row.some((cell) => cell.length > 0))) {
    return null;
  }

  return rows;
};

const calculateColumnWidths = (rows: string[][]) => {
  const columnCount = rows[0].length;
  const widths = Array.from({ length: columnCount }, () => MIN_CELL_WIDTH);

  for (let column = 0; column < columnCount; column++) {
    const longestCell = rows.reduce((maxLength, row) => {
      return Math.max(maxLength, row[column]?.length || 0);
    }, 0);

    widths[column] = Math.min(
      MAX_CELL_WIDTH,
      Math.max(
        MIN_CELL_WIDTH,
        longestCell * AVERAGE_CHAR_WIDTH + CELL_HORIZONTAL_PADDING,
      ),
    );
  }

  return widths;
};

export const createTableElementsFromCSV = (
  text: string,
): readonly ExcalidrawElement[] | null => {
  const rows = parseCSVTable(text);

  if (!rows) {
    return null;
  }

  const groupId = randomId();
  const columnWidths = calculateColumnWidths(rows);
  const elements: ExcalidrawElementSkeleton[] = [];

  let rowY = 0;
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    let columnX = 0;
    for (
      let columnIndex = 0;
      columnIndex < rows[rowIndex].length;
      columnIndex++
    ) {
      const cellText = rows[rowIndex][columnIndex];
      const isHeaderRow = rowIndex === 0;

      elements.push({
        type: "rectangle",
        x: columnX,
        y: rowY,
        width: columnWidths[columnIndex],
        height: CELL_HEIGHT,
        groupIds: [groupId],
        roughness: 0,
        strokeWidth: 1,
        fillStyle: "solid",
        backgroundColor: isHeaderRow ? HEADER_BACKGROUND_COLOR : "transparent",
        label: cellText
          ? {
              text: cellText,
              fontSize: 20,
              strokeColor: isHeaderRow ? HEADER_TEXT_COLOR : BODY_TEXT_COLOR,
            }
          : undefined,
      });

      columnX += columnWidths[columnIndex];
    }
    rowY += CELL_HEIGHT;
  }

  return convertToExcalidrawElements(elements, { regenerateIds: true });
};
