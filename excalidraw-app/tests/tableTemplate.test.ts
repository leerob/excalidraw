import { createTableTemplateElements } from "../data/tableTemplate";

describe("table template", () => {
  it("creates a 4x5 table with header and row labels", () => {
    const elements = createTableTemplateElements();
    const rectangles = elements.filter(
      (element) => element.type === "rectangle",
    );
    const textLabels = elements
      .map((element) => (element.type === "text" ? element.text : null))
      .filter((text): text is string => !!text);

    expect(rectangles).toHaveLength(20);

    const headerCells = rectangles.filter((element) => element.y === 0);
    const bodyCells = rectangles.filter((element) => element.y !== 0);

    expect(headerCells).toHaveLength(4);
    expect(
      headerCells.every((element) => element.backgroundColor !== "transparent"),
    ).toBe(true);
    expect(
      bodyCells.every((element) => element.backgroundColor === "transparent"),
    ).toBe(true);
    expect(textLabels).toEqual(
      expect.arrayContaining([
        "Column 1",
        "Column 2",
        "Column 3",
        "Column 4",
        "Row 1",
        "Row 2",
        "Row 3",
        "Row 4",
      ]),
    );
  });
});
