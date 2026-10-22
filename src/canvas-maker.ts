import { createCanvas, loadImage, type Canvas } from "canvas";
import path from "node:path";
import type { ImageLayer, Layer, Page, TextLayer } from "./types.js";
import { publicDirName } from "./index.js";

export interface TextLayout {
  fontString: string;
  lines: string[];
  lineHeight: number;
  width: number;
  height: number;
  baseline: number;
}

export interface RenderedLayer {
  name: string;
  left: number;
  top: number;
  canvas: Canvas;
  source: Layer;
  layout?: TextLayout;
}

export default abstract class CanvasMaker {
  public abstract create(page: Page): Promise<ArrayBuffer | Buffer>;

  protected async renderLayers(layers: Layer[]): Promise<RenderedLayer[]> {
    return Promise.all(layers.map((layer, i) => this.renderLayer(layer, i)));
  }

  protected async renderLayer(
    layer: Layer,
    index: number,
  ): Promise<RenderedLayer> {
    const base = {
      name: this.getLayerName(layer, index),
      left: layer.x,
      top: layer.y,
      source: layer,
    };

    switch (layer.type) {
      case "image":
        return { ...base, canvas: await this.drawImage(layer) };
      case "text": {
        const layout = this.layoutText(layer);
        return { ...base, canvas: this.drawText(layer, layout), layout };
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

  protected layoutText(layer: TextLayer): TextLayout {
    const { content, size, lh = 1, font = "sans-serif" } = layer;

    const fontString = `${size}px ${font}`;
    const lines = content.split("\n");
    const lineHeight = size * lh;

    const ctx = createCanvas(1, 1).getContext("2d");
    ctx.font = fontString;

    const width = Math.max(
      1,
      Math.ceil(Math.max(...lines.map((line) => ctx.measureText(line).width))),
    );

    const metrics = ctx.measureText("Mg");
    const ascent = metrics.fontBoundingBoxAscent ?? size * 0.8;
    const descent = metrics.fontBoundingBoxDescent ?? size * 0.2;

    const baseline = Math.ceil(ascent);
    const height = Math.ceil(
      baseline + (lines.length - 1) * lineHeight + descent,
    );

    return { fontString, lines, lineHeight, width, height, baseline };
  }

  protected drawText(layer: TextLayer, layout: TextLayout): Canvas {
    const { fg = "#000000", align = "left" } = layer;
    const { fontString, lines, lineHeight, width, height, baseline } = layout;

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

    return canvas;
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
