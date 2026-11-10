import { Container, Graphics, Sprite, Text } from "pixi.js";
import { AudioCtl } from "../core/AudioCtl";
import { HEIGHT, WIDTH, WORLDS, getDifficulty, rand } from "../config";
import { IScene, SceneManager } from "../core/SceneManager";
import { LEVEL_NAMES } from "../game/Background";
import { Effects } from "../game/Effects";
import { getCharacter, scaleFor } from "../game/characters";
import { GameStats } from "../game/types";
import { TextButton } from "../ui/Button";
import { StatsPanel } from "../ui/StatsPanel";
import { style } from "../ui/styles";
import { Keyboard } from "../utils/Keyboard";
import { GameScene } from "./GameScene";
import { StartScene } from "./StartScene";

/**
 * Pantalla de Game Over propia: fondo oscuro, título con efecto glitch,
 * el personaje caído con estrellitas, ceniza cayendo y el resumen de la partida.
 */
export class FinalScene extends Container implements IScene {
  private readonly panel: StatsPanel;
  private readonly title: Text;
  private readonly ghostA: Text;
  private readonly ghostB: Text;
  private readonly hero: Sprite;
  private readonly stars = new Container();
  private readonly fx = new Effects();
  private ready = 0.6; // evita saltear la pantalla con una tecla que venía apretada
  private t = 0;
  private glitchT = 0;

  constructor(private readonly stats: GameStats) {
    super();
    AudioCtl.music("gameover");

    // fondo: degradé rojo oscuro a negro + resplandor
    const bg = new Graphics();
    const bands = 40;
    for (let i = 0; i < bands; i++) {
      const k = i / (bands - 1);
      const r = Math.round(0x3a * (1 - k) + 0x05 * k);
      bg.beginFill((r << 16) | (0x02 << 8) | 0x08);
      bg.drawRect(0, (HEIGHT / bands) * i, WIDTH, HEIGHT / bands + 1);
      bg.endFill();
    }
    bg.beginFill(0xff1744, 0.08);
    bg.drawEllipse(WIDTH / 2, 470, 700, 260);
    bg.endFill();
    // líneas de "scan" tipo TV vieja
    for (let y = 0; y < HEIGHT; y += 6) {
      bg.beginFill(0x000000, 0.18);
      bg.drawRect(0, y, WIDTH, 2);
      bg.endFill();
    }
    this.addChild(bg, this.fx);

    // título con glitch (dos copias desplazadas en cian y magenta)
    const titleStyle = { fontSize: 190, strokeThickness: 0 };
    this.ghostA = new Text("GAME OVER", style({ ...titleStyle, fill: "#00e5ff" }));
    this.ghostB = new Text("GAME OVER", style({ ...titleStyle, fill: "#ff00e5" }));
    this.title = new Text("GAME OVER", style({ fontSize: 190, fill: ["#ffffff", "#ff8a80", "#d50000"], stroke: "#1a0000", strokeThickness: 14 }));
    for (const t of [this.ghostA, this.ghostB, this.title]) {
      t.anchor.set(0.5);
      t.position.set(WIDTH / 2, 150);
      this.addChild(t);
    }
    this.ghostA.alpha = 0.55;
    this.ghostB.alpha = 0.55;

    const where = stats.reachedBoss ? `Te venció el DINO-X en el ${LEVEL_NAMES[WORLDS]}` : `Caíste en el MUNDO ${stats.level}: ${LEVEL_NAMES[stats.level - 1]}`;
    const sub = new Text(`${where}  ·  ${getDifficulty(stats.difficulty).name}`, style({ fontSize: 38, fill: "#ffcdd2", strokeThickness: 6 }));
    sub.anchor.set(0.5);
    sub.position.set(WIDTH / 2, 275);
    this.addChild(sub);

    // el personaje tirado en el piso, mareado
    const def = getCharacter(stats.characterId);
    const frames = def.frames();
    const shadow = new Graphics();
    shadow.beginFill(0x000000, 0.45);
    shadow.drawEllipse(WIDTH / 2, 478, 150, 20);
    shadow.endFill();
    this.addChild(shadow);
    this.hero = new Sprite(frames[0]);
    this.hero.anchor.set(0.5);
    // acostado: el ancho de la textura pasa a ser el alto en pantalla (máx. 130 px para no pisar el texto)
    const tex = frames[0];
    this.hero.scale.set(Math.min(scaleFor(def, frames) * 1.35, 130 / tex.width));
    this.hero.rotation = -Math.PI / 2;
    const lyingH = tex.width * this.hero.scale.x;
    this.hero.position.set(WIDTH / 2, 478 - lyingH / 2 + 6);
    this.hero.tint = 0xdddddd;
    this.addChild(this.hero);
    for (let i = 0; i < 3; i++) {
      const st = new Text("★", style({ fontSize: 40, fill: "#ffeb3b", strokeThickness: 4 }));
      st.anchor.set(0.5);
      this.stars.addChild(st);
    }
    // estrellitas sobre la cabeza (que queda del lado izquierdo)
    const lyingW = tex.height * this.hero.scale.y;
    this.stars.position.set(WIDTH / 2 - lyingW / 2 + 30, this.hero.y - lyingH / 2 - 14);
    this.addChild(this.stars);

    this.panel = new StatsPanel(stats, 1100);
    this.panel.position.set(WIDTH / 2, 690);
    this.addChild(this.panel);

    const retry = new TextButton("↻  REINTENTAR (ENTER)", () => this.retry(), { width: 560, color: 0xff5252 });
    retry.position.set(WIDTH / 2 - 310, 960);
    const menu = new TextButton("☰  MENÚ (ESC)", () => this.menu(), { width: 460, color: 0x29b6f6 });
    menu.position.set(WIDTH / 2 + 310, 960);
    this.addChild(retry, menu);

    Keyboard.down.on("key", this.onKey, this);
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
    this.panel.update(dt);
    this.fx.update(dt);

    // glitch: cada tanto las copias se corren
    this.glitchT -= dt;
    if (this.glitchT <= 0) {
      this.glitchT = rand(0.05, 0.12);
      const strong = Math.random() < 0.15;
      const a = strong ? 18 : 5;
      this.ghostA.position.set(WIDTH / 2 + rand(-a, a), 150 + rand(-a / 2, a / 2));
      this.ghostB.position.set(WIDTH / 2 + rand(-a, a), 150 + rand(-a / 2, a / 2));
      this.title.x = WIDTH / 2 + (strong ? rand(-8, 8) : 0);
    }
    this.title.scale.set(1 + Math.sin(this.t * 2) * 0.015);

    // estrellitas girando sobre la cabeza
    this.stars.children.forEach((st, i) => {
      const a = this.t * 3.5 + (i * Math.PI * 2) / 3;
      st.position.set(Math.cos(a) * 55, Math.sin(a) * 14);
      st.scale.set(0.8 + Math.sin(a) * 0.25);
    });
    this.hero.y += Math.sin(this.t * 2) * 0.05;

    // ceniza cayendo
    if (Math.random() < 0.5) {
      this.fx.burst(rand(0, WIDTH), -10, { count: 1, colors: [0x9e9e9e, 0x616161, 0xff5252], speed: 40, life: 4, gravity: 60, size: 0.6 });
    }
  }

  public onExit(): void {
    Keyboard.down.off("key", this.onKey, this);
  }
}
