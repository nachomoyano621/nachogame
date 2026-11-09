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
  best: number;
  newRecord: boolean;
}
