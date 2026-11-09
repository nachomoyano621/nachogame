import { Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { HEIGHT, WIDTH, rand } from "../config";
import { getDifficulty } from "../config";
import { IScene, SceneManager } from "../core/SceneManager";
import { Effects } from "../game/Effects";
import { getCharacter } from "../game/characters";
import { GameStats } from "../game/types";
import { TextButton } from "../ui/Button";
import { StatsPanel } from "../ui/StatsPanel";
import { style } from "../ui/styles";
import { Keyboard } from "../utils/Keyboard";
import { GameScene } from "./GameScene";
import { StartScene } from "./StartScene";

/** Pantalla de victoria con rayos girando y confetti. */
export class WinScene extends Container implements IScene {
  private readonly rays = new Graphics();
  private readonly medal: Sprite;
  private readonly title: Text;
  private readonly panel: StatsPanel;
  private readonly fx = new Effects();
  private ready = 0.8;
  private t = 0;

  constructor(private readonly stats: GameStats) {
    super();

    const bg = new Graphics();
    bg.beginFill(0xff9800);
    bg.drawRect(0, 0, WIDTH, HEIGHT);
    bg.endFill();
    this.addChild(bg);

    for (let i = 0; i < 24; i++) {
      const a0 = (i / 24) * Math.PI * 2;
      const a1 = ((i + 0.5) / 24) * Math.PI * 2;
      this.rays.beginFill(0xffe0b2, 0.55);
      this.rays.drawPolygon([0, 0, Math.cos(a0) * 2400, Math.sin(a0) * 2400, Math.cos(a1) * 2400, Math.sin(a1) * 2400]);
      this.rays.endFill();
    }
    this.rays.position.set(500, HEIGHT / 2);
    this.addChild(this.rays);

    this.medal = new Sprite(Texture.from("win"));
    this.medal.anchor.set(0.5);
    this.medal.scale.set(0.92);
    this.medal.position.set(500, HEIGHT / 2);
    this.addChild(this.medal);

    this.title = new Text("¡GANASTE!", style({ fontSize: 130, fill: ["#ffffff", "#ffeb3b"], stroke: "#b71c1c", strokeThickness: 14 }));
    this.title.anchor.set(0.5);
    this.title.position.set(1400, 150);
    this.addChild(this.title);

    this.panel = new StatsPanel(stats, 880);
    this.panel.position.set(1400, 480);
    this.addChild(this.panel);

    const retry = new TextButton("↻  OTRA VEZ (ENTER)", () => this.retry(), { width: 520, color: 0x43a047 });
    retry.position.set(1400, 790);
    const menu = new TextButton("☰  MENÚ (ESC)", () => this.menu(), { width: 520, color: 0x29b6f6 });
    menu.position.set(1400, 915);
    this.addChild(retry, menu, this.fx);

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
    this.rays.rotation += dt * 0.15;
    this.medal.scale.set(0.92 + Math.sin(this.t * 3) * 0.02);
    this.title.rotation = Math.sin(this.t * 2) * 0.03;
    if (Math.random() < 0.25) {
      this.fx.burst(rand(0, WIDTH), -20, {
        count: 6,
        colors: [0xff1744, 0xffeb3b, 0x00e676, 0x2979ff, 0xe040fb],
        speed: 160,
        life: 3,
        gravity: 260,
        size: 1.2,
      });
    }
    this.fx.update(dt);
    this.panel.update(dt);
  }

  public onExit(): void {
    Keyboard.down.off("key", this.onKey, this);
  }
}
