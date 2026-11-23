import { AnimatedSprite, Container, Graphics, Rectangle, Sprite, Text } from "pixi.js";
import { HEIGHT, WIDTH } from "../config";
import { Sfx } from "../core/Sfx";
import { Storage } from "../core/Storage";
import { CharacterDef, scaleFor } from "../game/characters";
import { CosmeticDef, HATS, HEAD, TRAILS, bank, equippedHat, equippedTrail } from "../game/cosmetics";
import { Effects } from "../game/Effects";
import { Keyboard } from "../utils/Keyboard";
import { TextButton } from "./Button";
import { style } from "./styles";
import { TOUCH } from "./touch";

const TILE_W = 172;
const TILE_H = 170;

type Slot = CosmeticDef | { kind: "hat" | "trail"; id: null; name: string; price: 0 };

/**
 * ROPERO: con las monedas juntadas en todas las partidas se compran sombreros y estelas.
 * Se ve cómo le queda al personaje elegido.
 */
export class Wardrobe extends Container {
  private readonly rows: Slot[][];
  private readonly tiles: Container[][] = [];
  private readonly tileBgs: Graphics[][] = [];
  private readonly tileStatus: Text[][] = [];
  private sel = { r: 0, c: 1 };
  private readonly bankText: Text;
  private readonly msg: Text;
  private msgT = 0;
  private readonly preview: AnimatedSprite;
  private readonly hatSpr = new Sprite();
  private readonly fx = new Effects();
  private readonly baseScale: number;
  private ready = 0.3;
  private closed = false;
  private t = 0;
  private hue = 0;

  constructor(private readonly def: CharacterDef, private readonly onClose: () => void) {
    super();
    this.rows = [
      [{ kind: "hat", id: null, name: "SIN SOMBRERO", price: 0 }, ...HATS],
      [{ kind: "trail", id: null, name: "SIN ESTELA", price: 0 }, ...TRAILS],
    ];
    const dim = new Graphics();
    dim.beginFill(0x05030a, 0.95);
    dim.drawRect(0, 0, WIDTH, HEIGHT);
    dim.endFill();
    dim.interactive = true;
    this.addChild(dim);

    const title = new Text("👕 ROPERO", style({ fontSize: 84, fill: ["#fff176", "#ff6f00"], stroke: "#3e0000", strokeThickness: 12 }));
    title.anchor.set(0.5);
    title.position.set(WIDTH / 2, 90);
    this.bankText = new Text("", style({ fontSize: 36, fill: "#ffeb3b", strokeThickness: 7 }));
    this.bankText.anchor.set(0.5);
    this.bankText.position.set(WIDTH / 2, 170);
    const note = new Text("Las monedas del ropero son TODAS las que juntaste en todas las partidas", style({ fontSize: 22, fill: "#bdbdbd", strokeThickness: 0 }));
    note.anchor.set(0.5);
    note.position.set(WIDTH / 2, 212);
    this.addChild(title, this.bankText, note);

    // vista previa: el personaje con la ropa puesta, corriendo en su pedestal
    const stage = new Graphics();
    stage.beginFill(0x000000, 0.5);
    stage.drawRoundedRect(70, 260, 420, 600, 30);
    stage.endFill();
    stage.beginFill(this.def.accent, 0.3);
    stage.drawEllipse(280, 760, 130, 22);
    stage.endFill();
    this.addChild(stage);
    const frames = def.frames();
    this.preview = new AnimatedSprite(frames, false);
    this.preview.anchor.set(0.5, 1);
    this.baseScale = scaleFor(def, frames) * 1.7;
    this.preview.scale.set(this.baseScale);
    this.preview.position.set(280, 760);
    this.preview.animationSpeed = 0.25;
    this.preview.play();
    this.addChild(this.fx, this.preview);
    this.preview.addChild(this.hatSpr);
    const pname = new Text(def.name, style({ fontSize: 30, fill: `#${def.accent.toString(16).padStart(6, "0")}`, strokeThickness: 6 }));
    pname.anchor.set(0.5);
    pname.position.set(280, 815);
    this.addChild(pname);

    const labels = ["SOMBREROS", "ESTELAS"];
    this.rows.forEach((row, r) => {
      const y0 = 330 + r * 300;
      const lab = new Text(labels[r], style({ fontSize: 30, fill: "#80d8ff", strokeThickness: 6 }));
      lab.position.set(540, y0 - 75);
      this.addChild(lab);
      this.tiles.push([]);
      this.tileBgs.push([]);
      this.tileStatus.push([]);
      row.forEach((item, c) => {
        const tile = new Container();
        tile.position.set(540 + TILE_W / 2 + c * (TILE_W + 10), y0 + TILE_H / 2 - 30);
        const bg = new Graphics();
        tile.addChild(bg);
        // ícono
        if (item.id === null) {
          const x = new Text("✖", style({ fontSize: 56, fill: "#9e9e9e", strokeThickness: 0 }));
          x.anchor.set(0.5);
          x.y = -28;
          tile.addChild(x);
        } else if (item.kind === "hat") {
          const h = new Sprite((item as typeof HATS[number]).tex());
          h.anchor.set(0.5);
          h.scale.set(Math.min(120 / h.texture.width, 70 / h.texture.height));
          h.y = -28;
          tile.addChild(h);
        } else {
          const tr = item as typeof TRAILS[number];
          const dots = new Container();
          tr.colors.slice(0, 5).forEach((col, i) => {
            const tex = tr.tex();
            if (!tex) {
              const g = new Graphics();
              g.beginFill(col);
              g.drawCircle(0, 0, 9 - i);
              g.endFill();
              g.position.set(-44 + i * 22, -28 + Math.sin(i) * 10);
              dots.addChild(g);
              return;
            }
            const d = new Sprite(tex);
            d.anchor.set(0.5);
            d.tint = col;
            d.scale.set(1.3 - i * 0.12);
            d.position.set(-44 + i * 22, -28 + Math.sin(i) * 10);
            dots.addChild(d);
          });
          tile.addChild(dots);
        }
        const name = new Text(item.name, style({ fontSize: 16, strokeThickness: 4, align: "center", wordWrap: true, wordWrapWidth: TILE_W - 16 }));
        name.anchor.set(0.5, 0);
        name.y = 10;
        const status = new Text("", style({ fontSize: 20, strokeThickness: 4 }));
        status.anchor.set(0.5);
        status.y = 68;
        tile.addChild(name, status);
        tile.interactive = true;
        tile.cursor = "pointer";
        tile.hitArea = new Rectangle(-TILE_W / 2, -TILE_H / 2, TILE_W, TILE_H);
        tile.on("pointertap", () => {
          this.sel = { r, c };
          this.act();
        });
        this.tiles[r].push(tile);
        this.tileBgs[r].push(bg);
        this.tileStatus[r].push(status);
        this.addChild(tile);
      });
    });

    this.msg = new Text("", style({ fontSize: 30, strokeThickness: 6 }));
    this.msg.anchor.set(0.5);
    this.msg.position.set(1180, 900);
    this.addChild(this.msg);
    const ok = new TextButton("✔ LISTO (ESC)", () => this.close(), { width: 360, height: 76, fontSize: 32, color: 0xd32f2f });
    ok.position.set(1180, 990);
    this.addChild(ok);
    if (!TOUCH) {
      const help = new Text("← → ↑ ↓ elegir  ·  ENTER comprar / ponerse", style({ fontSize: 22, fill: "#bdbdbd", strokeThickness: 0 }));
      help.anchor.set(0.5);
      help.position.set(280, 900);
      this.addChild(help);
    }

    Keyboard.down.on("key", this.onKey, this);
    this.refresh();
  }

  private equippedId(kind: "hat" | "trail"): string | null {
    return kind === "hat" ? Storage.hat : Storage.trail;
  }

  private act(): void {
    const item = this.rows[this.sel.r][this.sel.c];
    if (item.id === null) {
      if (item.kind === "hat") Storage.setHat(null);
      else Storage.setTrail(null);
      Sfx.click();
    } else if (Storage.owned.includes(item.id)) {
      if (item.kind === "hat") Storage.setHat(item.id);
      else Storage.setTrail(item.id);
      Sfx.click();
      this.say(`¡Te pusiste ${item.name}!`, "#69f0ae");
    } else if (bank() >= item.price) {
      Storage.buyCosmetic(item.id, item.price);
      if (item.kind === "hat") Storage.setHat(item.id);
      else Storage.setTrail(item.id);
      Sfx.power();
      this.say(`¡Compraste ${item.name}!`, "#69f0ae");
    } else {
      Sfx.hurt();
      this.say(`Te faltan ${item.price - bank()} monedas para ${item.name}`, "#ff8a80");
    }
    this.refresh();
  }

  private say(text: string, fill: string): void {
    this.msg.text = text;
    this.msg.style.fill = fill;
    this.msgT = 3;
  }

  private refresh(): void {
    this.bankText.text = `🪙 MONEDAS DEL ROPERO: ${bank()}`;
    this.rows.forEach((row, r) => {
      row.forEach((item, c) => {
        const on = this.sel.r === r && this.sel.c === c;
        const worn = this.equippedId(item.kind) === item.id;
        const owned = item.id === null || Storage.owned.includes(item.id);
        const g = this.tileBgs[r][c];
        g.clear();
        g.lineStyle(on ? 6 : 3, worn ? 0x69f0ae : on ? 0xffd600 : 0xffffff, on || worn ? 1 : 0.35);
        g.beginFill(on ? 0x1d1406 : 0x111111, 0.95);
        g.drawRoundedRect(-TILE_W / 2, -TILE_H / 2, TILE_W, TILE_H, 18);
        g.endFill();
        const st = this.tileStatus[r][c];
        st.text = worn ? "✓ PUESTO" : owned ? "TENÉS" : `🪙 ${item.price}`;
        st.style.fill = worn ? "#69f0ae" : owned ? "#ffffff" : bank() >= item.price ? "#ffeb3b" : "#ff8a80";
        this.tiles[r][c].scale.set(on ? 1.06 : 1);
      });
    });
    const hat = equippedHat();
    this.hatSpr.visible = !!hat;
    if (hat) {
      // en coordenadas del sprite (ya escalado)
      const head = HEAD[this.def.id];
      const tex = hat.tex();
      this.hatSpr.texture = tex;
      this.hatSpr.anchor.set(hat.anchor[0], hat.anchor[1]);
      // mismas medidas que en el juego, pasadas a coordenadas del dibujo del personaje
      const sf = this.baseScale / 1.7;
      const h = this.def.height;
      const k = (h * 0.42 * head.scale) / 90;
      this.hatSpr.scale.set(k / sf);
      this.hatSpr.position.set((head.x * h) / sf, (-head.y * h) / sf);
    }
  }

  private onKey(code: string): void {
    if (this.destroyed) {
      Keyboard.down.off("key", this.onKey, this); // la pantalla de atrás se fue con esta ventana abierta
      return;
    }
    if (this.ready > 0 || this.closed) return;
    const row = this.rows[this.sel.r];
    if (code === "ArrowRight") this.sel.c = (this.sel.c + 1) % row.length;
    else if (code === "ArrowLeft") this.sel.c = (this.sel.c + row.length - 1) % row.length;
    else if (code === "ArrowDown" || code === "ArrowUp") {
      this.sel.r = 1 - this.sel.r;
      this.sel.c = Math.min(this.sel.c, this.rows[this.sel.r].length - 1);
    } else if (code === "Enter" || code === "NumpadEnter" || code === "Space") {
      this.act();
      return;
    } else if (code === "Escape" || code === "KeyR") {
      this.close();
      return;
    } else {
      return;
    }
    Sfx.click();
    this.refresh();
  }

  public close(): void {
    if (this.closed) return;
    this.closed = true;
    Keyboard.down.off("key", this.onKey, this);
    Sfx.click();
    this.onClose();
  }

  public update(dt: number): void {
    this.t += dt;
    this.ready -= dt;
    this.preview.update(dt * 60);
    this.preview.y = 760 - Math.abs(Math.sin(this.t * 4)) * 14;
    if (this.msgT > 0) {
      this.msgT -= dt;
      this.msg.alpha = Math.min(1, this.msgT * 2);
    }
    // estela de muestra
    const tr = equippedTrail();
    if (tr && Math.random() < 0.6) {
      const color = tr.id === "arcoiris" ? tr.colors[this.hue++ % tr.colors.length] : tr.colors[Math.floor(Math.random() * tr.colors.length)];
      this.fx.burst(240, 760 - this.def.height * (0.4 + Math.random() * 0.5), { count: 1, colors: [color], speed: 70, life: 0.8, gravity: tr.rise ? -260 : 120, size: 1.4, tex: tr.tex() });
    }
    // las partículas de muestra corren hacia atrás
    for (const p of this.fx.children) {
      p.x -= 160 * dt;
    }
    this.fx.update(dt);
  }
}
