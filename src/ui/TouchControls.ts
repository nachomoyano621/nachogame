import { Container, Graphics, Text } from "pixi.js";
import { HEIGHT, WIDTH } from "../config";
import { Keyboard } from "../utils/Keyboard";
import { style } from "./styles";

/** Botones en pantalla para celulares/tablets. Simulan teclas vía Keyboard.press/release. */
export class TouchControls extends Container {
  public static isTouchDevice(): boolean {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }

  constructor() {
    super();
    this.addButton(150, HEIGHT - 150, 95, "◀", "ArrowLeft");
    this.addButton(370, HEIGHT - 150, 95, "▶", "ArrowRight");
    this.addButton(WIDTH - 160, HEIGHT - 170, 115, "▲", "Space");
    this.addButton(WIDTH - 400, HEIGHT - 120, 75, "▼", "ArrowDown");
    this.addButton(WIDTH - 360, HEIGHT - 300, 70, "☠", "KeyF");
    this.addButton(WIDTH - 70, 260, 50, "II", "KeyP");
  }

  private addButton(x: number, y: number, r: number, symbol: string, code: string): void {
    const c = new Container();
    const g = new Graphics();
    g.lineStyle(5, 0xffffff, 0.7);
    g.beginFill(0xffffff, 0.18);
    g.drawCircle(0, 0, r);
    g.endFill();
    const t = new Text(symbol, style({ fontSize: r * 0.8, strokeThickness: 4 }));
    t.anchor.set(0.5);
    c.addChild(g, t);
    c.position.set(x, y);
    c.interactive = true;
    const down = (): void => {
      c.alpha = 0.6;
      Keyboard.press(code);
    };
    const up = (): void => {
      c.alpha = 1;
      Keyboard.release(code);
    };
    c.on("pointerdown", down);
    c.on("pointerup", up);
    c.on("pointerupoutside", up);
    c.on("pointerout", up);
    this.addChild(c);
  }
}
