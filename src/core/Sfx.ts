import { sound } from "@pixi/sound";

/**
 * Efectos de sonido sintetizados con WebAudio (no necesitan archivos).
 * Usan el mismo AudioContext que la música para poder grabar todo junto.
 */
export class Sfx {
  public static muted = false;
  private static ctx: AudioContext | null = null;
  /** Salida común de los efectos (se conecta a los parlantes y, en la demo, al grabador). */
  public static out: GainNode | null = null;

  private static ac(): AudioContext | null {
    if (Sfx.muted) {
      return null;
    }
    try {
      if (!Sfx.ctx) {
        Sfx.ctx = Sfx.sharedContext();
        if (!Sfx.ctx) {
          return null;
        }
        Sfx.out = Sfx.ctx.createGain();
        Sfx.out.connect(Sfx.ctx.destination);
      }
      if (Sfx.ctx.state === "suspended") {
        void Sfx.ctx.resume();
      }
      return Sfx.ctx;
    } catch {
      return null;
    }
  }

  /** AudioContext de @pixi/sound (o uno propio si no hay WebAudio ahí). */
  public static sharedContext(): AudioContext | null {
    const pixiCtx = (sound.context as unknown as { audioContext?: AudioContext }).audioContext;
    if (pixiCtx) {
      return pixiCtx;
    }
    const w = window as unknown as { webkitAudioContext?: typeof AudioContext };
    const AC = window.AudioContext || w.webkitAudioContext;
    return AC ? new AC() : null;
  }

  /** Inicializa el contexto (sin sonar) y devuelve la salida de efectos. */
  public static ensure(): GainNode | null {
    const wasMuted = Sfx.muted;
    Sfx.muted = false;
    Sfx.ac();
    Sfx.muted = wasMuted;
    return Sfx.out;
  }

  private static tone(f0: number, f1: number, dur: number, type: OscillatorType, vol: number, delay = 0): void {
    const ctx = Sfx.ac();
    if (!ctx) {
      return;
    }
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(Sfx.out ?? ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private static arp(notes: number[], step: number, type: OscillatorType, vol: number): void {
    notes.forEach((f, i) => Sfx.tone(f, f, step * 1.6, type, vol, i * step));
  }

  public static jump(): void {
    Sfx.tone(380, 760, 0.14, "square", 0.05);
  }
  public static airJump(): void {
    Sfx.tone(560, 1250, 0.15, "square", 0.05);
  }
  public static stomp(): void {
    Sfx.tone(320, 60, 0.2, "triangle", 0.3);
  }
  public static hurt(): void {
    Sfx.tone(240, 50, 0.45, "sawtooth", 0.12);
  }
  public static shieldBreak(): void {
    Sfx.tone(1000, 180, 0.3, "triangle", 0.18);
  }
  public static power(): void {
    Sfx.arp([523, 659, 784, 1047], 0.06, "square", 0.05);
  }
  public static levelUp(): void {
    Sfx.arp([392, 523, 659, 784, 1047], 0.08, "triangle", 0.18);
  }
  public static warn(): void {
    Sfx.tone(880, 880, 0.08, "square", 0.06);
    Sfx.tone(880, 880, 0.08, "square", 0.06, 0.15);
  }
  public static roar(): void {
    Sfx.tone(150, 40, 0.9, "sawtooth", 0.16);
    Sfx.tone(95, 35, 0.9, "square", 0.07);
  }
  public static die(): void {
    Sfx.tone(520, 50, 1.0, "triangle", 0.2);
  }
  public static win(): void {
    Sfx.arp([523, 659, 784, 1047, 784, 1047, 1319], 0.1, "square", 0.06);
  }
  public static whoosh(): void {
    Sfx.tone(1400, 160, 0.55, "triangle", 0.05);
  }
  public static boom(): void {
    Sfx.tone(180, 30, 0.6, "sawtooth", 0.2);
    Sfx.tone(90, 25, 0.7, "square", 0.1);
  }
  public static throwIt(): void {
    Sfx.tone(500, 180, 0.22, "triangle", 0.12);
  }
  public static spit(): void {
    Sfx.tone(300, 900, 0.18, "sawtooth", 0.06);
  }
  public static portal(): void {
    Sfx.arp([262, 330, 392, 523, 659, 784, 1047, 1319], 0.045, "sine", 0.12);
    Sfx.tone(200, 1600, 0.5, "triangle", 0.05);
  }
  public static click(): void {
    Sfx.tone(700, 900, 0.06, "square", 0.04);
  }
}
