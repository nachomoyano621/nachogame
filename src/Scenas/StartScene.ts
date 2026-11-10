import { AnimatedSprite, Container, Graphics, Text } from "pixi.js";
import { AudioCtl } from "../core/AudioCtl";
import { DIFFICULTIES, HEIGHT, WIDTH, WORLDS } from "../config";
import { Background, LEVEL_NAMES } from "../game/Background";
import { IScene, SceneManager } from "../core/SceneManager";
import { Sfx } from "../core/Sfx";
import { Storage } from "../core/Storage";
import { CHARACTERS, CharacterDef, scaleFor } from "../game/characters";
import { TextButton } from "../ui/Button";
import { style } from "../ui/styles";
import { Keyboard } from "../utils/Keyboard";
import { GameScene } from "./GameScene";

const CARD_W = 380;
const CARD_H = 520;

class CharacterCard extends Container {
  private readonly panel = new Graphics();
  private readonly preview: AnimatedSprite;
  private readonly baseScale: number;
  private selected = false;
  private t = Math.random() * 3;

  constructor(public readonly def: CharacterDef) {
    super();
    this.addChild(this.panel);

    const frames = def.frames();
    this.preview = new AnimatedSprite(frames, false);
    this.preview.anchor.set(0.5, 1);
    this.baseScale = scaleFor(def, frames) * 1.1;
    this.preview.scale.set(this.baseScale);
    this.preview.y = -58;
    this.preview.play();
    this.addChild(this.preview);

    const name = new Text(def.name, style({ fontSize: 32, fill: `#${def.accent.toString(16).padStart(6, "0")}`, strokeThickness: 6 }));
    name.anchor.set(0.5, 0);
    name.y = -44;
    this.addChild(name);

    const desc = new Text(def.desc, style({ fontSize: 22, strokeThickness: 0, wordWrap: true, wordWrapWidth: CARD_W - 50, align: "center", fill: "#eceff1" }));
    desc.anchor.set(0.5, 0);
    desc.y = 2;
    this.addChild(desc);

    const rows: [string, number][] = [
      ["VELOCIDAD", def.stats.velocidad],
      ["SALTO", def.stats.salto],
      ["VIDAS", def.stats.vidas],
    ];
    rows.forEach(([label, value], i) => {
      const y = 100 + i * 46;
      const l = new Text(label, style({ fontSize: 22, strokeThickness: 4 }));
      l.anchor.set(0, 0.5);
      l.position.set(-CARD_W / 2 + 28, y);
      this.addChild(l);
      const pips = new Graphics();
      for (let p = 0; p < 5; p++) {
        pips.beginFill(p < value ? def.accent : 0xffffff, p < value ? 1 : 0.18);
        pips.drawRoundedRect(p * 34, -10, 28, 20, 6);
        pips.endFill();
      }
      pips.position.set(10, y);
      this.addChild(pips);
    });

    this.interactive = true;
    this.cursor = "pointer";
    this.draw();
  }

  public setSelected(s: boolean): void {
    this.selected = s;
    this.draw();
  }

  private draw(): void {
    const g = this.panel;
    g.clear();
    g.lineStyle(this.selected ? 8 : 3, this.selected ? this.def.accent : 0xffffff, this.selected ? 1 : 0.4);
    g.beginFill(0x000000, this.selected ? 0.72 : 0.55);
    g.drawRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 28);
    g.endFill();
    // "piso" de la vista previa
    g.lineStyle(0);
    g.beginFill(this.def.accent, this.selected ? 0.35 : 0.15);
    g.drawEllipse(0, -58, 90, 14);
    g.endFill();
  }

  public update(dt: number): void {
    this.t += dt;
    this.preview.animationSpeed = this.selected ? 0.3 : 0.1;
    this.preview.update(dt * 60);
    const target = this.selected ? 1.06 : 0.93;
    const s = this.scale.x + (target - this.scale.x) * Math.min(1, dt * 10);
    this.scale.set(s);
    this.alpha = this.selected ? 1 : 0.8;
    this.preview.y = -58 - (this.selected ? Math.abs(Math.sin(this.t * 3)) * 18 : 0);
  }
}

export class StartScene extends Container implements IScene {
  private readonly cards: CharacterCard[] = [];
  private readonly diffButtons: Graphics[] = [];
  private diffIdx = 1;
  private bestText!: Text;
  private readonly title: Text;
  private selected = 0;
  private t = 0;
  private readonly bg = new Background();
  private readonly worldName: Text;
  private worldIdx = 0;
  private worldT = 0;

  constructor() {
    super();
    AudioCtl.music("select");

    // De fondo pasan los mundos del juego, uno tras otro
    this.addChild(this.bg);
    const dim = new Graphics();
    dim.beginFill(0x000000, 0.25);
    dim.drawRect(0, 0, WIDTH, HEIGHT);
    dim.endFill();
    const bands = 20;
    for (let i = 0; i < bands; i++) {
      dim.beginFill(0x000000, (i / bands) * 0.45);
      dim.drawRect(0, 300 + ((HEIGHT - 300) / bands) * i, WIDTH, (HEIGHT - 300) / bands + 1);
      dim.endFill();
    }
    this.addChild(dim);
    this.worldName = new Text("", style({ fontSize: 21, fill: "#ffe082", strokeThickness: 5 }));
    this.worldName.position.set(22, 14);
    this.addChild(this.worldName);
    this.showWorld(0);

    this.title = new Text(
      "TOMI GAME",
      style({ fontSize: 150, fill: ["#fff176", "#ff6f00"], stroke: "#3e0000", strokeThickness: 16, dropShadow: true, dropShadowDistance: 8, dropShadowColor: "#000000", dropShadowAlpha: 0.6 }),
    );
    this.title.anchor.set(0.5);
    this.title.position.set(WIDTH / 2, 125);
    this.addChild(this.title);

    const sub = new Text("ELEGÍ TU PERSONAJE", style({ fontSize: 44, strokeThickness: 7 }));
    sub.anchor.set(0.5);
    sub.position.set(WIDTH / 2, 244);
    this.addChild(sub);

    this.bestText = new Text("", style({ fontSize: 34, fill: "#ffd54f" }));
    this.bestText.anchor.set(1, 0);
    this.bestText.position.set(WIDTH - 28, 24);
    this.addChild(this.bestText);

    CHARACTERS.forEach((def, i) => {
      const card = new CharacterCard(def);
      card.position.set(WIDTH / 2 + (i - (CHARACTERS.length - 1) / 2) * 430, 548);
      card.on("pointertap", () => this.onCardTap(i));
      this.cards.push(card);
      this.addChild(card);
    });

    // selector de dificultad
    const diffLabel = new Text("DIFICULTAD (↑ ↓)", style({ fontSize: 24, strokeThickness: 5 }));
    diffLabel.anchor.set(1, 0.5);
    diffLabel.position.set(WIDTH / 2 - 400, 858);
    this.addChild(diffLabel);
    DIFFICULTIES.forEach((d, i) => {
      const b = new Graphics();
      b.position.set(WIDTH / 2 - 250 + i * 250, 858);
      const t = new Text(d.name, style({ fontSize: 32, strokeThickness: 6 }));
      t.anchor.set(0.5);
      b.addChild(t);
      const sub = new Text(d.desc, style({ fontSize: 16, strokeThickness: 0, fill: "#eceff1" }));
      sub.anchor.set(0.5, 0);
      sub.y = 36;
      b.addChild(sub);
      b.interactive = true;
      b.cursor = "pointer";
      b.on("pointertap", () => this.selectDiff(i));
      this.diffButtons.push(b);
      this.addChild(b);
    });

    const play = new TextButton("▶  JUGAR", () => this.start(), { width: 380, height: 74, fontSize: 40 });
    play.position.set(WIDTH / 2, 980);
    this.addChild(play);

    const help = new Text(
      "← → moverse  ·  ↑ / ESPACIO saltar (¡también en el aire!)  ·  ↓ caer rápido  ·  F lanzar cráneo  ·  P pausa  ·  M sonido",
      style({ fontSize: 22, strokeThickness: 4 }),
    );
    help.anchor.set(0.5);
    help.position.set(WIDTH / 2, 1056);
    this.addChild(help);

    const idx = CHARACTERS.findIndex((c) => c.id === Storage.character);
    this.select(idx >= 0 ? idx : 0, false);
    const di = DIFFICULTIES.findIndex((d) => d.id === Storage.difficulty);
    this.selectDiff(di >= 0 ? di : 1, false);

    Keyboard.down.on("key", this.onKey, this);
  }

  private onKey(code: string): void {
    if (code === "ArrowLeft" || code === "KeyA") {
      this.select(this.selected - 1);
    } else if (code === "ArrowRight" || code === "KeyD") {
      this.select(this.selected + 1);
    } else if (code === "ArrowUp" || code === "KeyW") {
      this.selectDiff(this.diffIdx - 1);
    } else if (code === "ArrowDown" || code === "KeyS") {
      this.selectDiff(this.diffIdx + 1);
    } else if (code === "Digit1" || code === "Digit2" || code === "Digit3") {
      this.selectDiff(Number(code.slice(-1)) - 1);
    } else if (code === "Enter" || code === "Space" || code === "NumpadEnter") {
      this.start();
    }
  }

  private onCardTap(i: number): void {
    if (i === this.selected) {
      this.start();
    } else {
      this.select(i);
    }
  }

  private select(i: number, sound = true): void {
    const n = this.cards.length;
    this.selected = ((i % n) + n) % n;
    this.cards.forEach((c, k) => c.setSelected(k === this.selected));
    if (sound) {
      Sfx.click();
    }
  }

  private selectDiff(i: number, sound = true): void {
    this.diffIdx = Math.max(0, Math.min(DIFFICULTIES.length - 1, i));
    this.diffButtons.forEach((b, k) => {
      const d = DIFFICULTIES[k];
      const on = k === this.diffIdx;
      b.clear();
      b.lineStyle(on ? 5 : 3, on ? 0xffffff : d.color, on ? 1 : 0.7);
      b.beginFill(on ? d.color : 0x000000, on ? 1 : 0.55);
      b.drawRoundedRect(-110, -30, 220, 60, 18);
      b.endFill();
      b.scale.set(on ? 1.08 : 1);
    });
    const d = DIFFICULTIES[this.diffIdx];
    this.bestText.text = `RÉCORD ${d.name}: ${Storage.bestFor(d.id)}`;
    if (sound) {
      Sfx.click();
    }
  }

  private start(): void {
    const def = CHARACTERS[this.selected];
    const diff = DIFFICULTIES[this.diffIdx];
    Storage.setCharacter(def.id);
    Storage.setDifficulty(diff.id);
    SceneManager.change(new GameScene(def, diff));
  }

  /** Cambia el mundo que se ve de fondo en el menú. */
  private showWorld(i: number): void {
    this.worldIdx = i % WORLDS;
    this.bg.setTheme(this.worldIdx, 1.2);
    this.worldName.text = `MUNDO ${this.worldIdx + 1}: ${LEVEL_NAMES[this.worldIdx]}`;
  }

  public update(dtMS: number): void {
    const dt = dtMS / 1000;
    this.t += dt;
    this.bg.update(dt, 240);
    this.worldT += dt;
    if (this.worldT >= 4) {
      this.worldT = 0;
      this.showWorld(this.worldIdx + 1);
    }
    this.title.scale.set(1 + Math.sin(this.t * 2.2) * 0.025);
    this.title.rotation = Math.sin(this.t * 1.3) * 0.015;
    for (const c of this.cards) {
      c.update(dt);
    }
  }

  public onExit(): void {
    Keyboard.down.off("key", this.onKey, this);
  }
}
