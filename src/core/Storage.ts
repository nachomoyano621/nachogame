import type { RunState } from "../game/types";

/** Una fila del TOP 5. */
export interface RecordEntry {
  /** runId de la partida. */
  id: string;
  name: string;
  score: number;
  character: string;
  /** Mundo al que llegó (8 = laboratorio). */
  world: number;
  won: boolean;
  date: number;
}

const KEY = "tomigame.v2";

interface SaveData {
  best: number;
  bests: Record<string, number>;
  difficulty: string;
  muted: boolean;
  character: string;
  /** Partida guardada para CONTINUAR (null = no hay). */
  run: RunState | null;
  /** TOP 5 por dificultad. */
  records: Record<string, RecordEntry[]>;
  /** Últimas iniciales usadas. */
  lastName: string;
}

const DEFAULTS: SaveData = { best: 0, bests: {}, difficulty: "medio", muted: false, character: "vikingo", run: null, records: {}, lastName: "" };

function read(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<SaveData>) };
    }
  } catch {
    // modo privado / storage bloqueado: seguimos con defaults
  }
  return { ...DEFAULTS };
}

function write(patch: Partial<SaveData>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), ...patch }));
  } catch {
    // ignorado a propósito
  }
}

export const Storage = {
  /** Récord por dificultad. */
  bestFor(difficulty: string): number {
    return read().bests[difficulty] ?? 0;
  },
  setBestFor(difficulty: string, n: number): void {
    write({ bests: { ...read().bests, [difficulty]: n } });
  },
  get difficulty(): string {
    return read().difficulty;
  },
  setDifficulty(id: string): void {
    write({ difficulty: id });
  },
  get best(): number {
    return read().best;
  },
  setBest(n: number): void {
    write({ best: n });
  },
  get muted(): boolean {
    return read().muted;
  },
  setMuted(m: boolean): void {
    write({ muted: m });
  },
  /** Partida para continuar (si quedó una con fichas). */
  get run(): RunState | null {
    return read().run;
  },
  saveRun(run: RunState | null): void {
    write({ run });
  },
  records(difficulty: string): RecordEntry[] {
    return read().records[difficulty] ?? [];
  },
  setRecords(difficulty: string, list: RecordEntry[]): void {
    write({ records: { ...read().records, [difficulty]: list } });
  },
  get lastName(): string {
    return read().lastName;
  },
  setLastName(name: string): void {
    write({ lastName: name });
  },
  get character(): string {
    return read().character;
  },
  setCharacter(id: string): void {
    write({ character: id });
  },
};
