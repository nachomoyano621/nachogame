import { Container, Graphics, Rectangle, Sprite, Text, filters } from "pixi.js";
import { Art } from "../art/ProceduralArt";
import { GROUND_Y, WIDTH, rand } from "../config";
import { Sfx } from "../core/Sfx";
import { style } from "../ui/styles";
import { Enemy, EnemyCtx } from "./enemies";

export interface BossCtx extends EnemyCtx {
  spawn: (e: Enemy) => void;
}

/** Bola de ácido que escupe el jefe (trayectoria en parábola). */
export class AcidBall extends Enemy {
  public override readonly stompable = false;
  public override readonly label = "ácido";
  private readonly spr: Sprite;

  constructor(x: number, y: number, private vx: number, private vy: number, private readonly g: number) {
    super();
    this.spr = new Sprite(Art.acid);
    this.spr.anchor.set(0.5);
    this.addChild(this.spr);
    this.position.set(x, y);
  }

  protected override tick(dt: number, ctx: EnemyCtx): void {
    this.vy += this.g * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.spr.rotation += dt * 6;
    this.spr.scale.set(1 + Math.sin(this.t * 20) * 0.08);
    ctx.burst(this.x, this.y, { count: 1, colors: [0x76ff03, 0xb2ff59], speed: 60, life: 0.35, gravity: 200, size: 0.9 });
    if (this.y >= GROUND_Y - 18) {
      ctx.burst(this.x, GROUND_Y - 10, { count: 14, colors: [0x76ff03, 0xccff90], speed: 320, life: 0.5, gravity: 900, up: 200 });
      this.gone = true;
    }
  }

  public override getHitbox(): Rectangle {
    return new Rectangle(this.x - 22, this.y - 22, 44, 44);
  }
}

/** Onda de choque que corre por el piso cuando el jefe aterriza. Hay que saltarla. */
export class Shockwave extends Enemy {
  public override readonly stompable = false;
  public override readonly label = "onda";
  private readonly gfx = new Graphics();

  constructor(x: number, private readonly vx: number) {
    super();
    this.gfx.beginFill(0x76ff03, 0.25);
    this.gfx.drawEllipse(0, -40, 38, 50);
    this.gfx.endFill();
    this.gfx.beginFill(0xb2ff59, 0.85);
    this.gfx.drawEllipse(0, -30, 18, 34);
    this.gfx.endFill();
    this.gfx.beginFill(0xffffff, 0.9);
    this.gfx.drawEllipse(0, -24, 7, 20);
    this.gfx.endFill();
    this.addChild(this.gfx);
    this.position.set(x, GROUND_Y);
  }

  protected override tick(dt: number, ctx: EnemyCtx): void {
    this.x += this.vx * dt;
    this.gfx.scale.set(1 + Math.sin(this.t * 25) * 0.1, 1 + Math.sin(this.t * 31) * 0.15);
    if (Math.random() < 0.5) {
      ctx.burst(this.x, GROUND_Y - 10, { count: 1, colors: [0x76ff03, 0xa1887f], speed: 120, life: 0.4, gravity: 600, up: 150, size: 0.8 });
    }
  }

  public override getHitbox(): Rectangle {
    return new Rectangle(this.x - 20, GROUND_Y - 66, 40, 66);
  }
}

type BossState = "enter" | "idle" | "spitWind" | "spit" | "chargeWarn" | "charge" | "stunned" | "hurt" | "return" | "jump" | "dying";

const S = 2.1; // escala del sprite
const HOME_X = 1500;
const LEFT_X = 360;

/**
 * JEFE FINAL: DINO-X, el experimento que se escapó del laboratorio.
 * Ataques: escupe ácido, embiste (y queda mareado contra la pared) y salta generando ondas de choque.
 * Sólo se le puede pegar saltándole en la cabeza mientras está MAREADO.
 * Emite "stunned" y "hit".
 */
export class Boss extends Container {
  public readonly maxHp: number;
  public hp: number;
  public done = false;

  private state: BossState = "enter";
  private timer = 0;
  private t = 0;
  private vx = 0;
  private vy = 0;
  private attackIdx = 0;
  private spitLeft = 0;
  private flashT = 0;
  private facing: -1 | 1 = -1;
  private readonly speed: number;

  private readonly body = new Container();
  private readonly spr: Sprite;
  private readonly eye = new Graphics();
  private readonly stars = new Container();
  private readonly hurtFilter = new filters.ColorMatrixFilter();

  constructor(maxHp: number, speed: number) {
    super();
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.speed = speed;

    this.spr = Sprite.from("myDino");
    this.spr.anchor.set(0.5, 1);
    const mutant = new filters.ColorMatrixFilter();
    mutant.hue(105, false);
    mutant.saturate(0.4, true);
    mutant.brightness(1.6, true);
    this.spr.filters = [mutant];
    this.body.addChild(this.spr);
    this.body.addChild(this.buildLabGear());
    this.body.scale.set(-S, S);
    this.addChild(this.body);

    for (let i = 0; i < 3; i++) {
      const st = new Text("★", style({ fontSize: 46, fill: "#ffeb3b", strokeThickness: 4 }));
      st.anchor.set(0.5);
      this.stars.addChild(st);
    }
    this.stars.visible = false;
    this.addChild(this.stars);

    this.position.set(WIDTH + 330, GROUND_Y + 6);
  }

  /** Casco metálico, ojo robótico, collar con luz, tubos y grillete roto (coordenadas de la textura). */
  private buildLabGear(): Container {
    // origen del sprite (anchor 0.5,1) => pixel (px,py) de la textura = (px-121, py-171)
    const o = (px: number, py: number): [number, number] => [px - 121, py - 171];
    const c = new Container();
    const g = new Graphics();

    // tubos desde el collar hacia la espalda
    g.lineStyle({ width: 4, color: 0x76ff03, alpha: 0.9 });
    const [ax, ay] = o(168, 52);
    const [bx, by] = o(105, 30);
    g.moveTo(ax, ay);
    g.bezierCurveTo(ax - 20, ay - 30, bx + 20, by - 25, bx, by);
    g.lineStyle(0);
    g.beginFill(0x455a64);
    g.drawRoundedRect(bx - 12, by - 6, 24, 12, 4);
    g.endFill();

    // collar
    const [cx, cy] = o(166, 44);
    g.lineStyle(2, 0x263238);
    g.beginFill(0x78909c);
    g.drawPolygon([cx - 6, cy - 4, cx + 14, cy - 10, cx + 22, cy + 18, cx + 2, cy + 24]);
    g.endFill();
    g.lineStyle(0);

    // casco metálico con remaches
    const [hx, hy] = o(186, 6);
    g.lineStyle(2, 0x263238);
    g.beginFill(0x90a4ae);
    g.drawRoundedRect(hx, hy, 34, 12, 5);
    g.endFill();
    g.lineStyle(0);
    g.beginFill(0x37474f);
    for (let i = 0; i < 4; i++) {
      g.drawCircle(hx + 5 + i * 8, hy + 6, 1.6);
    }
    g.endFill();

    // grillete roto en la pata
    const [lx, ly] = o(150, 140);
    g.lineStyle(3, 0x546e7a);
    g.drawRect(lx - 9, ly - 4, 18, 9);
    g.moveTo(lx + 9, ly);
    g.lineTo(lx + 16, ly + 6);
    g.lineTo(lx + 12, ly + 12);
    g.lineStyle(0);
    c.addChild(g);

    // luz del collar y ojo robótico (parpadean)
    const [ex, ey] = o(206, 19);
    this.eye.beginFill(0xff1744, 0.35);
    this.eye.drawCircle(ex, ey, 7);
    this.eye.endFill();
    this.eye.beginFill(0xff1744);
    this.eye.drawCircle(ex, ey, 3.2);
    this.eye.endFill();
    this.eye.beginFill(0xff1744);
    this.eye.drawCircle(cx + 9, cy + 8, 2.6);
    this.eye.endFill();
    c.addChild(this.eye);
    return c;
  }

  public get enraged(): boolean {
    return this.hp <= this.maxHp / 2;
  }

  /** Estado actual (para la demo / debug). */
  public get phase(): string {
    return this.state;
  }

  public get stunned(): boolean {
    return this.state === "stunned";
  }

  /** Si tocarlo hace daño (no cuando está mareado, golpeado o muriendo). */
  public get harmful(): boolean {
    // "return" tampoco lastima: se está retirando después del mareo y el jugador puede estar debajo
    return this.state !== "stunned" && this.state !== "hurt" && this.state !== "dying" && this.state !== "enter" && this.state !== "return";
  }

  public get dying(): boolean {
    return this.state === "dying";
  }

  /** Zona de la cabeza/lomo donde se lo aplasta. */
  public weakBox(): Rectangle {
    const top = this.y - (this.stunned ? 320 : 350);
    return this.facing < 0 ? new Rectangle(this.x - 260, top, 430, 110) : new Rectangle(this.x - 170, top, 430, 110);
  }

  public bodyBox(): Rectangle {
    return this.facing < 0 ? new Rectangle(this.x - 230, this.y - 280, 430, 270) : new Rectangle(this.x - 200, this.y - 280, 430, 270);
  }

  public hit(): void {
    this.hp--;
    this.flashT = 0.5;
    this.stars.visible = false;
    if (this.hp <= 0) {
      this.state = "dying";
      this.timer = 2.6;
      Sfx.roar();
    } else {
      this.state = "hurt";
      this.timer = 0.8;
    }
    this.emit("hit");
  }

  private face(dir: -1 | 1): void {
    this.facing = dir;
    this.body.scale.x = dir < 0 ? -S : S;
  }

  private idle(seconds: number): void {
    this.state = "idle";
    this.timer = seconds / this.spd;
    this.body.rotation = 0;
  }

  private get spd(): number {
    return this.speed * (this.enraged ? 1.3 : 1);
  }

  private nextAttack(): void {
    const seq = ["spit", "charge", "quake", "charge"] as const;
    const a = seq[this.attackIdx++ % seq.length];
    if (a === "spit") {
      this.state = "spitWind";
      this.timer = 0.6;
    } else if (a === "charge") {
      this.state = "chargeWarn";
      this.timer = 0.9 / this.spd;
      Sfx.roar();
    } else {
      this.state = "jump";
      this.vy = -1250;
      Sfx.whoosh();
    }
  }

  private walkAnim(rate: number): void {
    this.body.y = -Math.abs(Math.sin(this.t * rate)) * 10;
    this.body.rotation = Math.sin(this.t * rate) * 0.03;
  }

  public update(dt: number, ctx: BossCtx): void {
    this.t += dt;
    this.timer -= dt;

    // feedback de golpe / furia
    if (this.flashT > 0) {
      this.flashT -= dt;
      this.hurtFilter.reset();
      this.hurtFilter.brightness(Math.floor(this.t * 20) % 2 === 0 ? 2.2 : 1, false);
      this.body.filters = [this.hurtFilter];
    } else if (this.enraged && this.state !== "dying") {
      this.hurtFilter.reset();
      this.hurtFilter.brightness(1 + Math.max(0, Math.sin(this.t * 6)) * 0.35, false);
      this.body.filters = [this.hurtFilter];
    } else {
      this.body.filters = null;
    }
    this.eye.alpha = Math.sin(this.t * (this.enraged ? 16 : 6)) > 0 ? 1 : 0.3;

    switch (this.state) {
      case "enter":
        this.x -= 380 * dt;
        this.walkAnim(8);
        if (this.x <= HOME_X) {
          this.x = HOME_X;
          this.idle(1.2);
        }
        break;
      case "idle":
        this.body.y = Math.sin(this.t * 3) * 3;
        if (this.timer <= 0) {
          this.nextAttack();
        }
        break;
      case "spitWind":
        this.body.rotation = Math.min(0.12, this.body.rotation + dt * 0.4);
        if (this.timer <= 0) {
          this.state = "spit";
          this.spitLeft = this.enraged ? 5 : 3;
          this.timer = 0;
        }
        break;
      case "spit":
        if (this.timer <= 0 && this.spitLeft > 0) {
          this.spit(ctx);
          this.spitLeft--;
          this.timer = 0.4 / this.spd;
          if (this.spitLeft === 0) {
            this.idle(1);
          }
        }
        break;
      case "chargeWarn":
        this.body.x = (Math.random() - 0.5) * 10;
        this.body.rotation = -0.05;
        if (this.timer <= 0) {
          this.body.x = 0;
          this.state = "charge";
          this.vx = -980 * this.spd;
        }
        break;
      case "charge":
        this.x += this.vx * dt;
        this.walkAnim(18);
        if (Math.random() < 0.6) {
          ctx.burst(this.x + 150, GROUND_Y - 10, { count: 2, colors: [0xa1887f, 0x8d6e63], speed: 160, life: 0.4, gravity: 500, up: 150 });
        }
        if (this.x <= LEFT_X) {
          this.x = LEFT_X;
          this.state = "stunned";
          this.timer = (this.enraged ? 2.2 : 2.8) / Math.max(1, this.speed);
          this.body.rotation = -0.1;
          this.body.y = 0;
          this.stars.visible = true;
          Sfx.boom();
          ctx.shake(20, 0.45);
          ctx.burst(this.x - 250, GROUND_Y - 120, { count: 26, colors: [0xffffff, 0xffeb3b, 0xa1887f], speed: 520, life: 0.6 });
          this.emit("stunned");
        }
        break;
      case "stunned": {
        this.body.rotation = -0.1 + Math.sin(this.t * 5) * 0.03;
        this.stars.position.set(-170, -370);
        this.stars.children.forEach((st, i) => {
          const a = this.t * 4 + (i * Math.PI * 2) / 3;
          st.position.set(Math.cos(a) * 70, Math.sin(a) * 18);
          st.scale.set(0.8 + Math.sin(a) * 0.25);
        });
        if (this.timer <= 0) {
          this.stars.visible = false;
          this.startReturn();
        }
        break;
      }
      case "hurt":
        this.body.rotation = -0.15;
        if (this.timer <= 0) {
          this.startReturn();
        }
        break;
      case "return":
        this.x += 430 * this.spd * dt;
        this.walkAnim(10);
        if (this.x >= HOME_X) {
          this.x = HOME_X;
          this.face(-1);
          this.idle(0.8);
        }
        break;
      case "jump":
        this.vy += 2700 * dt;
        this.y += this.vy * dt;
        this.body.rotation = this.vy < 0 ? -0.08 : 0.06;
        if (this.y >= GROUND_Y + 6 && this.vy > 0) {
          this.y = GROUND_Y + 6;
          this.vy = 0;
          Sfx.boom();
          ctx.shake(22, 0.5);
          ctx.burst(this.x, GROUND_Y - 10, { count: 30, colors: [0x76ff03, 0xa1887f, 0xffffff], speed: 600, life: 0.6, gravity: 1200, up: 300 });
          const v = 640 * this.spd;
          ctx.spawn(new Shockwave(this.x - 200, -v));
          ctx.spawn(new Shockwave(this.x + 200, v));
          if (this.enraged) {
            ctx.spawn(new Shockwave(this.x - 200, -v * 0.62));
          }
          this.idle(1);
        }
        break;
      case "dying":
        this.body.rotation = Math.sin(this.t * 30) * 0.05;
        if (Math.random() < 0.35) {
          ctx.burst(this.x + rand(-220, 220), this.y - rand(40, 320), { count: 16, colors: [0xff6d00, 0xffeb3b, 0x76ff03, 0xffffff], speed: 480, life: 0.6 });
          if (Math.random() < 0.3) {
            Sfx.boom();
            ctx.shake(12, 0.2);
          }
        }
        if (this.timer < 0.8) {
          this.alpha = Math.max(0, this.timer / 0.8);
        }
        if (this.timer <= 0) {
          this.done = true;
        }
        break;
    }
  }

  private startReturn(): void {
    this.state = "return";
    this.face(1);
    this.body.rotation = 0;
  }

  private spit(ctx: BossCtx): void {
    const x0 = this.x - 250;
    const y0 = this.y - 285;
    const T = rand(0.9, 1.15);
    const g = 1400;
    const tx = ctx.px + rand(-120, 120);
    const ty = ctx.py - 60;
    const vx = (tx - x0) / T;
    const vy = (ty - y0) / T - 0.5 * g * T;
    ctx.spawn(new AcidBall(x0, y0, vx, vy, g));
    Sfx.spit();
    ctx.burst(x0, y0, { count: 8, colors: [0x76ff03, 0xccff90], speed: 200, life: 0.3, gravity: 0 });
  }
}
