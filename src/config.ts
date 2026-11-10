export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Línea del piso: los pies de los personajes apoyan acá. */
export const GROUND_Y = 972;

/** Monedas que hay que juntar EN CADA MUNDO para que se abra el portal (el contador vuelve a 0). */
export const COINS_PER_WORLD = 50;
/** Cantidad de mundos; desde el último, el portal lleva al laboratorio del jefe final. */
export const WORLDS = 7;
export const MAX_LIVES = 6;

/** Velocidad base a la que "corre" el mundo (px/s). */
export const BASE_WORLD_SPEED = 320;

export const JUMP_KEYS = ["ArrowUp", "KeyW", "Space"];
export const LEFT_KEYS = ["ArrowLeft", "KeyA"];
export const RIGHT_KEYS = ["ArrowRight", "KeyD"];
export const DOWN_KEYS = ["ArrowDown", "KeyS"];
/** Lanzar el objeto que llevás (el cráneo del desierto). */
export const THROW_KEYS = ["KeyF", "KeyX", "KeyJ"];

export function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export type DifficultyId = "facil" | "medio" | "dificil";

export interface Difficulty {
  id: DifficultyId;
  name: string;
  color: number;
  desc: string;
  /** Multiplicador de velocidad de enemigos y mundo. */
  speed: number;
  /** Multiplicador del tiempo entre enemigos (más alto = menos enemigos). */
  spawn: number;
  /** Vidas extra respecto del personaje (puede ser negativo). */
  extraLives: number;
  bossHp: number;
  /** Segundos de invulnerabilidad después de un golpe. */
  invuln: number;
  scoreMul: number;
}

export const DIFFICULTIES: Difficulty[] = [
  { id: "facil", name: "FÁCIL", color: 0x66bb6a, desc: "+2 vidas · enemigos lentos", speed: 0.85, spawn: 1.45, extraLives: 2, bossHp: 4, invuln: 2.2, scoreMul: 1 },
  { id: "medio", name: "MEDIO", color: 0xffb300, desc: "El desafío normal", speed: 1, spawn: 1, extraLives: 0, bossHp: 6, invuln: 1.7, scoreMul: 1.5 },
  { id: "dificil", name: "DIFÍCIL", color: 0xff1744, desc: "-1 vida · todo más rápido", speed: 1.2, spawn: 0.72, extraLives: -1, bossHp: 8, invuln: 1.25, scoreMul: 2.5 },
];

export function getDifficulty(id: string): Difficulty {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1];
}
