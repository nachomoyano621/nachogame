import { CharacterId } from "./characters";
import { WORLDS } from "../config";
import { Storage } from "../core/Storage";

/** Formas de jugar. */
export type GameMode = "aventura" | "sinfin" | "dia";

export interface GameOptions {
  mode: GameMode;
  /** Mundo donde arranca la aventura (8 = laboratorio). */
  startWorld: number;
  /** Personaje del jugador 2 (si juegan dos). */
  p2Id?: CharacterId | null;
}

export const DEFAULT_OPTIONS: GameOptions = { mode: "aventura", startWorld: 1, p2Id: null };

/** Segundos que dura cada mundo en el modo SIN FIN. */
export const ENDLESS_WORLD_TIME = 40;

export type DailyRuleId = "bazooka" | "turbo" | "meteoros" | "luna" | "craneos" | "oro";

export interface DailyRule {
  id: DailyRuleId;
  name: string;
  desc: string;
  icon: string;
}

/** Reglas del DESAFÍO DEL DÍA (cambia cada día, igual para todos). */
export const DAILY_RULES: DailyRule[] = [
  { id: "bazooka", name: "SOLO BAZOOKA", desc: "Arrancás con bazooka y no la perdés nunca", icon: "🚀" },
  { id: "turbo", name: "TODO A MIL", desc: "Todo va un 35% más rápido", icon: "⚡" },
  { id: "meteoros", name: "LLUVIA DE METEORITOS", desc: "Caen meteoritos en todos los mundos", icon: "☄️" },
  { id: "luna", name: "GRAVEDAD LUNAR", desc: "Saltás altísimo y caés despacito", icon: "🌙" },
  { id: "craneos", name: "CRÁNEOS Y FANTASMAS", desc: "Hay cráneos para lanzar en todos los mundos", icon: "💀" },
  { id: "oro", name: "MONEDAS DE ORO", desc: "Cada moneda vale el triple de puntos", icon: "🪙" },
];

/** Fecha local "AAAA-MM-DD". */
export function todayKey(d = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Regla de hoy. */
export function dailyRule(d = new Date()): DailyRule {
  const day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return DAILY_RULES[day % DAILY_RULES.length];
}

/** Clave del récord de cada modo (el del día cambia cada día). */
export function modeBestKey(mode: GameMode, difficulty: string): string {
  return mode === "dia" ? `dia:${todayKey()}:${difficulty}` : `${mode}:${difficulty}`;
}

/**
 * Mundo más lejano alcanzado (WORLDS + 1 = laboratorio). Además del registro nuevo,
 * mira lo que ya estaba guardado: récords, partida para continuar y el logro de vencer al DINO-X.
 */
export function reachedWorld(): number {
  let w = Storage.maxWorld;
  for (const d of ["facil", "medio", "dificil"]) {
    for (const e of Storage.records(d)) {
      w = Math.max(w, e.won ? WORLDS + 1 : e.world);
    }
  }
  const run = Storage.run;
  if (run) {
    w = Math.max(w, run.lab ? WORLDS + 1 : run.world);
  }
  if (Storage.achievements.includes("campeon")) {
    w = WORLDS + 1;
  }
  return Math.max(1, Math.min(WORLDS + 1, w));
}
