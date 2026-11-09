import { Texture } from "pixi.js";
import { Art } from "../art/ProceduralArt";

export type CharacterId = "vikingo" | "ninja" | "robot" | "astro";

export interface CharacterDef {
  id: CharacterId;
  name: string;
  desc: string;
  /** Velocidad horizontal (px/s). */
  speed: number;
  /** Velocidad inicial de salto (px/s). */
  jump: number;
  /** Saltos totales antes de tocar el piso (2 = doble salto). */
  maxJumps: number;
  lives: number;
  startShield: boolean;
  /** Mantener el salto apretado mientras cae = planear. */
  glide?: boolean;
  /** Alto en pantalla (px). */
  height: number;
  hitbox: { w: number; h: number };
  /** true = frames de "corrida" que se frenan en idle; false = animación continua. */
  runCycle: boolean;
  accent: number;
  stats: { velocidad: number; salto: number; vidas: number };
  frames: () => Texture[];
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: "vikingo",
    name: "TOMI EL VIKINGO",
    desc: "El clásico. Equilibrado, doble salto y 3 vidas.",
    speed: 420,
    jump: 1050,
    maxJumps: 2,
    lives: 3,
    startShield: false,
    height: 175,
    hitbox: { w: 70, h: 130 },
    runCycle: false,
    accent: 0xff7043,
    stats: { velocidad: 3, salto: 3, vidas: 3 },
    frames: () => Array.from({ length: 10 }, (_, i) => Texture.from(`hombre${i + 1}`)),
  },
  {
    id: "ninja",
    name: "NACHO NINJA",
    desc: "Rapidísimo y con TRIPLE salto. Pero sólo 2 vidas.",
    speed: 540,
    jump: 1000,
    maxJumps: 3,
    lives: 2,
    startShield: false,
    height: 165,
    hitbox: { w: 54, h: 120 },
    runCycle: true,
    accent: 0xe63946,
    stats: { velocidad: 5, salto: 5, vidas: 2 },
    frames: () => Art.ninja,
  },
  {
    id: "robot",
    name: "ROBO-TOMI",
    desc: "Lento pero blindado: 4 vidas y arranca con escudo.",
    speed: 350,
    jump: 980,
    maxJumps: 2,
    lives: 4,
    startShield: true,
    height: 168,
    hitbox: { w: 76, h: 125 },
    runCycle: true,
    accent: 0x00e5ff,
    stats: { velocidad: 2, salto: 2, vidas: 4 },
    frames: () => Art.robot,
  },
  {
    id: "astro",
    name: "CAPITÁN ASTRO",
    desc: "Mantené apretado el salto en el aire para PLANEAR con la mochila cohete.",
    speed: 420,
    jump: 1040,
    maxJumps: 2,
    lives: 3,
    startShield: false,
    glide: true,
    height: 170,
    hitbox: { w: 64, h: 128 },
    runCycle: true,
    accent: 0xffab40,
    stats: { velocidad: 3, salto: 4, vidas: 3 },
    frames: () => Art.astro,
  },
];

export function getCharacter(id: string): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}

/** Escala para que el frame más alto mida `height` px. */
export function scaleFor(def: CharacterDef, frames: Texture[]): number {
  const maxH = Math.max(...frames.map((t) => t.height));
  return def.height / maxH;
}
