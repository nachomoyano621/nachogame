const KEY = "tomigame.v2";

interface SaveData {
  best: number;
  bests: Record<string, number>;
  difficulty: string;
  muted: boolean;
  character: string;
}

const DEFAULTS: SaveData = { best: 0, bests: {}, difficulty: "medio", muted: false, character: "vikingo" };

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
  get character(): string {
    return read().character;
  },
  setCharacter(id: string): void {
    write({ character: id });
  },
};
