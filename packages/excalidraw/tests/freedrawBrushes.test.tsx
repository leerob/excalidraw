import React from "react";

import { pointFrom } from "@excalidraw/math";

import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { UI } from "./helpers/ui";
import { render } from "./test-utils";

describe("freedraw brushes", () => {
  beforeEach(async () => {
    await render(<Excalidraw />);
  });

  it("should apply selected brush type and size to newly drawn strokes", () => {
    UI.clickTool("freedraw");
    UI.clickOnTestId("strokeShape-marker");
    UI.clickOnTestId("strokeWidth-veryLarge");

    const freedraw = UI.createElement("freedraw", {
      points: [
        pointFrom(0, 0),
        pointFrom(40, 20),
        pointFrom(80, 10),
      ],
    });

    expect(freedraw.strokeShape).toBe("marker");
    expect(freedraw.strokeWidth).toBe(8);
  });

  it("should update brush type for selected freedraw element", () => {
    const freedraw = UI.createElement("freedraw", {
      points: [pointFrom(0, 0), pointFrom(20, 20), pointFrom(40, 0)],
    });

    expect(freedraw.strokeShape).toBe("round");
    API.setSelectedElements([freedraw.get()]);

    UI.clickOnTestId("strokeShape-sharp");

    expect(freedraw.strokeShape).toBe("sharp");
  });
});
