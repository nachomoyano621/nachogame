import { Container, Graphics, Rectangle, Text } from "pixi.js";
import { HEIGHT, WIDTH, WORLDS } from "../config";
import { Sfx } from "../core/Sfx";
import { Storage } from "../core/Storage";
import { LEVEL_NAMES } from "../game/Background";
import { CHARACTERS, CharacterId } from "../game/characters";
import { GameMode, GameOptions, dailyRule, modeBestKey } from "../game/modes";
import { Keyboard } from "../utils/Keyboard";
import { TextButton } from "./Button";
import { style } from "./styles";
import { TOUCH } from "./touch";

const CARD_W = 540;
const CARD_H = 430;
const MODES: GameMode[] = ["aventura", "sinfin", "dia"];

export interface PlayMenuOpts {
  p1Id: CharacterId;
  difficulty: string;
  /** Mundo ya elegido (por ejemplo, tocando su tarjeta en el título). */
  startWorld?: number;
  onStart: (o: GameOptions) => void;
  onClose: () => void;
}

/**
 * "¿CÓMO QUERÉS JUGAR?": aventura (eligiendo mundo), SIN FIN o DESAFÍO DEL DÍA,
 * y en la compu 1 o 2 jugadores (el segundo elige su personaje acá).
 */
export class PlayMenu extends Container {
  private mode: GameMode = "aventura";
  private world = 1;
  private players = 1;
  private p2Idx = 0;
  private readonly maxWorld: number;
  private readonly p2Options: CharacterId[];
  private readonly cards: Container[] = [];
  private readonly cardBgs: Graphics[] = [];
  private worldText!: Text;
  private worldHint!: Text;
  private readonly playersBtns: Graphics[] = [];
  private p2Row!: Container;
  private p2Text!: Text;
  private ready = 0.35;
  private closed = false;
  private t = 0;

  constructor(private readonly o: PlayMenuOpts) {
    super();
    // todos los mundos se pueden elegir desde el principio (pedido del dueño del juego)
    this.maxWorld = WORLDS;
    this.world = Math.max(1, Math.min(WORLDS, o.startWorld ?? 1));
    this.p2Options = CHARACTERS.filter((c) => !c.unlock || Storage.isUnlocked(c.id)).map((c) => c.id);
    this.p2Idx = Math.max(0, this.p2Options.findIndex((id) => id !== o.p1Id));

    const dim = new Graphics();
    dim.beginFill(0x05030a, 0.94);
    dim.drawRect(0, 0, WIDTH, HEIGHT);
    dim.endFill();
    dim.interactive = true;
    this.addChild(dim);

    const title = new Text("¿CÓMO QUERÉS JUGAR?", style({ fontSize: 84, fill: ["#fff176", "#ff6f00"], stroke: "#3e0000", strokeThickness: 12 }));
    title.anchor.set(0.5);
    title.position.set(WIDTH / 2, 110);
    this.addChild(title);

    // jugadores (sólo en la compu: dos personas en el mismo teclado)
    if (!TOUCH) {
      ["1 JUGADOR", "2 JUGADORES"].forEach((label, i) => {
        const b = new Graphics();
        b.position.set(WIDTH / 2 + (i === 0 ? -170 : 170), 215);
        const t = new Text(label, style({ fontSize: 30, strokeThickness: 6 }));
        t.anchor.set(0.5);
        b.addChild(t);
        b.interactive = true;
        b.cursor = "pointer";
        b.on("pointertap", () => this.setPlayers(i + 1));
        this.playersBtns.push(b);
        this.addChild(b);
      });
      this.p2Row = new Container();
      this.p2Row.position.set(WIDTH / 2, 285);
      this.p2Text = new Text("", style({ fontSize: 28, fill: "#80d8ff", strokeThickness: 6 }));
      this.p2Text.anchor.set(0.5);
      const prev = this.arrow("◀", -330, 0, () => this.cycleP2(-1));
      const next = this.arrow("▶", 330, 0, () => this.cycleP2(1));
      this.p2Row.addChild(this.p2Text, prev, next);
      this.addChild(this.p2Row);
    }

    // las tres formas de jugar
    const rule = dailyRule();
    const bestSinFin = Storage.bestFor(modeBestKey("sinfin", o.difficulty));
    const bestDia = Storage.bestFor(modeBestKey("dia", o.difficulty));
    const info: Record<GameMode, { icon: string; name: string; desc: string; foot: string; color: number }> = {
      aventura: { icon: "🗺️", name: "AVENTURA", desc: `Los ${WORLDS} mundos, sus jefes y el DINO-X del laboratorio`, foot: "", color: 0xff7043 },
      sinfin: { icon: "♾️", name: "SIN FIN", desc: "Cada 40 s cambia el mundo y todo va más rápido. ¿Cuánto aguantás?", foot: `RÉCORD: ${bestSinFin}`, color: 0xb388ff },
      dia: { icon: rule.icon, name: "DESAFÍO DEL DÍA", desc: `Hoy: ${rule.name}\n${rule.desc}`, foot: `RÉCORD DE HOY: ${bestDia}`, color: 0x69f0ae },
    };
    MODES.forEach((m, i) => {
      const c = new Container();
      c.position.set(WIDTH / 2 + (i - 1) * (CARD_W + 40), 560);
      const bg = new Graphics();
      c.addChild(bg);
      this.cardBgs.push(bg);
      const d = info[m];
      const icon = new Text(d.icon, style({ fontSize: 80, strokeThickness: 0 }));
      icon.anchor.set(0.5);
      icon.y = -140;
      const name = new Text(d.name, style({ fontSize: 46, fill: `#${d.color.toString(16).padStart(6, "0")}`, strokeThickness: 8 }));
      name.anchor.set(0.5);
      name.y = -60;
      const desc = new Text(d.desc, style({ fontSize: 24, fill: "#eceff1", strokeThickness: 0, align: "center", wordWrap: true, wordWrapWidth: CARD_W - 60 }));
      desc.anchor.set(0.5, 0);
      desc.y = -20;
      c.addChild(icon, name, desc);
      if (m === "aventura") {
        // selector de mundo (sólo los que ya alcanzaste)
        this.worldText = new Text("", style({ fontSize: 23, fill: "#ffd54f", strokeThickness: 5 }));
        this.worldText.anchor.set(0.5);
        this.worldText.y = 140;
        this.worldText.interactive = true;
        this.worldText.cursor = "pointer";
        this.worldText.hitArea = new Rectangle(-200, -30, 400, 60);
        this.worldText.on("pointertap", (e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          this.cycleWorld(1);
        });
        c.addChild(this.worldText, this.arrow("◀", -CARD_W / 2 + 32, 140, () => this.cycleWorld(-1)), this.arrow("▶", CARD_W / 2 - 32, 140, () => this.cycleWorld(1)));
        this.worldHint = new Text("", style({ fontSize: 20, fill: "#bdbdbd", strokeThickness: 0 }));
        this.worldHint.anchor.set(0.5);
        this.worldHint.y = 185;
        c.addChild(this.worldHint);
      } else {
        const foot = new Text(d.foot, style({ fontSize: 30, fill: "#ffd54f", strokeThickness: 6 }));
        foot.anchor.set(0.5);
        foot.y = 165;
        c.addChild(foot);
      }
      c.interactive = true;
      c.cursor = "pointer";
      c.hitArea = new Rectangle(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
      c.on("pointertap", () => {
        if (this.mode === m) {
          this.start();
        } else {
          this.mode = m;
          Sfx.click();
          this.refresh();
        }
      });
      this.cards.push(c);
      this.addChild(c);
    });

    const go = new TextButton("▶  ¡A JUGAR! (ENTER)", () => this.start(), { width: 520, height: 86, fontSize: 40, color: 0x43a047 });
    go.position.set(WIDTH / 2 - 160, 900);
    const back = new TextButton("✖ VOLVER (ESC)", () => this.close(), { width: 300, height: 70, fontSize: 30, color: 0x546e7a });
    back.position.set(WIDTH / 2 + 300, 900);
    this.addChild(go, back);
    const help = new Text(
      TOUCH ? "Tocá un modo para elegirlo (tocalo de nuevo para jugar)" : "← → modo  ·  ↑ ↓ mundo  ·  J: 1 o 2 jugadores  ·  Q / W: personaje del jugador 2",
      style({ fontSize: 22, strokeThickness: 4, fill: "#bdbdbd" }),
    );
    help.anchor.set(0.5);
    help.position.set(WIDTH / 2, 990);
    this.addChild(help);

    Keyboard.down.on("key", this.onKey, this);
    this.refresh();
  }

  private arrow(sym: string, x: number, y: number, fn: () => void): Text {
    const a = new Text(sym, style({ fontSize: 40, fill: "#ff8a80", strokeThickness: 6 }));
    a.anchor.set(0.5);
    a.position.set(x, y);
    a.interactive = true;
    a.cursor = "pointer";
    a.hitArea = new Rectangle(-40, -36, 80, 72);
    a.on("pointertap", (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      fn();
    });
    return a;
  }

  private cycleWorld(step: number): void {
    const n = WORLDS;
    this.world = ((this.world - 1 + step + n) % n) + 1;
    this.mode = "aventura";
    Sfx.click();
    this.refresh();
  }

  private cycleP2(step: number): void {
    const n = this.p2Options.length;
    this.p2Idx = (this.p2Idx + step + n) % n;
    this.players = 2;
    Sfx.click();
    this.refresh();
  }

  private setPlayers(n: number): void {
    this.players = n;
    Sfx.click();
    this.refresh();
  }

  private refresh(): void {
    MODES.forEach((m, i) => {
      const on = m === this.mode;
      const g = this.cardBgs[i];
      g.clear();
      g.lineStyle(on ? 8 : 3, on ? 0xffd600 : 0xffffff, on ? 1 : 0.35);
      g.beginFill(on ? 0x1d1406 : 0x111111, 0.95);
      g.drawRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 26);
      g.endFill();
      this.cards[i].scale.set(on ? 1.04 : 0.96);
      this.cards[i].alpha = on ? 1 : 0.75;
    });
    const w = this.world;
    const wname = w > WORLDS ? "LABORATORIO (DINO-X)" : `MUNDO ${w} · ${LEVEL_NAMES[w - 1]}`;
    const locked = w > this.maxWorld;
    this.worldText.text = locked ? `🔒 ${wname}` : wname;
    this.worldText.style.fill = locked ? "#9e9e9e" : "#ffd54f";
    this.worldHint.text = locked
      ? `🔒 Pasá el MUNDO ${w - 1} para desbloquearlo`
      : w > 1
        ? "PRÁCTICA: el DINO-X sólo aparece si empezás en el MUNDO 1"
        : "Tocá las flechas o el nombre para elegir el mundo";
    this.worldHint.style.fill = locked || w > 1 ? "#ffab91" : "#bdbdbd";
    if (!TOUCH) {
      this.playersBtns.forEach((b, i) => {
        const on = this.players === i + 1;
        b.clear();
        b.lineStyle(on ? 5 : 3, on ? 0xffffff : 0x80d8ff, on ? 1 : 0.6);
        b.beginFill(on ? 0x0277bd : 0x000000, on ? 1 : 0.5);
        b.drawRoundedRect(-150, -30, 300, 60, 18);
        b.endFill();
      });
      this.p2Row.visible = this.players === 2;
      const def = CHARACTERS.find((c) => c.id === this.p2Options[this.p2Idx]);
      this.p2Text.text = `JUGADOR 2: ${def?.name ?? ""}  (flechas · L dispara · K poder)`;
    }
  }

  private onKey(code: string): void {
    if (this.destroyed) {
      Keyboard.down.off("key", this.onKey, this); // la pantalla de atrás se fue con esta ventana abierta
      return;
    }
    if (this.ready > 0 || this.closed) return;
    if (code === "ArrowLeft") {
      this.mode = MODES[(MODES.indexOf(this.mode) + MODES.length - 1) % MODES.length];
      Sfx.click();
      this.refresh();
    } else if (code === "ArrowRight") {
      this.mode = MODES[(MODES.indexOf(this.mode) + 1) % MODES.length];
      Sfx.click();
      this.refresh();
    } else if (code === "ArrowUp") {
      this.cycleWorld(1);
    } else if (code === "ArrowDown") {
      this.cycleWorld(-1);
    } else if (code === "KeyJ" && !TOUCH) {
      this.setPlayers(this.players === 1 ? 2 : 1);
    } else if (code === "KeyQ" && !TOUCH) {
      this.cycleP2(-1);
    } else if (code === "KeyW" && !TOUCH) {
      this.cycleP2(1);
    } else if (code === "Enter" || code === "NumpadEnter" || code === "Space") {
      this.start();
    } else if (code === "Escape") {
      this.close();
    }
  }

  private start(): void {
    if (this.closed) return;
    if (this.mode === "aventura" && this.world > this.maxWorld) {
      Sfx.hurt();
      this.worldHint.scale.set(1.25);
      return;
    }
    this.closed = true;
    Keyboard.down.off("key", this.onKey, this);
    Sfx.click();
    this.o.onStart({
      mode: this.mode,
      startWorld: this.mode === "aventura" ? this.world : 1,
      p2Id: this.players === 2 ? this.p2Options[this.p2Idx] : null,
    });
  }

  public close(): void {
    if (this.closed) return;
    this.closed = true;
    Keyboard.down.off("key", this.onKey, this);
    Sfx.click();
    this.o.onClose();
  }

  public update(dt: number): void {
    this.t += dt;
    this.ready -= dt;
    if (this.worldHint && this.worldHint.scale.x > 1) {
      this.worldHint.scale.set(Math.max(1, this.worldHint.scale.x - dt));
    }
    const i = MODES.indexOf(this.mode);
    this.cards[i].y = 560 + Math.sin(this.t * 3) * 5;
  }
}
