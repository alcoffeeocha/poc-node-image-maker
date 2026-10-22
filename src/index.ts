import fs from "node:fs/promises";
import path from "node:path";
import PSDMaker from "./psd-maker.js";
import { fileURLToPath } from "node:url";
import type { Page } from "./types.js";
import SVGMaker from "./svg-maker.js";

export const moduleFileName = fileURLToPath(import.meta.url);
export const moduleDirName = path.dirname(moduleFileName);
export const publicDirName = path.resolve(moduleDirName, "..", "public");

(async function main() {
  try {
    const posterRaw = await fs.readFile(
      path.resolve(moduleDirName, "..", "poster.json"),
      "utf-8",
    );
    const posterData: Page = JSON.parse(posterRaw);

    const psdMaker = new PSDMaker();
    const svgMaker = new SVGMaker();

    const psdBuffer = await psdMaker.create(posterData);
    const svg = await svgMaker.create(posterData);

    await fs.writeFile(
      path.resolve(moduleDirName, "..", `${posterData.title}.psd`),
      Buffer.from(psdBuffer),
    );
    console.info("Created a psd file: ", `${posterData.title}.psd`);

    await fs.writeFile(
      path.resolve(moduleDirName, "..", `${posterData.title}.svg`),
      svg,
    );
    console.info("Created an svg file: ", `${posterData.title}.svg`);
  } catch (e) {
    console.error(e);
  }
})();
