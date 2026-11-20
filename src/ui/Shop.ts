import { Container, Graphics, Sprite, Text } from "pixi.js";
import { HEIGHT, WIDTH } from "../config";
import { Sfx } from "../core/Sfx";
import { WEAPONS, WeaponDef, WeaponId } from "../game/weapons";
import { Keyboard } from "../utils/Keyboard";
import { TextButton } from "./Button";
import { style } from "./styles";

const CARD_W = 310;
const CARD_H = 430;

/** Tarjeta de un arma en la tienda. */
class WeaponCard extends Container {
  private readonly bg = new Graphics();
  private readonly status: Text;
  private readonly priceText: Text;

  constructor(public readonly def: WeaponDef) {
    super();
    this.addChild(this.bg);
    const icon = new Sprite(def.tex());
    icon.anchor.set(0.5);
    const k = Math.min(240 / icon.texture.width, 110 / icon.texture.height);
    icon.scale.set(k);
    icon.position.set(0, -125);
    this.addChild(icon);
    const name = new Text(def.name, style({ fontSize: 34, fill: "#ffd54f", strokeThickness: 6 }));
    name.anchor.set(0.5, 0);
    name.y = -55;
    this.addChild(name);
    const desc = new Text(def.desc, style({ fontSize: 20, strokeThickness: 0, fill: "#eceff1", wordWrap: true, wordWrapWidth: CARD_W - 40, align: "center" }));
    desc.anchor.set(0.5, 0);
    desc.y = -12;
    this.addChild(desc);
    const rows: [string, number][] = [
      ["PODER", def.stats.poder],
      ["CADENCIA", def.stats.cadencia],
    ];
    rows.forEach(([label, v], i) => {
      const y = 70 + i * 34;
      const l = new Text(label, style({ fontSize: 20, strokeThickness: 4 }));
      l.anchor.set(0, 0.5);
      l.position.set(-CARD_W / 2 + 22, y);
      const pips = new Graphics();
      for (let p = 0; p < 5; p++) {
        pips.beginFill(p < v ? 0xff5252 : 0xffffff, p < v ? 1 : 0.15);
        pips.drawRoundedRect(p * 26, -8, 22, 16, 5);
        pips.endFill();
      }
      pips.position.set(10, y);
      this.addChild(l, pips);
    });
    this.priceText = new Text(`${def.price} MONEDAS`, style({ fontSize: 30, fill: "#ffeb3b", strokeThickness: 6 }));
    this.priceText.anchor.set(0.5);
    this.priceText.y = 150;
    this.addChild(this.priceText);
    this.status = new Text("", style({ fontSize: 22, strokeThickness: 5 }));
    this.status.anchor.set(0.5);
    this.status.y = 188;
    this.addChild(this.status);
    this.interactive = true;
    this.cursor = "pointer";
  }

  public refresh(selected: boolean, wallet: number, owned: WeaponId | null): void {
    const canBuy = wallet >= this.def.price;
    const equipped = owned === this.def.id;
    const g = this.bg;
    g.clear();
    g.lineStyle(selected ? 7 : 3, equipped ? 0x69f0ae : selected ? 0xff5252 : 0xffffff, selected ? 1 : 0.4);
    g.beginFill(0x000000, selected ? 0.8 : 0.6);
    g.drawRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 24);
    g.endFill();
    this.alpha = canBuy || equipped ? 1 : 0.55;
    this.priceText.style.fill = canBuy ? "#ffeb3b" : "#ff5252";
    this.status.text = equipped ? "✓ EQUIPADA" : canBuy ? (selected ? "ENTER: COMPRAR" : "") : "TE FALTAN MONEDAS";
    this.status.style.fill = equipped ? "#69f0ae" : canBuy ? "#ffffff" : "#ff8a80";
    this.scale.set(selected ? 1.05 : 1);
  }
}

/**
 * Armería entre pantallas: con las monedas de la billetera se compra un arma
 * (reemplaza a la que tengas). Lo que no gastes queda guardado para la próxima.
 */
export class Shop extends Container {
  private readonly cards: WeaponCard[] = [];
  private readonly walletText: Text;
  private readonly msg: Text;
  private readonly cont: TextButton;
  private selected = WEAPONS.length; // arranca en "SEGUIR"
  private t = 0;
  private msgT = 0;
  /** Ignora teclas al abrir (un ENTER que venía apretado no tiene que saltear la tienda). */
  private ready = 0.4;

  constructor(
    private wallet: number,
    private owned: WeaponId | null,
    private readonly onBuy: (id: WeaponId) => void,
    private readonly onClose: () => void,
    nextName: string,
  ) {
    super();
    const dim = new Graphics();
    dim.beginFill(0x0b0b14, 0.92);
    dim.drawRect(0, 0, WIDTH, HEIGHT);
    dim.endFill();
    // toldo rojinegro de la armería
    for (let x = 0; x < WIDTH; x += 120) {
      dim.beginFill((x / 120) % 2 === 0 ? 0xb71c1c : 0x111111);
      dim.drawPolygon([x, 0, x + 120, 0, x + 120, 70, x + 60, 100, x, 70]);
      dim.endFill();
    }
    this.addChild(dim);
    dim.interactive = true; // que los clics no pasen al juego

    const title = new Text("ARMERÍA", style({ fontSize: 96, fill: ["#ffffff", "#ff8a80"], stroke: "#000000", strokeThickness: 12 }));
    title.anchor.set(0.5);
    title.position.set(WIDTH / 2, 170);
    this.addChild(title);
    this.walletText = new Text("", style({ fontSize: 40, fill: "#ffeb3b", strokeThickness: 7 }));
    this.walletText.anchor.set(0.5);
    this.walletText.position.set(WIDTH / 2, 255);
    this.addChild(this.walletText);

    WEAPONS.forEach((w, i) => {
      const card = new WeaponCard(w);
      card.position.set(WIDTH / 2 + (i - (WEAPONS.length - 1) / 2) * (CARD_W + 30), 560);
      card.on("pointertap", () => {
        this.selected = i;
        this.buy();
      });
      this.cards.push(card);
      this.addChild(card);
    });

    this.msg = new Text("", style({ fontSize: 30, strokeThickness: 6 }));
    this.msg.anchor.set(0.5);
    this.msg.position.set(WIDTH / 2, 818);
    this.addChild(this.msg);

    this.cont = new TextButton(`SEGUIR → ${nextName}`, () => this.close(), { width: 640, height: 84, fontSize: 36, color: 0x43a047 });
    this.cont.position.set(WIDTH / 2, 905);
    this.addChild(this.cont);

    const help = new Text("← → elegir  ·  ENTER comprar  ·  ESC seguir  ·  Si perdés una vida, perdés el arma. Las monedas que no gastes se guardan.", style({ fontSize: 22, strokeThickness: 4 }));
    help.anchor.set(0.5);
    help.position.set(WIDTH / 2, 1010);
    this.addChild(help);

    Keyboard.down.on("key", this.onKey, this);
    this.refresh();
  }

  private onKey(code: string): void {
    if (this.ready > 0) {
      return;
    }
    if (code === "ArrowLeft" || code === "KeyA") {
      this.selected = (this.selected + WEAPONS.length) % (WEAPONS.length + 1);
      Sfx.click();
    } else if (code === "ArrowRight" || code === "KeyD") {
      this.selected = (this.selected + 1) % (WEAPONS.length + 1);
      Sfx.click();
    } else if (code === "Escape") {
      this.close();
      return;
    } else if (code === "Enter" || code === "NumpadEnter" || code === "Space") {
      if (this.selected === WEAPONS.length) {
        this.close();
        return;
      }
      this.buy();
    }
    this.refresh();
  }

  /** Compra el arma seleccionada (si alcanza la plata). */
  public buy(id?: WeaponId): void {
    const def = id ? WEAPONS.find((w) => w.id === id) : WEAPONS[this.selected];
    if (!def) return;
    if (this.owned === def.id) {
      this.say(`Ya tenés la ${def.name}`, "#69f0ae");
    } else if (this.wallet < def.price) {
      this.say(`Te faltan ${def.price - this.wallet} monedas para la ${def.name}`, "#ff8a80");
      Sfx.hurt();
    } else {
      this.wallet -= def.price;
      this.owned = def.id;
      this.onBuy(def.id);
      Sfx.power();
      this.say(`¡Compraste la ${def.name}! Te quedan ${this.wallet} monedas`, "#69f0ae");
      this.selected = WEAPONS.length; // pasa a "SEGUIR"
    }
    this.refresh();
  }

  private say(text: string, fill: string): void {
    this.msg.text = text;
    this.msg.style.fill = fill;
    this.msgT = 3;
  }

  private refresh(): void {
    this.walletText.text = `BILLETERA: ${this.wallet} MONEDAS`;
    this.cards.forEach((c, i) => {
      c.refresh(i === this.selected, this.wallet, this.owned);
      c.y = 560;
    });
    this.cont.scale.set(this.selected === WEAPONS.length ? 1.08 : 1);
  }

  public close(): void {
    Keyboard.down.off("key", this.onKey, this);
    Sfx.click();
    this.onClose();
  }

  public update(dt: number): void {
    this.t += dt;
    this.ready -= dt;
    if (this.msgT > 0) {
      this.msgT -= dt;
      this.msg.alpha = Math.min(1, this.msgT * 2);
    }
    const sel = this.cards[this.selected];
    if (sel) {
      sel.y = 560 + Math.sin(this.t * 4) * 6;
    }
  }
}
