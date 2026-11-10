import { Sfx } from "./Sfx";

/**
 * Música chiptune generada por código (WebAudio). Cada tema tiene tempo, escala, acordes,
 * instrumentos y batería propios; la melodía se compone una vez con una semilla fija,
 * así cada tema suena siempre igual y es reconocible.
 */

type Drums = "rock" | "soft" | "march" | "tribal" | "techno" | "double" | "none";

interface TrackDef {
  bpm: number;
  /** Nota base (MIDI). */
  root: number;
  scale: number[];
  /** Grados de la escala de los 4 acordes (uno por compás). */
  chords: number[];
  lead: OscillatorType;
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
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const HARMONIC = [0, 2, 3, 5, 7, 8, 11];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const MIXO = [0, 2, 4, 5, 7, 9, 10];
const PHRYG_DOM = [0, 1, 4, 5, 7, 8, 10];
const WHOLE = [0, 2, 4, 6, 8, 10];

const BUSY = [1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0];
const MEDIUM = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0];
const SLOW = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0];
const BOUNCY = [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0];

export const TRACKS: Record<string, TrackDef> = {
  title: { bpm: 132, root: 62, scale: MIXO, chords: [0, 6, 3, 0], lead: "square", bass: "triangle", drums: "rock", seed: 11, rhythm: MEDIUM, busyBass: true },
  select: { bpm: 112, root: 65, scale: MAJOR, chords: [0, 5, 3, 4], lead: "triangle", bass: "triangle", drums: "soft", seed: 23, rhythm: MEDIUM, arp: true },
  world2: { bpm: 100, root: 62, scale: PHRYG_DOM, chords: [0, 0, 1, 0], lead: "sawtooth", bass: "triangle", drums: "tribal", seed: 37, rhythm: MEDIUM, leadVol: 0.6 },
  world3: { bpm: 92, root: 67, scale: MAJOR, chords: [0, 3, 5, 4], lead: "sine", bass: "triangle", drums: "soft", seed: 41, rhythm: SLOW, swing: 0.22, arp: true },
  world4: { bpm: 104, root: 57, scale: DORIAN, chords: [0, 3, 0, 4], lead: "triangle", bass: "sine", drums: "tribal", seed: 53, rhythm: MEDIUM },
  world5: { bpm: 152, root: 52, scale: HARMONIC, chords: [0, 5, 6, 4], lead: "sawtooth", bass: "square", drums: "double", seed: 67, rhythm: BUSY, busyBass: true, leadVol: 0.55 },
  world6: { bpm: 120, root: 60, scale: WHOLE, chords: [0, 2, 4, 1], lead: "sine", bass: "sawtooth", drums: "techno", seed: 71, rhythm: MEDIUM, arp: true },
  world7: { bpm: 140, root: 64, scale: MAJOR, chords: [0, 4, 5, 3], lead: "square", bass: "triangle", drums: "march", seed: 83, rhythm: BOUNCY },
  boss: { bpm: 166, root: 57, scale: HARMONIC, chords: [0, 0, 5, 4], lead: "sawtooth", bass: "square", drums: "double", seed: 97, rhythm: BUSY, busyBass: true, leadVol: 0.55 },
  final: { bpm: 158, root: 50, scale: HARMONIC, chords: [0, 5, 1, 4], lead: "square", bass: "sawtooth", drums: "techno", seed: 101, rhythm: BUSY, busyBass: true },
  win: { bpm: 128, root: 60, scale: MAJOR, chords: [0, 3, 4, 0], lead: "square", bass: "triangle", drums: "march", seed: 113, rhythm: MEDIUM, arp: true },
  gameover: { bpm: 70, root: 57, scale: MINOR, chords: [0, 5, 3, 4], lead: "triangle", bass: "sine", drums: "none", seed: 127, rhythm: SLOW },
};

const DRUMS: Record<Drums, { kick: number[]; snare: number[]; hat: number[]; tom: number[] }> = {
  rock: { kick: [0, 8, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], tom: [] },
  soft: { kick: [0, 8], snare: [], hat: [4, 12], tom: [] },
  march: { kick: [0, 4, 8, 12], snare: [12, 14], hat: [2, 6, 10, 14], tom: [] },
  tribal: { kick: [0, 8], snare: [], hat: [], tom: [0, 3, 6, 10, 12] },
  techno: { kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], tom: [] },
  double: { kick: [0, 2, 8, 10], snare: [4, 12], hat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], tom: [] },
  none: { kick: [], snare: [], hat: [], tom: [] },
};

interface Step {
  lead: number | null;
  leadLen: number;
  bass: number | null;
  arp: number | null;
}

const BARS = 8;

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const midiFreq = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/** Nota MIDI del grado `deg` de la escala (admite grados fuera de rango: sube/baja octavas). */
function degree(def: TrackDef, deg: number, octave = 0): number {
  const n = def.scale.length;
  const o = Math.floor(deg / n);
  const i = ((deg % n) + n) % n;
  return def.root + def.scale[i] + 12 * (o + octave);
}

/** Compone el tema: 8 compases (melodía A en 1-4, A' en 5-8) a partir de la semilla. */
function compose(def: TrackDef): Step[] {
  const r = rng(def.seed);
  const steps: Step[] = [];
  const barA: (number | null)[][] = [];
  let cur = def.chords[0] + def.scale.length; // arrancar una octava arriba
  for (let bar = 0; bar < 4; bar++) {
    const chord = def.chords[bar];
    const notes: (number | null)[] = [];
    for (let i = 0; i < 16; i++) {
      if (!def.rhythm[i] || (r() < 0.12 && i % 4 !== 0)) {
        notes.push(null);
        continue;
      }
      if (i % 4 === 0) {
        // tiempo fuerte: nota del acorde, cerca de la anterior
        const tones = [chord, chord + 2, chord + 4].map((t) => t + def.scale.length);
        tones.sort((a, b) => Math.abs(a - cur) - Math.abs(b - cur));
        cur = tones[r() < 0.7 ? 0 : 1];
      } else {
        cur += [-2, -1, -1, 1, 1, 2][Math.floor(r() * 6)];
        cur = Math.max(def.scale.length - 2, Math.min(def.scale.length * 2 + 2, cur));
      }
      notes.push(cur);
    }
    barA.push(notes);
  }
  for (let bar = 0; bar < BARS; bar++) {
    const chord = def.chords[bar % 4];
    let mel = barA[bar % 4];
    if (bar === BARS - 1) {
      // final de frase: termina en la tónica
      mel = mel.map((n, i) => (n === null ? null : i >= 12 ? def.chords[0] + def.scale.length : n));
    }
    for (let i = 0; i < 16; i++) {
      // duración: hasta la próxima nota
      let len = 1;
      while (i + len < 16 && mel[i + len] === null && len < 4) len++;
      const bassOn = def.busyBass ? i % 2 === 0 : i === 0 || i === 8 || (i === 14 && bar % 2 === 1);
      const bassDeg = def.busyBass && i % 4 === 2 ? chord + 4 : chord;
      const arpTones = [chord, chord + 2, chord + 4, chord + 7];
      steps.push({
        lead: mel[i] === null ? null : degree(def, mel[i] as number),
        leadLen: len,
        bass: bassOn ? degree(def, bassDeg, -1) : null,
        arp: def.arp ? degree(def, arpTones[i % 4], 1) : null,
      });
    }
  }
  return steps;
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
    Music.steps = compose(def);
    Music.stepIdx = 0;
    Music.trackGain = ctx.createGain();
    Music.trackGain.gain.value = 1;
    Music.trackGain.connect(Music.master);
    Music.nextTime = ctx.currentTime + 0.08;
    Music.paused = false;
    Music.timer = window.setInterval(() => Music.tick(), 25);
  }

  public static stop(): void {
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
      const i = Music.stepIdx % Music.steps.length;
      const st = Music.steps[i];
      const inBar = i % 16;
      const swing = def.swing && inBar % 2 === 1 ? sixteenth * def.swing : 0;
      const t = Music.nextTime + swing;
      if (st.lead !== null) Music.note(def.lead, midiFreq(st.lead), t, sixteenth * st.leadLen * 0.9, 0.22 * (def.leadVol ?? 1));
      if (st.bass !== null) Music.note(def.bass, midiFreq(st.bass), t, sixteenth * (def.busyBass ? 1.6 : 3.5), 0.28);
      if (st.arp !== null) Music.note("square", midiFreq(st.arp), t, sixteenth * 0.6, 0.05);
      const d = DRUMS[def.drums];
      if (d.kick.includes(inBar)) Music.kick(t);
      if (d.snare.includes(inBar)) Music.snare(t);
      if (d.hat.includes(inBar)) Music.hat(t, def.drums === "double" ? 0.04 : 0.07);
      if (d.tom.includes(inBar)) Music.tom(t, inBar);
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
