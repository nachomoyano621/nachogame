import { sound } from "@pixi/sound";
import { Music } from "./Music";
import { Sfx } from "./Sfx";
import { Storage } from "./Storage";

/** Tema que usa la canción original (cancion.mp3) en vez de la música generada. */
const SONG_TRACK = "world1";

/**
 * Audio del juego: mute global persistido, música por pantalla y efectos.
 * Cada pantalla pide su tema con `AudioCtl.music(nombre)`; el Mundo 1 usa la canción original
 * y el resto, temas chiptune generados (ver Music.ts).
 */
export const AudioCtl = {
  init(): void {
    AudioCtl.set(Storage.muted);
  },
  get muted(): boolean {
    return Sfx.muted;
  },
  set(muted: boolean): void {
    Sfx.muted = muted;
    if (muted) {
      sound.muteAll();
    } else {
      sound.unmuteAll();
    }
    Music.setMuted(muted);
    Storage.setMuted(muted);
  },
  toggle(): void {
    AudioCtl.set(!Sfx.muted);
  },
  /** Cambia la música de fondo (si ya está sonando ese tema, sigue sin cortarse). */
  music(name: string): void {
    const song = sound.find("cancion");
    if (name === SONG_TRACK) {
      Music.stop();
      if (song && !song.isPlaying) {
        song.play({ loop: true, volume: 0.22 });
      }
      return;
    }
    song?.stop();
    Music.play(name);
  },
  /** Compatibilidad: la música de la partida es la del mundo actual. */
  playMusic(): void {
    AudioCtl.music(SONG_TRACK);
  },
  stopMusic(): void {
    sound.find("cancion")?.stop();
    Music.stop();
  },
  pauseMusic(paused: boolean): void {
    const song = sound.find("cancion");
    if (song?.isPlaying || song?.paused) {
      if (paused) {
        song.pause();
      } else {
        song.resume();
      }
    }
    Music.pause(paused);
  },
  /** Stream de audio (música + efectos) para grabar la demo. */
  captureStream(): MediaStream | null {
    const ctx = Sfx.sharedContext();
    const out = Sfx.ensure();
    const comp = (sound.context as unknown as { compressor?: AudioNode }).compressor;
    if (!ctx || !out) {
      return null;
    }
    const dest = ctx.createMediaStreamDestination();
    out.connect(dest);
    comp?.connect(dest);
    Music.output()?.connect(dest);
    return dest.stream;
  },
  coin(): void {
    sound.find("cancion_moneda")?.play({ volume: 0.35 });
  },
};
