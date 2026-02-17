import { randomId } from "@excalidraw/common";
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";

const TABLE_COLUMNS = ["Column 1", "Column 2", "Column 3", "Column 4"] as const;
const TABLE_ROWS = 5;
const CELL_WIDTH = 180;
const CELL_HEIGHT = 72;
const HEADER_BACKGROUND_COLOR = "#e9ecef";
const HEADER_TEXT_COLOR = "#495057";
const BODY_TEXT_COLOR = "#1f2937";

export const createTableTemplateElements = () => {
  const groupId = randomId();
  const elementsSkeleton: NonNullable<
    Parameters<typeof convertToExcalidrawElements>[0]
  > = [];

  for (let row = 0; row < TABLE_ROWS; row++) {
    for (let column = 0; column < TABLE_COLUMNS.length; column++) {
      const label =
        row === 0 ? TABLE_COLUMNS[column] : column === 0 ? `Row ${row}` : "";

      elementsSkeleton.push({
        type: "rectangle",
        x: column * CELL_WIDTH,
        y: row * CELL_HEIGHT,
        width: CELL_WIDTH,
        height: CELL_HEIGHT,
        groupIds: [groupId],
        roughness: 0,
        strokeWidth: 1,
        fillStyle: "solid",
        backgroundColor:
          row === 0 ? HEADER_BACKGROUND_COLOR : "transparent",
        label: label
          ? {
              text: label,
              fontSize: 20,
              strokeColor:
                row === 0 ? HEADER_TEXT_COLOR : BODY_TEXT_COLOR,
            }
          : undefined,
      });
    }
  }

  return convertToExcalidrawElements(elementsSkeleton, { regenerateIds: true });
};
