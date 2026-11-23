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
  /** Ruido filtrado (siseos, chisporroteos, motores). */
  private static noise(dur: number, freq: number, vol: number, delay = 0, q = 1, type: BiquadFilterType = "bandpass"): void {
    const ctx = Sfx.ac();
    if (!ctx) {
      return;
    }
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(Sfx.out ?? ctx.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  private static lastVoice = 0;

  /**
   * Voz de cada monstruo (al aparecer). `hurt` = versión corta y aguda al voltearlo.
   * Con un límite para que muchos monstruos juntos no saturen.
   */
  public static voice(label: string, hurt = false): void {
    const now = performance.now();
    if (now - Sfx.lastVoice < (hurt ? 90 : 350)) {
      return;
    }
    Sfx.lastVoice = now;
    const k = hurt ? 1.6 : 1; // al voltearlo suena más agudo
    const d = hurt ? 0.6 : 1; // y más corto
    switch (label) {
      case "dino":
      case "bebé dino-x":
        Sfx.tone(170 * k, 90 * k, 0.28 * d, "sawtooth", 0.07);
        break;
      case "mosquito":
        for (let i = 0; i < 4; i++) Sfx.tone(620 * k, 560 * k, 0.05, "square", 0.025, i * 0.06 * d);
        break;
      case "murciélago":
        Sfx.tone(2100 * k, 2700 * k, 0.06, "sine", 0.05);
        Sfx.tone(2300 * k, 2900 * k, 0.06, "sine", 0.05, 0.09 * d);
        break;
      case "escorpión":
        Sfx.tone(1300 * k, 900 * k, 0.04, "square", 0.05);
        Sfx.tone(1300 * k, 900 * k, 0.04, "square", 0.05, 0.08 * d);
        break;
      case "buitre":
      case "águila":
        Sfx.tone(1500 * k, 850 * k, 0.32 * d, "sawtooth", 0.05);
        break;
      case "roca":
        Sfx.noise(0.35 * d, 220, 0.18, 0, 0.8, "lowpass");
        break;
      case "cangrejo":
        Sfx.tone(950 * k, 950 * k, 0.03, "triangle", 0.09);
        Sfx.tone(1150 * k, 1150 * k, 0.03, "triangle", 0.09, 0.06 * d);
        break;
      case "medusa":
        Sfx.tone(280 * k, 640 * k, 0.18 * d, "sine", 0.09);
        break;
      case "serpiente":
        Sfx.noise(0.45 * d, 5200, 0.07, 0, 2);
        break;
      case "salamandra":
        Sfx.noise(0.3 * d, 3200, 0.06, 0, 1.2);
        Sfx.tone(240 * k, 140 * k, 0.2 * d, "sawtooth", 0.04);
        break;
      case "alien":
      case "bebé marciano":
        Sfx.tone(880 * k, 880 * k, 0.07, "square", 0.04);
        Sfx.tone(1320 * k, 1320 * k, 0.07, "square", 0.04, 0.09 * d);
        break;
      case "ovni":
        Sfx.tone(420 * k, 880 * k, 0.18 * d, "sine", 0.06);
        Sfx.tone(880 * k, 420 * k, 0.18 * d, "sine", 0.06, 0.18 * d);
        break;
      case "bloquecito":
        Sfx.tone(2200 * k, 1800 * k, 0.03, "square", 0.05);
        Sfx.tone(1700 * k, 1500 * k, 0.03, "square", 0.05, 0.07 * d);
        break;
      case "helibloque":
        for (let i = 0; i < 5; i++) Sfx.noise(0.04, 900 * k, 0.08, i * 0.05 * d, 3);
        break;
      case "patinador":
        Sfx.tone(1200 * k, 1600 * k, 0.08, "square", 0.04);
        Sfx.tone(1600 * k, 1200 * k, 0.08, "square", 0.04, 0.1 * d);
        break;
      case "flamenco":
        Sfx.tone(520 * k, 380 * k, 0.16 * d, "sawtooth", 0.05);
        Sfx.tone(560 * k, 400 * k, 0.16 * d, "sawtooth", 0.04, 0.18 * d);
        break;
      case "auto neón":
        Sfx.tone(440 * k, 440 * k, 0.09, "square", 0.05);
        Sfx.tone(554 * k, 554 * k, 0.09, "square", 0.05, 0.12 * d);
        break;
      case "dorado":
        Sfx.noise(0.25 * d, 1800, 0.08, 0, 0.7);
        Sfx.tone(300 * k, 700 * k, 0.12, "sine", 0.06);
        break;
      default:
        break; // peligros (lava, meteoritos, rex, mosasaurio) ya tienen su propio sonido
    }
  }

  /** Rugido propio de cada jefe (presentación, ataques y golpes). */
  public static bossVoice(voice: string, hurt = false): void {
    const k = hurt ? 1.35 : 1;
    switch (voice) {
      case "rey": // Rey Dino: rugido grave y largo
        Sfx.tone(130 * k, 45, 1.1, "sawtooth", 0.17);
        Sfx.tone(85 * k, 35, 1.1, "square", 0.08);
        break;
      case "escorpion": // chillido + pinzas
        Sfx.tone(1700 * k, 700, 0.5, "sawtooth", 0.07);
        for (let i = 0; i < 3; i++) Sfx.tone(1200, 900, 0.04, "square", 0.06, 0.45 + i * 0.08);
        break;
      case "cangrejo": // burbujeo + pellizco
        for (let i = 0; i < 4; i++) Sfx.tone(300 + i * 90, 700 + i * 90, 0.09, "sine", 0.1, i * 0.08);
        Sfx.tone(1000 * k, 1000 * k, 0.04, "triangle", 0.12, 0.38);
        break;
      case "serpiente": // siseo largo
        Sfx.noise(1.0, 5600 * k, 0.12, 0, 2);
        Sfx.tone(160 * k, 110, 0.6, "sawtooth", 0.05);
        break;
      case "salamandra": // rugido con chisporroteo
        Sfx.tone(180 * k, 60, 0.9, "sawtooth", 0.14);
        Sfx.noise(0.9, 2800, 0.09, 0, 0.8);
        break;
      case "marciano": // bip-bop que baja, de película de ciencia ficción
        [1320, 990, 1320, 660, 440].forEach((f, i) => Sfx.tone(f * k, f * k, 0.09, "square", 0.05, i * 0.1));
        Sfx.tone(600 * k, 150, 0.6, "sine", 0.06, 0.5);
        break;
      case "bloques": // crujido de bloques + golpe grave
        for (let i = 0; i < 4; i++) Sfx.tone(1900 - i * 250, 1500 - i * 250, 0.035, "square", 0.07, i * 0.07);
        Sfx.tone(110 * k, 40, 0.6, "triangle", 0.25, 0.3);
        break;
      case "dorado": // burbujeo + acorde de sintetizador ochentoso
        for (let i = 0; i < 4; i++) Sfx.tone(260 + i * 120, 620 + i * 120, 0.1, "sine", 0.09, i * 0.07);
        Sfx.tone(220 * k, 220 * k, 0.6, "sawtooth", 0.06, 0.3);
        Sfx.tone(277 * k, 277 * k, 0.6, "sawtooth", 0.05, 0.3);
        Sfx.tone(330 * k, 330 * k, 0.6, "sawtooth", 0.05, 0.3);
        break;
      case "dinox": // rugido metálico del laboratorio
        Sfx.tone(150 * k, 40, 1.3, "sawtooth", 0.18);
        Sfx.tone(95 * k, 30, 1.3, "square", 0.08);
        Sfx.tone(1250 * k, 1180, 0.9, "square", 0.025);
        break;
      default:
        Sfx.roar();
    }
  }

  /** "¡Buuuu!" de los fantasmas. */
  public static boo(): void {
    Sfx.tone(520, 300, 0.55, "sine", 0.09);
    Sfx.tone(780, 450, 0.55, "sine", 0.05, 0.05);
    Sfx.tone(300, 220, 0.4, "triangle", 0.05, 0.25);
  }

  /** Disparo según el arma. */
  public static shoot(kind: string): void {
    switch (kind) {
      case "bazooka":
        Sfx.tone(220, 60, 0.35, "sawtooth", 0.14);
        Sfx.tone(900, 200, 0.2, "triangle", 0.05);
        break;
      case "shotgun":
        Sfx.tone(260, 40, 0.25, "sawtooth", 0.16);
        break;
      case "revolver":
        Sfx.tone(700, 70, 0.22, "square", 0.1);
        break;
      case "smg":
        Sfx.tone(900, 160, 0.06, "square", 0.05);
        break;
      default:
        Sfx.tone(1000, 140, 0.12, "square", 0.07);
    }
  }
  public static click(): void {
    Sfx.tone(700, 900, 0.06, "square", 0.04);
  }
}
