// Button.ts
import { Container, Sprite, Texture } from "pixi.js";

export class Button extends Container {
  private def: Texture;
  private down: Texture;
  private over: Texture;

  private spr: Sprite;
  private isPressed: boolean = false;

  constructor(def: Texture, down: Texture, over: Texture) {
    super();

    this.def = def;
    this.down = down;
    this.over = over;

    this.spr = Sprite.from(def);
    this.spr.anchor.set(0.5);
    this.addChild(this.spr);
    this.spr.interactive = true;

    // Utiliza el evento 'pointerdown' para cambiar al estado presionado
    this.spr.on("pointerdown", this.onMouseDown, this);
    this.spr.on("pointerup", this.onMouseUp, this);
    this.spr.on("pointerupoutside", this.onMouseUp, this);
    this.spr.on("pointerover", this.onMouseOver, this);
    this.spr.on("pointerout", this.onMouseOut, this);
  }

  private onMouseDown(): void {
    if (!this.isPressed) {
      this.isPressed = true;
      this.spr.texture = this.down;
    }
  }

  private onMouseUp(): void {
    if (this.isPressed) {
      this.isPressed = false;
      this.emit("clickk");
      this.spr.texture = this.over;
    }
  }

  private onMouseOver(): void {
    // No cambiamos el estado al pasar el mouse sobre él
  }

  private onMouseOut(): void {
    if (!this.isPressed) {
      this.spr.texture = this.def;
    }
  }
}
