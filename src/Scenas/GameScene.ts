import { Container, Graphics, Rectangle } from "pixi.js";
import {
  BASE_WORLD_SPEED,
  COINS_PER_LEVEL,
  COINS_TO_WIN,
  Difficulty,
  GROUND_Y,
  JUMP_KEYS,
  THROW_KEYS,
  MAX_LEVEL,
  MAX_LIVES,
  WIDTH,
  rand,
} from "../config";
import { AudioCtl } from "../core/AudioCtl";
import { IScene, SceneManager } from "../core/SceneManager";
import { Sfx } from "../core/Sfx";
import { Storage } from "../core/Storage";
import { Background, LEVEL_NAMES } from "../game/Background";
import { Boss, BossCtx } from "../game/Boss";
import { CharacterDef } from "../game/characters";
import { Effects } from "../game/Effects";
import { Bat, Boulder, DinoSkater, Enemy, EnemyCtx, Meteor, Mosasaur, MosquitoEnemy, Rex } from "../game/enemies";
import { WORLD_ENEMIES } from "../game/worldEnemies";
import { Portal } from "../game/Portal";
import { Coin, POWER_LABEL, PowerKind, PowerUp, SkullPickup, ThrownSkull } from "../game/pickups";
import { WArt } from "../art/WorldArt";
import { Player } from "../game/Player";
import { GameStats } from "../game/types";
import { Hud } from "../ui/Hud";
import { TouchControls } from "../ui/TouchControls";
import { Keyboard } from "../utils/Keyboard";
import { FinalScene } from "./FinalScene";
import { WinScene } from "./WinScene";

type State = "playing" | "paused" | "dying" | "won" | "done";

const MAGNET_TIME = 9;
const X2_TIME = 9;
const SHIELD_TIME = 14;

const LEVEL_MESSAGES: Record<number, string> = {
  2: "Escorpiones, buitres en picada y rocas rodantes",
  3: "Cangrejos, medusas que pican y el MOSASAURIO",
  4: "Murciélagos y serpientes en la oscuridad",
  5: "Salamandras de fuego, bolas de lava y el REX",
  6: "¡Aliens, OVNIs y lluvia de meteoritos!",
};

/** Enemigos a los que el cráneo no les hace nada. */
const SKULL_PROOF = new Set(["roca", "meteorito", "lava", "mosasaurio", "rex", "ácido", "onda"]);

/** Índice del escenario del laboratorio en Background. */
const LAB_THEME = 6;

export class GameScene extends Container implements IScene {
  /** Pausar solo al perder el foco de la ventana (se desactiva en la demo). */
  public static autoPause = true;
  /** Para pruebas locales: el jugador no recibe daño. */
  public godMode = false;

  private readonly world = new Container();
  private readonly entities = new Container();
  private readonly bg = new Background();
  private readonly fx = new Effects();
  private readonly hud: Hud;
  private readonly player: Player;
  private readonly debugG: Graphics | null = null;

  private enemies: Enemy[] = [];
  private coins: Coin[] = [];
  private powerUps: PowerUp[] = [];
  private skulls: SkullPickup[] = [];
  private thrown: ThrownSkull[] = [];
  private carrying = false;
  private skullTimer = 1.5;
  private skullHintShown = false;
  private boss: Boss | null = null;
  private portal: Portal | null = null;
  private bossDefeated = false;

  private state: State = "playing";
  private lives: number;
  private readonly startLives: number;
  private coinsCollected = 0;
  private score = 0;
  private stomps = 0;
  private elapsed = 0;
  private level = 1;
  private scoreTick = 0;

  private enemyTimer = 2;
  private coinTimer = 0.4;
  private powerTimer = rand(9, 13);
  private meteorTimer = 3;

  private magnetT = 0;
  private x2T = 0;
  private shieldT = 0;

  private shakeT = 0;
  private shakeAmp = 0;
  private hitStop = 0;
  private alarmT = 0;
  private endTimer = 0;

  constructor(private readonly def: CharacterDef, private readonly diff: Difficulty) {
    super();
    this.startLives = Math.max(1, Math.min(MAX_LIVES, def.lives + diff.extraLives));
    this.lives = this.startLives;

    this.world.addChild(this.bg, this.entities, this.fx);
    this.addChild(this.world);

    this.player = new Player(def);
    this.entities.addChild(this.player);
    this.player.on("jump", (air: boolean) => this.onPlayerJump(air));
    this.player.on("land", () => this.fx.burst(this.player.x, GROUND_Y - 4, { count: 6, colors: [0xa1887f], speed: 160, life: 0.35, gravity: 600, up: 120, size: 0.8 }));

    if (def.startShield) {
      this.shieldT = SHIELD_TIME;
      this.player.setShield(true);
    }

    this.hud = new Hud(Storage.bestFor(diff.id));
    this.hud.setLives(this.lives, this.startLives);
    this.addChild(this.hud);

    if (TouchControls.isTouchDevice()) {
      this.addChild(new TouchControls());
    }

    // Vista de hitboxes para revisar colisiones: abrir con ?hitbox en la URL
    if (new URLSearchParams(window.location.search).has("hitbox")) {
      this.debugG = new Graphics();
      this.world.addChild(this.debugG);
    }

    this.hud.showBanner(`NIVEL 1 · ${diff.name}`, LEVEL_NAMES[0], 2.4);
    this.hud.showHint(`Juntá ${COINS_TO_WIN} monedas y vencé al jefe final\nSaltá ENCIMA de los monstruos para aplastarlos · ¡Esquivá rocas, fuego y medusas!`, 7);

    Keyboard.down.on("key", this.onKeyDown, this);
    Keyboard.up.on("key", this.onKeyUp, this);
    window.addEventListener("blur", this.onBlur);

    AudioCtl.playMusic();
  }

  // ------------------------------------------------------------------ input

  private onKeyDown(code: string): void {
    if (JUMP_KEYS.includes(code) && this.state === "playing") {
      this.player.pressJump();
    } else if (THROW_KEYS.includes(code) && this.state === "playing") {
      this.throwSkull();
    } else if (code === "KeyP" || code === "Escape") {
      this.togglePause();
    }
  }

  private onKeyUp(code: string): void {
    if (JUMP_KEYS.includes(code)) {
      this.player.releaseJump();
    }
  }

  private readonly onBlur = (): void => {
    if (GameScene.autoPause && this.state === "playing") {
      this.togglePause();
    }
  };

  private togglePause(): void {
    if (this.state === "playing") {
      this.state = "paused";
    } else if (this.state === "paused") {
      this.state = "playing";
    } else {
      return;
    }
    const paused = this.state === "paused";
    this.hud.setPaused(paused);
    AudioCtl.pauseMusic(paused);
  }

  public onExit(): void {
    Keyboard.down.off("key", this.onKeyDown, this);
    Keyboard.up.off("key", this.onKeyUp, this);
    window.removeEventListener("blur", this.onBlur);
    AudioCtl.stopMusic();
  }

  // ------------------------------------------------------------------ loop

  private get speedMul(): number {
    return (1 + 0.13 * (this.level - 1)) * this.diff.speed;
  }

  public update(dtMS: number): void {
    const dt = dtMS / 1000;
    this.hud.update(dt);
    if (this.state === "paused" || this.state === "done") {
      return;
    }
    // micro-pausa al recibir un golpe para que se note
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      this.updateShake(dt);
      return;
    }

    const worldSpeed = BASE_WORLD_SPEED * this.speedMul * (this.boss ? 0.5 : 1);
    this.bg.update(dt, worldSpeed);
    this.player.update(dt);
    if (this.player.gliding) {
      this.fx.burst(this.player.x, this.player.y - 40, { count: 2, colors: [0xff6d00, 0xffd54f, 0xffffff], speed: 120, life: 0.35, gravity: 600, size: 0.9 });
    }

    if (this.state === "playing") {
      this.elapsed += dt;
      this.scoreTick += dt;
      if (this.scoreTick >= 1) {
        this.scoreTick -= 1;
        this.addScore(5);
      }
      this.updateTimers(dt);
      this.spawn(dt);
    }

    this.updateEnemies(dt);
    this.updateBoss(dt);
    this.updatePortal(dt, worldSpeed);
    this.updateCoins(dt, worldSpeed);
    this.updatePowerUps(dt, worldSpeed);
    this.updateSkulls(dt, worldSpeed);
    this.fx.update(dt);
    this.updateShake(dt);
    this.drawDebug();

    if (this.alarmT > 0) {
      const before = Math.floor(this.alarmT / 0.5);
      this.alarmT -= dt;
      if (Math.floor(this.alarmT / 0.5) !== before && this.alarmT > 0) {
        this.hud.flash(0xff1744, 0.3);
        Sfx.warn();
      }
    }

    if (this.state === "dying" || this.state === "won") {
      this.endTimer -= dt;
      if (this.state === "won" && Math.random() < 0.4) {
        this.confetti();
      }
      if (this.endTimer <= 0) {
        this.finish();
      }
    }

    this.hud.setPowers({
      shield: this.shieldT,
      shieldMax: SHIELD_TIME,
      magnet: this.magnetT,
      magnetMax: MAGNET_TIME,
      x2: this.x2T,
      x2Max: X2_TIME,
    });
  }

  private updateTimers(dt: number): void {
    this.magnetT = Math.max(0, this.magnetT - dt);
    this.x2T = Math.max(0, this.x2T - dt);
    if (this.shieldT > 0) {
      this.shieldT -= dt;
      if (this.shieldT <= 0) {
        this.shieldT = 0;
        this.player.setShield(false);
      }
    }
  }

  // ------------------------------------------------------------------ spawns

  private spawn(dt: number): void {
    this.powerTimer -= dt;
    if (this.powerTimer <= 0) {
      this.spawnPowerUp();
      this.powerTimer = this.boss ? rand(7, 10) : rand(10, 16);
    }
    if (this.boss) {
      return; // durante el jefe sólo aparecen power-ups
    }
    // desierto: cráneos para agarrar y lanzar
    if (this.level === 2 && !this.carrying && this.skulls.length === 0) {
      this.skullTimer -= dt;
      if (this.skullTimer <= 0) {
        this.spawnSkull();
        this.skullTimer = rand(4, 7);
      }
    }
    this.enemyTimer -= dt;
    if (this.enemyTimer <= 0) {
      this.spawnEnemy();
      this.enemyTimer = (rand(1.5, 2.7) / (1 + 0.12 * (this.level - 1))) * this.diff.spawn;
    }
    this.coinTimer -= dt;
    if (this.coinTimer <= 0) {
      this.spawnCoinPattern();
      this.coinTimer = rand(2.4, 3.6);
    }
    // lluvia de meteoritos: en el planeta alienígena (y en el volcán si es DIFÍCIL)
    if (this.level === 6 || (this.level === 5 && this.diff.id === "dificil")) {
      this.meteorTimer -= dt;
      if (this.meteorTimer <= 0) {
        this.spawnMeteors();
        this.meteorTimer = (rand(3.5, 6) / this.speedMul) * this.diff.spawn;
      }
    }
  }

  private addEnemy(e: Enemy): void {
    this.enemies.push(e);
    this.entities.addChildAt(e, 0);
  }

  /** Cada mundo tiene sus propios monstruos. */
  private spawnEnemy(): void {
    const alive = (label: string): boolean => this.enemies.some((e) => e.label === label && !e.dead);
    const W = WORLD_ENEMIES;
    const pool: [() => Enemy, number][] = [];
    switch (this.level) {
      case 1: // Valle de los dinos
        pool.push([() => new DinoSkater(), 3], [() => new MosquitoEnemy(), 2.5]);
        break;
      case 2: // Desierto
        pool.push([W.scorpion, 3], [() => new Boulder(), 1.5]);
        if (!alive("buitre")) pool.push([W.vulture, 1.4]);
        break;
      case 3: // Océano
        pool.push([W.crab, 3], [W.jelly, 2.2]);
        if (!alive("mosasaurio")) pool.push([() => new Mosasaur(), 2.2]);
        break;
      case 4: // Selva de noche
        pool.push([() => new Bat(), 2.6], [W.snake, 3]);
        break;
      case 5: // Volcán
        pool.push([W.salamander, 3], [() => W.lava(Math.min(WIDTH - 80, this.player.x + rand(300, 900))), 2.2]);
        if (!alive("rex")) pool.push([() => new Rex(), 1]);
        break;
      default: // Planeta alienígena
        pool.push([W.alien, 3], [W.ufo, 2.2]);
        break;
    }

    const total = pool.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [make, w] of pool) {
      r -= w;
      if (r <= 0) {
        this.addEnemy(make());
        return;
      }
    }
  }

  /** Lluvia de meteoritos: caen adelante del jugador (la sombra viene hacia él con el piso). */
  private spawnMeteors(): void {
    const count = this.level >= 5 && Math.random() < 0.35 ? 3 : this.level >= 3 && Math.random() < 0.3 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      this.addEnemy(new Meteor(Math.min(WIDTH - 60, this.player.x + rand(250, 900) + i * 320)));
    }
  }

  private spawnCoinPattern(): void {
    const x0 = WIDTH + 60;
    const pts: [number, number][] = [];
    const r = Math.random();
    if (r < 0.28) {
      for (let i = 0; i < 5; i++) pts.push([x0 + i * 70, GROUND_Y - 45]);
    } else if (r < 0.58) {
      for (let i = 0; i < 7; i++) pts.push([x0 + i * 65, GROUND_Y - 50 - Math.sin((i / 6) * Math.PI) * 260]);
    } else if (r < 0.8) {
      for (let i = 0; i < 4; i++) pts.push([x0 + i * 70, GROUND_Y - 360]);
    } else {
      for (let i = 0; i < 6; i++) pts.push([x0 + i * 75, GROUND_Y - (i % 2 === 0 ? 60 : 210)]);
    }
    for (const [x, y] of pts) {
      const c = new Coin(x, y);
      this.coins.push(c);
      this.entities.addChild(c);
    }
  }

  private spawnPowerUp(): void {
    const kinds: PowerKind[] = ["shield", "magnet", "x2"];
    if (this.boss) {
      kinds.splice(1, 2); // contra el jefe: escudo o corazones
    }
    if (this.lives < MAX_LIVES) {
      kinds.push("heart", "heart");
    }
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const p = new PowerUp(kind, WIDTH + 80, rand(GROUND_Y - 340, GROUND_Y - 120));
    this.powerUps.push(p);
    this.entities.addChild(p);
  }

  // ------------------------------------------------------------------ updates

  private ctx(): BossCtx {
    return {
      speedMul: this.speedMul,
      px: this.player.x,
      py: this.player.y,
      shake: (a, s) => this.shake(a, s),
      burst: (x, y, o) => this.fx.burst(x, y, o),
      spawn: (e) => this.addEnemy(e),
    };
  }

  private updateEnemies(dt: number): void {
    const ctx: EnemyCtx = this.ctx();
    const pb = this.player.getHitbox();
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.step(dt, ctx);
      if (e.gone) {
        e.destroy({ children: true });
        this.enemies.splice(i, 1);
        continue;
      }
      if (e.dead || this.state !== "playing") {
        continue;
      }
      const eb = e.getHitbox();
      if (!intersects(pb, eb)) {
        continue;
      }
      const falling = this.player.vy > 0 && this.player.prevY <= eb.top + 22;
      if (e.stompable && falling) {
        this.stomp(e);
      } else {
        this.hurtPlayer(e.x);
      }
    }
  }

  private updateBoss(dt: number): void {
    const boss = this.boss;
    if (!boss) {
      return;
    }
    boss.update(dt, this.ctx());
    if (boss.done) {
      boss.destroy({ children: true });
      this.boss = null;
      this.hud.hideBoss();
      this.win();
      return;
    }
    if (this.state !== "playing" || boss.dying) {
      return;
    }
    const pb = this.player.getHitbox();
    const weak = boss.weakBox();
    const fromAbove = this.player.vy > 0 && this.player.prevY <= weak.top + 40 && intersects(pb, weak);
    if (fromAbove) {
      if (boss.stunned) {
        this.hitBoss(boss);
      } else {
        this.player.bounce(); // pisarlo cuando no está mareado no le hace nada, pero tampoco te lastima
        this.fx.burst(this.player.x, this.player.y, { count: 6, colors: [0xffffff], speed: 200, life: 0.3 });
      }
    } else if (boss.harmful && intersects(pb, boss.bodyBox())) {
      this.hurtPlayer(boss.x);
    }
  }

  private updateCoins(dt: number, speed: number): void {
    const pb = this.player.getHitbox();
    pb.pad(10, 10);
    const cx = this.player.x;
    const cy = this.player.y - this.def.height / 2;
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.tick(dt, speed);
      if (this.magnetT > 0 && this.state === "playing") {
        const dx = cx - c.x;
        const dy = cy - c.y;
        const d = Math.hypot(dx, dy);
        if (d < 560 && d > 1) {
          const pull = 1300 * dt;
          c.x += (dx / d) * Math.min(pull, d);
          c.y += (dy / d) * Math.min(pull, d);
        }
      }
      if (this.state === "playing" && intersects(pb, c.getHitbox())) {
        this.collectCoin(c);
        c.destroy();
        this.coins.splice(i, 1);
      } else if (c.x < -60) {
        c.destroy();
        this.coins.splice(i, 1);
      }
    }
  }

  // ------------------------------------------------------------------ cráneos (desierto)

  /** Pone un cráneo en el piso, entrando por la derecha (o en x para la demo). */
  public spawnSkull(x = WIDTH + 60): void {
    const sk = new SkullPickup(x);
    this.skulls.push(sk);
    this.entities.addChild(sk);
  }

  private throwSkull(): void {
    if (!this.carrying) {
      return;
    }
    this.carrying = false;
    this.player.setCarry(null);
    const dir = this.player.dir;
    const x0 = this.player.x + dir * 40;
    const y0 = this.player.y - this.def.height * 0.6;
    // puntería: apunta al monstruo más cercano que tenga adelante
    let vy = -260;
    const target = this.enemies
      .filter((e) => !e.dead && !SKULL_PROOF.has(e.label) && (e.x - x0) * dir > 40 && (e.x - x0) * dir < 1100)
      .sort((a, b) => Math.abs(a.x - x0) - Math.abs(b.x - x0))[0];
    if (target) {
      const hb = target.getHitbox();
      const t = Math.max(0.12, Math.abs(hb.x + hb.width / 2 - x0) / (ThrownSkull.SPEED + 300));
      vy = (hb.y + hb.height / 2 - y0) / t - 0.5 * ThrownSkull.GRAVITY * t;
      vy = Math.max(-1000, Math.min(700, vy));
    }
    const sk = new ThrownSkull(x0, y0, dir, vy);
    this.thrown.push(sk);
    this.entities.addChild(sk);
    Sfx.throwIt();
  }

  private updateSkulls(dt: number, speed: number): void {
    const pb = this.player.getHitbox();
    // cráneos en el piso
    for (let i = this.skulls.length - 1; i >= 0; i--) {
      const sk = this.skulls[i];
      sk.tick(dt, speed);
      if (this.state === "playing" && !this.carrying && intersects(pb, sk.getHitbox())) {
        this.carrying = true;
        this.player.setCarry(WArt.skull);
        Sfx.power();
        this.fx.floatText(sk.x, sk.y - 90, "¡CRÁNEO!", "#fff3e0", 38);
        if (!this.skullHintShown) {
          this.skullHintShown = true;
          this.hud.showHint("¡Agarraste un CRÁNEO!  Apretá F (o X) para lanzarlo contra los monstruos", 4);
        }
        sk.destroy();
        this.skulls.splice(i, 1);
      } else if (sk.x < -60) {
        sk.destroy();
        this.skulls.splice(i, 1);
      }
    }
    // cráneos volando
    const HARD = SKULL_PROOF;
    for (let i = this.thrown.length - 1; i >= 0; i--) {
      const sk = this.thrown[i];
      let done = sk.tick(dt);
      const hb = sk.getHitbox();
      for (const e of this.enemies) {
        if (done || e.dead || !intersects(hb, e.getHitbox())) {
          continue;
        }
        if (HARD.has(e.label)) {
          this.fx.floatText(e.x, e.y - 100, "¡TOC!", "#ffffff", 34);
        } else {
          e.kill();
          this.stomps++;
          const pts = e.points * this.level;
          this.addScore(pts);
          Sfx.stomp();
          this.shake(8, 0.15);
          this.fx.floatText(e.x, e.y - 110, `¡CRANEAZO! +${Math.round(pts * this.diff.scoreMul)}`, "#fff3e0", 40);
        }
        done = true;
      }
      if (this.boss && !done && intersects(hb, this.boss.bodyBox())) {
        this.fx.floatText(sk.x, sk.y - 60, "¡TOC!", "#ffffff", 34);
        done = true;
      }
      if (done) {
        this.fx.burst(sk.x, Math.min(sk.y, GROUND_Y - 20), { count: 14, colors: [0xf5f0e1, 0xd7ccc8, 0x8d6e63], speed: 380, life: 0.5, gravity: 900, up: 150 });
        sk.destroy();
        this.thrown.splice(i, 1);
      }
    }
  }

  private updatePowerUps(dt: number, speed: number): void {
    const pb = this.player.getHitbox();
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      p.tick(dt, speed);
      if (this.state === "playing" && intersects(pb, p.getHitbox())) {
        this.applyPowerUp(p.kind, p.x, p.y);
        p.destroy();
        this.powerUps.splice(i, 1);
      } else if (p.x < -80) {
        p.destroy();
        this.powerUps.splice(i, 1);
      }
    }
  }

  private updateShake(dt: number): void {
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const a = this.shakeAmp * Math.max(0, this.shakeT) * 4;
      this.world.position.set((Math.random() - 0.5) * a, (Math.random() - 0.5) * a);
    } else {
      this.world.position.set(0, 0);
    }
  }

  private drawDebug(): void {
    const g = this.debugG;
    if (!g) {
      return;
    }
    g.clear();
    const box = (r: Rectangle, color: number): void => {
      g.lineStyle(3, color, 0.9);
      g.drawRect(r.x, r.y, r.width, r.height);
    };
    box(this.player.getHitbox(), 0x00e5ff);
    for (const e of this.enemies) {
      if (!e.dead) box(e.getHitbox(), e.stompable ? 0xffeb3b : 0xff1744);
    }
    for (const c of this.coins) box(c.getHitbox(), 0x76ff03);
    if (this.boss) {
      box(this.boss.bodyBox(), 0xff1744);
      box(this.boss.weakBox(), 0xffeb3b);
    }
  }

  // ------------------------------------------------------------------ eventos

  private onPlayerJump(air: boolean): void {
    if (air) {
      Sfx.airJump();
      this.fx.burst(this.player.x, this.player.y, { count: 10, colors: [0xffffff, this.def.accent], speed: 260, life: 0.4, gravity: 300 });
    } else {
      Sfx.jump();
      this.fx.burst(this.player.x, GROUND_Y - 4, { count: 6, colors: [0xbcaaa4], speed: 180, life: 0.35, gravity: 500, up: 100, size: 0.8 });
    }
  }

  private stomp(e: Enemy): void {
    e.kill();
    this.player.bounce();
    this.stomps++;
    const pts = e.points * this.level;
    this.addScore(pts);
    Sfx.stomp();
    this.shake(8, 0.15);
    this.fx.burst(e.x, e.y - 40, { count: 16, colors: [0xffffff, 0xffeb3b, 0xff7043], speed: 420, life: 0.55 });
    this.fx.floatText(e.x, e.y - 110, `¡PLAF! +${Math.round(pts * this.diff.scoreMul)}`, "#ffffff", 38);
  }

  private hurtPlayer(fromX: number): void {
    if (this.godMode || this.player.invulnerable) {
      return;
    }
    const px = this.player.x;
    const py = this.player.y - this.def.height / 2;
    if (this.player.hasShield) {
      this.shieldT = 0;
      this.player.setShield(false);
      this.player.makeInvulnerable(1);
      Sfx.shieldBreak();
      this.shake(10, 0.2);
      this.hud.flash(0x40c4ff, 0.35);
      this.fx.burst(px, py, { count: 22, colors: [0x40c4ff, 0xffffff], speed: 520, life: 0.6, gravity: 200 });
      this.fx.floatText(px, py - 120, "¡ESCUDO ROTO!", "#80d8ff", 38);
      return;
    }
    this.lives--;
    this.hud.setLives(this.lives, this.startLives);
    this.hud.flash(0xff1744, 0.55);
    this.shake(26, 0.45);
    this.hitStop = 0.12;
    this.fx.burst(px, py, { count: 24, colors: [0xff1744, 0xffffff, 0xffeb3b], speed: 520, life: 0.6 });
    this.fx.floatText(px, py - 120, "-1 VIDA", "#ff5252", 52);
    if (this.lives <= 0) {
      this.die();
      return;
    }
    Sfx.hurt();
    this.player.makeInvulnerable(this.diff.invuln);
    // empujón lejos del enemigo
    this.player.vy = -650;
    this.player.vx = fromX >= this.player.x ? -650 : 650;
  }

  private die(): void {
    this.state = "dying";
    this.endTimer = 1.8;
    this.player.die();
    this.entities.addChild(this.player); // queda por encima de todo
    AudioCtl.stopMusic();
    Sfx.die();
    this.hud.showBanner("¡AUCH!", "", 1.8);
  }

  private collectCoin(c: Coin): void {
    if (this.coinsCollected >= COINS_TO_WIN) {
      return;
    }
    const value = this.x2T > 0 ? 2 : 1;
    this.coinsCollected = Math.min(COINS_TO_WIN, this.coinsCollected + value);
    this.addScore(10 * value);
    AudioCtl.coin();
    this.fx.burst(c.x, c.y, { count: 8, colors: [0xffeb3b, 0xffc107, 0xffffff], speed: 260, life: 0.4, gravity: 300 });
    this.fx.floatText(c.x, c.y - 30, `+${value}`, "#ffeb3b", 34);
    this.hud.setCoins(this.coinsCollected);

    // Al completar las monedas del mundo aparece un PORTAL hacia el siguiente
    if (!this.portal && !this.boss && !this.bossDefeated && (this.coinsCollected >= COINS_TO_WIN || this.targetLevel() > this.level)) {
      const toLab = this.coinsCollected >= COINS_TO_WIN;
      this.portal = new Portal(toLab ? "¡AL LABORATORIO!" : "PORTAL →");
      this.entities.addChild(this.portal);
      Sfx.portal();
      this.hud.showHint(toLab ? "¡Juntaste todo! Entrá al portal para enfrentar al jefe final" : "¡Apareció un PORTAL! Entrá para viajar al siguiente mundo", 4);
    }
  }

  private targetLevel(): number {
    return Math.min(MAX_LEVEL, 1 + Math.floor(this.coinsCollected / COINS_PER_LEVEL));
  }

  private updatePortal(dt: number, worldSpeed: number): void {
    const p = this.portal;
    if (!p) {
      return;
    }
    p.update(dt, worldSpeed);
    if (Math.random() < 0.5) {
      this.fx.burst(p.x + rand(-60, 60), p.y + rand(-140, 140), { count: 1, colors: [0x18ffff, 0xb388ff, 0xffffff], speed: 80, life: 0.6, gravity: -100, size: 0.8 });
    }
    if (this.state === "playing" && intersects(this.player.getHitbox(), p.getHitbox())) {
      this.enterPortal();
    }
  }

  /** Viaje por el portal: flash, se limpia la pantalla y cambia el mundo. */
  private enterPortal(): void {
    const p = this.portal;
    if (!p) {
      return;
    }
    this.fx.burst(p.x, p.y, { count: 50, colors: [0x18ffff, 0xb388ff, 0xffffff], speed: 700, life: 0.8, gravity: 0 });
    p.destroy({ children: true });
    this.portal = null;
    Sfx.portal();
    this.hud.flash(0xe1bee7, 0.9);
    this.shake(10, 0.25);
    this.hitStop = 0.15;
    for (const e of this.enemies) {
      e.kill();
    }
    for (const c of this.coins) {
      c.destroy();
    }
    this.coins = [];
    this.player.x = 300;
    this.player.makeInvulnerable(1.2);
    this.fx.burst(this.player.x, this.player.y - 80, { count: 30, colors: [0x18ffff, 0xb388ff, 0xffffff], speed: 500, life: 0.6, gravity: 0 });
    this.enemyTimer = 2;
    this.meteorTimer = 4;
    this.coinTimer = 0.8;

    if (this.coinsCollected >= COINS_TO_WIN) {
      this.startBoss();
      return;
    }
    const newLevel = this.targetLevel();
    this.level = newLevel;
    this.hud.setLevel(newLevel);
    this.bg.setTheme(newLevel - 1, 0.5);
    this.hud.showBanner(`¡NIVEL ${newLevel}!`, `${LEVEL_NAMES[newLevel - 1]} · ${LEVEL_MESSAGES[newLevel] ?? ""}`, 2.8);
    Sfx.levelUp();
    this.confetti();
  }

  /** Aparece el jefe final: alarma, fondo de laboratorio y barra de vida. */
  private startBoss(): void {
    this.boss = new Boss(this.diff.bossHp, this.diff.speed);
    this.boss.on("stunned", () => this.hud.showHint("¡ESTÁ MAREADO!  ¡SALTALE EN LA CABEZA!", 2.2));
    this.entities.addChildAt(this.boss, 0);
    this.hud.showBoss();
    this.hud.setBossHp(this.boss.hp, this.boss.maxHp);
    this.bg.setTheme(LAB_THEME, 0.5);
    this.alarmT = 2.6;
    this.hud.showBanner("¡ALERTA!", "El DINO-X se escapó del laboratorio. ¡Derrotalo!", 3);
    this.hud.showHint("Esquivá el ácido y las ondas.  Cuando choque contra la pared y quede mareado, ¡saltale en la cabeza!", 8);
    // los enemigos comunes huyen y las monedas que quedaban se convierten en chispas
    for (const e of this.enemies) {
      e.kill();
    }
    for (const c of this.coins) {
      this.fx.burst(c.x, c.y, { count: 4, colors: [0xffeb3b], speed: 160, life: 0.3 });
      c.destroy();
    }
    this.coins = [];
  }

  private hitBoss(boss: Boss): void {
    boss.hit();
    this.player.bounce();
    this.player.vy = -1150;
    this.player.makeInvulnerable(1);
    this.addScore(300);
    Sfx.stomp();
    this.shake(18, 0.35);
    this.hitStop = 0.1;
    this.hud.setBossHp(boss.hp, boss.maxHp);
    this.fx.burst(this.player.x, this.player.y, { count: 30, colors: [0xffffff, 0xffeb3b, 0x76ff03], speed: 600, life: 0.7 });
    this.fx.floatText(this.player.x, this.player.y - 160, boss.hp > 0 ? "¡PUM!" : "¡K.O.!", "#ffeb3b", 64);
    if (boss.hp <= 0) {
      this.bossDefeated = true;
      this.addScore(2000);
      this.hud.showBanner("¡DERROTASTE AL DINO-X!", "", 2.6);
    } else if (boss.enraged) {
      this.hud.showHint("¡SE ENOJÓ!  Ahora es más rápido", 2);
    }
  }

  private applyPowerUp(kind: PowerKind, x: number, y: number): void {
    Sfx.power();
    this.fx.burst(x, y, { count: 20, colors: [0xffffff, 0x69f0ae, 0x40c4ff], speed: 420, life: 0.6, gravity: 200 });
    this.fx.floatText(x, y - 60, POWER_LABEL[kind], "#69f0ae", 40);
    this.addScore(25);
    switch (kind) {
      case "heart":
        this.lives = Math.min(MAX_LIVES, this.lives + 1);
        this.hud.setLives(this.lives, this.startLives);
        this.hud.popHeart(this.lives - 1);
        break;
      case "shield":
        this.shieldT = SHIELD_TIME;
        this.player.setShield(true);
        break;
      case "magnet":
        this.magnetT = MAGNET_TIME;
        break;
      case "x2":
        this.x2T = X2_TIME;
        break;
    }
  }

  private win(): void {
    this.state = "won";
    this.endTimer = 2.4;
    this.player.makeInvulnerable(99);
    AudioCtl.stopMusic();
    Sfx.win();
    this.hud.showBanner("¡GANASTE!", "¡Venciste al monstruo del laboratorio!", 2.4);
    this.addScore(this.lives * 200);
  }

  private confetti(): void {
    this.fx.burst(rand(100, WIDTH - 100), rand(80, 400), {
      count: 14,
      colors: [0xff1744, 0xffeb3b, 0x00e676, 0x2979ff, 0xe040fb],
      speed: 420,
      life: 1.2,
      gravity: 500,
    });
  }

  private addScore(n: number): void {
    this.score += Math.round(n * this.diff.scoreMul);
    this.hud.setScore(this.score);
  }

  private shake(amp: number, seconds: number): void {
    this.shakeAmp = Math.max(this.shakeAmp * (this.shakeT > 0 ? 1 : 0), amp);
    this.shakeT = Math.max(this.shakeT, seconds);
  }

  private finish(): void {
    const won = this.state === "won";
    const best = Storage.bestFor(this.diff.id);
    const newRecord = this.score > best;
    if (newRecord) {
      Storage.setBestFor(this.diff.id, this.score);
    }
    const stats: GameStats = {
      score: this.score,
      coins: this.coinsCollected,
      level: this.level,
      stomps: this.stomps,
      time: this.elapsed,
      characterId: this.def.id,
      difficulty: this.diff.id,
      bossDefeated: this.bossDefeated,
      best: Math.max(best, this.score),
      newRecord,
    };
    this.state = "done"; // congela hasta que se aplique el cambio de escena
    SceneManager.change(won ? new WinScene(stats) : new FinalScene(stats));
  }

  // ------------------------------------------------------------------ debug

  /** Para la demo: hace aparecer un power-up puntual. */
  public debugSpawnPower(kind: PowerKind, x: number, y = GROUND_Y - 120): void {
    const p = new PowerUp(kind, x, y);
    this.powerUps.push(p);
    this.entities.addChild(p);
  }

  /** Solo para pruebas desde la consola en local. */
  public debugGiveCoins(n: number): void {
    for (let i = 0; i < n; i++) {
      const c = new Coin(this.player.x, this.player.y - 80);
      this.collectCoin(c);
      c.destroy();
    }
  }
}

function intersects(a: Rectangle, b: Rectangle): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
