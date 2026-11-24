import { Sfx } from "./Sfx";

/**
 * Música chiptune generada por código (WebAudio). Cada tema tiene tempo, escala, acordes,
 * instrumentos y batería propios, y se compone como una canción con partes
 * (intro, tema A, variación, parte B, quiebre, solo, tema final con cambio de tono).
 * Cada vuelta se recompone con otra semilla y otro tono: dura toda la pantalla sin repetirse igual.
 */

type Drums = "rock" | "soft" | "march" | "tribal" | "techno" | "double" | "funk" | "half" | "none";

interface TrackDef {
  bpm: number;
  /** Nota base (MIDI). */
  root: number;
  scale: number[];
  /** Grados de la escala de los 4 acordes (uno por compás). */
  chords: number[];
  /** Acordes de la parte B (si no, se derivan). */
  chordsB?: number[];
  lead: OscillatorType;
  /** Instrumento de la parte B y el solo. */
  lead2?: OscillatorType;
  bass: OscillatorType;
  drums: Drums;
  seed: number;
  /** Patrón rítmico de la melodía (16 semicorcheas). */
  rhythm: number[];
  arp?: boolean;
  swing?: number;
  leadVol?: number;
  /** Bajo en corcheas (más movido). */
  busyBass?: boolean;
  /** Bajo funk sincopado con saltos de octava. */
  funkBass?: boolean;
  /** Coro fantasmal "uuuh" (notas largas con vibrato). */
  ooh?: boolean;
  /** Tema corto que se repite tal cual (pantallas de fin). */
  short?: boolean;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const HARMONIC = [0, 2, 3, 5, 7, 8, 11];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const MIXO = [0, 2, 4, 5, 7, 9, 10];
const WHOLE = [0, 2, 4, 6, 8, 10];

const BUSY = [1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0];
const MEDIUM = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0];
const SLOW = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0];
const BOUNCY = [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0];
const FUNKY = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0];

export const TRACKS: Record<string, TrackDef> = {
  title: { bpm: 132, root: 62, scale: MIXO, chords: [0, 6, 3, 0], chordsB: [3, 4, 6, 4], lead: "square", lead2: "sawtooth", bass: "triangle", drums: "rock", seed: 11, rhythm: MEDIUM, busyBass: true },
  select: { bpm: 112, root: 65, scale: MAJOR, chords: [0, 5, 3, 4], chordsB: [3, 0, 1, 4], lead: "triangle", lead2: "square", bass: "triangle", drums: "soft", seed: 23, rhythm: MEDIUM, arp: true },
  world1: { bpm: 126, root: 60, scale: MAJOR, chords: [0, 4, 5, 3], chordsB: [5, 3, 0, 4], lead: "square", lead2: "triangle", bass: "triangle", drums: "rock", seed: 7, rhythm: BOUNCY, busyBass: true, arp: true },
  // Desierto de los cráneos: funk fantasmal (tema original, estilo "cazafantasmas")
  world2: { bpm: 116, root: 52, scale: DORIAN, chords: [0, 0, 6, 3], chordsB: [3, 4, 0, 6], lead: "square", lead2: "sawtooth", bass: "sawtooth", drums: "funk", seed: 37, rhythm: FUNKY, funkBass: true, ooh: true, leadVol: 0.7 },
  world3: { bpm: 92, root: 67, scale: MAJOR, chords: [0, 3, 5, 4], chordsB: [5, 1, 4, 0], lead: "sine", lead2: "triangle", bass: "triangle", drums: "soft", seed: 41, rhythm: SLOW, swing: 0.22, arp: true },
  world4: { bpm: 104, root: 57, scale: DORIAN, chords: [0, 3, 0, 4], chordsB: [5, 4, 3, 4], lead: "triangle", lead2: "square", bass: "sine", drums: "tribal", seed: 53, rhythm: MEDIUM },
  world5: { bpm: 152, root: 52, scale: HARMONIC, chords: [0, 5, 6, 4], chordsB: [3, 0, 5, 4], lead: "sawtooth", lead2: "square", bass: "square", drums: "double", seed: 67, rhythm: BUSY, busyBass: true, leadVol: 0.55 },
  world6: { bpm: 120, root: 60, scale: WHOLE, chords: [0, 2, 4, 1], chordsB: [3, 1, 5, 2], lead: "sine", lead2: "triangle", bass: "sawtooth", drums: "techno", seed: 71, rhythm: MEDIUM, arp: true, ooh: true },
  world7: { bpm: 140, root: 64, scale: MAJOR, chords: [0, 4, 5, 3], chordsB: [1, 4, 0, 5], lead: "square", lead2: "triangle", bass: "triangle", drums: "march", seed: 83, rhythm: BOUNCY },
  // Santa Fe Vice City: synthwave (tema propio)
  world8: { bpm: 104, root: 57, scale: MINOR, chords: [0, 5, 2, 6], chordsB: [3, 5, 0, 6], lead: "sawtooth", lead2: "square", bass: "sawtooth", drums: "techno", seed: 89, rhythm: MEDIUM, busyBass: true, arp: true, leadVol: 0.55 },
  boss: { bpm: 166, root: 57, scale: HARMONIC, chords: [0, 0, 5, 4], chordsB: [5, 6, 4, 4], lead: "sawtooth", lead2: "square", bass: "square", drums: "double", seed: 97, rhythm: BUSY, busyBass: true, leadVol: 0.55 },
  final: { bpm: 158, root: 50, scale: HARMONIC, chords: [0, 5, 1, 4], chordsB: [5, 3, 1, 4], lead: "square", lead2: "sawtooth", bass: "sawtooth", drums: "techno", seed: 101, rhythm: BUSY, busyBass: true },
  win: { bpm: 128, root: 60, scale: MAJOR, chords: [0, 3, 4, 0], lead: "square", bass: "triangle", drums: "march", seed: 113, rhythm: MEDIUM, arp: true, short: true },
  gameover: { bpm: 70, root: 57, scale: MINOR, chords: [0, 5, 3, 4], lead: "triangle", bass: "sine", drums: "none", seed: 127, rhythm: SLOW, short: true },
};

const DRUMS: Record<Drums, { kick: number[]; snare: number[]; hat: number[]; tom: number[] }> = {
  rock: { kick: [0, 8, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], tom: [] },
  soft: { kick: [0, 8], snare: [], hat: [4, 12], tom: [] },
  march: { kick: [0, 4, 8, 12], snare: [12, 14], hat: [2, 6, 10, 14], tom: [] },
  tribal: { kick: [0, 8], snare: [], hat: [], tom: [0, 3, 6, 10, 12] },
  techno: { kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], tom: [] },
  double: { kick: [0, 2, 8, 10], snare: [4, 12], hat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], tom: [] },
  funk: { kick: [0, 6, 10], snare: [4, 12], hat: [0, 2, 4, 6, 7, 8, 10, 12, 14, 15], tom: [] },
  half: { kick: [0], snare: [8], hat: [0, 4, 8, 12], tom: [] },
  none: { kick: [], snare: [], hat: [], tom: [] },
};

interface Step {
  lead: number | null;
  leadLen: number;
  leadType: OscillatorType;
  bass: number | null;
  bassLen: number;
  arp: number | null;
  ooh: number | null;
  /** Colchón: notas del acorde que suenan todo el compás (suave, para que no haya huecos). */
  pad: number[] | null;
  drums: Drums;
  /** Redoble de cierre de parte. */
  fill: boolean;
}

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const midiFreq = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/** Nota MIDI del grado `deg` de la escala (admite grados fuera de rango: sube/baja octavas). */
function degree(def: TrackDef, deg: number, octave = 0, transpose = 0): number {
  const n = def.scale.length;
  const o = Math.floor(deg / n);
  const i = ((deg % n) + n) % n;
  return def.root + transpose + def.scale[i] + 12 * (o + octave);
}

/** Inventa 4 compases de melodía sobre 4 acordes (grados de escala, o null = silencio). */
function melody(def: TrackDef, chords: number[], seed: number, rhythm: number[]): (number | null)[][] {
  const r = rng(seed);
  const n = def.scale.length;
  const bars: (number | null)[][] = [];
  let cur = chords[0] + n;
  for (let bar = 0; bar < 4; bar++) {
    const chord = chords[bar];
    const notes: (number | null)[] = [];
    for (let i = 0; i < 16; i++) {
      if (!rhythm[i] || (r() < 0.12 && i % 4 !== 0)) {
        notes.push(null);
        continue;
      }
      if (i % 4 === 0) {
        const tones = [chord, chord + 2, chord + 4].map((t) => t + n);
        tones.sort((a, b) => Math.abs(a - cur) - Math.abs(b - cur));
        cur = tones[r() < 0.7 ? 0 : 1];
      } else {
        cur += [-2, -1, -1, 1, 1, 2][Math.floor(r() * 6)];
        cur = Math.max(n - 2, Math.min(n * 2 + 2, cur));
      }
      notes.push(cur);
    }
    bars.push(notes);
  }
  return bars;
}

/** Variación: agrega notas de paso en algunos silencios y sube alguna nota. */
function vary(bars: (number | null)[][], seed: number): (number | null)[][] {
  const r = rng(seed);
  return bars.map((bar) =>
    bar.map((nt, i) => {
      if (nt === null && i > 0 && bar[i - 1] !== null && r() < 0.35) return (bar[i - 1] as number) + (r() < 0.5 ? 1 : -1);
      if (nt !== null && i % 4 === 2 && r() < 0.25) return nt + 2;
      return nt;
    }),
  );
}

interface Part {
  bars: number;
  chords: number[];
  mel: (number | null)[][] | null;
  leadType: OscillatorType;
  octave: number;
  drums: Drums;
  arp: boolean;
  bass: "normal" | "busy" | "funk" | "pedal";
  ooh: boolean;
  /** Redoble al final de la parte. */
  fill: boolean;
}

/** Ritmos alternativos para que cada parte tenga el suyo (parecido al del tema). */
function altRhythm(r: number[], k: number): number[] {
  const pool = [MEDIUM, BOUNCY, FUNKY, SLOW, BUSY].filter((x) => x !== r);
  // los temas lentos alternan con ritmos tranquilos; los movidos, con movidos
  const calm = r === SLOW;
  const order = calm ? [MEDIUM, SLOW, FUNKY] : pool;
  return order[k % order.length];
}

/**
 * Frase de 8 compases tipo "pregunta y respuesta": 4 compases + 2 que la recuerdan + 2 nuevos que cierran.
 * Así la melodía no repite el mismo pedacito de 4 compases una y otra vez.
 */
function phrase8(def: TrackDef, chords: number[], seed: number, rhythm: number[], rhythm2: number[]): (number | null)[][] {
  const a = melody(def, chords, seed, rhythm);
  const b = melody(def, chords, seed + 7, rhythm2);
  const av = vary(a, seed + 3);
  return [a[0], a[1], a[2], a[3], av[0], av[1], b[2], b[3]];
}

/**
 * Compone una vuelta de la canción (~48 compases, 1:30 a 2 minutos).
 * Todas las partes en el mismo tono y sin huecos; cada vuelta cambia las melodías (otra semilla)
 * pero sigue en el mismo tono, así no parece que la música "se corta y vuelve a empezar".
 */
function compose(def: TrackDef, cycle = 0): Step[] {
  const n = def.scale.length;
  const seed = def.seed + cycle * 101;
  const chordsA = def.chords;
  const chordsB = def.chordsB ?? [chordsA[2], chordsA[3], chordsA[0], chordsA[1]];
  const chordsC = [chordsB[1], chordsA[2], chordsB[3], chordsA[3]];
  const lead2 = def.lead2 ?? def.lead;
  const bassMode = def.funkBass ? "funk" : def.busyBass ? "busy" : "normal";
  const r0 = def.rhythm;
  const phraseA = phrase8(def, chordsA, seed, r0, altRhythm(r0, cycle));
  const phraseA2 = phrase8(def, chordsA, seed + 11, r0, altRhythm(r0, cycle + 1));
  const phraseB = phrase8(def, chordsB, seed + 17, altRhythm(r0, cycle + 2), r0);
  const phraseC = phrase8(def, chordsC, seed + 29, altRhythm(r0, cycle + 3), altRhythm(r0, cycle + 4));
  const phraseB2 = phrase8(def, chordsB, seed + 37, altRhythm(r0, cycle + 2), altRhythm(r0, cycle + 1));
  const P = (o: Partial<Part> & { bars: number; chords: number[] }): Part => ({
    mel: null, leadType: def.lead, octave: 0, drums: def.drums, arp: false, bass: bassMode, ooh: false, fill: false, ...o,
  });
  const parts: Part[] = def.short
    ? [P({ bars: 8, chords: chordsA, mel: phraseA })]
    : [
        // la intro (corta) sólo al empezar: en las vueltas siguientes la música sigue de largo
        ...(cycle === 0 ? [P({ bars: 2, chords: chordsA, drums: def.drums === "none" ? "none" : "half", bass: "pedal" })] : []),
        P({ bars: 8, chords: chordsA, mel: phraseA }), // tema A
        P({ bars: 8, chords: chordsB, mel: phraseB, leadType: lead2, ooh: !!def.ooh }), // parte B
        P({ bars: 8, chords: chordsA, mel: phraseA2, arp: !!def.arp }), // A con otra respuesta
        P({ bars: 8, chords: chordsC, mel: phraseC, octave: 1, arp: !!def.arp, fill: true }), // puente
        P({ bars: 8, chords: chordsB, mel: phraseB2, leadType: lead2, ooh: !!def.ooh }), // B con otra melodía
        P({ bars: 8, chords: chordsA, mel: vary(phraseA, seed + 9), octave: 0, fill: true }), // vuelve el tema
      ];
  const steps: Step[] = [];
  for (const part of parts) {
    for (let bar = 0; bar < part.bars; bar++) {
      const chord = part.chords[bar % part.chords.length];
      let mel = part.mel ? part.mel[bar % part.mel.length] : null;
      if (mel && bar === part.bars - 1) {
        // final de frase: termina en la tónica del acorde
        mel = mel.map((nt, i) => (nt === null ? null : i >= 12 ? part.chords[0] + n : nt));
      }
      const lastBar = bar === part.bars - 1;
      for (let i = 0; i < 16; i++) {
        let len = 1;
        if (mel) {
          while (i + len < 16 && mel[i + len] === null && len < 4) len++;
        }
        let bassOn: boolean;
        let bassDeg = chord;
        let bassOct = -1;
        let bassLen = 3.5;
        if (part.bass === "busy") {
          bassOn = i % 2 === 0;
          if (i % 4 === 2) bassDeg = chord + 4;
          bassLen = 1.6;
        } else if (part.bass === "funk") {
          bassOn = [0, 3, 6, 8, 10, 11, 14].includes(i);
          if (i === 6 || i === 14) bassOct = 0;
          if (i === 10) bassDeg = chord + 4;
          if (i === 11) bassDeg = chord + 5;
          bassLen = i === 0 || i === 8 ? 1.8 : 0.9;
        } else if (part.bass === "pedal") {
          bassOn = i === 0 || i === 8;
          bassLen = 7;
        } else {
          bassOn = i === 0 || i === 8 || (i === 14 && bar % 2 === 1);
        }
        // arpegio tranquilo: en corcheas y siguiendo el acorde
        const arpTones = [chord, chord + 2, chord + 4, chord + 2];
        steps.push({
          lead: mel && mel[i] !== null ? degree(def, mel[i] as number, part.octave) : null,
          leadLen: len,
          leadType: part.leadType,
          bass: bassOn ? degree(def, bassDeg, bassOct) : null,
          bassLen,
          arp: part.arp && i % 2 === 0 ? degree(def, arpTones[(i / 2) % 4], 1) : null,
          ooh: part.ooh && i === 0 && bar % 2 === 0 ? degree(def, chord + n, 0) : null,
          pad: i === 0 ? [degree(def, chord, 0), degree(def, chord + 2, 0), degree(def, chord + 4, 0)] : null,
          drums: part.drums,
          fill: part.fill && lastBar && i >= 12 && part.drums !== "none",
        });
      }
    }
  }
  return steps;
}

/** Duración (segundos) de una vuelta de un tema (para pruebas). */
export function trackLength(name: string): number {
  const def = TRACKS[name];
  return def ? (compose(def).length * 60) / def.bpm / 4 : 0;
}

export class Music {
  private static ctx: AudioContext | null = null;
  private static master: GainNode | null = null;
  private static trackGain: GainNode | null = null;
  private static noise: AudioBuffer | null = null;
  private static current: string | null = null;
  private static def: TrackDef | null = null;
  private static steps: Step[] = [];
  private static stepIdx = 0;
  private static cycle = 0;
  /** Por dónde iba cada tema (si vuelve a sonar, sigue de ahí en vez de empezar de cero). */
  private static saved = new Map<string, { steps: Step[]; stepIdx: number; cycle: number }>();
  private static nextTime = 0;
  private static timer: number | null = null;
  private static muted = false;
  private static paused = false;

  private static init(): AudioContext | null {
    if (!Music.ctx) {
      Music.ctx = Sfx.sharedContext();
      if (!Music.ctx) return null;
      Music.master = Music.ctx.createGain();
      Music.master.gain.value = Music.muted ? 0 : 0.16;
      Music.master.connect(Music.ctx.destination);
      const len = Music.ctx.sampleRate * 0.5;
      Music.noise = Music.ctx.createBuffer(1, len, Music.ctx.sampleRate);
      const data = Music.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (Music.ctx.state === "suspended") {
      void Music.ctx.resume();
    }
    return Music.ctx;
  }

  /** Salida de la música (para grabar). */
  public static output(): GainNode | null {
    Music.init();
    return Music.master;
  }

  public static setMuted(m: boolean): void {
    Music.muted = m;
    if (Music.master && Music.ctx) {
      Music.master.gain.setTargetAtTime(m ? 0 : 0.16, Music.ctx.currentTime, 0.05);
    }
  }

  public static get playing(): string | null {
    return Music.current;
  }

  /** Arranca un tema (si ya está sonando, no hace nada). */
  public static play(name: string): void {
    if (Music.current === name && !Music.paused) return;
    const def = TRACKS[name];
    if (!def) {
      Music.stop();
      return;
    }
    const ctx = Music.init();
    if (!ctx || !Music.master) return;
    Music.stop();
    Music.current = name;
    Music.def = def;
    const prev = def.short ? undefined : Music.saved.get(name);
    Music.saved.delete(name);
    Music.cycle = prev ? prev.cycle : 0;
    Music.steps = prev ? prev.steps : compose(def, 0);
    // retoma desde el comienzo del compás donde había quedado
    Music.stepIdx = prev ? prev.stepIdx - (prev.stepIdx % 16) : 0;
    Music.trackGain = ctx.createGain();
    Music.trackGain.gain.value = 1;
    Music.trackGain.connect(Music.master);
    Music.nextTime = ctx.currentTime + 0.08;
    Music.paused = false;
    Music.timer = window.setInterval(() => Music.tick(), 25);
  }

  public static stop(): void {
    if (Music.current && Music.def && !Music.def.short) {
      Music.saved.set(Music.current, { steps: Music.steps, stepIdx: Music.stepIdx, cycle: Music.cycle });
    }
    if (Music.timer !== null) {
      window.clearInterval(Music.timer);
      Music.timer = null;
    }
    const g = Music.trackGain;
    if (g && Music.ctx) {
      g.gain.setTargetAtTime(0, Music.ctx.currentTime, 0.08);
      window.setTimeout(() => g.disconnect(), 800);
    }
    Music.trackGain = null;
    Music.current = null;
    Music.paused = false;
  }

  public static pause(p: boolean): void {
    if (!Music.current || !Music.ctx || !Music.trackGain) return;
    Music.paused = p;
    Music.trackGain.gain.setTargetAtTime(p ? 0 : 1, Music.ctx.currentTime, 0.05);
    if (!p) {
      Music.nextTime = Music.ctx.currentTime + 0.08;
    }
  }

  private static tick(): void {
    const ctx = Music.ctx;
    const def = Music.def;
    if (!ctx || !def || Music.paused) return;
    const sixteenth = 60 / def.bpm / 4;
    // si la pestaña estuvo frenada, no "recuperar" notas viejas
    if (Music.nextTime < ctx.currentTime - 0.2) {
      Music.nextTime = ctx.currentTime + 0.05;
    }
    while (Music.nextTime < ctx.currentTime + 0.12) {
      if (Music.stepIdx >= Music.steps.length) {
        // terminó la vuelta: se recompone otra distinta (otra semilla y otro tono)
        Music.stepIdx = 0;
        if (!def.short) {
          Music.cycle++;
          Music.steps = compose(def, Music.cycle);
        }
      }
      const i = Music.stepIdx;
      const st = Music.steps[i];
      const inBar = i % 16;
      const swing = def.swing && inBar % 2 === 1 ? sixteenth * def.swing : 0;
      const t = Music.nextTime + swing;
      if (st.lead !== null) Music.note(st.leadType, midiFreq(st.lead), t, sixteenth * st.leadLen * 0.9, 0.22 * (def.leadVol ?? 1));
      if (st.bass !== null) Music.note(def.bass, midiFreq(st.bass), t, sixteenth * st.bassLen, def.funkBass ? 0.22 : 0.28);
      if (st.arp !== null) Music.note("triangle", midiFreq(st.arp), t, sixteenth * 1.4, 0.045);
      if (st.pad) {
        for (const pn of st.pad) Music.note("triangle", midiFreq(pn), t, sixteenth * 15.5, 0.026);
      }
      if (st.ooh !== null) Music.ooh(midiFreq(st.ooh), t, sixteenth * 28);
      const d = DRUMS[st.drums];
      if (st.fill) {
        Music.snare(t);
        if (inBar % 2 === 1) Music.tom(t, inBar);
      } else {
        if (d.snare.includes(inBar)) Music.snare(t);
        if (d.tom.includes(inBar)) Music.tom(t, inBar);
      }
      if (d.kick.includes(inBar)) Music.kick(t);
      if (d.hat.includes(inBar)) Music.hat(t, st.drums === "double" ? 0.04 : 0.07);
      Music.nextTime += sixteenth;
      Music.stepIdx++;
    }
  }

  private static out(): AudioNode | null {
    return Music.trackGain;
  }

  private static note(type: OscillatorType, freq: number, t: number, dur: number, vol: number): void {
    const ctx = Music.ctx;
    const out = Music.out();
    if (!ctx || !out) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(vol * 0.6, t + Math.min(0.08, dur * 0.5));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /** Coro fantasmal: nota larga, entrada lenta y vibrato ("uuuuh"). */
  private static ooh(freq: number, t: number, dur: number): void {
    const ctx = Music.ctx;
    const out = Music.out();
    if (!ctx || !out) return;
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * 0.94, t);
    osc.frequency.exponentialRampToValueAtTime(freq, t + 0.35);
    lfo.frequency.value = 5.5;
    lfoGain.gain.value = freq * 0.018;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(out);
    osc.start(t);
    lfo.start(t);
    osc.stop(t + dur + 0.05);
    lfo.stop(t + dur + 0.05);
  }

  private static kick(t: number): void {
    const ctx = Music.ctx;
    const out = Music.out();
    if (!ctx || !out) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  private static noiseHit(t: number, dur: number, vol: number, hp: number): void {
    const ctx = Music.ctx;
    const out = Music.out();
    if (!ctx || !out || !Music.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = Music.noise;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(out);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  private static snare(t: number): void {
    Music.noiseHit(t, 0.14, 0.35, 1200);
    Music.note("triangle", 190, t, 0.08, 0.15);
  }

  private static hat(t: number, vol: number): void {
    Music.noiseHit(t, 0.035, vol, 7000);
  }

  private static tom(t: number, step: number): void {
    const ctx = Music.ctx;
    const out = Music.out();
    if (!ctx || !out) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    const f0 = step % 2 === 0 ? 170 : 125;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + 0.18);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + 0.25);
  }
}

/**
 * Para pruebas: mide cuánto se repite un tema y dónde "se corta".
 * - frases: cuántas veces suena la frase de 2 compases más repetida en una vuelta
 * - sinMelodia: compases seguidos sin melodía (huecos que suenan a corte)
 * - saltoDeTono: semitonos que cambia la tonalidad al pasar de una vuelta a la siguiente
 */
export function analyzeTrack(name: string): { segundos: number; compases: number; ritmosDistintos: number; mismoRitmoPct: number; fraseMasRepetida: number; frasesDistintas: number; maxCompasesSinMelodia: number; saltoDeTono: number; arrancaSinMelodia: boolean } {
  const def = TRACKS[name];
  const a = compose(def, 0);
  const b = compose(def, 1);
  const bars = (st: Step[]): Step[][] => Array.from({ length: Math.floor(st.length / 16) }, (_, i) => st.slice(i * 16, i * 16 + 16));
  const ba = bars(a);
  // forma de la melodía: en qué tiempos suena y cuánto sube/baja (igual aunque esté en otro tono u octava)
  const sig = (bs: Step[]): string => {
    let prev: number | null = null;
    return bs.map((x) => { if (x.lead === null) return "-"; const d = prev === null ? 0 : x.lead - prev; prev = x.lead; return String(d); }).join(",");
  };
  const counts = new Map<string, number>();
  for (const bar of ba) {
    const k = sig(bar);
    if (/^[-,]+$/.test(k)) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const rhythms = new Map<string, number>();
  for (const bar of ba) {
    const k = bar.map((x) => (x.lead === null ? 0 : 1)).join("");
    if (!k.includes("1")) continue;
    rhythms.set(k, (rhythms.get(k) ?? 0) + 1);
  }
  const withLead = [...rhythms.values()].reduce((a2, b2) => a2 + b2, 0);
  let run = 0;
  let maxRun = 0;
  for (const bar of ba) {
    run = bar.every((x) => x.lead === null) ? run + 1 : 0;
    maxRun = Math.max(maxRun, run);
  }
  const lastBass = [...a].reverse().find((x) => x.bass !== null)?.bass ?? 0;
  const firstBass = b.find((x) => x.bass !== null)?.bass ?? 0;
  const firstBarsB = bars(b).slice(0, 2);
  return {
    segundos: Math.round((a.length * 60) / def.bpm / 4),
    compases: ba.length,
    ritmosDistintos: rhythms.size,
    mismoRitmoPct: Math.round((Math.max(0, ...rhythms.values()) / Math.max(1, withLead)) * 100),
    fraseMasRepetida: Math.max(0, ...counts.values()),
    frasesDistintas: counts.size,
    maxCompasesSinMelodia: maxRun,
    saltoDeTono: Math.abs(((firstBass - lastBass) % 12 + 12) % 12) % 12,
    arrancaSinMelodia: firstBarsB.every((bar) => bar.every((x) => x.lead === null)),
  };
}
