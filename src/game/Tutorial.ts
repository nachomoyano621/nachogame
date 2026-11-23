import { Container, Graphics, Text } from "pixi.js";
import { GROUND_Y, WIDTH } from "../config";
import { Sfx } from "../core/Sfx";
import { style } from "../ui/styles";

export type TutorialEvent = "move" | "jump" | "airJump" | "stomp" | "coin" | "power";

interface Step {
  icon: string;
  title: string;
  key: string;
  touch: string;
  /** Evento que lo completa (y cuántas veces). */
  done: TutorialEvent;
  times?: number;
  /** Se completa solo después de estos segundos. */
  auto?: number;
  /** Al empezar el paso (ej: hacer aparecer un dino). */
  start?: "dino" | "coins";
}

const STEPS: Step[] = [
  { icon: "⬅ ➡", title: "MOVETE", key: "Flechas o A / D", touch: "Botones ◀ ▶", done: "move" },
  { icon: "⬆", title: "SALTÁ", key: "ESPACIO o flecha ↑", touch: "Botón ▲", done: "jump" },
  { icon: "⬆⬆", title: "¡DOBLE SALTO!", key: "Saltá otra vez en el aire", touch: "Tocá ▲ otra vez en el aire", done: "airJump" },
  { icon: "👟", title: "¡APLASTALO!", key: "Caele ENCIMA a este dino", touch: "Caele ENCIMA a este dino", done: "stomp", start: "dino" },
  { icon: "🪙", title: "JUNTÁ MONEDAS", key: "Con 50 aparece el JEFE · vencelo y se abre el PORTAL", touch: "Con 50 aparece el JEFE · vencelo y se abre el PORTAL", done: "coin", times: 5, start: "coins" },
  { icon: "⚡", title: "PODER ESPECIAL", key: "Apretá E", touch: "Botón ⚡", done: "power", auto: 7 },
];

const PARK_X = 1180;
const BOARD_W = 600;
const BOARD_H = 170;

/** Cartel de madera clavado en el piso. */
class Sign extends Container {
  private readonly check: Text;

  constructor(step: Step, touch: boolean) {
    super();
    const g = new Graphics();
    // poste
    g.beginFill(0x5d4037);
    g.drawRect(-12, -150, 24, 150);
    g.endFill();
    // tabla
    g.lineStyle(6, 0x3e2723);
    g.beginFill(0x8d6e63);
    g.drawRoundedRect(-BOARD_W / 2, -150 - BOARD_H, BOARD_W, BOARD_H, 18);
    g.endFill();
    g.lineStyle(0);
    g.beginFill(0x795548, 0.6);
    for (let y = -150 - BOARD_H + 34; y < -160; y += 34) {
      g.drawRect(-BOARD_W / 2 + 10, y, BOARD_W - 20, 3);
    }
    g.endFill();
    // clavos
    g.beginFill(0x212121);
    for (const x of [-BOARD_W / 2 + 18, BOARD_W / 2 - 18]) {
      g.drawCircle(x, -150 - BOARD_H + 18, 5);
      g.drawCircle(x, -168, 5);
    }
    g.endFill();
    this.addChild(g);

    const icon = new Text(step.icon, style({ fontSize: 58, strokeThickness: 6 }));
    icon.anchor.set(0.5);
    icon.position.set(-BOARD_W / 2 + 85, -150 - BOARD_H / 2);
    const title = new Text(step.title, style({ fontSize: 44, fill: "#fff8e1", stroke: "#3e2723", strokeThickness: 8 }));
    title.anchor.set(0, 0.5);
    title.position.set(-BOARD_W / 2 + 160, -150 - BOARD_H + 52);
    const sub = new Text(touch ? step.touch : step.key, style({ fontSize: 24, fill: "#ffe0b2", stroke: "#3e2723", strokeThickness: 5, wordWrap: true, wordWrapWidth: BOARD_W - 180 }));
    sub.anchor.set(0, 0);
    sub.position.set(-BOARD_W / 2 + 160, -150 - BOARD_H + 84);
    this.check = new Text("✓", style({ fontSize: 120, fill: "#69f0ae", strokeThickness: 10 }));
    this.check.anchor.set(0.5);
    this.check.position.set(BOARD_W / 2 - 40, -150 - BOARD_H + 20);
    this.check.visible = false;
    this.addChild(icon, title, sub, this.check);
    this.position.set(WIDTH + BOARD_W, GROUND_Y);
  }

  public tick(): void {
    this.check.visible = true;
  }
}

export interface TutorialHooks {
  spawnDino: () => void;
  spawnCoins: () => void;
  /** ¿Sigue vivo el dino del tutorial? */
  dinoAlive: () => boolean;
  finished: () => void;
}

/**
 * Tutorial del Mundo 1 con carteles: cada cartel entra con el piso, se queda
 * esperando que hagas la acción, marca ✓ y sigue de largo.
 */
export class Tutorial extends Container {
  private idx = -1;
  private sign: Sign | null = null;
  private readonly leaving: Sign[] = [];
  private count = 0;
  private stepT = 0;
  private doneT = 0;
  private dinoWait = 0;
  public finishedAll = false;
  private readonly skipText: Text;

  constructor(private readonly hooks: TutorialHooks, private readonly touch: boolean) {
    super();
    this.skipText = new Text("", style({ fontSize: 22, strokeThickness: 4, fill: "#ffffffcc" }));
    this.skipText.anchor.set(1, 1);
    this.skipText.position.set(WIDTH - 24, 128);
    this.addChild(this.skipText);
    this.next();
  }

  /** Paso actual (para pruebas). */
  public get step(): number {
    return this.idx;
  }

  private next(): void {
    if (this.sign) {
      this.leaving.push(this.sign);
      this.sign = null;
    }
    this.idx++;
    this.count = 0;
    this.stepT = 0;
    this.doneT = 0;
    const step = STEPS[this.idx];
    if (!step) {
      this.finishedAll = true;
      this.skipText.visible = false;
      this.hooks.finished();
      return;
    }
    this.sign = new Sign(step, this.touch);
    this.addChild(this.sign);
    if (step.start === "dino") {
      this.hooks.spawnDino();
    } else if (step.start === "coins") {
      this.hooks.spawnCoins();
    }
  }

  public event(e: TutorialEvent): void {
    const step = STEPS[this.idx];
    if (!step || this.doneT > 0 || step.done !== e) {
      return;
    }
    this.count++;
    if (this.count >= (step.times ?? 1)) {
      this.complete();
    }
  }

  private complete(): void {
    this.sign?.tick();
    Sfx.power();
    this.doneT = 0.8; // muestra el ✓ un ratito y pasa al siguiente
  }

  /** Saltear todo (ENTER). */
  public skip(): void {
    if (this.finishedAll) {
      return;
    }
    this.idx = STEPS.length - 1;
    this.doneT = 0;
    this.next();
  }

  public update(dt: number, worldSpeed: number): void {
    const step = STEPS[this.idx];
    if (this.sign) {
      // entra con el piso y se estaciona
      this.sign.x = Math.max(PARK_X, this.sign.x - worldSpeed * dt * 1.6);
    }
    for (let i = this.leaving.length - 1; i >= 0; i--) {
      const s = this.leaving[i];
      s.x -= worldSpeed * dt * 1.4;
      if (s.x < -BOARD_W) {
        s.destroy({ children: true });
        this.leaving.splice(i, 1);
      }
    }
    if (!step) {
      return;
    }
    this.stepT += dt;
    if (this.doneT > 0) {
      this.doneT -= dt;
      if (this.doneT <= 0) {
        this.next();
      }
      return;
    }
    if (step.auto && this.stepT >= step.auto) {
      this.complete();
    }
    // si el dino se fue sin que lo aplaste, viene otro
    if (step.start === "dino" && !this.hooks.dinoAlive()) {
      this.dinoWait += dt;
      if (this.dinoWait > 1.2) {
        this.dinoWait = 0;
        this.hooks.spawnDino();
      }
    }
    // si se acabaron las monedas antes de juntar 5, vienen más
    if (step.start === "coins" && this.stepT > 6) {
      this.stepT = 0;
      this.hooks.spawnCoins();
    }
  }
}
