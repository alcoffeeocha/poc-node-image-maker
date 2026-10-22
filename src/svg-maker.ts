import fs from "node:fs/promises";
import path from "node:path";
import { createCanvas, loadImage } from "canvas";
import {
  SVG,
  registerWindow,
  type Container,
  type Svg,
} from "@svgdotjs/svg.js";
import { createSVGWindow } from "svgdom";
import type { ImageLayer, Layer, Page, TextLayer } from "./types.js";
import { publicDirName } from "./index.js";
import { MIME_TYPES } from "./constants.js";

interface LoadedImage {
  href: string;
  w: number;
  h: number;
}

export default class SVGMaker {
  public async create(page: Page): Promise<string> {
    const images = await Promise.all(
      page.layers.map((layer) =>
        layer.type === "image" ? this.loadImage(layer) : null,
      ),
    );

    const window = createSVGWindow();
    registerWindow(window, window.document);

    const root = SVG(window.document.documentElement) as Svg;
    root.size(page.w, page.h).viewbox(0, 0, page.w, page.h);

    this.drawBackground(root, page.w, page.h, page.bg);

    page.layers.forEach((layer, i) => {
      const group = root.group().attr("data-name", this.getLayerName(layer, i));

      switch (layer.type) {
        case "image":
          this.drawImage(group, layer, images[i]!);
          break;
        case "text":
          this.drawText(group, layer);
          break;
      }
    });

    return root.svg();
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
    parent: Container,
    width: number,
    height: number,
    color: string,
  ): void {
    parent
      .rect(width, height)
      .move(0, 0)
      .fill(color)
      .attr("data-name", "Background");
  }

  protected async loadImage(layer: ImageLayer): Promise<LoadedImage> {
    const file = path.join(publicDirName, layer.url);
    const buffer = await fs.readFile(file);
    const mime =
      MIME_TYPES[path.extname(file).toLowerCase()] ??
      "application/octet-stream";

    let w = layer.w;
    let h = layer.h;
    if (!w || !h) {
      const img = await loadImage(buffer);
      w = w || img.width;
      h = h || img.height;
    }

    return {
      href: `data:${mime};base64,${buffer.toString("base64")}`,
      w,
      h,
    };
  }

  protected drawImage(
    parent: Container,
    layer: ImageLayer,
    loaded: LoadedImage,
  ): void {
    parent.element("image").attr({
      x: layer.x,
      y: layer.y,
      width: loaded.w,
      height: loaded.h,
      preserveAspectRatio: "none",
      href: loaded.href,
    });
  }

  protected drawText(parent: Container, layer: TextLayer): void {
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

    const lines = content.split("\n");
    const lineHeight = size * lh;

    const measureCtx = createCanvas(1, 1).getContext("2d");
    measureCtx.font = `${size}px ${font}`;

    const width = Math.max(
      1,
      Math.ceil(
        Math.max(...lines.map((line) => measureCtx.measureText(line).width)),
      ),
    );

    const metrics = measureCtx.measureText("Mg");
    const ascent = metrics.fontBoundingBoxAscent ?? size * 0.8;
    const baseline = Math.ceil(ascent);

    const anchorX =
      align === "center" ? x + width / 2 : align === "right" ? x + width : x;
    const textAnchor =
      align === "center" ? "middle" : align === "right" ? "end" : "start";

    parent
      .text((add) => {
        lines.forEach((line, i) => {
          add.tspan(line).attr({
            x: anchorX,
            y: y + baseline + i * lineHeight,
          });
        });
      })
      .attr({
        "font-family": font,
        "font-size": size,
        "text-anchor": textAnchor,
        fill: fg,
        style: "white-space: pre",
      });
  }
}
