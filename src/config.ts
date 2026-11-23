export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Línea del piso: los pies de los personajes apoyan acá. */
export const GROUND_Y = 972;

/** Monedas que hay que juntar EN CADA MUNDO para que se abra el portal (el contador vuelve a 0). */
export const COINS_PER_WORLD = 50;
/** Cantidad de mundos; desde el último, el portal lleva al laboratorio del jefe final. */
export const WORLDS = 8;
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

/** Cómo pelean los jefes en cada dificultad. */
export interface BossTuning {
  /** Velocidad de sus movimientos y ataques. */
  speed: number;
  /** Segundos que queda mareado (para saltarle encima). */
  stun: number;
  /** Multiplicador de las pausas entre ataques (más alto = más respiro). */
  rest: number;
  /** Multiplicador del aviso antes de embestir (más alto = más tiempo para esquivar). */
  warn: number;
  /** Proyectiles por ráfaga (normal / enojado). */
  shots: [number, number];
  /** Puntería: desvío máximo de los proyectiles (px). */
  aim: number;
  /** Velocidad de las ondas del piso. */
  wave: number;
  /** Onda extra cuando está enojado. */
  extraWave: boolean;
  /** Bebés por invocación (normal / enojado). */
  babies: [number, number];
  /** Se enoja (más rápido) a media vida. */
  enrage: boolean;
  /** Multiplicador del daño de balas y poderes (más alto = pierde más rápido). */
  dmg: number;
}

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
  boss: BossTuning;
}

export const DIFFICULTIES: Difficulty[] = [
  { id: "facil", name: "FÁCIL", color: 0x66bb6a, desc: "+2 vidas · enemigos y jefes lentos", speed: 0.85, spawn: 1.45, extraLives: 2, bossHp: 3, invuln: 2.2, scoreMul: 1,
    boss: { speed: 0.6, stun: 5, rest: 2.3, warn: 2, shots: [1, 2], aim: 300, wave: 1, extraWave: false, babies: [1, 1], enrage: false, dmg: 2 } },
  { id: "medio", name: "MEDIO", color: 0xffb300, desc: "El desafío normal", speed: 1, spawn: 1, extraLives: 0, bossHp: 5, invuln: 1.7, scoreMul: 1.5,
    boss: { speed: 0.9, stun: 3.2, rest: 1.25, warn: 1.25, shots: [3, 3], aim: 170, wave: 1, extraWave: false, babies: [2, 2], enrage: true, dmg: 1.2 } },
  { id: "dificil", name: "DIFÍCIL", color: 0xff1744, desc: "-1 vida · jefes rápidos y enojados", speed: 1.1, spawn: 0.85, extraLives: -1, bossHp: 8, invuln: 1.45, scoreMul: 2.5,
    boss: { speed: 1.05, stun: 2.8, rest: 1.1, warn: 1.1, shots: [3, 4], aim: 140, wave: 1.05, extraWave: true, babies: [2, 3], enrage: true, dmg: 1 } },
];

export function getDifficulty(id: string): Difficulty {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1];
}
