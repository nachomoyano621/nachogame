import { Rectangle, Sprite, Texture } from "pixi.js";
import { Art } from "../art/ProceduralArt";
import { WArt } from "../art/WorldArt";
import { GROUND_Y } from "../config";

export class Coin extends Sprite {
  private static readonly SCALE = 0.22;
  private t = Math.random() * 6;

  constructor(x: number, y: number) {
    super(Texture.from("moneda"));
    this.anchor.set(0.5);
    this.scale.set(Coin.SCALE);
    this.position.set(x, y);
  }

  public tick(dt: number, speed: number): void {
    this.t += dt;
    this.x -= speed * dt;
    this.scale.x = Coin.SCALE * Math.max(0.15, Math.abs(Math.cos(this.t * 4)));
  }

  public getHitbox(): Rectangle {
    return new Rectangle(this.x - 25, this.y - 25, 50, 50);
  }
}

/** Cráneo tirado en el piso del desierto: se agarra pasando por encima. */
export class SkullPickup extends Sprite {
  private t = 0;

  constructor(x: number) {
    super(WArt.skull);
    this.anchor.set(0.5, 1);
    this.position.set(x, GROUND_Y + 4);
  }

  public tick(dt: number, speed: number): void {
    this.t += dt;
    this.x -= speed * dt;
    // brillito para que se note que se puede agarrar
    const s = 1 + Math.max(0, Math.sin(this.t * 5)) * 0.12;
    this.scale.set(s);
    this.tint = Math.sin(this.t * 5) > 0.7 ? 0xfff59d : 0xffffff;
  }

  public getHitbox(): Rectangle {
    return new Rectangle(this.x - 30, this.y - 56, 60, 56);
  }
}

/** Cráneo lanzado por el jugador: vuela girando y rebota por el piso (tipo bowling). */
export class ThrownSkull extends Sprite {
  public static readonly SPEED = 1100;
  public static readonly GRAVITY = 1200;
  public vx: number;
  public vy: number;
  private bounces = 0;

  constructor(x: number, y: number, dir: number, vy = -260) {
    super(WArt.skull);
    this.anchor.set(0.5);
    this.position.set(x, y);
    this.vx = ThrownSkull.SPEED * dir;
    this.vy = vy;
  }

  /** Devuelve true cuando se terminó (rebotó demasiado o salió de la pantalla). */
  public tick(dt: number): boolean {
    this.vy += ThrownSkull.GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += 14 * dt * Math.sign(this.vx);
    if (this.y >= GROUND_Y - 26) {
      this.y = GROUND_Y - 26;
      this.bounces++;
      this.vy = -Math.abs(this.vy) * 0.55;
      this.vx *= 0.85;
    }
    return this.bounces > 3 || this.x < -60 || this.x > 1980;
  }

  public getHitbox(): Rectangle {
    return new Rectangle(this.x - 28, this.y - 28, 56, 56);
  }
}

export type PowerKind = "heart" | "shield" | "magnet" | "x2";

const TEX: Record<PowerKind, () => Texture> = {
  heart: () => Art.powerHeart,
  shield: () => Art.powerShield,
  magnet: () => Art.powerMagnet,
  x2: () => Art.powerX2,
};

export const POWER_LABEL: Record<PowerKind, string> = {
  heart: "+1 VIDA",
  shield: "¡ESCUDO DE COLÓN!",
  magnet: "¡IMÁN!",
  x2: "¡PUNTOS x2!",
};

export class PowerUp extends Sprite {
  private t = 0;
  private readonly baseY: number;

  constructor(public readonly kind: PowerKind, x: number, y: number) {
    super(TEX[kind]());
    this.anchor.set(0.5);
    this.scale.set(kind === "shield" ? 1.35 : 0.95); // el escudo de Colón, más grande para que se lea
    this.baseY = y;
    this.position.set(x, y);
  }

  public tick(dt: number, speed: number): void {
    this.t += dt;
    this.x -= speed * 0.8 * dt;
    this.y = this.baseY + Math.sin(this.t * 3) * 14;
    this.rotation = Math.sin(this.t * 2) * 0.12;
  }

  public getHitbox(): Rectangle {
    return new Rectangle(this.x - 38, this.y - 38, 76, 76);
  }
}
