import { Rectangle, Sprite } from "pixi.js";
import { WpArt } from "../art/WeaponArt";
import { WIDTH } from "../config";

/**
 * Fantasmita que sale del cráneo al lanzarlo: busca al monstruo más cercano,
 * lo atraviesa volteándolo y después se desvanece.
 */
export class Ghost extends Sprite {
  private vx: number;
  private vy: number;
  private t = Math.random() * 6;
  private life = 3.2;
  /** Monstruos que todavía puede voltear. */
  public charges = 2;

  constructor(x: number, y: number, dir: number, spread: number) {
    super(WpArt.ghost);
    this.anchor.set(0.5);
    this.position.set(x, y);
    this.vx = dir * (260 + Math.random() * 120);
    this.vy = -220 + spread * 160;
    this.alpha = 0;
    this.scale.set(dir < 0 ? -0.9 : 0.9, 0.9);
  }

  /** Mueve el fantasma hacia el objetivo (si hay). Devuelve true cuando se terminó. */
  public tick(dt: number, target: { x: number; y: number } | null): boolean {
    this.t += dt;
    this.life -= dt;
    if (target) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      const speed = 620;
      // gira de a poco hacia el objetivo (vuelo curvo de fantasma)
      this.vx += ((dx / d) * speed - this.vx) * Math.min(1, dt * 4);
      this.vy += ((dy / d) * speed - this.vy) * Math.min(1, dt * 4);
    } else {
      this.vy += (-40 - this.vy) * Math.min(1, dt * 2);
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt + Math.sin(this.t * 7) * 1.2;
    const sx = this.vx < 0 ? -1 : 1;
    const wob = 1 + Math.sin(this.t * 9) * 0.06;
    this.scale.set(sx * 0.9 * wob, 0.9 / wob);
    this.rotation = Math.sin(this.t * 5) * 0.12;
    // aparece rápido y se desvanece al final
    this.alpha = Math.min(0.9, (3.2 - this.life) * 4, this.life * 1.5);
    return this.life <= 0 || this.charges <= 0 || this.x < -100 || this.x > WIDTH + 100 || this.y < -120;
  }

  public getHitbox(): Rectangle {
    return new Rectangle(this.x - 30, this.y - 34, 60, 68);
  }
}
