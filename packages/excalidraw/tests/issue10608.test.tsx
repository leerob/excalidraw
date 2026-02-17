import { pointFrom } from "@excalidraw/math";

import { Excalidraw } from "../index";
import { API } from "./helpers/api";
import {
  act,
  GlobalTestState,
  render,
  unmountComponent,
  waitFor,
} from "./test-utils";

import type { LocalPoint } from "@excalidraw/math";
import type { NormalizedZoomValue } from "../types";

describe("Issue #10608 - circle outline arrow seam", () => {
  beforeEach(async () => {
    unmountComponent();
    localStorage.clear();
    sessionStorage.clear();
    Object.assign(document, {
      elementFromPoint: () => GlobalTestState.canvas,
    });
    await render(<Excalidraw />);
    API.setAppState({
      zoom: {
        value: 1 as NormalizedZoomValue,
      },
      scrollX: -1300,
      scrollY: -150,
    });
  });

  it("renders the reported payload through the static-scene canvas path", async () => {
    const arrow = API.createElement({
      id: "y6OsduWfxPy2khIdz9CdY",
      type: "arrow",
      x: 1423.6515171252845,
      y: 181.95762131415097,
      width: 243.4327401362434,
      height: 235.28813015919079,
      angle: 0,
      strokeColor: "#1e1e1e",
      backgroundColor: "#ffc9c9",
      fillStyle: "solid",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 0,
      opacity: 60,
      roundness: null,
      points: [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(95.92514311418427, -66.96657036739754),
        pointFrom<LocalPoint>(243.4327401362434, -235.28813015919079),
      ],
      startArrowhead: "circle_outline",
      endArrowhead: "arrow",
      elbowed: false,
    });

    API.setElements([arrow]);
    act(() => {
      window.h.app.refresh();
    });

    await waitFor(() => {
      expect(window.h.elements).toHaveLength(1);
      expect(window.h.elements[0].id).toBe("y6OsduWfxPy2khIdz9CdY");
    });
  });
});
