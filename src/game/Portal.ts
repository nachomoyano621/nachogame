import { Container, Graphics, Rectangle, Text } from "pixi.js";
import { GROUND_Y, WIDTH } from "../config";
import { style } from "../ui/styles";

/** Portal para pasar al siguiente mundo: entra desde la derecha y espera a que el jugador lo toque. */
export class Portal extends Container {
  private static readonly STOP_X = 1560;
  private readonly g = new Graphics();
  private readonly label: Text;
  private t = 0;

  constructor(text: string) {
    super();
    this.addChild(this.g);
    this.label = new Text(text, style({ fontSize: 34, fill: "#18ffff", strokeThickness: 7 }));
    this.label.anchor.set(0.5, 1);
    this.label.y = -190;
    this.addChild(this.label);
    this.position.set(WIDTH + 160, GROUND_Y - 160);
  }

  public update(dt: number, worldSpeed: number): void {
    this.t += dt;
    if (this.x > Portal.STOP_X) {
      this.x = Math.max(Portal.STOP_X, this.x - Math.max(worldSpeed, 300) * 1.3 * dt);
    }
    const g = this.g;
    g.clear();
    g.beginFill(0x7c4dff, 0.18);
    g.drawEllipse(0, 0, 130, 190);
    g.endFill();
    g.beginFill(0x12002b, 0.95);
    g.drawEllipse(0, 0, 70, 140);
    g.endFill();
    for (let i = 0; i < 6; i++) {
      const p = this.t * 5 + i * 1.1;
      g.lineStyle(9 - i, i % 2 === 0 ? 0x18ffff : 0xb388ff, 0.85 - i * 0.1);
      g.drawEllipse(0, 0, (72 + i * 11) * (1 + 0.06 * Math.sin(p)), (142 + i * 9) * (1 + 0.05 * Math.cos(p)));
    }
    g.lineStyle(0);
    // espiral interna
    for (let i = 0; i < 10; i++) {
      const a = this.t * 3 + i * 0.63;
      const r = 20 + i * 5;
      g.beginFill(0xe1bee7, 0.7);
      g.drawCircle(Math.cos(a) * r * 0.5, Math.sin(a) * r, 4);
      g.endFill();
    }
    this.label.y = -205 + Math.sin(this.t * 4) * 8;
  }

  public getHitbox(): Rectangle {
    return new Rectangle(this.x - 55, this.y - 150, 110, 310);
  }
}
