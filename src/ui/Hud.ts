import { Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { Art } from "../art/ProceduralArt";
import { COINS_PER_WORLD, HEIGHT, MAX_LIVES, WIDTH, WORLDS } from "../config";
import { AudioCtl } from "../core/AudioCtl";
import { style } from "./styles";

export interface PowerStatus {
  shield: number; // segundos restantes (0 = inactivo)
  shieldMax: number;
  magnet: number;
  magnetMax: number;
  x2: number;
  x2Max: number;
}

class PowerSlot extends Container {
  private readonly ring = new Graphics();

  constructor(tex: Texture) {
    super();
    const bg = new Graphics();
    bg.beginFill(0x000000, 0.45);
    bg.drawCircle(0, 0, 42);
    bg.endFill();
    const icon = new Sprite(tex);
    icon.anchor.set(0.5);
    icon.scale.set(0.72);
    this.addChild(bg, icon, this.ring);
  }

  public setProgress(p: number): void {
    this.ring.clear();
    this.ring.lineStyle(6, p < 0.25 ? 0xff5252 : 0x69f0ae);
    this.ring.arc(0, 0, 42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
  }
}

export class Hud extends Container {
  private readonly hearts: Sprite[] = [];
  private readonly coinText: Text;
  private readonly levelText: Text;
  private readonly scoreText: Text;
  private readonly bestText: Text;
  private readonly soundText: Text;
  private readonly bar = new Graphics();
  private readonly barText: Text;
  private readonly slots: { shield: PowerSlot; magnet: PowerSlot; x2: PowerSlot };
  private readonly banner: Text;
  private readonly bannerSub: Text;
  private bannerT = 0;
  private bannerFit = 1;
  private readonly flashG = new Graphics();
  private flashT = 0;
  private readonly pauseLayer = new Container();
  private readonly hint: Text;
  private hintT = 0;
  private readonly bossBar = new Container();
  private readonly bossFill = new Graphics();
  private readonly bossName = new Text("", style({ fontSize: 28, fill: "#ffffff", strokeThickness: 6 }));
  private bossColor = 0x76ff03;
  private bossShown = 1;
  private bossTarget = 1;
  private lastCoins = -1;
  private lastScore = -1;
  private t = 0;

  constructor(best: number) {
    super();

    // Panel superior izquierdo: vidas, monedas y nivel
    const panel = new Graphics();
    panel.beginFill(0x000000, 0.45);
    panel.drawRoundedRect(18, 18, 470, 128, 22);
    panel.endFill();
    this.addChild(panel);

    for (let i = 0; i < MAX_LIVES; i++) {
      const h = new Sprite(Art.heart);
      h.position.set(36 + i * 62, 28);
      this.hearts.push(h);
      this.addChild(h);
    }

    const coin = Sprite.from("moneda");
    coin.scale.set(0.2);
    coin.position.set(36, 92);
    this.addChild(coin);
    this.coinText = new Text("0 / 50", style({ fontSize: 34, fill: "#ffeb3b" }));
    this.coinText.position.set(90, 92);
    this.addChild(this.coinText);

    this.levelText = new Text(`MUNDO 1/${WORLDS}`, style({ fontSize: 28, fill: "#80d8ff" }));
    this.levelText.anchor.set(1, 0);
    this.levelText.position.set(470, 95);
    this.addChild(this.levelText);

    // Centro: puntaje y barra de progreso hacia la victoria
    this.scoreText = new Text("0", style({ fontSize: 58, strokeThickness: 8 }));
    this.scoreText.anchor.set(0.5, 0);
    this.scoreText.position.set(WIDTH / 2, 16);
    this.addChild(this.scoreText);
    this.bar.position.set(WIDTH / 2 - 300, 96);
    this.addChild(this.bar);
    this.barText = new Text("", style({ fontSize: 19, strokeThickness: 4 }));
    this.barText.anchor.set(0.5);
    this.barText.position.set(WIDTH / 2, 96 + 15);
    this.addChild(this.barText);

    // Derecha: récord, ayuda y power-ups activos
    this.bestText = new Text(`RÉCORD ${best}`, style({ fontSize: 30, fill: "#ffd54f" }));
    this.bestText.anchor.set(1, 0);
    this.bestText.position.set(WIDTH - 24, 22);
    this.addChild(this.bestText);
    this.soundText = new Text("", style({ fontSize: 22, strokeThickness: 5 }));
    this.soundText.anchor.set(1, 0);
    this.soundText.position.set(WIDTH - 24, 64);
    this.addChild(this.soundText);

    this.slots = {
      shield: new PowerSlot(Art.iconShield),
      magnet: new PowerSlot(Art.iconMagnet),
      x2: new PowerSlot(Art.iconX2),
    };
    for (const s of Object.values(this.slots)) {
      s.visible = false;
      s.y = 155;
      this.addChild(s);
    }

    this.hint = new Text("", style({ fontSize: 30, align: "center" }));
    this.hint.anchor.set(0.5);
    this.hint.position.set(WIDTH / 2, 200);
    this.addChild(this.hint);

    this.banner = new Text("", style({ fontSize: 110, fill: ["#fff176", "#ff6f00"], stroke: "#3e0000", strokeThickness: 12 }));
    this.banner.anchor.set(0.5);
    this.banner.position.set(WIDTH / 2, 420);
    this.banner.visible = false;
    this.addChild(this.banner);
    this.bannerSub = new Text("", style({ fontSize: 44, strokeThickness: 8 }));
    this.bannerSub.anchor.set(0.5);
    this.bannerSub.position.set(WIDTH / 2, 520);
    this.bannerSub.visible = false;
    this.addChild(this.bannerSub);

    // barra de vida del jefe
    const bossBg = new Graphics();
    bossBg.beginFill(0x000000, 0.6);
    bossBg.drawRoundedRect(-400, 0, 800, 38, 19);
    bossBg.endFill();
    const bossName = this.bossName;
    bossName.anchor.set(0.5, 1);
    bossName.y = -4;
    const bossFrame = new Graphics();
    bossFrame.lineStyle(4, 0xffffff, 0.9);
    bossFrame.drawRoundedRect(-400, 0, 800, 38, 19);
    this.bossBar.addChild(bossBg, this.bossFill, bossFrame, bossName);
    this.bossBar.position.set(WIDTH / 2, 178);
    this.bossBar.visible = false;
    this.addChild(this.bossBar);

    this.addChild(this.flashG);

    const dim = new Graphics();
    dim.beginFill(0x000000, 0.6);
    dim.drawRect(0, 0, WIDTH, HEIGHT);
    dim.endFill();
    const pt = new Text("PAUSA", style({ fontSize: 140, fill: "#ffffff", strokeThickness: 12 }));
    pt.anchor.set(0.5);
    pt.position.set(WIDTH / 2, HEIGHT / 2 - 60);
    const ps = new Text("P / ESC para seguir  ·  M sonido", style({ fontSize: 40 }));
    ps.anchor.set(0.5);
    ps.position.set(WIDTH / 2, HEIGHT / 2 + 60);
    this.pauseLayer.addChild(dim, pt, ps);
    this.pauseLayer.visible = false;
    this.addChild(this.pauseLayer);

    this.setCoins(0);
  }

  public setLives(lives: number, shownMax: number): void {
    this.hearts.forEach((h, i) => {
      h.visible = i < Math.max(lives, shownMax);
      h.texture = i < lives ? Art.heart : Art.heartEmpty;
    });
  }

  public popHeart(index: number): void {
    const h = this.hearts[index];
    if (h) {
      h.scale.set(1.5);
    }
  }

  /**
   * Monedas del MUNDO actual (no son los puntos). Al llegar a 50 se abre el portal y el contador vuelve a 0.
   * `lastWorld` = true en el último mundo (el portal lleva al jefe final).
   */
  public setCoins(n: number, lastWorld = false): void {
    const key = n * 2 + (lastWorld ? 1 : 0);
    if (key === this.lastCoins) {
      return;
    }
    this.lastCoins = key;
    this.coinText.text = `${n} / ${COINS_PER_WORLD}`;
    const p = Math.min(1, n / COINS_PER_WORLD);
    const W = 600;
    const H = 30;
    this.bar.clear();
    this.bar.beginFill(0x000000, 0.6);
    this.bar.drawRoundedRect(0, 0, W, H, 15);
    this.bar.endFill();
    if (p > 0) {
      this.bar.beginFill(p >= 1 ? 0x18ffff : 0xffc107);
      this.bar.drawRoundedRect(3, 3, Math.max(24, (W - 6) * p), H - 6, 12);
      this.bar.endFill();
    }
    this.bar.lineStyle(3, 0xffffff, 0.85);
    this.bar.drawRoundedRect(0, 0, W, H, 15);
    const goal = lastWorld ? "JEFE FINAL" : "PORTAL";
    this.barText.text = n >= COINS_PER_WORLD ? `¡${goal} ABIERTO! → entrá` : `${n} / ${COINS_PER_WORLD} MONEDAS → ${goal}`;
  }

  /** Mensaje fijo en la barra (ej: durante la pelea con el jefe). */
  public setBarMessage(text: string): void {
    this.barText.text = text;
  }

  public setScore(n: number): void {
    if (n !== this.lastScore) {
      this.lastScore = n;
      this.scoreText.text = `${n}`;
    }
  }

  public setLevel(n: number): void {
    this.levelText.text = n > WORLDS ? "JEFE FINAL" : `MUNDO ${n}/${WORLDS}`;
  }

  public setPowers(p: PowerStatus): void {
    let x = WIDTH - 70;
    const entries: [PowerSlot, number, number][] = [
      [this.slots.shield, p.shield, p.shieldMax],
      [this.slots.magnet, p.magnet, p.magnetMax],
      [this.slots.x2, p.x2, p.x2Max],
    ];
    for (const [slot, left, max] of entries) {
      slot.visible = left > 0;
      if (slot.visible) {
        slot.x = x;
        slot.setProgress(max > 0 ? left / max : 1);
        x -= 100;
      }
    }
  }

  public showBanner(text: string, sub = "", seconds = 2.2): void {
    this.banner.text = text;
    this.bannerSub.text = sub;
    this.banner.visible = true;
    this.bannerSub.visible = sub !== "";
    this.bannerT = seconds;
    // achicar carteles largos para que entren en la pantalla
    this.banner.scale.set(1);
    this.bannerSub.scale.set(1);
    this.bannerFit = Math.min(1, (WIDTH - 120) / Math.max(1, this.banner.width));
    this.bannerSub.scale.set(Math.min(1, (WIDTH - 80) / Math.max(1, this.bannerSub.width)));
  }

  public showHint(text: string, seconds: number): void {
    this.hint.text = text;
    this.hintT = seconds;
  }

  public flash(color: number, alpha = 0.45): void {
    this.flashG.clear();
    this.flashG.beginFill(color, alpha);
    this.flashG.drawRect(0, 0, WIDTH, HEIGHT);
    this.flashG.endFill();
    this.flashT = 0.35;
    this.flashG.alpha = 1;
  }

  public showBoss(name: string, color: number): void {
    this.bossName.text = name;
    this.bossColor = color;
    this.bossBar.visible = true;
    this.bossShown = 0;
    this.bossTarget = 1;
    this.hint.y = 250;
  }

  public setBossHp(hp: number, max: number): void {
    this.bossTarget = Math.max(0, hp / max);
  }

  public hideBoss(): void {
    this.bossBar.visible = false;
  }

  public setPaused(p: boolean): void {
    this.pauseLayer.visible = p;
  }

  public update(dt: number): void {
    this.t += dt;
    this.soundText.text = `M: sonido ${AudioCtl.muted ? "OFF" : "ON"}  ·  P: pausa`;

    for (const h of this.hearts) {
      if (h.scale.x > 1) {
        h.scale.set(Math.max(1, h.scale.x - dt * 3));
      }
    }

    if (this.bannerT > 0) {
      this.bannerT -= dt;
      const s = (1 + Math.sin(this.t * 8) * 0.03) * this.bannerFit;
      this.banner.scale.set(s);
      const a = Math.min(1, this.bannerT * 3);
      this.banner.alpha = a;
      this.bannerSub.alpha = a;
      if (this.bannerT <= 0) {
        this.banner.visible = false;
        this.bannerSub.visible = false;
      }
    }

    if (this.hintT > 0) {
      this.hintT -= dt;
      this.hint.alpha = Math.min(1, this.hintT * 2);
      this.hint.visible = this.hintT > 0;
    }

    if (this.bossBar.visible) {
      this.bossShown += (this.bossTarget - this.bossShown) * Math.min(1, dt * 4);
      this.bossFill.clear();
      if (this.bossShown > 0.005) {
        const low = this.bossTarget <= 0.5;
        this.bossFill.beginFill(low ? 0xff1744 : this.bossColor);
        this.bossFill.drawRoundedRect(-394, 6, 788 * this.bossShown, 26, 13);
        this.bossFill.endFill();
      }
    }

    if (this.flashT > 0) {
      this.flashT -= dt;
      this.flashG.alpha = Math.max(0, this.flashT / 0.35);
    }
  }
}
