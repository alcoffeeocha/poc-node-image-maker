import {
  initializeCanvas,
  writePsd,
  type LayerTextData,
  type Psd,
  type Layer as PsdLayer,
} from "ag-psd";
import { createCanvas, loadImage, type Canvas } from "canvas";
import type { ImageLayer, Layer, Page, TextLayer } from "./types.js";
import path from "node:path";
import { PS_FONTS } from "./constants.js";
import { publicDirName } from "./index.js";

export default class PSDMaker {
  constructor() {
    initializeCanvas((width, height) => createCanvas(width, height));
  }

  public async create(page: Page): Promise<ArrayBuffer> {
    const newPage: Psd = {
      width: page.w,
      height: page.h,
      children: [
        {
          name: "Background",
          top: 0,
          left: 0,
          canvas: this.drawBackground(page.w, page.h, page.bg),
        },
        ...(await this.createLayers(page.layers)),
      ],
    };
    return writePsd(newPage);
  }

  protected async createLayers(layers: Layer[]): Promise<PsdLayer[]> {
    return Promise.all(layers.map((layer, i) => this.createLayer(layer, i)));
  }

  protected async createLayer(layer: Layer, index: number): Promise<PsdLayer> {
    const base = {
      name: this.getLayerName(layer, index),
      left: layer.x,
      top: layer.y,
    };

    switch (layer.type) {
      case "image":
        return { ...base, canvas: await this.drawImage(layer) };
      case "text": {
        const [canvas, text] = this.createText(layer);
        return { ...base, canvas, text };
      }
    }
  }

  protected getLayerName(layer: Layer, index: number): string {
    if (layer.name) return layer.name;
    switch (layer.type) {
      case "text":
        return layer.content.split("\n")[0] || `Text ${index + 1}`;
      case "image":
        return path.basename(layer.url) || `Image ${index + 1}`;
    }
  }

  protected drawBackground(
    width: number,
    height: number,
    color: string,
  ): Canvas {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    return canvas;
  }

  protected async drawImage(layer: ImageLayer): Promise<Canvas> {
    const imgPath = path.join(publicDirName, layer.url);
    const img = await loadImage(imgPath);

    const canvas = createCanvas(layer.w || img.width, layer.h || img.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    return canvas;
  }

  // Creating a text is indeed harder than Image
  protected createText(layer: TextLayer): [Canvas, LayerTextData] {
    const {
      content,
      size,
      lh = 1,
      font = "sans-serif",
      fg = "#000000",
      align = "left",
      x,
      y,
    } = layer;

    const fontString = `${size}px ${font}`;
    const lines = content.split("\n");
    const lineHeight = size * lh;

    const measureCtx = createCanvas(1, 1).getContext("2d");
    measureCtx.font = fontString;

    const width = Math.max(
      1,
      Math.ceil(
        Math.max(...lines.map((line) => measureCtx.measureText(line).width)),
      ),
    );

    const metrics = measureCtx.measureText("Mg");
    const ascent = metrics.fontBoundingBoxAscent ?? size * 0.8;
    const descent = metrics.fontBoundingBoxDescent ?? size * 0.2;

    const baseline = Math.ceil(ascent);
    const height = Math.ceil(
      baseline + (lines.length - 1) * lineHeight + descent,
    );

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.font = fontString;
    ctx.fillStyle = fg;
    ctx.textAlign = align;
    ctx.textBaseline = "alphabetic";

    const textX =
      align === "center" ? width / 2 : align === "right" ? width : 0;

    lines.forEach((line, i) => {
      ctx.fillText(line, textX, baseline + i * lineHeight);
    });

    const anchorX =
      align === "center" ? x + width / 2 : align === "right" ? x + width : x;

    const layerData: LayerTextData = {
      text: content.replace(/\n/g, "\r"),
      transform: [1, 0, 0, 1, anchorX, y + baseline],
      shapeType: "point",
      style: {
        font: { name: PS_FONTS[font] ?? font },
        fontSize: size,
        fillColor: PSDMaker.hexToRGB(fg),
        autoLeading: false,
        leading: size * lh,
      },
      paragraphStyle: { justification: align },
    };

    return [canvas, layerData];
  }

  public static hexToRGB(hex: string): { r: number; g: number; b: number } {
    let value = hex.replace("#", "");
    if (value.length === 3) {
      value = value
        .split("")
        .map((c) => c + c)
        .join("");
    }
    const num = parseInt(value, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }
}
