import { createCanvas } from "canvas";
import sharp from "sharp";
import CanvasMaker from "./canvas-maker.js";
import type { Page } from "./types.js";

export class FlatTIFFMaker extends CanvasMaker {
  public async create(page: Page): Promise<Buffer> {
    const canvas = createCanvas(page.w, page.h);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(this.drawBackground(page.w, page.h, page.bg), 0, 0);

    for (const layer of await this.renderLayers(page.layers)) {
      ctx.drawImage(layer.canvas, layer.left, layer.top);
    }

    return sharp(canvas.toBuffer("image/png"))
      .tiff({ compression: "lzw", xres: 11.81, yres: 11.81 })
      .toBuffer();
  }
}
