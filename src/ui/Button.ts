import { Container, Graphics, Text } from "pixi.js";
import { Sfx } from "../core/Sfx";
import { style } from "./styles";

export interface ButtonOpts {
  width?: number;
  height?: number;
  color?: number;
  fontSize?: number;
}

/** Botón con texto, hover y click/tap. */
export class TextButton extends Container {
  private readonly bg = new Graphics();
  private readonly label: Text;
  private readonly w: number;
  private readonly h: number;
  private readonly color: number;

  constructor(text: string, onClick: () => void, o: ButtonOpts = {}) {
    super();
    this.w = o.width ?? 460;
    this.h = o.height ?? 92;
    this.color = o.color ?? 0xffb300;
    this.addChild(this.bg);
    this.label = new Text(text, style({ fontSize: o.fontSize ?? 38, strokeThickness: 7 }));
    this.label.anchor.set(0.5);
    this.addChild(this.label);
    this.draw(false);

    this.interactive = true;
    this.cursor = "pointer";
    this.on("pointerover", () => this.draw(true));
    this.on("pointerout", () => this.draw(false));
    this.on("pointertap", () => {
      Sfx.click();
      onClick();
    });
  }

  private draw(hover: boolean): void {
    const { w, h } = this;
    this.bg.clear();
    this.bg.beginFill(0x000000, 0.35);
    this.bg.drawRoundedRect(-w / 2 + 6, -h / 2 + 8, w, h, 24);
    this.bg.endFill();
    this.bg.lineStyle(5, 0xffffff, hover ? 1 : 0.85);
    this.bg.beginFill(hover ? 0xffffff : this.color, 1);
    this.bg.drawRoundedRect(-w / 2, -h / 2, w, h, 24);
    this.bg.endFill();
    if (hover) {
      this.bg.beginFill(this.color, 0.85);
      this.bg.lineStyle(0);
      this.bg.drawRoundedRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 20);
      this.bg.endFill();
    }
    this.scale.set(hover ? 1.05 : 1);
  }
}
