import { Container, Sprite, Text } from "pixi.js";
import { Art } from "../art/ProceduralArt";
import { style } from "../ui/styles";

interface Particle {
  spr: Sprite;
  vx: number;
  vy: number;
  life: number;
  max: number;
  gravity: number;
  spin: number;
}

interface Floating {
  txt: Text;
  life: number;
}

export interface BurstOpts {
  count?: number;
  colors?: number[];
  speed?: number;
  life?: number;
  gravity?: number;
  size?: number;
  up?: number;
}

/** Partículas y textos flotantes ("+10", "¡PLAF!", etc). */
export class Effects extends Container {
  private parts: Particle[] = [];
  private floats: Floating[] = [];

  public burst(x: number, y: number, o: BurstOpts = {}): void {
    const count = o.count ?? 12;
    const colors = o.colors ?? [0xffffff];
    const speed = o.speed ?? 380;
    const size = o.size ?? 1;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random() * 0.65);
      const spr = new Sprite(Art.particle);
      spr.anchor.set(0.5);
      spr.tint = colors[i % colors.length];
      spr.scale.set(size * (0.5 + Math.random() * 0.7));
      spr.position.set(x, y);
      this.addChild(spr);
      const life = (o.life ?? 0.7) * (0.6 + Math.random() * 0.6);
      this.parts.push({
        spr,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - (o.up ?? 0),
        life,
        max: life,
        gravity: o.gravity ?? 900,
        spin: (Math.random() - 0.5) * 10,
      });
    }
  }

  public floatText(x: number, y: number, text: string, fill = "#ffeb3b", size = 40): void {
    const txt = new Text(text, style({ fontSize: size, fill, strokeThickness: 7 }));
    txt.anchor.set(0.5);
    txt.position.set(x, y);
    this.addChild(txt);
    this.floats.push({ txt, life: 1 });
  }

  public update(dt: number): void {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.spr.destroy();
        this.parts.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.spr.x += p.vx * dt;
      p.spr.y += p.vy * dt;
      p.spr.rotation += p.spin * dt;
      p.spr.alpha = Math.min(1, (p.life / p.max) * 1.5);
    }
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.life -= dt;
      if (f.life <= 0) {
        f.txt.destroy();
        this.floats.splice(i, 1);
        continue;
      }
      f.txt.y -= 90 * dt;
      f.txt.alpha = Math.min(1, f.life * 2.5);
      const s = f.life > 0.85 ? 1 + (f.life - 0.85) * 3 : 1;
      f.txt.scale.set(s);
    }
  }
}
