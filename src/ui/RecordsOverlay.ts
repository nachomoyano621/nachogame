import { Container, Graphics, Rectangle, Sprite, Text } from "pixi.js";
import { DIFFICULTIES, HEIGHT, WIDTH, WORLDS, getDifficulty } from "../config";
import { Records, TOP_N } from "../core/Records";
import { Sfx } from "../core/Sfx";
import { Storage } from "../core/Storage";
import { CharacterId, getCharacter } from "../game/characters";
import { GameStats } from "../game/types";
import { Keyboard } from "../utils/Keyboard";
import { TextButton } from "./Button";
import { style } from "./styles";
import { TOUCH } from "./touch";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const SLOT_X = [-170, 0, 170];
const SLOT_Y = 585;
const MEDALS = [0xffd600, 0xcfd8dc, 0xff8f00, 0x90a4ae, 0x90a4ae];

export interface RecordsOpts {
  difficulty: string;
  /** Partida recién terminada: si viene con `ask`, primero pide las iniciales. */
  stats?: GameStats;
  ask?: boolean;
  /** Fila a resaltar (la partida recién guardada). */
  highlightId?: string;
  /** Permite cambiar de dificultad con ← → (desde el menú). */
  switchable?: boolean;
  onClose: () => void;
}

/**
 * TOP 5 local: carga de iniciales estilo arcade (teclado o tocando ▲ ▼)
 * y la tabla de récords de cada dificultad.
 */
export class RecordsOverlay extends Container {
  private readonly content = new Container();
  private mode: "entry" | "table" = "table";
  private difficulty: string;
  private highlightId: string | undefined;
  private letters: number[] = [0, 0, 0];
  private slot = 0;
  private readonly slotTexts: Text[] = [];
  private readonly slotBoxes: Graphics[] = [];
  private highlightRow: Graphics | null = null;
  private ready = 0.5;
  private t = 0;
  private closed = false;

  constructor(private readonly o: RecordsOpts) {
    super();
    this.difficulty = o.difficulty;
    this.highlightId = o.highlightId;

    const dim = new Graphics();
    dim.beginFill(0x05030a, 0.94);
    dim.drawRect(0, 0, WIDTH, HEIGHT);
    dim.endFill();
    dim.interactive = true; // que los toques no pasen a la pantalla de atrás
    this.addChild(dim);

    const panel = new Graphics();
    panel.lineStyle(6, 0xff1744, 0.9);
    panel.beginFill(0x111111, 1);
    panel.drawRoundedRect(WIDTH / 2 - 560, 150, 1120, 860, 36);
    panel.endFill();
    // franjas rojinegras arriba
    for (let i = 0; i < 14; i++) {
      panel.beginFill(i % 2 === 0 ? 0xb71c1c : 0x000000);
      panel.drawRect(WIDTH / 2 - 530 + i * 75.7, 166, 75.7, 18);
      panel.endFill();
    }
    this.addChild(panel, this.content);

    if (o.ask && o.stats) {
      const last = Storage.lastName || "AAA";
      this.letters = [0, 1, 2].map((i) => Math.max(0, CHARS.indexOf(last[i] ?? "A")));
      this.buildEntry(o.stats);
    } else {
      this.buildTable();
    }
    Keyboard.down.on("key", this.onKey, this);
  }

  // ------------------------------------------------------------ iniciales

  private buildEntry(stats: GameStats): void {
    this.mode = "entry";
    this.content.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.slotTexts.length = 0;
    this.slotBoxes.length = 0;

    const title = new Text("¡ENTRASTE AL TOP 5!", style({ fontSize: 76, fill: ["#ffffff", "#ff8a80"], stroke: "#3e0000", strokeThickness: 12 }));
    title.anchor.set(0.5);
    title.position.set(WIDTH / 2, 260);
    const sub = new Text(`${stats.score} PUNTOS  ·  ${getDifficulty(stats.difficulty).name}`, style({ fontSize: 40, fill: "#ffd54f", strokeThickness: 7 }));
    sub.anchor.set(0.5);
    sub.position.set(WIDTH / 2, 340);
    const ask = new Text("PONÉ TUS INICIALES", style({ fontSize: 30, strokeThickness: 5 }));
    ask.anchor.set(0.5);
    ask.position.set(WIDTH / 2, 388);
    this.content.addChild(title, sub, ask);

    SLOT_X.forEach((dx, i) => {
      const box = new Graphics();
      box.position.set(WIDTH / 2 + dx, SLOT_Y);
      box.interactive = true;
      box.cursor = "pointer";
      box.on("pointertap", () => {
        this.slot = i;
        this.refreshEntry();
      });
      const txt = new Text("A", style({ fontSize: 120, strokeThickness: 10 }));
      txt.anchor.set(0.5);
      box.addChild(txt);
      this.slotBoxes.push(box);
      this.slotTexts.push(txt);
      this.content.addChild(box);
      // flechitas para tocar (celular)
      for (const [sym, dy, step] of [["▲", -135, 1], ["▼", 135, -1]] as const) {
        const arrow = new Text(sym, style({ fontSize: 54, fill: "#ff8a80", strokeThickness: 6 }));
        arrow.anchor.set(0.5);
        arrow.position.set(WIDTH / 2 + dx, SLOT_Y + dy);
        arrow.interactive = true;
        arrow.cursor = "pointer";
        arrow.hitArea = new Rectangle(-60, -40, 120, 80);
        arrow.on("pointertap", () => {
          this.slot = i;
          this.cycle(step);
        });
        this.content.addChild(arrow);
      }
    });

    const help = new Text(TOUCH ? "Tocá ▲ ▼ para cambiar cada letra" : "Escribí las letras (o ↑ ↓ para cambiar, ← → para moverte)", style({ fontSize: 26, strokeThickness: 5, fill: "#eceff1" }));
    help.anchor.set(0.5);
    help.position.set(WIDTH / 2, 790);
    const ok = new TextButton("✔  GUARDAR (ENTER)", () => this.confirm(), { width: 520, color: 0x43a047 });
    ok.position.set(WIDTH / 2, 892);
    this.content.addChild(help, ok);
    this.refreshEntry();
  }

  private refreshEntry(): void {
    this.slotTexts.forEach((txt, i) => {
      txt.text = CHARS[this.letters[i]];
      const box = this.slotBoxes[i];
      const on = i === this.slot;
      box.clear();
      box.lineStyle(on ? 8 : 4, on ? 0xff1744 : 0xffffff, on ? 1 : 0.5);
      box.beginFill(on ? 0x3e0000 : 0x000000, 0.85);
      box.drawRoundedRect(-70, -90, 140, 180, 20);
      box.endFill();
    });
  }

  private cycle(step: number): void {
    this.letters[this.slot] = (this.letters[this.slot] + step + CHARS.length) % CHARS.length;
    Sfx.click();
    this.refreshEntry();
  }

  private type(ch: string): void {
    this.letters[this.slot] = CHARS.indexOf(ch);
    this.slot = Math.min(2, this.slot + 1);
    Sfx.click();
    this.refreshEntry();
  }

  private confirm(): void {
    const stats = this.o.stats;
    if (this.mode !== "entry" || !stats) {
      return;
    }
    const name = this.letters.map((l) => CHARS[l]).join("");
    Records.submit(stats, name);
    Sfx.power();
    this.highlightId = stats.runId;
    this.ready = 0.3;
    this.buildTable();
  }

  // ------------------------------------------------------------ tabla

  private buildTable(): void {
    this.mode = "table";
    this.content.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.highlightRow = null;
    const diff = getDifficulty(this.difficulty);

    const title = new Text(`🏆 TOP ${TOP_N}`, style({ fontSize: 80, fill: ["#fff176", "#ff6f00"], stroke: "#3e0000", strokeThickness: 12 }));
    title.anchor.set(0.5);
    title.position.set(WIDTH / 2, 255);
    this.content.addChild(title);

    // pestañas de dificultad
    DIFFICULTIES.forEach((d, i) => {
      const on = d.id === this.difficulty;
      const tab = new Graphics();
      tab.lineStyle(4, on ? 0xffffff : d.color, on ? 1 : 0.6);
      tab.beginFill(on ? d.color : 0x000000, on ? 1 : 0.5);
      tab.drawRoundedRect(-120, -28, 240, 56, 18);
      tab.endFill();
      tab.position.set(WIDTH / 2 + (i - 1) * 270, 345);
      const tt = new Text(d.name, style({ fontSize: 28, strokeThickness: 5 }));
      tt.anchor.set(0.5);
      tab.addChild(tt);
      if (this.o.switchable) {
        tab.interactive = true;
        tab.cursor = "pointer";
        tab.on("pointertap", () => this.setDifficulty(d.id));
      } else {
        tab.alpha = on ? 1 : 0.35;
      }
      this.content.addChild(tab);
    });

    const list = Records.top(this.difficulty);
    for (let i = 0; i < TOP_N; i++) {
      const y = 445 + i * 92;
      const e = list[i];
      const row = new Container();
      row.position.set(WIDTH / 2, y);
      const bg = new Graphics();
      const mine = !!e && e.id === this.highlightId;
      bg.beginFill(mine ? 0xff1744 : 0xffffff, mine ? 0.35 : i % 2 === 0 ? 0.06 : 0.02);
      bg.drawRoundedRect(-500, -40, 1000, 80, 16);
      bg.endFill();
      row.addChild(bg);
      if (mine) {
        this.highlightRow = bg;
      }
      const medal = new Graphics();
      medal.beginFill(MEDALS[i]);
      medal.drawCircle(0, 0, 30);
      medal.endFill();
      medal.position.set(-440, 0);
      const rank = new Text(`${i + 1}`, style({ fontSize: 32, fill: "#1a1a1a", strokeThickness: 0 }));
      rank.anchor.set(0.5);
      medal.addChild(rank);
      row.addChild(medal);
      if (e) {
        const def = getCharacter(e.character as CharacterId);
        const tex = def.frames()[0];
        const icon = new Sprite(tex);
        icon.anchor.set(0.5);
        icon.scale.set(Math.min(66 / tex.height, 80 / tex.width));
        icon.position.set(-350, 0);
        const name = new Text(e.name, style({ fontSize: 54, strokeThickness: 7, letterSpacing: 6 }));
        name.anchor.set(0, 0.5);
        name.position.set(-290, 0);
        const where = new Text(e.won ? "¡GANÓ!" : e.world > WORLDS ? "LABORATORIO" : `MUNDO ${e.world}`, style({ fontSize: 26, fill: e.won ? "#69f0ae" : "#80d8ff", strokeThickness: 5 }));
        where.anchor.set(0, 0.5);
        where.position.set(-60, 0);
        const score = new Text(`${e.score}`, style({ fontSize: 50, fill: "#ffeb3b", strokeThickness: 7 }));
        score.anchor.set(1, 0.5);
        score.position.set(470, 0);
        row.addChild(icon, name, where, score);
      } else {
        const empty = new Text("- - -", style({ fontSize: 40, fill: "#757575", strokeThickness: 4 }));
        empty.anchor.set(0, 0.5);
        empty.position.set(-290, 0);
        row.addChild(empty);
      }
      this.content.addChild(row);
    }

    const ok = new TextButton("✔  LISTO (ENTER)", () => this.close(), { width: 440, height: 80, fontSize: 34, color: diff.color });
    ok.position.set(WIDTH / 2, 915);
    const note = new Text(this.o.switchable && !TOUCH ? "← → cambiar dificultad  ·  los récords quedan guardados en este navegador" : "Los récords quedan guardados en este navegador", style({ fontSize: 20, strokeThickness: 4, fill: "#bdbdbd" }));
    note.anchor.set(0.5);
    note.position.set(WIDTH / 2, 980);
    this.content.addChild(ok, note);
  }

  private setDifficulty(id: string): void {
    if (id === this.difficulty) {
      return;
    }
    this.difficulty = id;
    Sfx.click();
    this.buildTable();
  }

  // ------------------------------------------------------------ input / ciclo

  private onKey(code: string): void {
    if (this.ready > 0 || this.closed) {
      return;
    }
    if (this.mode === "entry") {
      const m = /^(?:Key([A-Z])|Digit([0-9])|Numpad([0-9]))$/.exec(code);
      if (m) {
        this.type(m[1] ?? m[2] ?? m[3]);
      } else if (code === "ArrowUp") {
        this.cycle(1);
      } else if (code === "ArrowDown") {
        this.cycle(-1);
      } else if (code === "ArrowLeft" || code === "Backspace") {
        this.slot = Math.max(0, this.slot - 1);
        this.refreshEntry();
      } else if (code === "ArrowRight") {
        this.slot = Math.min(2, this.slot + 1);
        this.refreshEntry();
      } else if (code === "Enter" || code === "NumpadEnter") {
        this.confirm();
      }
      return;
    }
    if (this.o.switchable && (code === "ArrowLeft" || code === "ArrowRight")) {
      const i = DIFFICULTIES.findIndex((d) => d.id === this.difficulty);
      const n = DIFFICULTIES.length;
      this.setDifficulty(DIFFICULTIES[(i + (code === "ArrowLeft" ? -1 : 1) + n) % n].id);
    } else if (code === "Enter" || code === "NumpadEnter" || code === "Escape" || code === "Space" || code === "KeyT") {
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
    this.o.onClose();
  }

  public update(dt: number): void {
    this.t += dt;
    this.ready -= dt;
    if (this.mode === "entry") {
      const txt = this.slotTexts[this.slot];
      if (txt) {
        txt.alpha = Math.sin(this.t * 10) > -0.3 ? 1 : 0.35;
      }
      this.slotTexts.forEach((s, i) => i !== this.slot && (s.alpha = 1));
    } else if (this.highlightRow) {
      this.highlightRow.alpha = 0.6 + Math.sin(this.t * 6) * 0.4;
    }
  }
}

/**
 * Al terminar una partida: si entra al TOP 5 pide las iniciales (overlay);
 * si es la misma partida que continuó, actualiza su puesto solo y avisa con un cartelito.
 */
export class RecordGate {
  private overlay: RecordsOverlay | null = null;
  private cooldown = 0;

  constructor(host: Container, stats: GameStats, toastX: number, toastY: number) {
    const st = Records.status(stats);
    if (st.kind === "new") {
      this.overlay = new RecordsOverlay({
        difficulty: stats.difficulty,
        stats,
        ask: true,
        onClose: () => {
          const o = this.overlay;
          this.overlay = null;
          this.cooldown = 0.3; // que el ENTER que cerró la tabla no apriete un botón de atrás
          if (o) {
            host.removeChild(o);
            o.destroy({ children: true });
          }
        },
      });
      host.addChild(this.overlay);
    } else if (st.kind === "update") {
      const pos = Records.submit(stats, st.entry.name);
      const toast = new Text(`🏆 ${st.entry.name}: puesto ${pos} del TOP ${TOP_N}`, style({ fontSize: 32, fill: "#ffd54f", strokeThickness: 6 }));
      toast.anchor.set(0.5);
      toast.position.set(toastX, toastY);
      host.addChild(toast);
    }
  }

  /** true mientras la pantalla de atrás tiene que ignorar las teclas. */
  public get busy(): boolean {
    return this.overlay !== null || this.cooldown > 0;
  }

  public update(dt: number): void {
    this.cooldown -= dt;
    this.overlay?.update(dt);
  }
}
