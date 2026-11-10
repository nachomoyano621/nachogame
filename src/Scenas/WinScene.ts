import { AnimatedSprite, Container, Graphics, Sprite, Text } from "pixi.js";
import { FINAL_BOSS, WORLD_BOSSES } from "../game/Boss";
import { HEIGHT, WIDTH, WORLDS, getDifficulty, rand } from "../config";
import { IScene, SceneManager } from "../core/SceneManager";
import { Effects } from "../game/Effects";
import { getCharacter, scaleFor } from "../game/characters";
import { GameStats } from "../game/types";
import { TextButton } from "../ui/Button";
import { StatsPanel } from "../ui/StatsPanel";
import { style } from "../ui/styles";
import { Keyboard } from "../utils/Keyboard";
import { GameScene } from "./GameScene";
import { StartScene } from "./StartScene";

const HERO_X = 400;
const HERO_Y = 700;
const TROPHY_Y = 580;
const FLOOR_Y = 980;
const FIREWORK_COLORS = [
  [0xff1744, 0xff8a80, 0xffffff],
  [0xffd600, 0xffff8d, 0xffffff],
  [0x00e5ff, 0x84ffff, 0xffffff],
  [0x76ff03, 0xccff90, 0xffffff],
  [0xe040fb, 0xea80fc, 0xffffff],
];

/**
 * Pantalla de victoria: noche de festejo con fuegos artificiales y reflectores,
 * tu personaje saltando arriba del podio dorado, trofeo y el resumen de la partida.
 */
export class WinScene extends Container implements IScene {
  private readonly lights = new Graphics();
  private readonly fx = new Effects();
  private readonly hero: AnimatedSprite;
  private readonly trophy = new Container();
  private readonly title: Text;
  private readonly titleMask: Text;
  private readonly shine = new Graphics();
  private readonly panel: StatsPanel;
  private readonly heroBaseScale: number;
  private ready = 0.8;
  private t = 0;
  private fireworkT = 0.2;

  constructor(private readonly stats: GameStats) {
    super();

    // cielo de noche
    const bg = new Graphics();
    const bands = 40;
    for (let i = 0; i < bands; i++) {
      const k = i / (bands - 1);
      const r = Math.round(0x0d + (0x3a - 0x0d) * k);
      const g = Math.round(0x02 + (0x0c - 0x02) * k);
      const b = Math.round(0x21 + (0xa3 - 0x21) * k);
      bg.beginFill((r << 16) | (g << 8) | b);
      bg.drawRect(0, (HEIGHT / bands) * i, WIDTH, HEIGHT / bands + 1);
      bg.endFill();
    }
    for (let i = 0; i < 160; i++) {
      bg.beginFill(0xffffff, rand(0.3, 1));
      bg.drawCircle(rand(0, WIDTH), rand(0, 700), rand(1, 2.6));
      bg.endFill();
    }
    this.addChild(bg, this.lights, this.fx);

    // piso brillante
    const floor = new Graphics();
    floor.beginFill(0x1a1240);
    floor.drawRect(0, FLOOR_Y, WIDTH, HEIGHT - FLOOR_Y);
    floor.endFill();
    floor.beginFill(0xffd54f, 0.25);
    floor.drawRect(0, FLOOR_Y, WIDTH, 4);
    floor.endFill();
    this.addChild(floor);

    // círculo de luz en el piso donde festeja el personaje
    const spot = new Graphics();
    spot.beginFill(0xfff59d, 0.12);
    spot.drawEllipse(HERO_X + 120, HERO_Y + 4, 330, 46);
    spot.endFill();
    spot.beginFill(0xfff59d, 0.22);
    spot.drawEllipse(HERO_X + 120, HERO_Y + 4, 220, 28);
    spot.endFill();
    this.addChild(spot);

    // fila de JEFES VENCIDOS (en color los derrotados)
    this.buildBossRow(stats.bosses);

    // el personaje ganador festejando
    const def = getCharacter(stats.characterId);
    const frames = def.frames();
    this.hero = new AnimatedSprite(frames, false);
    this.hero.anchor.set(0.5, 1);
    this.heroBaseScale = scaleFor(def, frames) * 1.5;
    this.hero.scale.set(this.heroBaseScale);
    this.hero.animationSpeed = 0.2;
    this.hero.play();
    this.hero.position.set(HERO_X, HERO_Y);
    this.addChild(this.hero);

    // trofeo
    this.buildTrophy();
    this.trophy.position.set(HERO_X + 280, TROPHY_Y);
    this.addChild(this.trophy);

    // título con brillo que lo recorre
    const titleStyle = style({ fontSize: 170, fill: ["#fff59d", "#ffd600", "#ff8f00"], stroke: "#4a1500", strokeThickness: 16, dropShadow: true, dropShadowDistance: 8, dropShadowAlpha: 0.5 });
    this.title = new Text("¡GANASTE!", titleStyle);
    this.title.anchor.set(0.5);
    this.title.position.set(WIDTH / 2, 130);
    this.addChild(this.title);
    // brillo que recorre el título (la máscara es una COPIA del texto: un objeto usado como máscara no se dibuja)
    this.titleMask = new Text("¡GANASTE!", titleStyle);
    this.titleMask.anchor.set(0.5);
    this.titleMask.position.set(WIDTH / 2, 130);
    this.addChild(this.titleMask);
    this.shine.beginFill(0xffffff, 0.4);
    this.shine.drawPolygon([0, 0, 60, 0, 10, 220, -50, 220]);
    this.shine.endFill();
    this.shine.mask = this.titleMask;
    this.addChild(this.shine);

    const subText = stats.bossDefeated ? `¡Salvaste los ${WORLDS} mundos y venciste al DINO-X!` : "¡Completaste la aventura!";
    const sub = new Text(`${subText}  ·  ${getDifficulty(stats.difficulty).name}`, style({ fontSize: 40, fill: "#e1f5fe", strokeThickness: 7 }));
    sub.anchor.set(0.5);
    sub.position.set(WIDTH / 2, 250);
    this.addChild(sub);

    this.panel = new StatsPanel(stats, 860);
    this.panel.position.set(1390, 540);
    this.addChild(this.panel);

    const retry = new TextButton("↻  OTRA VEZ (ENTER)", () => this.retry(), { width: 520, color: 0x43a047 });
    retry.position.set(1390, 810);
    const menu = new TextButton("☰  MENÚ (ESC)", () => this.menu(), { width: 520, color: 0x29b6f6 });
    menu.position.set(1390, 930);
    this.addChild(retry, menu);

    Keyboard.down.on("key", this.onKey, this);
  }

  private buildTrophy(): void {
    const g = new Graphics();
    const gold = 0xffc107;
    const dark = 0xb07800;
    g.beginFill(0xffd54f, 0.25);
    g.drawCircle(0, -40, 150);
    g.endFill();
    // asas
    g.lineStyle(14, dark);
    g.arc(-78, -90, 38, Math.PI * 0.5, Math.PI * 1.5);
    g.moveTo(78, -128);
    g.arc(78, -90, 38, -Math.PI * 0.5, Math.PI * 0.5);
    g.lineStyle(0);
    // copa
    g.lineStyle(5, dark);
    g.beginFill(gold);
    g.drawPolygon([-85, -150, 85, -150, 60, -40, 20, -10, -20, -10, -60, -40]);
    g.endFill();
    // pie y base
    g.beginFill(gold);
    g.drawRect(-16, -12, 32, 50);
    g.drawRoundedRect(-60, 36, 120, 26, 8);
    g.endFill();
    g.lineStyle(0);
    g.beginFill(0x5d4037);
    g.drawRoundedRect(-75, 60, 150, 34, 8);
    g.endFill();
    // brillo y estrella
    g.beginFill(0xffffff, 0.45);
    g.drawEllipse(-40, -110, 12, 30);
    g.endFill();
    const star: number[] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? 30 : 13;
      star.push(Math.cos(a) * r, -95 + Math.sin(a) * r);
    }
    g.lineStyle(3, dark);
    g.beginFill(0xfff59d);
    g.drawPolygon(star);
    g.endFill();
    this.trophy.addChild(g);
  }

  /** Fila con los 8 jefes del juego: en color los vencidos (en orden), apagados los que faltaron. */
  private buildBossRow(beaten: number): void {
    const all = [...WORLD_BOSSES, FINAL_BOSS];
    const slot = 104;
    const x0 = 70;
    const y0 = 840;
    const label = new Text(`JEFES VENCIDOS: ${beaten}/${all.length}`, style({ fontSize: 30, fill: "#ffd54f", strokeThickness: 6 }));
    label.position.set(x0, y0 - 46);
    this.addChild(label);
    all.forEach((cfg, i) => {
      const done = i < beaten;
      const c = new Container();
      c.position.set(x0 + i * slot, y0);
      const box = new Graphics();
      box.lineStyle(3, done ? cfg.color : 0x555577, 0.9);
      box.beginFill(0x000000, 0.45);
      box.drawRoundedRect(0, 0, slot - 10, 100, 14);
      box.endFill();
      c.addChild(box);
      const tex = cfg.frames()[0];
      const spr = new Sprite(tex);
      spr.anchor.set(0.5, 1);
      const k = Math.min(78 / tex.width, 78 / tex.height);
      spr.scale.set(cfg.facesRight ? -k : k, k);
      spr.position.set((slot - 10) / 2, 90);
      if (!done) {
        spr.tint = 0x333344;
        spr.alpha = 0.6;
      }
      c.addChild(spr);
      if (done) {
        const check = new Text("✓", style({ fontSize: 34, fill: "#69f0ae", strokeThickness: 5 }));
        check.anchor.set(1, 0);
        check.position.set(slot - 14, -4);
        c.addChild(check);
      }
      this.addChild(c);
    });
  }

  private firework(): void {
    const x = rand(150, WIDTH - 150);
    const y = rand(120, 480);
    const colors = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
    this.fx.burst(x, y, { count: 46, colors, speed: 520, life: 1.4, gravity: 160, size: 1.1 });
    this.fx.burst(x, y, { count: 12, colors: [0xffffff], speed: 160, life: 0.6, gravity: 0, size: 0.8 });
  }

  private onKey(code: string): void {
    if (this.ready > 0) {
      return;
    }
    if (code === "Enter" || code === "NumpadEnter" || code === "Space") {
      this.retry();
    } else if (code === "Escape") {
      this.menu();
    }
  }

  private retry(): void {
    SceneManager.change(new GameScene(getCharacter(this.stats.characterId), getDifficulty(this.stats.difficulty)));
  }

  private menu(): void {
    SceneManager.change(new StartScene());
  }

  public update(dtMS: number): void {
    const dt = dtMS / 1000;
    this.t += dt;
    this.ready -= dt;

    // reflectores que se mueven
    this.lights.clear();
    for (const [bx, phase, color] of [[200, 0, 0xffd600], [WIDTH - 200, 1.7, 0x00e5ff]] as const) {
      const a = -Math.PI / 2 + Math.sin(this.t * 0.8 + phase) * 0.55;
      const len = 1300;
      const spread = 0.12;
      this.lights.beginFill(color, 0.1);
      this.lights.drawPolygon([bx, FLOOR_Y, bx + Math.cos(a - spread) * len, FLOOR_Y + Math.sin(a - spread) * len, bx + Math.cos(a + spread) * len, FLOOR_Y + Math.sin(a + spread) * len]);
      this.lights.endFill();
    }

    // fuegos artificiales
    this.fireworkT -= dt;
    if (this.fireworkT <= 0) {
      this.fireworkT = rand(0.35, 0.8);
      this.firework();
    }
    this.fx.update(dt);

    // personaje festejando
    const hop = Math.abs(Math.sin(this.t * 4.5));
    this.hero.y = HERO_Y - hop * 45;
    this.hero.scale.set(this.heroBaseScale * (1 + (1 - hop) * 0.05), this.heroBaseScale * (1 - (1 - hop) * 0.05));
    this.hero.update(dt * 60);

    this.trophy.y = TROPHY_Y + Math.sin(this.t * 2) * 10;
    this.trophy.rotation = Math.sin(this.t * 1.5) * 0.05;

    this.title.scale.set(1 + Math.sin(this.t * 3) * 0.03);
    this.titleMask.scale.copyFrom(this.title.scale);
    const sweep = ((this.t * 700) % (WIDTH + 800)) - 400;
    this.shine.position.set(sweep, 40);

    this.panel.update(dt);
  }

  public onExit(): void {
    Keyboard.down.off("key", this.onKey, this);
  }
}
