import { ITextStyle, TextStyle } from "pixi.js";

export const FONT = '"Arial Black", "Segoe UI Black", "Segoe UI", Arial, sans-serif';

export function style(o: Partial<ITextStyle> = {}): TextStyle {
  return new TextStyle({
    fontFamily: FONT,
    fill: "#ffffff",
    stroke: "#000000",
    strokeThickness: 6,
    lineJoin: "round",
    ...o,
  });
}
