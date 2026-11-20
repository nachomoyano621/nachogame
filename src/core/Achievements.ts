import { WEAPONS } from "../game/weapons";
import { Storage } from "./Storage";

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  /** Logro por contador acumulado: clave del contador y meta. */
  counter?: string;
  target?: number;
}

/** Contador especial: armas distintas compradas (se calcula). */
const ARMERO = "armero";

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "pasos", name: "PRIMEROS PASOS", desc: "Pasá por tu primer portal", icon: "🌀" },
  { id: "aplastador", name: "APLASTADOR", desc: "Aplastá 50 monstruos saltándoles encima", icon: "👟", counter: "stomps", target: 50 },
  { id: "craneo", name: "CRANEAZO", desc: "Lanzá 10 cráneos", icon: "💀", counter: "skulls", target: 10 },
  { id: "gatillo", name: "GATILLO FÁCIL", desc: "Volteá 100 monstruos a los tiros", icon: "🔫", counter: "shotKills", target: 100 },
  { id: "kaboom", name: "KABOOM", desc: "Volteá 3 monstruos con un solo bazookazo", icon: "💥" },
  { id: "monedas", name: "COLECCIONISTA", desc: "Juntá 1000 monedas en total", icon: "🪙", counter: "coins", target: 1000 },
  { id: "ahorro", name: "AHORRISTA", desc: "Tené 150 monedas en la billetera", icon: "💰" },
  { id: ARMERO, name: "ARMERO", desc: "Comprá las 5 armas de la armería", icon: "🛒", counter: ARMERO, target: WEAPONS.length },
  { id: "cazajefes", name: "CAZAJEFES", desc: "Vencé a 10 jefes en total", icon: "👑", counter: "bosses", target: 10 },
  { id: "campeon", name: "CAMPEÓN", desc: "Vencé al DINO-X", icon: "🏆" },
  { id: "intocable", name: "INTOCABLE", desc: "Ganá sin perder ni una vida ni usar fichas", icon: "🛡️" },
  { id: "leyenda", name: "LEYENDA", desc: "Ganá en DIFÍCIL", icon: "🔥" },
];

type Listener = (def: AchievementDef) => void;
const listeners: Listener[] = [];

function counterValue(key: string): number {
  if (key === ARMERO) {
    return WEAPONS.filter((w) => Storage.counter(`w_${w.id}`) > 0).length;
  }
  return Storage.counter(key);
}

/** Logros: se guardan en el navegador y avisan al conseguirse. */
export const Achievements = {
  has(id: string): boolean {
    return Storage.achievements.includes(id);
  },

  get count(): number {
    return ACHIEVEMENTS.filter((a) => Achievements.has(a.id)).length;
  },

  /** Avisos (el HUD muestra un cartelito). Devuelve la función para desuscribirse. */
  onUnlock(fn: Listener): () => void {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  },

  unlock(id: string): void {
    if (Achievements.has(id)) {
      return;
    }
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (!def) {
      return;
    }
    Storage.setAchievements([...Storage.achievements, id]);
    for (const fn of [...listeners]) fn(def);
  },

  /** Suma a un contador y desbloquea los logros que lleguen a la meta. */
  add(counter: string, n = 1): void {
    Storage.addCounter(counter, n);
    for (const a of ACHIEVEMENTS) {
      if (a.counter && a.target && !Achievements.has(a.id) && counterValue(a.counter) >= a.target) {
        Achievements.unlock(a.id);
      }
    }
  },

  /** [actual, meta] para la barra de progreso (null si no es por contador). */
  progress(def: AchievementDef): [number, number] | null {
    if (!def.counter || !def.target) {
      return null;
    }
    return [Math.min(def.target, counterValue(def.counter)), def.target];
  },
};
