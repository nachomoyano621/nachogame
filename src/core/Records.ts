import { WORLDS } from "../config";
import { GameStats } from "../game/types";
import { RecordEntry, Storage } from "./Storage";

export const TOP_N = 5;

/** Lo que pasa con una partida terminada respecto del TOP 5 de su dificultad. */
export type RecordStatus =
  /** No entra al ranking. */
  | { kind: "none" }
  /** Entra por primera vez: hay que pedir las iniciales. */
  | { kind: "new" }
  /** Es la misma partida que ya estaba (continuó): se actualiza sola. */
  | { kind: "update"; entry: RecordEntry };

/** Ranking local (queda guardado en este navegador). */
export const Records = {
  top(difficulty: string): RecordEntry[] {
    return [...Storage.records(difficulty)].sort((a, b) => b.score - a.score || a.date - b.date).slice(0, TOP_N);
  },

  status(stats: GameStats): RecordStatus {
    if (stats.score <= 0) {
      return { kind: "none" };
    }
    const list = Records.top(stats.difficulty);
    const mine = list.find((e) => e.id === stats.runId);
    if (mine) {
      return stats.score > mine.score ? { kind: "update", entry: mine } : { kind: "none" };
    }
    if (list.length < TOP_N || stats.score > list[list.length - 1].score) {
      return { kind: "new" };
    }
    return { kind: "none" };
  },

  /** Guarda (o actualiza) la partida en el ranking. Devuelve el puesto (1..5) o 0 si quedó afuera. */
  submit(stats: GameStats, name: string): number {
    const entry: RecordEntry = {
      id: stats.runId,
      name,
      score: stats.score,
      character: stats.characterId,
      world: stats.bossDefeated || stats.reachedBoss ? WORLDS + 1 : stats.level,
      won: stats.bossDefeated,
      date: Date.now(),
    };
    const others = Storage.records(stats.difficulty).filter((e) => e.id !== stats.runId);
    const list = [...others, entry].sort((a, b) => b.score - a.score || a.date - b.date).slice(0, TOP_N);
    Storage.setRecords(stats.difficulty, list);
    Storage.setLastName(name);
    return list.findIndex((e) => e.id === stats.runId) + 1;
  },
};

export function newRunId(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}
