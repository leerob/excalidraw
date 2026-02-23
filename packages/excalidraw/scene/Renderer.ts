import { getElementBounds } from "@excalidraw/element";

import {
  memoize,
  toBrandedType,
  viewportCoordsToSceneCoords,
} from "@excalidraw/common";

import type {
  ExcalidrawElement,
  NonDeletedElementsMap,
  NonDeletedExcalidrawElement,
} from "@excalidraw/element/types";

import type { Scene } from "@excalidraw/element";

import { renderStaticSceneThrottled } from "../renderer/staticScene";

import type { RenderableElementsMap } from "./types";

import type { AppState } from "../types";

export class Renderer {
  private scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  public getRenderableElements = (() => {
    const getVisibleCanvasElements = ({
      elementsMap,
      zoom,
      offsetLeft,
      offsetTop,
      scrollX,
      scrollY,
      height,
      width,
    }: {
      elementsMap: NonDeletedElementsMap;
      zoom: AppState["zoom"];
      offsetLeft: AppState["offsetLeft"];
      offsetTop: AppState["offsetTop"];
      scrollX: AppState["scrollX"];
      scrollY: AppState["scrollY"];
      height: AppState["height"];
      width: AppState["width"];
    }): readonly NonDeletedExcalidrawElement[] => {
      const viewTransformations = {
        zoom,
        offsetLeft,
        offsetTop,
        scrollX,
        scrollY,
      };
      const topLeftSceneCoords = viewportCoordsToSceneCoords(
        {
          clientX: offsetLeft,
          clientY: offsetTop,
        },
        viewTransformations,
      );
      const bottomRightSceneCoords = viewportCoordsToSceneCoords(
        {
          clientX: offsetLeft + width,
          clientY: offsetTop + height,
        },
        viewTransformations,
      );
      const visibleElements: NonDeletedExcalidrawElement[] = [];
      for (const element of elementsMap.values()) {
        const [x1, y1, x2, y2] = getElementBounds(element, elementsMap);
        if (
          topLeftSceneCoords.x <= x2 &&
          topLeftSceneCoords.y <= y2 &&
          bottomRightSceneCoords.x >= x1 &&
          bottomRightSceneCoords.y >= y1
        ) {
          visibleElements.push(element);
        }
      }
      return visibleElements;
    };

    const getFilteredRenderableElements = ({
      elements,
      hiddenTextElementId,
      newElementId,
    }: {
      elements: readonly NonDeletedExcalidrawElement[];
      hiddenTextElementId: ExcalidrawElement["id"] | null;
      newElementId: ExcalidrawElement["id"] | undefined;
    }) => {
      const elementsMap = toBrandedType<RenderableElementsMap>(new Map());

      for (const element of elements) {
        if (newElementId === element.id || hiddenTextElementId === element.id) {
          continue;
        }

        elementsMap.set(element.id, element);
      }
      return elementsMap;
    };

    return memoize(
      ({
        zoom,
        offsetLeft,
        offsetTop,
        scrollX,
        scrollY,
        height,
        width,
        editingTextElement,
        newElementId,
        // cache-invalidation nonce
        sceneNonce: _sceneNonce,
      }: {
        zoom: AppState["zoom"];
        offsetLeft: AppState["offsetLeft"];
        offsetTop: AppState["offsetTop"];
        scrollX: AppState["scrollX"];
        scrollY: AppState["scrollY"];
        height: AppState["height"];
        width: AppState["width"];
        editingTextElement: AppState["editingTextElement"];
        /** note: first render of newElement will always bust the cache
         * (we'd have to prefilter elements outside of this function) */
        newElementId: ExcalidrawElement["id"] | undefined;
        sceneNonce: ReturnType<InstanceType<typeof Scene>["getSceneNonce"]>;
      }) => {
        const elements = this.scene.getNonDeletedElements();
        const sceneElementsMap = this.scene.getNonDeletedElementsMap();
        const hiddenTextElementId =
          editingTextElement?.type === "text" ? editingTextElement.id : null;

        const shouldFilterRenderableElements =
          (newElementId != null && sceneElementsMap.has(newElementId)) ||
          (hiddenTextElementId != null &&
            sceneElementsMap.has(hiddenTextElementId));

        const elementsMap = shouldFilterRenderableElements
          ? getFilteredRenderableElements({
              elements,
              hiddenTextElementId,
              newElementId,
            })
          : toBrandedType<RenderableElementsMap>(sceneElementsMap);

        const visibleElements = getVisibleCanvasElements({
          elementsMap,
          zoom,
          offsetLeft,
          offsetTop,
          scrollX,
          scrollY,
          height,
          width,
        });

        return { elementsMap, visibleElements };
      },
    );
  })();

  // NOTE Doesn't destroy everything (scene, rc, etc.) because it may not be
  // safe to break TS contract here (for upstream cases)
  public destroy() {
    renderStaticSceneThrottled.cancel();
    this.getRenderableElements.clear();
  }
}
