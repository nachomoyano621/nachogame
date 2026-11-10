import { AnimatedSprite, Graphics, Rectangle, Sprite, Texture, filters } from "pixi.js";
import { Art } from "../art/ProceduralArt";
import { WArt } from "../art/WorldArt";
import { BASE_WORLD_SPEED, GROUND_Y, WIDTH, rand } from "../config";
import { Eagle, Enemy, EnemyCtx } from "./enemies";

// ------------------------------------------------------------------ monstruos de cada mundo

export interface WalkerOpts {
  label: string;
  frames: Texture[];
  scale: number;
  speed: [number, number];
  hit: { w: number; h: number };
  stompable: boolean;
  anim: number;
  /** Salta cada tanto (aliens). */
  hop?: boolean;
}

/** Monstruo terrestre genérico (escorpión, cangrejo, serpiente, salamandra, alien). */
export class Walker extends Enemy {
  public override readonly stompable: boolean;
  public override readonly label: string;
  private readonly spr: AnimatedSprite;
  private readonly speed: number;
  private vy = 0;
  private hopT = rand(0.4, 1.2);

  constructor(private readonly o: WalkerOpts) {
    super();
    this.stompable = o.stompable;
    this.label = o.label;
    this.speed = rand(o.speed[0], o.speed[1]);
    this.spr = new AnimatedSprite(o.frames, false);
    this.spr.anchor.set(0.5, 1);
    this.spr.scale.set(o.scale);
    this.spr.animationSpeed = o.anim;
    this.spr.play();
    this.addChild(this.spr);
    this.position.set(WIDTH + 120, GROUND_Y + 2);
  }

  protected override tick(dt: number, ctx: EnemyCtx): void {
    this.x -= this.speed * ctx.speedMul * dt;
    this.spr.update(dt * 60);
    if (this.o.hop) {
      this.hopT -= dt;
      if (this.hopT <= 0 && this.vy === 0) {
        this.vy = -rand(550, 750);
        this.hopT = rand(0.9, 1.6);
      }
      if (this.vy !== 0) {
        this.vy += 2000 * dt;
        this.spr.y = Math.min(0, this.spr.y + this.vy * dt);
        if (this.spr.y === 0 && this.vy > 0) {
          this.vy = 0;
        }
      }
    } else {
      this.spr.y = -Math.abs(Math.sin(this.t * 10)) * 3;
    }
  }

  public override getHitbox(): Rectangle {
    const { w, h } = this.o.hit;
    return new Rectangle(this.x - w / 2, this.y + this.spr.y - h, w, h);
  }
}

export interface FlyerOpts {
  label: string;
  frames: Texture[];
  scale: number;
  speed: [number, number];
  baseY: [number, number];
  amp: number;
  freq: number;
  hit: { w: number; h: number };
  stompable: boolean;
  anim: number;
}

/** Monstruo volador genérico (medusa, OVNI). */
export class Flyer extends Enemy {
  public override readonly stompable: boolean;
  public override readonly label: string;
  private readonly spr: AnimatedSprite;
  private readonly speed: number;
  private readonly baseY: number;

  constructor(private readonly o: FlyerOpts) {
    super();
    this.stompable = o.stompable;
    this.label = o.label;
    this.speed = rand(o.speed[0], o.speed[1]);
    this.baseY = rand(o.baseY[0], o.baseY[1]);
    this.spr = new AnimatedSprite(o.frames, false);
    this.spr.anchor.set(0.5);
    this.spr.scale.set(o.scale);
    this.spr.animationSpeed = o.anim;
    this.spr.play();
    this.addChild(this.spr);
    this.position.set(WIDTH + 120, this.baseY);
  }

  protected override tick(dt: number, ctx: EnemyCtx): void {
    this.x -= this.speed * ctx.speedMul * dt;
    this.y = this.baseY + Math.sin(this.t * this.o.freq) * this.o.amp;
    this.spr.rotation = Math.sin(this.t * 3) * 0.06;
    this.spr.update(dt * 60);
  }

  public override getHitbox(): Rectangle {
    const { w, h } = this.o.hit;
    return new Rectangle(this.x - w / 2, this.y - h / 2, w, h);
  }
}

/** Volcán: bola de lava que burbujea en el piso y salta. No se puede aplastar. */
export class LavaBall extends Enemy {
  public override readonly stompable = false;
  public override readonly label = "lava";
  private readonly marker = new Graphics();
  private readonly ball: Sprite;
  private state: "warn" | "jump" = "warn";
  private timer = 1;
  private vy = 0;

  constructor(x: number) {
    super();
    this.marker.beginFill(0xff6d00, 0.7);
    this.marker.drawEllipse(0, 0, 60, 14);
    this.marker.endFill();
    this.marker.beginFill(0xffd600, 0.8);
    this.marker.drawEllipse(0, 0, 30, 7);
    this.marker.endFill();
    this.addChild(this.marker);
    this.ball = new Sprite(WArt.lava);
    this.ball.anchor.set(0.5);
    this.ball.visible = false;
    this.addChild(this.ball);
    this.position.set(x, GROUND_Y);
  }

  protected override tick(dt: number, ctx: EnemyCtx): void {
    this.x -= BASE_WORLD_SPEED * ctx.speedMul * dt;
    if (this.state === "warn") {
      this.timer -= dt;
      this.marker.scale.set(0.6 + Math.sin(this.t * 20) * 0.15 + (1 - this.timer) * 0.4);
      if (Math.random() < 0.5) {
        ctx.burst(this.x + rand(-40, 40), GROUND_Y - 4, { count: 1, colors: [0xff6d00, 0xffd600], speed: 120, life: 0.4, gravity: 600, up: 250, size: 0.8 });
      }
      if (this.timer <= 0) {
        this.state = "jump";
        this.marker.visible = false;
        this.ball.visible = true;
        this.ball.y = 10;
        this.vy = -rand(1150, 1400);
        ctx.burst(this.x, GROUND_Y - 10, { count: 18, colors: [0xff6d00, 0xffd600, 0xff3d00], speed: 420, life: 0.5, gravity: 900, up: 300 });
      }
      return;
    }
    this.vy += 2300 * dt;
    this.ball.y += this.vy * dt;
    this.ball.rotation += dt * 6;
    ctx.burst(this.x, this.y + this.ball.y, { count: 1, colors: [0xff6d00, 0xffab00], speed: 60, life: 0.3, gravity: -100, size: 0.9 });
    if (this.vy > 0 && this.ball.y >= 10) {
      ctx.burst(this.x, GROUND_Y - 10, { count: 14, colors: [0xff6d00, 0xffd600], speed: 300, life: 0.4, gravity: 900, up: 200 });
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
    return new Rectangle(this.x - 30, this.y + this.ball.y - 30, 60, 60);
  }
}

/** Bebé DINO-X: mini dino mutante que larga el jefe final. Corre a los saltitos; se puede aplastar. */
export class BabyDino extends Enemy {
  public override readonly stompable = true;
  public override readonly label = "bebé dino-x";
  private readonly spr: Sprite;
  private readonly speed = rand(330, 430);
  private vy = 0;
  private hopT = rand(0.2, 0.8);

  constructor(x: number) {
    super();
    this.spr = Sprite.from("myDino");
    this.spr.anchor.set(0.5, 1);
    this.spr.scale.set(-0.42, 0.42);
    const mutant = new filters.ColorMatrixFilter();
    mutant.hue(105, false);
    mutant.brightness(1.5, true);
    this.spr.filters = [mutant];
    this.addChild(this.spr);
    this.position.set(x, GROUND_Y + 2);
  }

  protected override tick(dt: number, ctx: EnemyCtx): void {
    this.x -= this.speed * ctx.speedMul * dt;
    this.hopT -= dt;
    if (this.hopT <= 0 && this.vy === 0) {
      this.vy = -rand(380, 520);
      this.hopT = rand(0.6, 1.1);
    }
    if (this.vy !== 0) {
      this.vy += 2000 * dt;
      this.spr.y = Math.min(0, this.spr.y + this.vy * dt);
      if (this.spr.y === 0 && this.vy > 0) {
        this.vy = 0;
      }
    }
    this.spr.rotation = Math.sin(this.t * 18) * 0.08;
  }

  public override getHitbox(): Rectangle {
    return new Rectangle(this.x - 42, this.y + this.spr.y - 62, 84, 60);
  }
}

/** Bebés de los jefes (aparecen a la posición x). */
export const BOSS_BABIES = {
  dino: (x: number): Enemy => new BabyDino(x),
  alien: (x: number): Enemy => {
    const e = new Walker({ label: "bebé marciano", frames: WArt.alien, scale: 0.55, speed: [320, 420], hit: { w: 46, h: 76 }, stompable: true, anim: 0.2, hop: true });
    e.x = x;
    return e;
  },
};

/** Fábricas de los monstruos propios de cada mundo. */
export const WORLD_ENEMIES = {
  scorpion: (): Enemy => new Walker({ label: "escorpión", frames: WArt.scorpion, scale: 0.95, speed: [240, 320], hit: { w: 110, h: 62 }, stompable: true, anim: 0.12 }),
  vulture: (): Enemy => new Eagle(Art.vulture, "buitre"),
  crab: (): Enemy => new Walker({ label: "cangrejo", frames: WArt.crab, scale: 0.9, speed: [280, 360], hit: { w: 100, h: 62 }, stompable: true, anim: 0.2 }),
  jelly: (): Enemy => new Flyer({ label: "medusa", frames: WArt.jelly, scale: 0.85, speed: [200, 260], baseY: [720, 850], amp: 55, freq: 2, hit: { w: 76, h: 90 }, stompable: false, anim: 0.08 }),
  snake: (): Enemy => new Walker({ label: "serpiente", frames: WArt.snake, scale: 1, speed: [260, 330], hit: { w: 150, h: 40 }, stompable: true, anim: 0.1 }),
  salamander: (): Enemy => new Walker({ label: "salamandra", frames: WArt.salamander, scale: 1, speed: [330, 410], hit: { w: 140, h: 52 }, stompable: true, anim: 0.18 }),
  lava: (x: number): Enemy => new LavaBall(x),
  alien: (): Enemy => new Walker({ label: "alien", frames: WArt.alien, scale: 0.95, speed: [250, 320], hit: { w: 70, h: 125 }, stompable: true, anim: 0.15, hop: true }),
  bricky: (): Enemy => new Walker({ label: "bloquecito", frames: WArt.brickMonster, scale: 0.95, speed: [270, 350], hit: { w: 100, h: 96 }, stompable: true, anim: 0.18, hop: true }),
  copter: (): Enemy => new Flyer({ label: "helibloque", frames: WArt.brickCopter, scale: 0.9, speed: [260, 330], baseY: [640, 800], amp: 70, freq: 2, hit: { w: 110, h: 60 }, stompable: true, anim: 0.4 }),
  ufo: (): Enemy => new Flyer({ label: "ovni", frames: WArt.ufo, scale: 0.9, speed: [260, 320], baseY: [640, 780], amp: 90, freq: 1.6, hit: { w: 140, h: 60 }, stompable: true, anim: 0.12 }),
};
