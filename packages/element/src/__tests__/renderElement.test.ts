import { describe, expect, it } from "vitest";

import { shouldDisableImageSmoothingForElement } from "../renderElement";

describe("shouldDisableImageSmoothingForElement", () => {
  const appState = { shouldCacheIgnoreZoom: false } as any;

  it("keeps smoothing enabled for zero-angle arrows with start circle_outline", () => {
    const element = {
      type: "arrow",
      angle: 0,
      startArrowhead: "circle_outline",
      endArrowhead: "arrow",
    } as any;

    expect(shouldDisableImageSmoothingForElement(element, appState)).toBe(
      false,
    );
  });

  it("keeps smoothing enabled for zero-angle arrows with end circle_outline", () => {
    const element = {
      type: "arrow",
      angle: 0,
      startArrowhead: null,
      endArrowhead: "circle_outline",
    } as any;

    expect(shouldDisableImageSmoothingForElement(element, appState)).toBe(
      false,
    );
  });

  it("disables smoothing for zero-angle arrows without circle_outline heads", () => {
    const element = {
      type: "arrow",
      angle: 0,
      startArrowhead: null,
      endArrowhead: "arrow",
    } as any;

    expect(shouldDisableImageSmoothingForElement(element, appState)).toBe(true);
  });

  it("keeps smoothing enabled when cache ignores zoom", () => {
    const element = {
      type: "arrow",
      angle: 0,
      startArrowhead: null,
      endArrowhead: "arrow",
    } as any;

    expect(
      shouldDisableImageSmoothingForElement(element, {
        shouldCacheIgnoreZoom: true,
      } as any),
    ).toBe(false);
  });
});
