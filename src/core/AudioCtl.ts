import { sound } from "@pixi/sound";
import { Sfx } from "./Sfx";
import { Storage } from "./Storage";

/** Mute global: música (@pixi/sound) + efectos sintetizados. Se persiste. */
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
    Storage.setMuted(muted);
  },
  toggle(): void {
    AudioCtl.set(!Sfx.muted);
  },
  playMusic(): void {
    const music = sound.find("cancion");
    if (music && !music.isPlaying) {
      music.play({ loop: true, volume: 0.22 });
    }
  },
  stopMusic(): void {
    sound.find("cancion")?.stop();
  },
  pauseMusic(paused: boolean): void {
    const music = sound.find("cancion");
    if (!music) {
      return;
    }
    if (paused) {
      music.pause();
    } else {
      music.resume();
    }
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
    return dest.stream;
  },
  coin(): void {
    sound.find("cancion_moneda")?.play({ volume: 0.35 });
  },
};
