import { Container, Graphics, Text } from "pixi.js";
import { GameStats } from "../game/types";
import { getDifficulty } from "../config";
import { getCharacter } from "../game/characters";
import { style } from "./styles";

export function formatTime(seconds: number): string {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Panel con el resumen de la partida (centrado en 0,0). */
export class StatsPanel extends Container {
  private readonly record: Text | null = null;
  private t = 0;

  constructor(stats: GameStats, width: number) {
    super();
    const h = 330;
    const bg = new Graphics();
    bg.lineStyle(5, 0xffffff, 0.85);
    bg.beginFill(0x000000, 0.72);
    bg.drawRoundedRect(-width / 2, -h / 2, width, h, 28);
    bg.endFill();
    this.addChild(bg);

    const who = new Text(`${getCharacter(stats.characterId).name} · ${getDifficulty(stats.difficulty).name}${stats.bossDefeated ? " · ¡DINO-X DERROTADO!" : ""}`, style({ fontSize: 26, fill: "#b0bec5", strokeThickness: 0 }));
    who.anchor.set(0.5, 0);
    who.y = -h / 2 + 18;
    this.addChild(who);

    const score = new Text(`${stats.score} PUNTOS`, style({ fontSize: 70, fill: ["#fff176", "#ffa000"], strokeThickness: 8 }));
    score.anchor.set(0.5, 0);
    score.y = -h / 2 + 50;
    this.addChild(score);

    const cols: [string, string][] = [
      ["MONEDAS", `${stats.coins}`],
      ["NIVEL", `${stats.level}`],
      ["APLASTADOS", `${stats.stomps}`],
      ["TIEMPO", formatTime(stats.time)],
    ];
    const colW = (width - 60) / cols.length;
    cols.forEach(([label, value], i) => {
      const x = -width / 2 + 30 + colW * (i + 0.5);
      const v = new Text(value, style({ fontSize: 50 }));
      v.anchor.set(0.5, 0);
      v.position.set(x, 10);
      const l = new Text(label, style({ fontSize: 22, fill: "#90caf9", strokeThickness: 0 }));
      l.anchor.set(0.5, 0);
      l.position.set(x, 70);
      this.addChild(v, l);
    });

    if (stats.newRecord) {
      this.record = new Text("¡NUEVO RÉCORD!", style({ fontSize: 40, fill: "#69f0ae", strokeThickness: 7 }));
      this.record.anchor.set(0.5, 0);
      this.record.y = h / 2 - 62;
      this.addChild(this.record);
    } else {
      const best = new Text(`RÉCORD ${getDifficulty(stats.difficulty).name}: ${stats.best}`, style({ fontSize: 32, fill: "#ffd54f", strokeThickness: 5 }));
      best.anchor.set(0.5, 0);
      best.y = h / 2 - 56;
      this.addChild(best);
    }
  }

  public update(dt: number): void {
    this.t += dt;
    if (this.record) {
      this.record.scale.set(1 + Math.sin(this.t * 7) * 0.06);
    }
  }
}
