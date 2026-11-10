import { AnimatedSprite, Container, Graphics, Rectangle, Text, Texture, filters } from "pixi.js";
import { Art } from "../art/ProceduralArt";
import { WArt } from "../art/WorldArt";
import { GROUND_Y, WIDTH, rand } from "../config";
import { Sfx } from "../core/Sfx";
import { style } from "../ui/styles";
import { Enemy, EnemyCtx } from "./enemies";
import { BOSS_BABIES } from "./worldEnemies";

export interface BossCtx extends EnemyCtx {
  spawn: (e: Enemy) => void;
}

// ------------------------------------------------------------------ proyectiles

/** Cómo se ve lo que tira cada jefe (rocas, aguijones, burbujas, veneno, fuego, láser, ácido). */
export interface ShotLook {
  label: string;
  tex: () => Texture;
  tint: number;
  scale: number;
  trail: number[];
}

export const SHOTS: Record<string, ShotLook> = {
  rock: { label: "piedra", tex: () => Art.boulder, tint: 0xffffff, scale: 0.42, trail: [0xa1887f, 0x6d4c41] },
  stinger: { label: "aguijón", tex: () => Art.acid, tint: 0xe040fb, scale: 0.9, trail: [0xce93d8, 0x8e24aa] },
  bubble: { label: "burbuja", tex: () => Art.acid, tint: 0x80deea, scale: 1, trail: [0xe1f5fe, 0x4fc3f7] },
  venom: { label: "veneno", tex: () => Art.acid, tint: 0xffffff, scale: 0.9, trail: [0x76ff03, 0x33691e] },
  fire: { label: "fuego", tex: () => WArt.lava, tint: 0xffffff, scale: 0.55, trail: [0xff6d00, 0xffd600] },
  laser: { label: "láser", tex: () => Art.acid, tint: 0xff4081, scale: 0.8, trail: [0xff80ab, 0xffffff] },
  brick: { label: "ladrillo", tex: () => WArt.brickShot, tint: 0xffffff, scale: 1, trail: [0xff6d00, 0xfdd835, 0x1e88e5] },
  acid: { label: "ácido", tex: () => Art.acid, tint: 0xffffff, scale: 1, trail: [0x76ff03, 0xb2ff59] },
};

/** Proyectil que tira un jefe (trayectoria en parábola). */
export class AcidBall extends Enemy {
  public override readonly stompable = false;
  public override readonly label: string;
  public readonly projectile = true;
  private readonly spr: AnimatedSprite;

  constructor(x: number, y: number, private vx: number, private vy: number, private readonly g: number, private readonly look: ShotLook = SHOTS.acid) {
    super();
    this.label = look.label;
    this.spr = new AnimatedSprite([look.tex()], false);
    this.spr.anchor.set(0.5);
    this.spr.tint = look.tint;
    this.spr.scale.set(look.scale);
    this.addChild(this.spr);
    this.position.set(x, y);
  }

  protected override tick(dt: number, ctx: EnemyCtx): void {
    this.vy += this.g * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.spr.rotation += dt * 6;
    this.spr.scale.set(this.look.scale * (1 + Math.sin(this.t * 20) * 0.08));
    ctx.burst(this.x, this.y, { count: 1, colors: this.look.trail, speed: 60, life: 0.35, gravity: 200, size: 0.9 });
    if (this.y >= GROUND_Y - 18) {
      ctx.burst(this.x, GROUND_Y - 10, { count: 14, colors: this.look.trail, speed: 320, life: 0.5, gravity: 900, up: 200 });
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

  constructor(x: number, private readonly vx: number, color = 0x76ff03) {
    super();
    this.gfx.beginFill(color, 0.25);
    this.gfx.drawEllipse(0, -40, 38, 50);
    this.gfx.endFill();
    this.gfx.beginFill(color, 0.85);
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
      ctx.burst(this.x, GROUND_Y - 10, { count: 1, colors: [0xffffff, 0xa1887f], speed: 120, life: 0.4, gravity: 600, up: 150, size: 0.8 });
    }
  }

  public override getHitbox(): Rectangle {
    return new Rectangle(this.x - 20, GROUND_Y - 66, 40, 66);
  }
}

// ------------------------------------------------------------------ configuración de cada jefe

export interface BossConfig {
  name: string;
  /** Frase del cartel cuando aparece. */
  intro: string;
  frames: () => Texture[];
  /** Hacia dónde mira el dibujo original. */
  facesRight: boolean;
  scale: number;
  /** Multiplicador de la vida base de la dificultad. */
  hpMul: number;
  color: number;
  shot: ShotLook;
  /** Giro de color (grados) para darle un look distinto. */
  hue?: number;
  anim?: number;
  /** DINO-X: casco y equipo de laboratorio. */
  lab?: boolean;
  /** Si el jefe larga bebés (mini monstruos que corren hacia el jugador). */
  babies?: (x: number) => Enemy;
  /** Jefe final del juego (al vencerlo se gana). */
  final?: boolean;
}

/** Jefes de cada mundo (índice = mundo - 1) y el jefe final. */
export const WORLD_BOSSES: BossConfig[] = [
  { name: "REY DINO PATINADOR", intro: "¡El rey del valle quiere sus monedas!", frames: () => [Texture.from("dino1"), Texture.from("dino2")], facesRight: true, scale: 1.75, hpMul: 0.5, color: 0xffd600, shot: SHOTS.rock, anim: 0.12 },
  { name: "ESCORPIÓN GIGANTE", intro: "¡Cuidado con sus aguijones!", frames: () => WArt.scorpion, facesRight: false, scale: 2.7, hpMul: 0.5, color: 0xe040fb, shot: SHOTS.stinger, hue: -25, anim: 0.12 },
  { name: "CANGREJO GIGANTE", intro: "¡Tira burbujas y pellizca fuerte!", frames: () => WArt.crab, facesRight: false, scale: 3, hpMul: 0.5, color: 0x4fc3f7, shot: SHOTS.bubble, anim: 0.15 },
  { name: "SERPIENTE GIGANTE", intro: "¡Escupe veneno! No te quedes quieto", frames: () => WArt.snake, facesRight: false, scale: 3.1, hpMul: 0.5, color: 0x76ff03, shot: SHOTS.venom, anim: 0.1 },
  { name: "SALAMANDRA DE MAGMA", intro: "¡Lanza bolas de fuego!", frames: () => WArt.salamander, facesRight: false, scale: 2.7, hpMul: 0.5, color: 0xff6d00, shot: SHOTS.fire, hue: -15, anim: 0.15 },
  { name: "MARCIANO MALO GIGANTE", intro: "¡Dispara rayos láser y larga marcianitos!", frames: () => WArt.alien, facesRight: false, scale: 2.7, hpMul: 0.5, color: 0xff4081, shot: SHOTS.laser, hue: 150, anim: 0.12, babies: (x) => BOSS_BABIES.alien(x) },
  { name: "GIGANTE DE BLOQUES", intro: "¡Te tira ladrillos de juguete!", frames: () => WArt.brickGolem, facesRight: false, scale: 1.7, hpMul: 0.5, color: 0xfdd835, shot: SHOTS.brick, anim: 0.1 },
];

export const FINAL_BOSS: BossConfig = {
  name: "DINO-X · EXPERIMENTO DEL LABORATORIO",
  intro: "El DINO-X se escapó del laboratorio ¡con sus bebés! Derrotalo",
  babies: (x) => BOSS_BABIES.dino(x),
  frames: () => [Texture.from("myDino")],
  facesRight: true,
  scale: 2.1,
  hpMul: 1,
  color: 0x76ff03,
  shot: SHOTS.acid,
  lab: true,
  final: true,
};

type BossState = "enter" | "idle" | "spitWind" | "spit" | "chargeWarn" | "charge" | "stunned" | "hurt" | "return" | "jump" | "summon" | "dying";

/**
 * Jefe genérico. Ataques: tira proyectiles, embiste (y queda mareado contra la pared) y salta generando ondas.
 * Sólo se le puede pegar saltándole en la cabeza mientras está MAREADO.
 * Emite "stunned" y "hit".
 */
export class Boss extends Container {
  public readonly maxHp: number;
  public hp: number;
  public done = false;
  public readonly cfg: BossConfig;

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
  private readonly S: number;
  private readonly dw: number;
  private readonly dh: number;
  private readonly homeX: number;
  private readonly leftX: number;

  private readonly body = new Container();
  private readonly spr: AnimatedSprite;
  private readonly aura = new Graphics();
  private readonly eye = new Graphics();
  private readonly stars = new Container();
  private readonly hurtFilter = new filters.ColorMatrixFilter();

  constructor(cfg: BossConfig, maxHp: number, speed: number) {
    super();
    this.cfg = cfg;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.speed = speed;
    this.S = cfg.scale;

    const frames = cfg.frames();
    this.spr = new AnimatedSprite(frames, false);
    this.spr.anchor.set(0.5, 1);
    this.spr.animationSpeed = cfg.anim ?? 0.1;
    this.spr.play();
    const look = new filters.ColorMatrixFilter();
    if (cfg.lab) {
      look.hue(105, false);
      look.saturate(0.4, true);
      look.brightness(1.6, true);
      this.spr.filters = [look];
    } else if (cfg.hue) {
      look.hue(cfg.hue, false);
      this.spr.filters = [look];
    }
    this.dw = frames[0].width * this.S;
    this.dh = frames[0].height * this.S;
    this.homeX = Math.min(1500, WIDTH - this.dw / 2 - 20);
    this.leftX = this.dw / 2 + 110;

    // aura de jefe detrás del cuerpo
    this.aura.beginFill(cfg.color, 0.18);
    this.aura.drawEllipse(0, -this.dh * 0.45, this.dw * 0.62, this.dh * 0.6);
    this.aura.endFill();
    this.addChild(this.aura);

    this.body.addChild(this.spr);
    if (cfg.lab) {
      this.body.addChild(this.buildLabGear());
    }
    this.addChild(this.body);
    this.face(-1);

    for (let i = 0; i < 3; i++) {
      const st = new Text("★", style({ fontSize: 46, fill: "#ffeb3b", strokeThickness: 4 }));
      st.anchor.set(0.5);
      this.stars.addChild(st);
    }
    this.stars.visible = false;
    this.addChild(this.stars);

    this.position.set(WIDTH + this.dw / 2 + 60, GROUND_Y + 6);
  }

  /** Casco metálico, ojo robótico, collar, tubos y grillete roto (sólo DINO-X, coordenadas de dino.png). */
  private buildLabGear(): Container {
    const o = (px: number, py: number): [number, number] => [px - 121, py - 171];
    const c = new Container();
    const g = new Graphics();
    g.lineStyle({ width: 4, color: 0x76ff03, alpha: 0.9 });
    const [ax, ay] = o(168, 52);
    const [bx, by] = o(105, 30);
    g.moveTo(ax, ay);
    g.bezierCurveTo(ax - 20, ay - 30, bx + 20, by - 25, bx, by);
    g.lineStyle(0);
    g.beginFill(0x455a64);
    g.drawRoundedRect(bx - 12, by - 6, 24, 12, 4);
    g.endFill();
    const [cx, cy] = o(166, 44);
    g.lineStyle(2, 0x263238);
    g.beginFill(0x78909c);
    g.drawPolygon([cx - 6, cy - 4, cx + 14, cy - 10, cx + 22, cy + 18, cx + 2, cy + 24]);
    g.endFill();
    g.lineStyle(0);
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
    const [lx, ly] = o(150, 140);
    g.lineStyle(3, 0x546e7a);
    g.drawRect(lx - 9, ly - 4, 18, 9);
    g.moveTo(lx + 9, ly);
    g.lineTo(lx + 16, ly + 6);
    g.lineTo(lx + 12, ly + 12);
    g.lineStyle(0);
    c.addChild(g);
    const [ex, ey] = o(206, 19);
    this.eye.beginFill(0xff1744, 0.35);
    this.eye.drawCircle(ex, ey, 7);
    this.eye.endFill();
    this.eye.beginFill(0xff1744);
    this.eye.drawCircle(ex, ey, 3.2);
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

  /** Si tocarlo hace daño (no cuando está mareado, golpeado, retirándose o muriendo). */
  public get harmful(): boolean {
    return this.state !== "stunned" && this.state !== "hurt" && this.state !== "dying" && this.state !== "enter" && this.state !== "return";
  }

  public get dying(): boolean {
    return this.state === "dying";
  }

  /** Zona de la cabeza/lomo donde se lo aplasta (franja de arriba). */
  public weakBox(): Rectangle {
    const h = Math.max(100, this.dh * 0.35);
    const top = this.y - this.dh - 20 + (this.stunned ? 30 : 0);
    return new Rectangle(this.x - this.dw * 0.45, top, this.dw * 0.9, h);
  }

  public bodyBox(): Rectangle {
    return new Rectangle(this.x - this.dw * 0.42, this.y - this.dh * 0.82, this.dw * 0.84, this.dh * 0.8);
  }

  public hit(): void {
    this.hp--;
    this.flashT = 0.5;
    this.stars.visible = false;
    if (this.hp <= 0) {
      this.state = "dying";
      this.timer = this.cfg.final ? 2.6 : 1.8;
      Sfx.roar();
    } else {
      this.state = "hurt";
      this.timer = 0.8;
    }
    this.emit("hit");
  }

  private face(dir: -1 | 1): void {
    this.facing = dir;
    const mirrored = (dir > 0) !== this.cfg.facesRight;
    this.body.scale.set(mirrored ? -this.S : this.S, this.S);
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
    // los jefes de mundo arrancan embistiendo (pelea más corta); el DINO-X arranca escupiendo.
    // Los que tienen bebés los largan entre ataque y ataque.
    type Attack = "spit" | "charge" | "quake" | "babies";
    const withBabies = !!this.cfg.babies;
    const seq: Attack[] = this.cfg.final
      ? ["spit", "babies", "charge", "quake", "babies", "charge"]
      : withBabies
        ? ["charge", "babies", "spit", "quake", "charge"]
        : ["charge", "spit", "quake", "charge", "spit"];
    const a = seq[this.attackIdx++ % seq.length];
    if (a === "babies") {
      this.state = "summon";
      this.timer = 0.7;
      this.spitLeft = this.enraged ? 3 : 2;
      Sfx.roar();
    } else if (a === "spit") {
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
    this.spr.update(dt * 60);
    this.aura.alpha = 0.7 + Math.sin(this.t * 4) * 0.3;

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
        if (this.x <= this.homeX) {
          this.x = this.homeX;
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
      case "summon":
        // se para en dos patas, ruge y van saliendo los bebés
        this.body.rotation = -0.12 + Math.sin(this.t * 20) * 0.02;
        if (this.timer <= 0 && this.spitLeft > 0 && this.cfg.babies) {
          const bx = this.x + this.facing * this.dw * 0.35;
          ctx.spawn(this.cfg.babies(bx));
          ctx.burst(bx, GROUND_Y - 40, { count: 14, colors: [this.cfg.color, 0xffffff], speed: 320, life: 0.5, gravity: 600, up: 200 });
          this.spitLeft--;
          this.timer = 0.4;
          if (this.spitLeft === 0) {
            this.idle(1.1);
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
          ctx.burst(this.x + this.dw * 0.3, GROUND_Y - 10, { count: 2, colors: [0xa1887f, 0x8d6e63], speed: 160, life: 0.4, gravity: 500, up: 150 });
        }
        if (this.x <= this.leftX) {
          this.x = this.leftX;
          this.state = "stunned";
          this.timer = (this.enraged ? 2.2 : 2.8) / Math.max(1, this.speed);
          this.body.rotation = -0.1;
          this.body.y = 0;
          this.stars.visible = true;
          Sfx.boom();
          ctx.shake(20, 0.45);
          ctx.burst(this.x - this.dw * 0.5, GROUND_Y - 120, { count: 26, colors: [0xffffff, 0xffeb3b, 0xa1887f], speed: 520, life: 0.6 });
          this.emit("stunned");
        }
        break;
      case "stunned": {
        this.body.rotation = -0.1 + Math.sin(this.t * 5) * 0.03;
        this.stars.position.set(-this.dw * 0.25, -this.dh - 10);
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
        if (this.x >= this.homeX) {
          this.x = this.homeX;
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
          ctx.burst(this.x, GROUND_Y - 10, { count: 30, colors: [this.cfg.color, 0xa1887f, 0xffffff], speed: 600, life: 0.6, gravity: 1200, up: 300 });
          const v = 640 * this.spd;
          ctx.spawn(new Shockwave(this.x - this.dw * 0.4, -v, this.cfg.color));
          ctx.spawn(new Shockwave(this.x + this.dw * 0.4, v, this.cfg.color));
          if (this.enraged) {
            ctx.spawn(new Shockwave(this.x - this.dw * 0.4, -v * 0.62, this.cfg.color));
          }
          this.idle(1);
        }
        break;
      case "dying":
        this.body.rotation = Math.sin(this.t * 30) * 0.05;
        if (Math.random() < 0.35) {
          ctx.burst(this.x + rand(-this.dw * 0.4, this.dw * 0.4), this.y - rand(30, this.dh * 0.9), { count: 16, colors: [0xff6d00, 0xffeb3b, this.cfg.color, 0xffffff], speed: 480, life: 0.6 });
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
    const x0 = this.x + this.facing * this.dw * 0.45; // sale de la boca (adelante)
    const y0 = this.y - this.dh * 0.72;
    const T = rand(0.9, 1.15);
    const g = 1400;
    const tx = ctx.px + rand(-120, 120);
    const ty = ctx.py - 60;
    const vx = (tx - x0) / T;
    const vy = (ty - y0) / T - 0.5 * g * T;
    ctx.spawn(new AcidBall(x0, y0, vx, vy, g, this.cfg.shot));
    Sfx.spit();
    ctx.burst(x0, y0, { count: 8, colors: this.cfg.shot.trail, speed: 200, life: 0.3, gravity: 0 });
  }
}
