import {
  initializeCanvas,
  writePsd,
  type LayerTextData,
  type Psd,
  type Layer as PsdLayer,
} from "ag-psd";
import { createCanvas } from "canvas";
import CanvasMaker, {
  type RenderedLayer,
  type TextLayout,
} from "./canvas-maker.js";
import { PS_FONTS } from "./constants.js";
import type { Page, TextLayer } from "./types.js";

export default class PSDMaker extends CanvasMaker {
  constructor() {
    super();
    initializeCanvas((width, height) => createCanvas(width, height));
  }

  public async create(page: Page): Promise<ArrayBuffer> {
    const rendered = await this.renderLayers(page.layers);

    const psd: Psd = {
      width: page.w,
      height: page.h,
      children: [
        {
          name: "Background",
          top: 0,
          left: 0,
          canvas: this.drawBackground(page.w, page.h, page.bg),
        },
        ...rendered.map((layer) => this.toPsdLayer(layer)),
      ],
    };

    return writePsd(psd);
  }

  protected toPsdLayer(rendered: RenderedLayer): PsdLayer {
    const { name, left, top, canvas, source, layout } = rendered;
    const psdLayer: PsdLayer = { name, left, top, canvas };

    if (source.type === "text" && layout) {
      psdLayer.text = this.createTextData(source, layout);
    }

    return psdLayer;
  }

  protected createTextData(
    layer: TextLayer,
    layout: TextLayout,
  ): LayerTextData {
    const {
      content,
      size,
      lh = 1,
      font = "Arial",
      fg = "#000000",
      align = "left",
      x,
      y,
    } = layer;

    const anchorX =
      align === "center"
        ? x + layout.width / 2
        : align === "right"
          ? x + layout.width
          : x;

    return {
      text: content.replace(/\n/g, "\r"),
      transform: [1, 0, 0, 1, anchorX, y + layout.baseline],
      shapeType: "point",
      style: {
        font: { name: PS_FONTS[font] ?? font },
        fontSize: size,
        fillColor: CanvasMaker.hexToRGB(fg),
        autoLeading: false,
        leading: size * lh,
      },
      paragraphStyle: { justification: align },
    };
  }
}