import { AnimatedSprite, Container, Graphics, Rectangle, Sprite, Text, Texture } from "pixi.js";
import { Art } from "../art/ProceduralArt";
import { BASE_WORLD_SPEED, GROUND_Y, HEIGHT, WIDTH, rand } from "../config";
import { Sfx } from "../core/Sfx";
import { style } from "../ui/styles";
import { BurstOpts } from "./Effects";

export interface EnemyCtx {
  speedMul: number;
  px: number;
  py: number;
  shake: (amp: number, seconds: number) => void;
  burst: (x: number, y: number, o: BurstOpts) => void;
}

export abstract class Enemy extends Container {
  public dead = false;
  public gone = false;
  /** Si se lo puede aplastar saltándole encima. */
  public abstract readonly stompable: boolean;
  public readonly points: number = 50;
  public abstract readonly label: string;
  protected t = 0;
  private deathScaleY = 1;

  public abstract getHitbox(): Rectangle;
  protected abstract tick(dt: number, ctx: EnemyCtx): void;

  public step(dt: number, ctx: EnemyCtx): void {
    this.t += dt;
    if (this.dead) {
      this.deathScaleY = Math.max(0.15, this.deathScaleY - dt * 5);
      this.scale.y = this.deathScaleY;
      this.alpha -= dt * 2.5;
      if (this.alpha <= 0) {
        this.gone = true;
      }
      return;
    }
    this.tick(dt, ctx);
    if (this.x < -420 || this.x > WIDTH + 900 || this.y > HEIGHT + 300 || this.y < -360) {
      this.gone = true;
    }
  }

  public kill(): void {
    this.dead = true;
  }
}

function warningSign(): Container {
  const c = new Container();
  const g = new Graphics();
  g.lineStyle(6, 0x000000);
  g.beginFill(0xffd600);
  g.drawPolygon([0, -52, 50, 36, -50, 36]);
  g.endFill();
  c.addChild(g);
  const t = new Text("!", style({ fontSize: 60, fill: "#d50000", stroke: "#000000", strokeThickness: 0 }));
  t.anchor.set(0.5);
  t.y = 6;
  c.addChild(t);
  return c;
}

/** Dino con patineta (el original). Terrestre, se lo puede aplastar. */
export class DinoSkater extends Enemy {
  public override readonly stompable = true;
  public override readonly label = "dino";
  private readonly spr: AnimatedSprite;
  private readonly speed = rand(250, 330);

  constructor() {
    super();
    this.spr = new AnimatedSprite([Texture.from("dino1"), Texture.from("dino2")], false);
    this.spr.anchor.set(0.5, 1);
    this.spr.scale.set(-0.7, 0.7);
    this.spr.animationSpeed = 0.1;
    this.spr.play();
    this.addChild(this.spr);
    this.position.set(WIDTH + 130, GROUND_Y + 6);
  }

  protected override tick(dt: number, ctx: EnemyCtx): void {
    this.x -= this.speed * ctx.speedMul * dt;
    this.spr.update(dt * 60);
    this.spr.y = -Math.abs(Math.sin(this.t * 9)) * 5;
  }

  public override getHitbox(): Rectangle {
    return new Rectangle(this.x - 55, this.y - 120, 110, 110);
  }
}

/** Mosquito (el original): vuela bajo ondulando. */
export class MosquitoEnemy extends Enemy {
  public override readonly stompable = true;
  public override readonly label = "mosquito";
  private readonly spr: Sprite;
  private readonly baseY = rand(720, 880);
  private readonly speed = rand(320, 380);

  constructor() {
    super();
    this.spr = Sprite.from("mosquito");
    this.spr.anchor.set(0.5);
    this.spr.scale.set(0.4);
    this.addChild(this.spr);
    this.position.set(WIDTH + 100, this.baseY);
  }

  protected override tick(dt: number, ctx: EnemyCtx): void {
    this.x -= this.speed * ctx.speedMul * dt;
    this.y = this.baseY + Math.sin(this.t * 5) * 30;
    this.spr.rotation = Math.sin(this.t * 22) * 0.06;
  }

  public override getHitbox(): Rectangle {
    return new Rectangle(this.x - 42, this.y - 22, 84, 44);
  }
}

/** NUEVO: Murciélago. Vuela en picada ondulante grande. */
export class Bat extends Enemy {
  public override readonly stompable = true;
  public override readonly label = "murciélago";
  private readonly spr: AnimatedSprite;
  private readonly baseY = rand(600, 760);
  private readonly amp = rand(120, 170);
  private readonly speed = rand(280, 340);

  constructor() {
    super();
    const f = Art.bat;
    this.spr = new AnimatedSprite([f[0], f[1], f[2], f[1]], false);
    this.spr.anchor.set(0.5);
    this.spr.scale.set(0.95);
    this.spr.animationSpeed = 0.35;
    this.spr.play();
    this.addChild(this.spr);
    this.position.set(WIDTH + 100, this.baseY);
  }

  protected override tick(dt: number, ctx: EnemyCtx): void {
    this.x -= this.speed * ctx.speedMul * dt;
    this.y = this.baseY + Math.sin(this.t * 2.4) * this.amp;
    this.spr.update(dt * 60);
  }

  public override getHitbox(): Rectangle {
    return new Rectangle(this.x - 40, this.y - 24, 80, 48);
  }
}

/** NUEVO: Roca rodante que rebota. No se puede aplastar: hay que esquivarla. */
export class Boulder extends Enemy {
  public override readonly stompable = false;
  public override readonly label = "roca";
  private static readonly R = 52;
  private readonly spr: Sprite;
  private vy = -300;
  private readonly speed = rand(400, 470);

  constructor() {
    super();
    this.spr = new Sprite(Art.boulder);
    this.spr.anchor.set(0.5);
    this.addChild(this.spr);
    this.position.set(WIDTH + 90, GROUND_Y - Boulder.R - 40);
  }

  protected override tick(dt: number, ctx: EnemyCtx): void {
    const v = this.speed * ctx.speedMul;
    this.x -= v * dt;
    this.vy += 2200 * dt;
    this.y += this.vy * dt;
    if (this.y >= GROUND_Y - Boulder.R) {
      this.y = GROUND_Y - Boulder.R;
      this.vy = -rand(420, 860);
      ctx.shake(4, 0.08);
    }
    this.spr.rotation -= (v * dt) / Boulder.R;
  }

  public override getHitbox(): Rectangle {
    return new Rectangle(this.x - 40, this.y - 40, 80, 80);
  }
}

/** NUEVO: Águila. Entra por arriba, avisa con "!" y se tira en picada hacia el jugador. */
export class Eagle extends Enemy {
  public override readonly stompable = false;
  public override readonly label: string;
  private readonly spr: AnimatedSprite;
  private readonly warn: Container;
  private state: "enter" | "aim" | "dive" | "exit" = "enter";
  private timer = 0;
  private vx = 0;
  private vy = 0;
  private readonly targetX = rand(1000, 1550);
  private readonly baseY = rand(140, 220);

  constructor(frames: Texture[] = Art.eagle, label = "águila") {
    super();
    this.label = label;
    this.spr = new AnimatedSprite(frames, false);
    this.spr.anchor.set(0.5);
    this.spr.animationSpeed = 0.18;
    this.spr.play();
    this.addChild(this.spr);
    this.warn = warningSign();
    this.warn.y = -110;
    this.warn.visible = false;
    this.addChild(this.warn);
    this.position.set(WIDTH + 140, this.baseY);
  }

  protected override tick(dt: number, ctx: EnemyCtx): void {
    this.spr.update(dt * 60);
    switch (this.state) {
      case "enter":
        this.x -= 480 * dt;
        this.y = this.baseY + Math.sin(this.t * 4) * 12;
        if (this.x <= this.targetX) {
          this.state = "aim";
          this.timer = 0.8;
          this.warn.visible = true;
          Sfx.warn();
        }
        break;
      case "aim":
        this.timer -= dt;
        this.warn.alpha = Math.floor(this.t * 12) % 2 === 0 ? 1 : 0.3;
        this.y = this.baseY + Math.sin(this.t * 4) * 12;
        if (this.timer <= 0) {
          const dx = ctx.px - this.x;
          const dy = ctx.py - 70 - this.y;
          const d = Math.hypot(dx, dy) || 1;
          const v = 980 * ctx.speedMul;
          this.vx = (dx / d) * v;
          this.vy = (dy / d) * v;
          this.state = "dive";
          this.warn.visible = false;
          this.spr.gotoAndStop(0);
          this.orient();
        }
        break;
      case "dive":
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.y >= GROUND_Y - 70) {
          this.state = "exit";
          this.vy = -700;
          this.vx = this.vx > 0 ? 520 : -720;
          this.spr.play();
        }
        break;
      case "exit":
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.orient();
        break;
    }
  }

  private orient(): void {
    // El sprite mira a la izquierda: lo damos vuelta si va a la derecha.
    const right = this.vx > 0;
    this.spr.scale.x = right ? -1 : 1;
    const ang = Math.atan2(this.vy, this.vx);
    this.spr.rotation = right ? ang : ang - Math.PI;
  }

  public override getHitbox(): Rectangle {
    return new Rectangle(this.x - 50, this.y - 26, 100, 52);
  }
}

/** NUEVO: Rex furioso (jefe). Ruge, avisa y cruza la pantalla a toda velocidad. */
export class Rex extends Enemy {
  public override readonly stompable = false;
  public override readonly label = "rex";
  private readonly spr: Sprite;
  private readonly warn: Container;
  private warnT = 1.4;
  private roared = false;

  constructor() {
    super();
    this.spr = Sprite.from("myDino");
    this.spr.anchor.set(0.5, 1);
    this.spr.scale.set(-1.25, 1.25);
    this.addChild(this.spr);
    this.warn = warningSign();
    this.warn.scale.set(1.3);
    this.warn.position.set(-(260 + 90), -200);
    this.addChild(this.warn);
    this.position.set(WIDTH + 260, GROUND_Y + 4);
  }

  protected override tick(dt: number, ctx: EnemyCtx): void {
    if (!this.roared) {
      this.roared = true;
      Sfx.roar();
      ctx.shake(14, 0.6);
    }
    if (this.warnT > 0) {
      this.warnT -= dt;
      this.warn.alpha = Math.floor(this.t * 10) % 2 === 0 ? 1 : 0.25;
      if (this.warnT <= 0) {
        this.warn.visible = false;
      }
      return;
    }
    this.x -= 780 * ctx.speedMul * dt;
    this.spr.y = -Math.abs(Math.sin(this.t * 14)) * 10;
    this.spr.rotation = Math.sin(this.t * 14) * 0.04;
  }

  public override getHitbox(): Rectangle {
    return new Rectangle(this.x - 110, this.y - 150, 220, 145);
  }
}

/**
 * NUEVO: Meteorito. Marca con una sombra roja dónde va a caer (la sombra se mueve con el piso),
 * cae en diagonal dejando estela de fuego y explota al tocar el piso.
 */
export class Meteor extends Enemy {
  public override readonly stompable = false;
  public override readonly label = "meteorito";
  private static readonly WARN = 1.1;
  private static readonly FALL = 0.6;
  private readonly marker = new Graphics();
  private readonly rock: Sprite;
  private state: "warn" | "fall" | "boom" = "warn";
  private timer = Meteor.WARN;
  private readonly startDx = rand(380, 620);
  private readonly startDy = -1150;

  constructor(x: number) {
    super();
    this.position.set(x, GROUND_Y);
    this.marker.beginFill(0xff1744, 0.45);
    this.marker.drawEllipse(0, 0, 80, 18);
    this.marker.endFill();
    this.marker.lineStyle(4, 0xff1744, 0.9);
    this.marker.drawEllipse(0, 0, 80, 18);
    this.addChild(this.marker);
    this.rock = new Sprite(Art.meteor);
    this.rock.anchor.set(0.5);
    this.rock.visible = false;
    this.addChild(this.rock);
  }

  protected override tick(dt: number, ctx: EnemyCtx): void {
    // el punto de impacto viaja con el piso
    this.x -= BASE_WORLD_SPEED * ctx.speedMul * dt;
    this.timer -= dt;
    if (this.state === "warn") {
      const k = 1 - Math.max(0, this.timer) / Meteor.WARN;
      this.marker.scale.set(0.35 + k * 0.65);
      this.marker.alpha = 0.5 + Math.sin(this.t * 18) * 0.5;
      if (this.timer <= 0) {
        this.state = "fall";
        this.timer = Meteor.FALL;
        this.rock.visible = true;
        Sfx.whoosh();
      }
    } else if (this.state === "fall") {
      const k = 1 - Math.max(0, this.timer) / Meteor.FALL;
      this.rock.position.set(this.startDx * (1 - k), this.startDy * (1 - k) - 40);
      this.rock.rotation += dt * 8;
      this.marker.scale.set(1 + k * 0.2);
      this.marker.alpha = 1;
      ctx.burst(this.x + this.rock.x, this.y + this.rock.y, { count: 3, colors: [0xff6d00, 0xffab00, 0xffeb3b], speed: 90, life: 0.45, gravity: -150, size: 1.4 });
      if (this.timer <= 0) {
        this.state = "boom";
        this.timer = 0.18;
        this.rock.visible = false;
        this.marker.visible = false;
        Sfx.boom();
        ctx.shake(14, 0.3);
        ctx.burst(this.x, this.y - 30, { count: 30, colors: [0xff6d00, 0xffab00, 0xffeb3b, 0x5d4037], speed: 650, life: 0.8, gravity: 1200, up: 300, size: 1.3 });
      }
    } else if (this.timer <= 0) {
      this.gone = true;
    }
  }

  /** Desaparece directo (no tiene animación de aplastado). */
  public override kill(): void {
    this.gone = true;
  }

  public override getHitbox(): Rectangle {
    if (this.state === "fall") {
      return new Rectangle(this.x + this.rock.x - 34, this.y + this.rock.y - 34, 68, 68);
    }
    if (this.state === "boom") {
      return new Rectangle(this.x - 85, this.y - 110, 170, 110);
    }
    return new Rectangle(-9999, -9999, 0, 0);
  }
}

/**
 * NUEVO (mundo océano): Mosasaurio. Avisa con burbujas y "!" dónde sale y dónde cae,
 * y salta desde el agua por encima del muelle con la boca llena de dientes.
 */
export class Mosasaur extends Enemy {
  public override readonly stompable = false;
  public override readonly label = "mosasaurio";
  private static readonly WARN = 1.2;
  private static readonly JUMP = 1.9;
  private readonly spr: AnimatedSprite;
  private readonly warnA: Container;
  private readonly warnB: Container;
  private state: "warn" | "jump" = "warn";
  private timer = Mosasaur.WARN;
  private readonly x0 = rand(1350, 1780);
  private readonly x1: number;
  private splashed = false;

  constructor() {
    super();
    this.x1 = this.x0 - rand(750, 1050);
    this.spr = new AnimatedSprite(Art.mosasaur, false);
    this.spr.anchor.set(0.5);
    this.spr.animationSpeed = 0.12;
    this.spr.play();
    this.spr.visible = false;
    this.addChild(this.spr);
    this.warnA = warningSign();
    this.warnB = warningSign();
    this.warnA.scale.set(0.8);
    this.warnB.scale.set(0.8);
    this.addChild(this.warnA, this.warnB);
    this.position.set(0, 0);
    this.warnA.position.set(this.x0, GROUND_Y - 70);
    this.warnB.position.set(this.x1, GROUND_Y - 70);
    Sfx.warn();
  }

  private pos(k: number): [number, number] {
    const x = this.x0 + (this.x1 - this.x0) * k;
    const y = 1180 - 4 * 760 * k * (1 - k);
    return [x, y];
  }

  protected override tick(dt: number, ctx: EnemyCtx): void {
    this.timer -= dt;
    if (this.state === "warn") {
      const blink = Math.floor(this.t * 10) % 2 === 0 ? 1 : 0.3;
      this.warnA.alpha = blink;
      this.warnB.alpha = blink;
      if (Math.random() < 0.6) {
        ctx.burst(this.x0 + rand(-60, 60), GROUND_Y + 20, { count: 1, colors: [0xffffff, 0xb3e5fc], speed: 60, life: 0.5, gravity: -300, size: 0.9 });
      }
      if (this.timer <= 0) {
        this.state = "jump";
        this.timer = Mosasaur.JUMP;
        this.warnA.visible = false;
        this.spr.visible = true;
        Sfx.roar();
        ctx.shake(8, 0.3);
        ctx.burst(this.x0, GROUND_Y, { count: 30, colors: [0xffffff, 0x81d4fa, 0x0288d1], speed: 600, life: 0.8, gravity: 1300, up: 500, size: 1.3 });
      }
      return;
    }
    const k = 1 - Math.max(0, this.timer) / Mosasaur.JUMP;
    const [x, y] = this.pos(k);
    const [nx, ny] = this.pos(Math.min(1, k + 0.01));
    this.spr.position.set(x, y);
    this.spr.rotation = Math.atan2(ny - y, nx - x) - Math.PI;
    this.spr.update(dt * 60);
    this.warnB.alpha = Math.floor(this.t * 10) % 2 === 0 ? 1 : 0.3;
    if (!this.splashed && k > 0.85) {
      this.splashed = true;
      this.warnB.visible = false;
      ctx.burst(this.x1, GROUND_Y, { count: 30, colors: [0xffffff, 0x81d4fa, 0x0288d1], speed: 600, life: 0.8, gravity: 1300, up: 500, size: 1.3 });
    }
    if (this.timer <= 0) {
      this.gone = true;
    }
  }

  public override kill(): void {
    this.gone = true;
  }

  public override getHitbox(): Rectangle {
    if (this.state !== "jump") {
      return new Rectangle(-9999, -9999, 0, 0);
    }
    return new Rectangle(this.spr.x - 120, this.spr.y - 45, 240, 90);
  }
}
