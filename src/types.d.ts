export interface BaseLayer {
  name?: string;
  x: number;
  y: number;
}

export interface ImageLayer extends BaseLayer {
  type: "image";
  url: string;
  w: number;
  h: number;
}

export interface TextLayer extends BaseLayer {
  type: "text";
  content: string;
  size: number;
  lh?: number;
  font?: string;
  fg?: string;
  align?: "left" | "center" | "right";
}

export type Layer = ImageLayer | TextLayer;

export interface Page {
  title: string;
  w: number;
  h: number;
  bg: string;
  layers: Layer[];
}
