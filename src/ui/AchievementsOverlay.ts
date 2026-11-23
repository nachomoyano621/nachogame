import { Container, Graphics, Text } from "pixi.js";
import { HEIGHT, WIDTH } from "../config";
import { ACHIEVEMENTS, Achievements } from "../core/Achievements";
import { Sfx } from "../core/Sfx";
import { Keyboard } from "../utils/Keyboard";
import { TextButton } from "./Button";
import { style } from "./styles";

const COLS = 4;
const CW = 400;
const CH = 168;
const GAP = 22;

/** Lista de logros (conseguidos en color, pendientes en gris con su progreso). */
export class AchievementsOverlay extends Container {
  private ready = 0.3;
  private closed = false;
  private t = 0;
  private readonly shine: Graphics[] = [];

  constructor(private readonly onClose: () => void) {
    super();
    const dim = new Graphics();
    dim.beginFill(0x05030a, 0.94);
    dim.drawRect(0, 0, WIDTH, HEIGHT);
    dim.endFill();
    dim.interactive = true;
    this.addChild(dim);

    const got = Achievements.count;
    const title = new Text(`🏅 LOGROS  ${got}/${ACHIEVEMENTS.length}`, style({ fontSize: 76, fill: ["#fff176", "#ff6f00"], stroke: "#3e0000", strokeThickness: 12 }));
    title.anchor.set(0.5);
    title.position.set(WIDTH / 2, 95);
    this.addChild(title);

    const gridW = COLS * CW + (COLS - 1) * GAP;
    const x0 = (WIDTH - gridW) / 2;
    ACHIEVEMENTS.forEach((a, i) => {
      const done = Achievements.has(a.id);
      const card = new Container();
      card.position.set(x0 + (i % COLS) * (CW + GAP), 180 + Math.floor(i / COLS) * (CH + GAP));
      const bg = new Graphics();
      bg.lineStyle(done ? 5 : 3, done ? 0xffd600 : 0x616161, done ? 1 : 0.8);
      bg.beginFill(done ? 0x2a1d00 : 0x151515, 0.95);
      bg.drawRoundedRect(0, 0, CW, CH, 22);
      bg.endFill();
      card.addChild(bg);
      if (done) {
        this.shine.push(bg);
      }
      const icon = new Text(a.icon, style({ fontSize: 64, strokeThickness: 0 }));
      icon.anchor.set(0.5);
      icon.position.set(62, CH / 2 - 6);
      icon.alpha = done ? 1 : 0.3;
      const name = new Text(a.name, style({ fontSize: 26, fill: done ? "#ffd600" : "#9e9e9e", strokeThickness: 5 }));
      name.position.set(120, 18);
      const desc = new Text(a.desc, style({ fontSize: 20, fill: done ? "#ffffff" : "#bdbdbd", strokeThickness: 0, wordWrap: true, wordWrapWidth: CW - 136 }));
      desc.position.set(120, 58);
      card.addChild(icon, name, desc);
      const prog = Achievements.progress(a);
      if (done) {
        const ok = new Text("✓", style({ fontSize: 40, fill: "#69f0ae", strokeThickness: 5 }));
        ok.anchor.set(1, 1);
        ok.position.set(CW - 14, CH - 6);
        card.addChild(ok);
      } else if (prog) {
        const [cur, max] = prog;
        const bar = new Graphics();
        bar.beginFill(0xffffff, 0.15);
        bar.drawRoundedRect(120, CH - 36, CW - 200, 16, 8);
        bar.endFill();
        bar.beginFill(0xff6d00);
        bar.drawRoundedRect(120, CH - 36, Math.max(16, ((CW - 200) * cur) / max), 16, 8);
        bar.endFill();
        const pt = new Text(`${cur}/${max}`, style({ fontSize: 20, strokeThickness: 4 }));
        pt.anchor.set(1, 0.5);
        pt.position.set(CW - 14, CH - 28);
        card.addChild(bar, pt);
      } else {
        const lock = new Text("🔒", style({ fontSize: 26, strokeThickness: 0 }));
        lock.anchor.set(1, 1);
        lock.position.set(CW - 14, CH - 10);
        lock.alpha = 0.6;
        card.addChild(lock);
      }
      this.addChild(card);
    });

    const ok = new TextButton("✔  LISTO (ENTER)", () => this.close(), { width: 440, height: 80, fontSize: 34, color: 0xd32f2f });
    ok.position.set(WIDTH / 2, 800);
    const note = new Text("Los logros quedan guardados en este navegador", style({ fontSize: 20, strokeThickness: 4, fill: "#bdbdbd" }));
    note.anchor.set(0.5);
    note.position.set(WIDTH / 2, 865);
    this.addChild(ok, note);

    Keyboard.down.on("key", this.onKey, this);
  }

  private onKey(code: string): void {
    if (this.destroyed) {
      Keyboard.down.off("key", this.onKey, this); // la pantalla de atrás se fue con esta ventana abierta
      return;
    }
    if (this.ready > 0 || this.closed) {
      return;
    }
    if (code === "Enter" || code === "NumpadEnter" || code === "Escape" || code === "Space" || code === "KeyL") {
      this.close();
    }
  }

  public close(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    Keyboard.down.off("key", this.onKey, this);
    Sfx.click();
    this.onClose();
  }

  public update(dt: number): void {
    this.t += dt;
    this.ready -= dt;
    this.shine.forEach((g, i) => (g.alpha = 0.85 + Math.sin(this.t * 3 + i) * 0.15));
  }
}
