import { DifficultyId } from "../config";
import { CharacterId } from "./characters";

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
}
