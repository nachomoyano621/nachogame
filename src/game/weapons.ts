import { Rectangle, Sprite, Texture } from "pixi.js";
import { WpArt } from "../art/WeaponArt";
import { GROUND_Y, WIDTH } from "../config";

export type WeaponId = "pistol" | "revolver" | "shotgun" | "smg" | "bazooka";

export interface WeaponDef {
  id: WeaponId;
  name: string;
  price: number;
  desc: string;
  /** Segundos entre disparos. */
  cooldown: number;
  /** Velocidad de la bala (px/s). */
  speed: number;
  /** Cuánto de "un golpe" le saca al jefe cada bala (1 = un salto en la cabeza). */
  bossDmg: number;
  /** Balas por disparo (escopeta: 3). */
  pellets: number;
  /** Apertura entre perdigones (radianes). */
  spread: number;
  /** A cuántos enemigos atraviesa cada bala. */
  pierce: number;
  /** Explota en área (bazooka). */
  explosive: boolean;
  /** Segundos que vuela la bala (alcance). */
  life: number;
  /** Para la tienda (1..5). */
  stats: { poder: number; cadencia: number };
  tex: () => Texture;
  /** Punto de la empuñadura dentro del dibujo (anchor). */
  anchor: [number, number];
  bullet: () => Texture;
}

export const WEAPONS: WeaponDef[] = [
  {
    id: "pistol", name: "PISTOLA", price: 15, desc: "Barata y confiable.",
    cooldown: 0.32, speed: 1500, bossDmg: 0.15, pellets: 1, spread: 0, pierce: 1, explosive: false, life: 0.9,
    stats: { poder: 1, cadencia: 3 }, tex: () => WpArt.pistol, anchor: [12 / 70, 22 / 50], bullet: () => WpArt.bullet,
  },
  {
    id: "revolver", name: "REVÓLVER", price: 30, desc: "Lento pero potente: atraviesa 2 monstruos.",
    cooldown: 0.55, speed: 1900, bossDmg: 0.3, pellets: 1, spread: 0, pierce: 2, explosive: false, life: 1,
    stats: { poder: 3, cadencia: 2 }, tex: () => WpArt.revolver, anchor: [12 / 96, 22 / 50], bullet: () => WpArt.bullet,
  },
  {
    id: "shotgun", name: "ESCOPETA", price: 45, desc: "3 perdigones en abanico, de cerca.",
    cooldown: 0.75, speed: 1400, bossDmg: 0.12, pellets: 3, spread: 0.2, pierce: 1, explosive: false, life: 0.45,
    stats: { poder: 4, cadencia: 2 }, tex: () => WpArt.shotgun, anchor: [46 / 144, 20 / 40], bullet: () => WpArt.pellet,
  },
  {
    id: "smg", name: "METRALLETA", price: 60, desc: "Ráfaga rapidísima. Mantené F apretada.",
    cooldown: 0.09, speed: 1650, bossDmg: 0.06, pellets: 1, spread: 0.06, pierce: 1, explosive: false, life: 0.8,
    stats: { poder: 2, cadencia: 5 }, tex: () => WpArt.smg, anchor: [34 / 118, 24 / 58], bullet: () => WpArt.bullet,
  },
  {
    id: "bazooka", name: "BAZOOKA", price: 90, desc: "Cohete explosivo: voltea hasta rocas y al Rex.",
    cooldown: 1.15, speed: 950, bossDmg: 0.6, pellets: 1, spread: 0, pierce: 1, explosive: true, life: 1.6,
    stats: { poder: 5, cadencia: 1 }, tex: () => WpArt.bazooka, anchor: [50 / 148, 40 / 68], bullet: () => WpArt.rocket,
  },
];

export function getWeapon(id: WeaponId): WeaponDef {
  return WEAPONS.find((w) => w.id === id) ?? WEAPONS[0];
}

/** Bala (o perdigón, o cohete) disparada por el jugador. */
export class Bullet extends Sprite {
  public readonly def: WeaponDef;
  public pierceLeft: number;
  /** Enemigos ya atravesados (para no pegarles dos veces). */
  public readonly hit = new Set<unknown>();
  private readonly vx: number;
  private readonly vy: number;
  private life: number;

  constructor(def: WeaponDef, x: number, y: number, dir: number, angle: number) {
    super(def.bullet());
    this.def = def;
    this.anchor.set(0.5);
    this.position.set(x, y);
    this.vx = Math.cos(angle) * def.speed * dir;
    this.vy = Math.sin(angle) * def.speed;
    this.rotation = dir > 0 ? angle : Math.PI - angle;
    this.pierceLeft = def.pierce;
    this.life = def.life;
  }

  /** Devuelve true cuando se terminó (alcance, salió de la pantalla o tocó el piso). */
  public tick(dt: number): boolean {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    return this.life <= 0 || this.x < -60 || this.x > WIDTH + 60 || this.y > GROUND_Y;
  }

  public getHitbox(): Rectangle {
    const r = this.def.explosive ? 18 : 12;
    return new Rectangle(this.x - r, this.y - r, r * 2, r * 2);
  }
}
