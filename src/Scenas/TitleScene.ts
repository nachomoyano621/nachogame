import { AnimatedSprite, Container, Graphics, Sprite, Text, Texture, TilingSprite } from "pixi.js";
import { Art } from "../art/ProceduralArt";
import { WArt } from "../art/WorldArt";
import { HEIGHT, WIDTH, WORLDS } from "../config";
import { IScene, SceneManager } from "../core/SceneManager";
import { Sfx } from "../core/Sfx";
import { Background, LEVEL_NAMES } from "../game/Background";
import { CHARACTERS, scaleFor } from "../game/characters";
import { style } from "../ui/styles";
import { Keyboard } from "../utils/Keyboard";
import { StartScene } from "./StartScene";

const STRIPE = 140;
const PARADE_Y = 985;

/** Miniaturas de los mundos (se generan una sola vez). */
let thumbs: Texture[] | null = null;

function worldThumbs(): Texture[] {
  if (!thumbs) {
    const bg = new Background();
    thumbs = Array.from({ length: WORLDS }, (_, i) => bg.snapshot(SceneManager.renderer, i, 0.22));
    bg.destroy({ children: true });
  }
  return thumbs;
}

interface Runner {
  spr: AnimatedSprite;
  speed: number;
  bob: number;
}

/**
 * Pantalla de título: TOMI GAME en rojo y negro (colores de Colón), los 7 mundos,
 * los personajes corriendo perseguidos por monstruos y "PRESIONÁ ENTER".
 */
export class TitleScene extends Container implements IScene {
  private readonly stripes = new Container();
  private readonly cards: Container[] = [];
  private readonly runners: Runner[] = [];
  private readonly ground: TilingSprite;
  private readonly title = new Container();
  private readonly press: Text;
  private t = 0;
  private ready = 0.4;

  constructor() {
    super();

    // fondo de franjas diagonales rojinegras que se desplazan
    const g = new Graphics();
    for (let x = -HEIGHT - STRIPE * 2; x < WIDTH + STRIPE * 2; x += STRIPE) {
      g.beginFill(Math.round(x / STRIPE) % 2 === 0 ? 0xb71c1c : 0x121212);
      g.drawPolygon([x, 0, x + STRIPE, 0, x + STRIPE + HEIGHT, HEIGHT, x + HEIGHT, HEIGHT]);
      g.endFill();
    }
    this.stripes.addChild(g);
    this.addChild(this.stripes);
    const shade = new Graphics();
    shade.beginFill(0x000000, 0.45);
    shade.drawRect(0, 0, WIDTH, HEIGHT);
    shade.endFill();
    shade.beginFill(0x000000, 0.35);
    shade.drawEllipse(WIDTH / 2, 170, 900, 170);
    shade.endFill();
    this.addChild(shade);

    // TÍTULO: "TOMI" rojo y "GAME" negro, con escudos a los costados
    const tomi = new Text("TOMI", style({ fontSize: 200, fill: ["#ff5252", "#d50000", "#8e0000"], stroke: "#000000", strokeThickness: 20, dropShadow: true, dropShadowColor: "#ffffff", dropShadowBlur: 12, dropShadowDistance: 0, dropShadowAlpha: 0.6 }));
    const game = new Text("GAME", style({ fontSize: 200, fill: ["#3a3a3a", "#000000"], stroke: "#e53935", strokeThickness: 20, dropShadow: true, dropShadowColor: "#ffffff", dropShadowBlur: 12, dropShadowDistance: 0, dropShadowAlpha: 0.6 }));
    tomi.anchor.set(1, 0.5);
    game.anchor.set(0, 0.5);
    tomi.x = -20;
    game.x = 20;
    this.title.addChild(tomi, game);
    for (const side of [-1, 1]) {
      const shield = new Sprite(Art.iconShield);
      shield.anchor.set(0.5);
      shield.scale.set(1.5);
      shield.position.set(side * (Math.max(tomi.width, game.width) + 110), 6);
      this.title.addChild(shield);
    }
    this.title.position.set(WIDTH / 2, 160);
    this.addChild(this.title);

    const sub = new Text("¡Recorré 7 mundos, juntá monedas y vencé a 8 jefes!", style({ fontSize: 46, fill: "#ffffff", strokeThickness: 8 }));
    sub.anchor.set(0.5);
    sub.position.set(WIDTH / 2, 305);
    this.addChild(sub);

    // tarjetas de los 7 mundos
    const tex = worldThumbs();
    const cw = 232;
    const gap = 18;
    const x0 = (WIDTH - (WORLDS * cw + (WORLDS - 1) * gap)) / 2;
    tex.forEach((tx, i) => {
      const c = new Container();
      const frame = new Graphics();
      frame.lineStyle(5, i % 2 === 0 ? 0xe53935 : 0xffffff);
      frame.beginFill(0x000000);
      frame.drawRoundedRect(-4, -4, cw + 8, 138, 12);
      frame.endFill();
      const img = new Sprite(tx);
      img.width = cw;
      img.height = 130;
      const badge = new Graphics();
      badge.lineStyle(3, 0xffffff);
      badge.beginFill(0xd50000);
      badge.drawCircle(18, 18, 20);
      badge.endFill();
      const num = new Text(`${i + 1}`, style({ fontSize: 26, strokeThickness: 4 }));
      num.anchor.set(0.5);
      num.position.set(18, 18);
      const name = new Text(LEVEL_NAMES[i], style({ fontSize: 19, strokeThickness: 5, wordWrap: true, wordWrapWidth: cw, align: "center" }));
      name.anchor.set(0.5, 0);
      name.position.set(cw / 2, 142);
      c.addChild(frame, img, badge, num, name);
      c.position.set(x0 + i * (cw + gap), 400);
      this.cards.push(c);
      this.addChild(c);
    });

    // jefe final
    const boss = new Text("…y al final, el DINO-X en el LABORATORIO SECRETO", style({ fontSize: 30, fill: "#b2ff59", strokeThickness: 6 }));
    boss.anchor.set(0.5);
    boss.position.set(WIDTH / 2, 625);
    this.addChild(boss);

    this.press = new Text("PRESIONÁ  ENTER  PARA  EMPEZAR", style({ fontSize: 58, fill: ["#ffffff", "#ffcdd2"], stroke: "#b71c1c", strokeThickness: 10 }));
    this.press.anchor.set(0.5);
    this.press.position.set(WIDTH / 2, 730);
    this.addChild(this.press);

    // piso y desfile: los 4 personajes corriendo, perseguidos por monstruos de todos los mundos
    this.ground = new TilingSprite(Art.ground, WIDTH, HEIGHT - PARADE_Y + 6);
    this.ground.y = PARADE_Y - 4;
    this.addChild(this.ground);
    const add = (frames: Texture[], height: number, speed: number, flip: boolean, x: number, bob = 0): void => {
      const spr = new AnimatedSprite(frames, false);
      spr.anchor.set(0.5, 1);
      const k = height / Math.max(...frames.map((f) => f.height));
      spr.scale.set(flip ? -k : k, k);
      spr.animationSpeed = 0.25;
      spr.play();
      spr.position.set(x, PARADE_Y);
      this.addChild(spr);
      this.runners.push({ spr, speed, bob });
    };
    CHARACTERS.forEach((def, i) => {
      const frames = def.frames();
      add(frames, def.height * 0.9 * (scaleFor(def, frames) > 0 ? 1 : 1), 210, false, 900 - i * 170);
    });
    add([Texture.from("dino1"), Texture.from("dino2")], 150, 210, true, 300);
    add(WArt.scorpion, 70, 210, false, 150);
    add(WArt.crab, 70, 210, false, 20);
    add(Art.bat, 60, 210, false, -120, 110);
    add(WArt.alien, 110, 210, false, -260);
    add(WArt.brickMonster, 90, 210, false, -400);

    Keyboard.down.on("key", this.onKey, this);
    this.interactive = true;
    this.on("pointertap", () => this.go());
  }

  private onKey(code: string): void {
    if (code === "Enter" || code === "NumpadEnter" || code === "Space") {
      this.go();
    }
  }

  private go(): void {
    if (this.ready > 0) {
      return;
    }
    Sfx.click();
    SceneManager.change(new StartScene());
  }

  public update(dtMS: number): void {
    const dt = dtMS / 1000;
    this.t += dt;
    this.ready -= dt;
    this.stripes.x = -((this.t * 40) % (STRIPE * 2));
    this.title.scale.set(1 + Math.sin(this.t * 2.2) * 0.03);
    this.title.rotation = Math.sin(this.t * 1.3) * 0.012;
    this.press.alpha = 0.55 + Math.max(0, Math.sin(this.t * 4)) * 0.45;
    this.press.scale.set(1 + Math.sin(this.t * 4) * 0.02);
    this.cards.forEach((c, i) => {
      c.y = 400 + Math.sin(this.t * 2 + i * 0.7) * 8;
    });
    this.ground.tilePosition.x -= 240 * dt;
    for (const r of this.runners) {
      r.spr.x += r.speed * dt;
      if (r.spr.x > WIDTH + 200) {
        r.spr.x -= WIDTH + 800;
      }
      r.spr.y = PARADE_Y - (r.bob ? r.bob + Math.sin(this.t * 4 + r.spr.x * 0.01) * 15 : Math.abs(Math.sin(this.t * 10 + r.spr.x)) * 6);
      r.spr.update(dt * 60);
    }
  }

  public onExit(): void {
    Keyboard.down.off("key", this.onKey, this);
  }
}
