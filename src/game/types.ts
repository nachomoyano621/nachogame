import { DifficultyId } from "../config";
import { CharacterId } from "./characters";
import type { GameOptions } from "./modes";

/** Fichas para continuar que tiene cada partida nueva. */
export const START_CREDITS = 3;

/**
 * Estado de una partida para poder CONTINUAR después de un Game Over
 * (desde el mismo mundo, conservando billetera, puntos y jefes vencidos).
 */
export interface RunState {
  /** Identifica la partida (para que continuar no duplique el récord). */
  runId?: string;
  characterId: CharacterId;
  difficulty: DifficultyId;
  /** Mundo donde se cayó (1..7). */
  world: number;
  /** Se cayó en el laboratorio (pelea con el DINO-X). */
  lab: boolean;
  wallet: number;
  score: number;
  totalCoins: number;
  stomps: number;
  elapsed: number;
  bosses: number;
  /** Fichas que quedan para continuar. */
  credits: number;
  /** Personaje del jugador 2 (si jugaban dos). */
  p2Id?: CharacterId | null;
}

export interface GameStats {
  score: number;
  coins: number;
  level: number;
  stomps: number;
  time: number;
  characterId: CharacterId;
  difficulty: DifficultyId;
  bossDefeated: boolean;
  /** Llegó al laboratorio (pelea con el jefe). */
  reachedBoss: boolean;
  /** Jefes vencidos (los de cada mundo + el final). */
  bosses: number;
  best: number;
  newRecord: boolean;
  /** Identifica la partida (un récord por partida, aunque continúe). */
  runId: string;
  /** Nombre del personaje que se desbloqueó con esta partida (si hubo). */
  unlocked?: string;
  /** Para continuar (sólo en Game Over y si quedan fichas). */
  run?: RunState;
  /** Modo y opciones de la partida (para REINTENTAR igual). */
  options?: GameOptions;
  /** SIN FIN / DESAFÍO: mundos recorridos. */
  laps?: number;
}
