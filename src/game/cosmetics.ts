import { Texture } from "pixi.js";
import { CosArt } from "../art/CosmeticArt";
import { Storage } from "../core/Storage";
import { CharacterId } from "./characters";

export type HatId = "gorro" | "gorra" | "galera" | "vaquero" | "cuernos" | "corona";
export type TrailId = "estrellas" | "corazones" | "fuego" | "arcoiris";

export interface HatDef {
  kind: "hat";
  id: HatId;
  name: string;
  price: number;
  tex: () => Texture;
  /** Punto de apoyo (anchor) dentro del dibujo: la base del sombrero. */
  anchor: [number, number];
}

export interface TrailDef {
  kind: "trail";
  id: TrailId;
  name: string;
  price: number;
  colors: number[];
  tex: () => Texture | undefined;
  /** Las partículas suben (fuego) en vez de caer. */
  rise?: boolean;
}

export type CosmeticDef = HatDef | TrailDef;

const a = (x: number, y: number, w: number, h: number): [number, number] => [-x / w, -y / h];

export const HATS: HatDef[] = [
  { kind: "hat", id: "gorra", name: "GORRA", price: 40, tex: () => CosArt.gorra, anchor: a(-34, -44, 92, 52) },
  { kind: "hat", id: "gorro", name: "GORRO ROJINEGRO", price: 60, tex: () => CosArt.gorro, anchor: a(-40, -70, 80, 76) },
  { kind: "hat", id: "cuernos", name: "CUERNITOS", price: 80, tex: () => CosArt.cuernos, anchor: a(-44, -38, 88, 44) },
  { kind: "hat", id: "galera", name: "GALERA", price: 100, tex: () => CosArt.galera, anchor: a(-47, -70, 94, 76) },
  { kind: "hat", id: "vaquero", name: "SOMBRERO VAQUERO", price: 120, tex: () => CosArt.vaquero, anchor: a(-60, -50, 120, 58) },
  { kind: "hat", id: "corona", name: "CORONA", price: 200, tex: () => CosArt.corona, anchor: a(-42, -50, 84, 54) },
];

export const TRAILS: TrailDef[] = [
  { kind: "trail", id: "estrellas", name: "ESTELA DE ESTRELLAS", price: 80, colors: [0xffd600, 0xffffff, 0xfff59d], tex: () => CosArt.star },
  { kind: "trail", id: "corazones", name: "ESTELA DE CORAZONES", price: 100, colors: [0xff4081, 0xff80ab, 0xf50057], tex: () => CosArt.heart },
  { kind: "trail", id: "fuego", name: "ESTELA DE FUEGO", price: 120, colors: [0xff6d00, 0xffab00, 0xffd600, 0xd50000], tex: () => undefined, rise: true },
  { kind: "trail", id: "arcoiris", name: "ESTELA ARCOÍRIS", price: 180, colors: [0xff1744, 0xff9100, 0xffea00, 0x00e676, 0x2979ff, 0xd500f9], tex: () => undefined },
];

export const COSMETICS: CosmeticDef[] = [...HATS, ...TRAILS];

/** Dónde va la cabeza de cada personaje (fracción del alto, desde los pies) y corrimiento horizontal. */
export const HEAD: Record<CharacterId, { y: number; x: number; scale: number }> = {
  // medido con capturas: la base del sombrero apenas hundida en la cabeza (o el casco)
  vikingo: { y: 0.77, x: 0.0, scale: 0.85 },
  ninja: { y: 0.87, x: 0.0, scale: 0.8 },
  robot: { y: 0.88, x: 0.0, scale: 0.85 },
  astro: { y: 0.88, x: 0.0, scale: 0.9 },
  rojinegro: { y: 0.9, x: 0.0, scale: 0.8 },
};

/** Monedas del ropero: todas las juntadas en todas las partidas menos lo gastado. */
export function bank(): number {
  return Math.max(0, Storage.counter("coins") - Storage.spent);
}

export function equippedHat(): HatDef | null {
  const id = Storage.hat;
  return HATS.find((h) => h.id === id) ?? null;
}

export function equippedTrail(): TrailDef | null {
  const id = Storage.trail;
  return TRAILS.find((t) => t.id === id) ?? null;
}
