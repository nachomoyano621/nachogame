import { Application, Rectangle } from "pixi.js";
import { COINS_PER_LEVEL, DIFFICULTIES, GROUND_Y, WIDTH } from "../config";
import { AudioCtl } from "../core/AudioCtl";
import { SceneManager } from "../core/SceneManager";
import { Background, LEVEL_NAMES } from "../game/Background";
import { Boss } from "../game/Boss";
import { CHARACTERS, CharacterDef } from "../game/characters";
import { Boulder, Enemy, Meteor, Mosasaur, Rex } from "../game/enemies";
import { WORLD_ENEMIES } from "../game/worldEnemies";
import { Player } from "../game/Player";
import { Portal } from "../game/Portal";
import { Coin } from "../game/pickups";
import { Hud } from "../ui/Hud";
import { FinalScene } from "../Scenas/FinalScene";
import { GameScene } from "../Scenas/GameScene";
import { Keyboard } from "../utils/Keyboard";

/**
 * Modo demo (?demo): un piloto automático juega de verdad (choca, pierde vidas, aplasta enemigos,
 * entra a los portales y pelea con el jefe) siguiendo un guion que muestra todo el juego.
 * Con ?demo&record además graba el canvas + audio y manda el video a window.__demoChunk().
 */

/** Vista "interna" de GameScene para la demo (los campos son privados en TS, no en runtime). */
interface GS {
  player: Player;
  enemies: Enemy[];
  coins: Coin[];
  portal: Portal | null;
  boss: Boss | null;
  state: string;
  lives: number;
  startLives: number;
  hud: Hud;
  bg: Background;
  level: number;
  coinsCollected: number;
  meteorTimer: number;
  enemyTimer: number;
  def: CharacterDef;
  skulls: { x: number }[];
  carrying: boolean;
  addEnemy(e: Enemy): void;
  debugGiveCoins(n: number): void;
  spawnSkull(x?: number): void;
  debugSpawnPower(kind: "heart" | "shield" | "magnet" | "x2", x: number, y?: number): void;
  powerUps: { x: number; y: number }[];
}

const JUMP = "Space";

function scene(): GS | null {
  const s = SceneManager.scene;
  return s instanceof GameScene ? (s as unknown as GS) : null;
}

const sleep = (s: number): Promise<void> => new Promise((r) => setTimeout(r, s * 1000));

function tap(code: string): void {
  Keyboard.press(code);
  setTimeout(() => Keyboard.release(code), 90);
}

// ------------------------------------------------------------------ piloto automático

class AutoPilot {
  public enabled = false;
  /** Si es false, el jugador puede morir (para mostrar el Game Over). */
  public keepAlive = true;
  private holdT = 0;
  private cooldown = 0;
  private airUsed = 0;
  private throwCd = 0;

  public step(dt: number): void {
    const s = scene();
    if (!this.enabled || !s || s.state !== "playing") {
      this.releaseAll();
      return;
    }
    const p = s.player;
    if (this.keepAlive && s.lives < 2) {
      s.lives = 2; // la demo nunca se corta antes de tiempo
      s.hud.setLives(s.lives, s.startLives);
    }

    let targetX = 620;
    let wantJump = false;

    if (s.portal) {
      targetX = s.portal.x;
    } else if (s.boss) {
      [targetX, wantJump] = this.bossPlan(s);
    } else if (s.powerUps.length > 0 && s.powerUps[0].x < WIDTH - 100) {
      targetX = s.powerUps[0].x; // ir a buscar el power-up
      wantJump = s.powerUps[0].y < p.y - 140 && Math.abs(s.powerUps[0].x - p.x) < 150;
    } else if (!s.carrying && s.skulls.length > 0 && s.skulls[0].x > 0) {
      targetX = s.skulls[0].x; // ir a buscar el cráneo
    } else {
      const coin = s.coins.filter((c) => c.x > p.x - 40 && c.x < p.x + 650).sort((a, b) => a.x - b.x)[0];
      if (coin) {
        targetX = coin.x;
        if (coin.y < p.y - 150 && Math.abs(coin.x - p.x) < 130) {
          wantJump = true;
        }
      }
    }

    for (const e of s.enemies) {
      if (e.dead) {
        continue;
      }
      const hb: Rectangle = e.getHitbox();
      const cx = hb.x + hb.width / 2;
      const dx = cx - p.x;
      if (e.label === "meteorito" || e.label === "mosasaurio" || e.label === "lava") {
        const spots = e.label === "mosasaurio" ? [(e as unknown as { x0: number }).x0, (e as unknown as { x1: number }).x1] : [e.x];
        for (const pos of spots) {
          if (Math.abs(pos - p.x) < 240) {
            targetX = Math.max(120, Math.min(WIDTH - 120, pos + (p.x < pos ? -420 : 420)));
          }
        }
      } else if (e.label === "onda") {
        if (Math.abs(dx) < 230) wantJump = true;
      } else if (e.label === "ácido") {
        if (Math.abs(dx) < 160 && hb.y > p.y - 450) targetX = p.x + (dx > 0 ? -300 : 300);
      } else if (hb.bottom > GROUND_Y - 190 && dx > -30 && dx < (e.label === "rex" ? 520 : 250)) {
        wantJump = true;
      }
    }

    // lanzar el cráneo a un monstruo que viene de frente
    this.throwCd -= dt;
    if (s.carrying && this.throwCd <= 0) {
      const hard = ["roca", "meteorito", "lava", "mosasaurio", "rex"];
      const target = s.enemies.find((e) => !e.dead && !hard.includes(e.label) && e.x - p.x > 250 && e.x - p.x < 800);
      if (target) {
        if (p.dir < 0) {
          Keyboard.press("ArrowRight"); // darse vuelta para tirar hacia adelante
        } else {
          tap("KeyF");
          this.throwCd = 1;
        }
      }
    }

    // movimiento horizontal
    if (targetX > p.x + 25) {
      Keyboard.release("ArrowLeft");
      Keyboard.press("ArrowRight");
    } else if (targetX < p.x - 25) {
      Keyboard.release("ArrowRight");
      Keyboard.press("ArrowLeft");
    } else {
      Keyboard.release("ArrowLeft");
      Keyboard.release("ArrowRight");
    }

    // salto / doble salto / planeo
    this.cooldown -= dt;
    if (this.holdT > 0) {
      this.holdT -= dt;
      if (this.holdT <= 0 && !(p.def.glide && !p.onGround && p.vy > 0)) {
        Keyboard.release(JUMP);
      }
    }
    if (p.onGround) {
      this.airUsed = 0;
    }
    if (wantJump && this.cooldown <= 0) {
      if (p.onGround) {
        this.pressJump(0.3);
      } else if (p.vy > -180 && this.airUsed < p.def.maxJumps - 1) {
        this.airUsed++;
        this.pressJump(0.3);
      }
    }
    if (p.def.glide && !p.onGround && p.vy > 0 && wantJump) {
      Keyboard.press(JUMP); // planear
    }
  }

  private bossPlan(s: GS): [number, boolean] {
    const b = s.boss as Boss;
    const p = s.player;
    if (b.stunned) {
      const w = b.weakBox();
      const tx = w.x + w.width / 2 - 40;
      return [tx, Math.abs(tx - p.x) < 110];
    }
    if (b.phase === "chargeWarn" || b.phase === "charge") {
      return [p.x, b.phase === "charge" && b.x - p.x < 880];
    }
    if (b.phase === "hurt" || b.phase === "return") {
      return [1000, false];
    }
    return [780, false];
  }

  private pressJump(hold: number): void {
    Keyboard.release(JUMP);
    Keyboard.press(JUMP);
    this.holdT = hold;
    this.cooldown = 0.12;
  }

  public releaseAll(): void {
    for (const k of ["ArrowLeft", "ArrowRight", JUMP]) {
      Keyboard.release(k);
    }
  }
}

// ------------------------------------------------------------------ guion

function char(id: string): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}

async function waitUntil(cond: () => boolean, maxSeconds: number): Promise<void> {
  const t0 = performance.now();
  while (!cond() && performance.now() - t0 < maxSeconds * 1000) {
    await sleep(0.1);
  }
}

/** Arranca una partida nueva directamente en un mundo. */
async function startAt(id: string, level: number, difficulty = "medio"): Promise<GS> {
  SceneManager.change(new GameScene(char(id), DIFFICULTIES.find((d) => d.id === difficulty) ?? DIFFICULTIES[1]));
  await sleep(0.15);
  const s = scene() as GS;
  if (level > 1) {
    s.coinsCollected = (level - 1) * COINS_PER_LEVEL;
    s.level = level;
    s.hud.setCoins(s.coinsCollected);
    s.hud.setLevel(level);
    s.bg.setTheme(level - 1, 0.01);
    s.hud.showBanner(`NIVEL ${level}`, `${LEVEL_NAMES[level - 1]} · ${s.def.name}`, 2.6);
  } else {
    s.hud.showBanner("NIVEL 1", `${LEVEL_NAMES[0]} · ${s.def.name}`, 2.6);
  }
  return s;
}

/** Completa las monedas del mundo para que aparezca el portal y deja que el piloto entre. */
async function goThroughPortal(): Promise<void> {
  const s = scene();
  if (!s) return;
  const target = Math.min(50, (Math.floor(s.coinsCollected / COINS_PER_LEVEL) + 1) * COINS_PER_LEVEL);
  s.debugGiveCoins(Math.max(1, target - s.coinsCollected));
  const lvl = s.level;
  await waitUntil(() => !s.portal || s.level !== lvl || !!s.boss, 9);
  await sleep(0.6);
}

export async function runDemo(app: Application, record: boolean): Promise<void> {
  GameScene.autoPause = false;
  const pilot = new AutoPilot();
  app.ticker.add(() => pilot.step(Math.min(app.ticker.deltaMS, 50) / 1000));

  const stop = record ? startRecording(app) : null;

  // 1) Menú: personajes y dificultades
  await sleep(1.5);
  for (let i = 0; i < 4; i++) {
    tap("ArrowRight");
    await sleep(1.1);
  }
  tap("ArrowUp");
  await sleep(0.7);
  tap("ArrowDown");
  await sleep(0.7);
  tap("ArrowDown");
  await sleep(0.7);
  tap("ArrowUp");
  await sleep(0.8);
  tap("Enter");
  await sleep(0.4);

  // 2) Vikingo en el valle: monedas, aplastar dinos, recibir golpes, escudo de Colón, portal al desierto
  pilot.enabled = true;
  await sleep(5);
  scene()?.debugSpawnPower("shield", WIDTH + 60, GROUND_Y - 110);
  await sleep(6);
  await goThroughPortal();

  const W = WORLD_ENEMIES;
  const isGame = (): boolean => SceneManager.scene instanceof GameScene;
  const isGameOver = (): boolean => SceneManager.scene instanceof FinalScene;

  // 3) Desierto: agarra un cráneo y lo lanza a los escorpiones; buitre y rocas rodantes
  {
    const s = scene() as GS;
    s.spawnSkull(s.player.x + 380);
    await sleep(1.2);
    s.addEnemy(W.scorpion());
    await sleep(2.2);
    s.addEnemy(W.vulture());
    s.spawnSkull(s.player.x + 450);
    await sleep(1.5);
    s.addEnemy(W.scorpion());
    await sleep(2.5);
    s.addEnemy(new Boulder());
    await sleep(3);
    await goThroughPortal();
  }

  // 4) Océano con Nacho Ninja (triple salto): cangrejos, medusas y el Mosasaurio
  {
    const s = await startAt("ninja", 3);
    await sleep(1);
    s.addEnemy(new Mosasaur());
    s.addEnemy(W.crab());
    await sleep(3.5);
    s.addEnemy(W.jelly());
    await sleep(2);
    s.addEnemy(new Mosasaur());
    await sleep(4);
    await goThroughPortal();
  }

  // 5) Selva de noche (sigue el ninja): serpientes y murciélagos
  {
    const s = scene() as GS;
    s.addEnemy(W.snake());
    await sleep(3);
    s.addEnemy(W.snake());
    await sleep(3.5);
  }

  // 6) Volcán con el Capitán Astro (planeo): salamandras, bolas de lava y el Rex
  {
    const s = await startAt("astro", 5);
    await sleep(1);
    s.addEnemy(W.salamander());
    s.addEnemy(W.lava(900));
    await sleep(3);
    s.addEnemy(new Rex());
    await sleep(2.5);
    s.addEnemy(W.lava(700));
    await sleep(3);
  }

  // 7) Planeta alienígena con Robo-Tomi (escudo rojinegro): aliens, OVNIs y meteoritos
  {
    const s = await startAt("robot", 6);
    await sleep(1.2);
    s.addEnemy(W.alien());
    s.addEnemy(W.ufo());
    s.meteorTimer = 0;
    await sleep(3);
    s.addEnemy(new Meteor(900));
    s.addEnemy(W.alien());
    await sleep(3.5);
    // 8) Portal al laboratorio y jefe final
    await goThroughPortal();
  }
  {
    const s = scene() as GS;
    if (s?.boss) {
      // en la demo el jefe tiene menos vida para que la pelea no sea eterna
      const b = s.boss as unknown as { hp: number; maxHp: number };
      b.hp = 3;
      s.hud.setBossHp(b.hp, b.maxHp);
    }
    await waitUntil(() => !(scene()?.boss) || !scene(), 45);
    await waitUntil(() => !isGame(), 6);
  }

  // 9) Pantalla de victoria
  pilot.enabled = false;
  await sleep(5.5);

  // 10) Partida en DIFÍCIL que termina en Game Over
  {
    const s = await startAt("vikingo", 5, "dificil");
    pilot.enabled = true;
    pilot.keepAlive = false;
    s.addEnemy(W.lava(700));
    await sleep(1.5);
    s.addEnemy(new Rex());
    await waitUntil(isGameOver, 20);
    if (!isGameOver()) {
      // si el piloto esquivó todo, se termina igual
      const g = scene();
      if (g) {
        g.lives = 1;
        g.addEnemy(new Rex());
      }
      await waitUntil(isGameOver, 10);
    }
    pilot.enabled = false;
    await sleep(6);
  }

  pilot.releaseAll();
  AudioCtl.stopMusic();
  if (stop) {
    await stop();
  }
  (window as unknown as { __demoFinished: boolean }).__demoFinished = true;
}

// ------------------------------------------------------------------ grabación

function startRecording(app: Application): () => Promise<void> {
  const canvas = app.view as HTMLCanvasElement & { captureStream(fps: number): MediaStream };
  const stream = canvas.captureStream(30);
  AudioCtl.captureStream()?.getAudioTracks().forEach((t) => stream.addTrack(t));
  const types = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "video/webm";
  const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
  const send = (window as unknown as { __demoChunk?: (b64: string) => Promise<void> }).__demoChunk;
  let pending: Promise<void> = Promise.resolve();
  rec.ondataavailable = (e: BlobEvent) => {
    if (!e.data.size || !send) return;
    pending = pending.then(async () => {
      const buf = new Uint8Array(await e.data.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i += 0x8000) {
        bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      }
      await send(btoa(bin));
    });
  };
  rec.start(1000);
  return () =>
    new Promise<void>((res) => {
      rec.onstop = () => void pending.then(() => res());
      rec.stop();
    });
}
