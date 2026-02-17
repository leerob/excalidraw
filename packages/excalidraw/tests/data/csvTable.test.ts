import { createTableElementsFromCSV, parseCSVTable } from "../../data/csvTable";

describe("csv table helpers", () => {
  describe("parseCSVTable", () => {
    it("parses a valid csv grid", () => {
      expect(parseCSVTable("Name,Role\nAlice,Engineer\nBob,Designer")).toEqual([
        ["Name", "Role"],
        ["Alice", "Engineer"],
        ["Bob", "Designer"],
      ]);
    });

    it("supports quoted values containing commas", () => {
      expect(parseCSVTable('Name,Notes\nAlice,"loves, commas"')).toEqual([
        ["Name", "Notes"],
        ["Alice", "loves, commas"],
      ]);
    });

    it("returns null for malformed csv", () => {
      expect(parseCSVTable('"Name","Role\nAlice,Engineer')).toBe(null);
    });

    it("returns null for non-table text", () => {
      expect(parseCSVTable("this, is not")).toBe(null);
    });
  });

  describe("createTableElementsFromCSV", () => {
    it("creates rectangle cells with bound text labels", () => {
      const elements = createTableElementsFromCSV("A,B\n1,2");

      expect(elements).not.toBe(null);
      expect(
        elements?.filter((element) => element.type === "rectangle"),
      ).toHaveLength(4);
      expect(
        elements?.filter((element) => element.type === "text"),
      ).toHaveLength(4);
    });
  });
});
