import { Container, Graphics, Rectangle } from "pixi.js";
import {
  BASE_WORLD_SPEED,
  COINS_PER_WORLD,
  Difficulty,
  GROUND_Y,
  JUMP_KEYS,
  THROW_KEYS,
  MAX_LIVES,
  WIDTH,
  WORLDS,
  rand,
} from "../config";
import { AudioCtl } from "../core/AudioCtl";
import { IScene, SceneManager } from "../core/SceneManager";
import { Sfx } from "../core/Sfx";
import { Storage } from "../core/Storage";
import { newRunId } from "../core/Records";
import { Achievements } from "../core/Achievements";
import { Background, LEVEL_NAMES } from "../game/Background";
import { AcidBall, Boss, BossConfig, BossCtx, FINAL_BOSS, SHOTS, WORLD_BOSSES } from "../game/Boss";
import { BALL, Bullet, SHURIKEN, WeaponDef, WeaponId, getWeapon } from "../game/weapons";
import { Shop } from "../ui/Shop";
import { CharacterDef, getCharacter } from "../game/characters";
import { Effects } from "../game/Effects";
import { Bat, Boulder, DinoSkater, Enemy, EnemyCtx, Meteor, Mosasaur, MosquitoEnemy, Rex } from "../game/enemies";
import { WORLD_ENEMIES } from "../game/worldEnemies";
import { Portal } from "../game/Portal";
import { Coin, POWER_LABEL, PowerKind, PowerUp, SkullPickup, ThrownSkull } from "../game/pickups";
import { WArt } from "../art/WorldArt";
import { Player } from "../game/Player";
import { Tutorial } from "../game/Tutorial";
import { GameStats, RunState, START_CREDITS } from "../game/types";
import { Hud } from "../ui/Hud";
import { TouchControls } from "../ui/TouchControls";
import { Keyboard } from "../utils/Keyboard";
import { FinalScene } from "./FinalScene";
import { WinScene } from "./WinScene";

type State = "playing" | "paused" | "shop" | "dying" | "won" | "done";

/** Monedas extra a la billetera por vencer al jefe de un mundo. */
const BOSS_BOUNTY = 20;
/** Radio de la explosión de la bazooka. */
const BLAST_R = 170;
/** Teclas del poder especial. */
const POWER_KEYS = ["KeyE", "KeyK"];
/** Radio del GRITO VIKINGO. */
const SHOUT_R = 520;

const MAGNET_TIME = 6;
const X2_TIME = 9;
const SHIELD_TIME = 14;

const LEVEL_MESSAGES: Record<number, string> = {
  2: "Escorpiones, buitres en picada y rocas rodantes",
  3: "Cangrejos, medusas que pican y el MOSASAURIO",
  4: "Murciélagos y serpientes en la oscuridad",
  5: "Salamandras de fuego, bolas de lava y el REX",
  6: "¡Aliens, OVNIs y lluvia de meteoritos!",
  7: "Bloquecitos saltarines, helibloques y lluvia de ladrillos",
};

/** Enemigos a los que el cráneo no les hace nada. */
const SKULL_PROOF = new Set(["roca", "meteorito", "ladrillazo", "lava", "mosasaurio", "rex", "onda", ...Object.values(SHOTS).map((s) => s.label)]);
/** Peligros que las balas atraviesan (no se pueden voltear). */
const BULLET_PASS = new Set(["meteorito", "ladrillazo", "lava", "onda"]);
/** Bichos blindados: sólo la bazooka los voltea (las demás balas rebotan). */
const ARMORED = new Set(["roca", "mosasaurio", "rex"]);

/** Índice del escenario del laboratorio en Background. */
const LAB_THEME = WORLDS;

export class GameScene extends Container implements IScene {
  /** Pausar solo al perder el foco de la ventana (se desactiva en la demo). */
  public static autoPause = true;
  /** Tutorial del Mundo 1 la primera vez (la demo lo apaga). */
  public static tutorialEnabled = true;
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
  /** Se venció al jefe FINAL (DINO-X). */
  private bossDefeated = false;
  /** Se venció al jefe del mundo actual (se reinicia en cada mundo). */
  private worldBossBeaten = false;
  /** Llegó al laboratorio del jefe final. */
  private finalReached = false;
  /** Jefes vencidos en toda la partida. */
  private bossesBeaten = 0;

  private state: State = "playing";
  private lives: number;
  private readonly startLives: number;
  /** Monedas del mundo actual (vuelve a 0 al pasar por el portal). */
  private coinsCollected = 0;
  /** Monedas de toda la partida (para las estadísticas finales). */
  private totalCoins = 0;
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

  /** Monedas para gastar en la armería (se acumulan entre mundos). */
  private wallet = 0;
  /** Fichas para CONTINUAR después de un Game Over. */
  private credits = START_CREDITS;
  private weapon: WeaponDef | null = null;
  private bullets: Bullet[] = [];
  private fireCd = 0;
  /** Daño acumulado al jefe por las balas (al llegar a 1 = un golpe). */
  private bossChip = 0;
  private shop: Shop | null = null;
  private afterShop: (() => void) | null = null;
  private gunHintShown = false;
  /** Identifica la partida (un solo récord aunque continúe). */
  private runId = newRunId();
  /** Vidas perdidas en la partida (para el logro INTOCABLE). */
  private livesLost = 0;
  /** Recarga del poder especial (0 = listo). */
  private powerCd = 0;
  /** Segundos de TURBO que quedan (astronauta). */
  private turboT = 0;
  private tutorial: Tutorial | null = null;
  private tutDino: Enemy | null = null;
  private movedDist = 0;
  private readonly offAch: () => void;

  constructor(private readonly def: CharacterDef, private readonly diff: Difficulty, run?: RunState) {
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

    Keyboard.down.on("key", this.onKeyDown, this);
    Keyboard.up.on("key", this.onKeyUp, this);
    window.addEventListener("blur", this.onBlur);
    this.offAch = Achievements.onUnlock((a) => {
      this.hud.showAchievement(a.icon, a.name);
      Sfx.levelUp();
    });

    if (run) {
      this.resume(run);
    } else {
      Storage.saveRun(null); // partida nueva: se descarta la que había para continuar
      this.hud.showBanner(`MUNDO 1 · ${diff.name}`, LEVEL_NAMES[0], 2.4);
      if (GameScene.tutorialEnabled && !Storage.tutorialDone) {
        this.startTutorial();
      } else {
        this.hud.showHint(`Juntá ${COINS_PER_WORLD} monedas: aparece el JEFE · vencelo y entrá al PORTAL`, 5);
      }
      AudioCtl.music(`world${this.level}`);
    }
    this.refreshArsenal();
  }

  /** CONTINUAR: arranca en el mundo (o el laboratorio) donde se cayó, con la billetera y los puntos. */
  private resume(run: RunState): void {
    this.level = Math.max(1, Math.min(WORLDS, run.world));
    this.wallet = run.wallet;
    this.score = run.score;
    this.totalCoins = run.totalCoins;
    this.stomps = run.stomps;
    this.elapsed = run.elapsed;
    this.bossesBeaten = run.bosses;
    this.credits = run.credits;
    this.livesLost = 1; // si continuó, ya perdió vidas
    this.runId = run.runId ?? this.runId;
    this.hud.setScore(this.score);
    this.hud.setLevel(this.level);
    this.hud.setCoins(0, this.level === WORLDS);
    this.bg.setTheme(this.level - 1, 0.01);
    // se guarda con las fichas que quedan (por si cierra el juego en el medio)
    Storage.saveRun({ ...run });
    // antes de seguir pasa por la ARMERÍA (el arma se perdió al caer, la billetera no)
    if (run.lab) {
      this.hud.setCoins(COINS_PER_WORLD, true);
      this.hud.setLevel(WORLDS + 1);
      this.openShop("LABORATORIO", () => {
        this.hud.setBarMessage("¡DERROTÁ AL DINO-X!");
        this.startBoss(FINAL_BOSS);
      });
    } else {
      AudioCtl.music(`world${this.level}`);
      this.openShop(`MUNDO ${this.level}`, () => {
        this.hud.showBanner(`¡CONTINUAR! · MUNDO ${this.level}`, `${LEVEL_NAMES[this.level - 1]} · te quedan ${this.credits} fichas`, 2.6);
      });
    }
  }

  // ------------------------------------------------------------------ tutorial

  private startTutorial(): void {
    const tut = new Tutorial(
      {
        spawnDino: () => {
          const d = new DinoSkater(190);
          this.addEnemy(d);
          this.tutDino = d;
        },
        spawnCoins: () => this.debugCoinRow(8),
        dinoAlive: () => !!this.tutDino && !this.tutDino.destroyed && !this.tutDino.dead && this.tutDino.x > -60,
        finished: () => {
          Storage.setTutorialDone(true);
          this.hud.showBanner("¡LISTO!", `¡A jugar! Juntá ${COINS_PER_WORLD} monedas y vencé al jefe`, 2.2);
          this.enemyTimer = 1.5;
          this.coinTimer = 0.4;
        },
      },
      TouchControls.isTouchDevice(),
    );
    this.tutorial = tut;
    this.world.addChildAt(tut, this.world.getChildIndex(this.entities)); // detrás del jugador
  }

  /** El tutorial todavía corre. */
  private get inTutorial(): boolean {
    return !!this.tutorial && !this.tutorial.finishedAll;
  }

  private refreshArsenal(): void {
    if (this.wallet >= 150) {
      Achievements.unlock("ahorro");
    }
    const w = this.weapon;
    this.hud.setArsenal(w ? w.name : null, w ? w.tex() : null, this.wallet, this.credits);
  }

  private setWeapon(id: WeaponId | null): void {
    this.weapon = id ? getWeapon(id) : null;
    this.player.setWeapon(this.weapon ? this.weapon.tex() : null, this.weapon?.anchor);
    this.refreshArsenal();
  }

  // ------------------------------------------------------------------ input

  private onKeyDown(code: string): void {
    if (JUMP_KEYS.includes(code) && this.state === "playing") {
      this.player.pressJump();
    } else if (THROW_KEYS.includes(code) && this.state === "playing") {
      if (this.carrying) {
        this.throwSkull(); // si lleva un cráneo, F primero lo lanza
        this.fireCd = Math.max(this.fireCd, 0.35);
      } else {
        this.tryFire();
      }
    } else if (POWER_KEYS.includes(code) && this.state === "playing") {
      this.usePower();
    } else if ((code === "Enter" || code === "NumpadEnter") && this.inTutorial && this.state === "playing") {
      this.tutorial?.skip();
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
    this.offAch();
    // la música la elige la pantalla siguiente (no se corta acá para no pisarla)
  }

  // ------------------------------------------------------------------ loop

  private get speedMul(): number {
    // medido con el piloto: con +13% por mundo el 6 y el 7 eran 20-40 veces más difíciles que el 1
    return (1 + 0.08 * (this.level - 1)) * this.diff.speed;
  }

  public update(dtMS: number): void {
    const dt = dtMS / 1000;
    this.hud.update(dt);
    if (this.state === "shop") {
      this.shop?.update(dt);
      return;
    }
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
    const px0 = this.player.x;
    this.player.update(dt);
    if (this.tutorial) {
      this.movedDist += Math.abs(this.player.x - px0);
      if (this.movedDist > 160) {
        this.tutorial.event("move");
      }
      this.tutorial.update(dt, worldSpeed);
      if (this.tutorial.finishedAll && this.tutorial.children.length <= 1) {
        this.tutorial.destroy({ children: true });
        this.tutorial = null;
      }
    }
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
      // mantener F apretada = dispara seguido (metralleta)
      this.fireCd -= dt;
      this.updatePower(dt);
      if (this.weapon && !this.carrying && Keyboard.isDown(...THROW_KEYS)) {
        this.tryFire();
      }
    }

    this.updateEnemies(dt);
    this.updateBoss(dt);
    this.updatePortal(dt, worldSpeed);
    this.updateCoins(dt, worldSpeed);
    this.updatePowerUps(dt, worldSpeed);
    this.updateSkulls(dt, worldSpeed);
    this.updateBullets(dt);
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
      this.powerTimer = this.boss ? rand(7, 10) : rand(13, 19);
    }
    if (this.boss || this.portal || this.coinsCollected >= COINS_PER_WORLD || this.inTutorial) {
      return; // durante el jefe y con el portal abierto: sin monstruos ni monedas (sólo power-ups)
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
      this.enemyTimer = (rand(1.5, 2.7) / (1 + 0.08 * (this.level - 1))) * this.diff.spawn;
    }
    this.coinTimer -= dt;
    if (this.coinTimer <= 0) {
      this.spawnCoinPattern();
      this.coinTimer = rand(2.9, 4.3);
    }
    // lluvia de meteoritos: en el planeta alienígena (y en el volcán si es DIFÍCIL)
    // (en el mundo de bloques, en vez de meteoritos llueven ladrillos)
    if (this.level === 6 || this.level === 7 || (this.level === 5 && this.diff.id === "dificil")) {
      this.meteorTimer -= dt;
      if (this.meteorTimer <= 0) {
        this.spawnMeteors();
        // medido: dividir por toda la velocidad del mundo hacía del Mundo 6 una trampa (lluvia cada 2 s)
        this.meteorTimer = (rand(4.5, 7) / Math.sqrt(this.speedMul)) * this.diff.spawn;
      }
    }
  }

  private addEnemy(e: Enemy): void {
    this.enemies.push(e);
    this.entities.addChildAt(e, 0);
    if (!(e instanceof AcidBall)) {
      Sfx.voice(e.label);
    }
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
      case 6: // Planeta alienígena
        pool.push([W.alien, 3], [W.ufo, 2.2]);
        break;
      default: // Mundo de bloques
        pool.push([W.bricky, 3], [W.copter, 1.5]); // medido: el helibloque era la causa n°1 de vidas perdidas en el Mundo 7
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
    // tandas de 3 sólo en DIFÍCIL; en FÁCIL de a uno
    const hard = this.diff.id === "dificil";
    const count = this.diff.id === "facil" ? 1 : hard && Math.random() < 0.3 ? 3 : Math.random() < (hard ? 0.3 : 0.2) ? 2 : 1;
    for (let i = 0; i < count; i++) {
      // cae cerca del jugador (adelante o un poco atrás); la sombra avisa dónde
      const x = Math.max(80, Math.min(WIDTH - 80, this.player.x + rand(-150, 450) + i * 330));
      const warn = this.diff.id === "facil" ? 1.5 : 1.1;
      this.addEnemy(this.level === 7 ? new Meteor(x, WArt.brickShot, "ladrillazo", warn) : new Meteor(x, undefined, undefined, warn));
    }
  }

  private spawnCoinPattern(): void {
    const x0 = WIDTH + 60;
    const pts: [number, number][] = [];
    const r = Math.random();
    if (r < 0.28) {
      for (let i = 0; i < 4; i++) pts.push([x0 + i * 70, GROUND_Y - 45]);
    } else if (r < 0.58) {
      for (let i = 0; i < 6; i++) pts.push([x0 + i * 70, GROUND_Y - 50 - Math.sin((i / 5) * Math.PI) * 260]);
    } else if (r < 0.8) {
      for (let i = 0; i < 4; i++) pts.push([x0 + i * 70, GROUND_Y - 360]);
    } else {
      for (let i = 0; i < 5; i++) pts.push([x0 + i * 75, GROUND_Y - (i % 2 === 0 ? 60 : 210)]);
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
      if (this.turboT > 0 && !BULLET_PASS.has(e.label)) {
        this.shootDown(e, "¡TURBO!");
      } else if (e.stompable && falling) {
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
      const final = boss.cfg.final;
      boss.destroy({ children: true });
      this.boss = null;
      this.hud.hideBoss();
      if (final) {
        this.win();
      } else {
        this.openPortal(); // jefe del mundo vencido: portal sin enemigos
      }
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
        if (d < 380 && d > 1) {
          const pull = 850 * dt;
          c.x += (dx / d) * Math.min(pull, d);
          c.y += (dy / d) * Math.min(pull, d);
        }
      }
      if (this.state === "playing" && intersects(pb, c.getHitbox())) {
        // Ojo: la moneda 50 hace aparecer al jefe, que limpia TODAS las monedas (this.coins pasa a ser otro array).
        // Por eso la sacamos de la lista antes, y si la lista cambió cortamos el recorrido.
        const list = this.coins;
        list.splice(i, 1);
        this.collectCoin(c);
        if (!c.destroyed) {
          c.destroy();
        }
        if (this.coins !== list) {
          break;
        }
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
    Achievements.add("skulls");
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

  // ------------------------------------------------------------------ poder especial

  private usePower(): void {
    if (this.powerCd > 0 || this.state !== "playing") {
      if (this.powerCd > 0) {
        this.hud.nudgePower();
      }
      return;
    }
    const pw = this.def.power;
    this.powerCd = pw.cooldown;
    this.tutorial?.event("power");
    const p = this.player;
    const dir = p.dir;
    const cy = p.y - this.def.height / 2;
    this.fx.floatText(p.x, p.y - this.def.height - 50, "¡" + pw.name + "!", "#ffe57f", 40);
    switch (pw.id) {
      case "grito": {
        Sfx.roar();
        this.shake(18, 0.4);
        this.hud.flash(0xff9100, 0.35);
        for (let i = 0; i < 3; i++) {
          this.fx.burst(p.x, cy, { count: 40, colors: [0xffffff, 0xffcc80, 0xff9100], speed: 900 + i * 250, life: 0.5, gravity: 0, size: 1.1 });
        }
        for (const e of this.enemies) {
          if (e.dead || BULLET_PASS.has(e.label)) continue;
          const hb = e.getHitbox();
          if (Math.hypot(hb.x + hb.width / 2 - p.x, hb.y + hb.height / 2 - cy) <= SHOUT_R) {
            this.shootDown(e, "¡AAAH!");
          }
        }
        const boss = this.boss;
        if (boss && !boss.dying && Math.abs(boss.x - p.x) <= SHOUT_R + 150) {
          this.chipBoss(boss, 0.5, boss.x, boss.y - 150);
        }
        break;
      }
      case "estrellas":
        Sfx.throwIt();
        for (const a of [-0.16, 0, 0.16]) {
          const b = new Bullet(SHURIKEN, p.x + dir * 30, cy - 10, dir, a);
          this.bullets.push(b);
          this.entities.addChild(b);
        }
        break;
      case "escudo":
        Sfx.power();
        this.shieldT = Math.max(this.shieldT, 6);
        p.setShield(true);
        this.fx.burst(p.x, cy, { count: 30, colors: [0xff1744, 0x00e5ff, 0xffffff], speed: 500, life: 0.5, gravity: 0 });
        break;
      case "turbo":
        Sfx.whoosh();
        this.turboT = 2.6;
        p.speedMul = 1.9;
        break;
      case "pelotazo": {
        Sfx.throwIt();
        Sfx.stomp();
        const b = new Bullet(BALL, p.x + dir * 40, p.y - 40, dir, -0.45);
        this.bullets.push(b);
        this.entities.addChild(b);
        break;
      }
    }
  }

  private updatePower(dt: number): void {
    this.powerCd = Math.max(0, this.powerCd - dt);
    if (this.turboT > 0) {
      this.turboT -= dt;
      const p = this.player;
      this.fx.burst(p.x - p.dir * 30, p.y - this.def.height * 0.4, { count: 3, colors: [0xff6d00, 0xffd54f, 0x40c4ff], speed: 200, life: 0.35, gravity: 0, size: 1 });
      if (this.turboT <= 0) {
        p.speedMul = 1;
      }
    }
    this.hud.setPower(this.def.power.name, 1 - this.powerCd / this.def.power.cooldown);
  }

  // ------------------------------------------------------------------ armas

  private tryFire(): void {
    const w = this.weapon;
    if (!w || this.fireCd > 0 || this.state !== "playing") {
      return;
    }
    this.fireCd = w.cooldown;
    const dir = this.player.dir;
    const m = this.player.muzzle();
    for (let i = 0; i < w.pellets; i++) {
      const spread = w.pellets > 1 ? (i - (w.pellets - 1) / 2) * w.spread : (Math.random() - 0.5) * w.spread;
      const b = new Bullet(w, m.x, m.y, dir, spread);
      this.bullets.push(b);
      this.entities.addChild(b);
    }
    this.player.recoil();
    Sfx.shoot(w.id);
    this.fx.burst(m.x + dir * 20, m.y, { count: w.explosive ? 12 : 4, colors: [0xffffff, 0xffeb3b, 0xff9800], speed: 220, life: 0.18, gravity: 0, size: 0.8 });
    if (w.explosive) {
      this.player.vx -= dir * 260; // retroceso de la bazooka
      this.shake(6, 0.12);
    }
  }

  private updateBullets(dt: number): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      let done = b.tick(dt);
      if (done && b.def.explosive) {
        this.explode(b.x, Math.min(b.y, GROUND_Y - 20));
      }
      const hb = b.getHitbox();
      for (const e of this.enemies) {
        if (done || e.dead || b.hit.has(e) || BULLET_PASS.has(e.label) || !intersects(hb, e.getHitbox())) {
          continue;
        }
        b.hit.add(e);
        if (b.def.explosive) {
          this.explode(b.x, b.y);
          done = true;
        } else if (e instanceof AcidBall) {
          // derriba los disparos del jefe
          e.kill();
          this.fx.burst(e.x, e.y, { count: 10, colors: [0xffffff, 0xb2ff59], speed: 300, life: 0.35 });
          this.addScore(15);
          done = true;
        } else if (ARMORED.has(e.label)) {
          this.fx.floatText(e.x, e.y - 100, "¡CLANK!", "#cfd8dc", 32);
          this.fx.burst(b.x, b.y, { count: 5, colors: [0xffffff, 0xffeb3b], speed: 260, life: 0.25 });
          done = true;
        } else {
          this.shootDown(e, "¡BANG!");
          b.pierceLeft--;
          done = b.pierceLeft <= 0;
        }
      }
      const boss = this.boss;
      if (!done && boss && !boss.dying && intersects(hb, boss.bodyBox())) {
        if (b.def.explosive) {
          this.explode(b.x, b.y);
        } else {
          this.chipBoss(boss, b.def.bossDmg, b.x, b.y);
        }
        done = true;
      }
      if (done) {
        b.destroy();
        this.bullets.splice(i, 1);
      }
    }
  }

  /** Enemigo volteado por una bala o la explosión. */
  private shootDown(e: { x: number; y: number; points: number; label: string; kill: () => void }, word: string): void {
    e.kill();
    Sfx.voice(e.label, true);
    Achievements.add("shotKills");
    this.stomps++;
    const pts = e.points * this.level;
    this.addScore(pts);
    Sfx.stomp();
    this.fx.burst(e.x, e.y - 40, { count: 12, colors: [0xffffff, 0xffeb3b, 0xff7043], speed: 380, life: 0.45 });
    this.fx.floatText(e.x, e.y - 110, `${word} +${Math.round(pts * this.diff.scoreMul)}`, "#ffe082", 34);
  }

  /** Explosión de la bazooka: voltea todo lo que esté cerca (hasta rocas y al Rex) y le pega al jefe. */
  private explode(x: number, y: number): void {
    Sfx.boom();
    this.shake(16, 0.3);
    this.fx.burst(x, y, { count: 40, colors: [0xffffff, 0xffeb3b, 0xff9800, 0xff3d00, 0x424242], speed: 650, life: 0.7, gravity: 300 });
    this.fx.floatText(x, y - 80, "¡KABOOM!", "#ff9100", 48);
    let blasted = 0;
    for (const e of this.enemies) {
      if (e.dead || BULLET_PASS.has(e.label)) {
        continue;
      }
      const hb = e.getHitbox();
      const ex = Math.max(hb.left, Math.min(x, hb.right));
      const ey = Math.max(hb.top, Math.min(y, hb.bottom));
      if (Math.hypot(ex - x, ey - y) <= BLAST_R) {
        this.shootDown(e, "¡BOOM!");
        blasted++;
      }
    }
    if (blasted >= 3) {
      Achievements.unlock("kaboom");
    }
    const boss = this.boss;
    if (boss && !boss.dying) {
      const bb = boss.bodyBox();
      const ex = Math.max(bb.left, Math.min(x, bb.right));
      const ey = Math.max(bb.top, Math.min(y, bb.bottom));
      if (Math.hypot(ex - x, ey - y) <= BLAST_R) {
        this.chipBoss(boss, this.weapon?.bossDmg ?? 0.6, x, y);
      }
    }
  }

  /** Las balas le van sacando de a poco: cada 1 punto acumulado es como un salto en la cabeza. */
  private chipBoss(boss: Boss, dmg: number, x: number, y: number): void {
    // mientras está golpeado (parpadeando) las balas no le hacen nada
    if (!boss.harmful && !boss.stunned) {
      this.fx.floatText(x, y - 40, "¡TOC!", "#ffffff", 28);
      return;
    }
    this.bossChip += dmg;
    this.fx.burst(x, y, { count: 6, colors: [0xffffff, boss.cfg.color], speed: 260, life: 0.3 });
    if (this.bossChip >= 1) {
      this.bossChip -= 1;
      this.damageBoss(boss);
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
    this.tutorial?.event(air ? "airJump" : "jump");
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
    Sfx.voice(e.label, true);
    this.tutorial?.event("stomp");
    Achievements.add("stomps");
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
    if (this.godMode || this.player.invulnerable || this.turboT > 0) {
      return;
    }
    const px = this.player.x;
    const py = this.player.y - this.def.height / 2;
    if (this.inTutorial) {
      // practicando: sólo un empujón, sin perder vidas
      Sfx.hurt();
      this.player.makeInvulnerable(1);
      this.player.vy = -650;
      this.player.vx = fromX >= this.player.x ? -650 : 650;
      this.fx.floatText(px, py - 120, "¡CAELE ENCIMA!", "#ffe082", 40);
      return;
    }
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
    this.livesLost++;
    this.hud.setLives(this.lives, this.startLives);
    this.hud.flash(0xff1744, 0.55);
    this.shake(26, 0.45);
    this.hitStop = 0.12;
    this.fx.burst(px, py, { count: 24, colors: [0xff1744, 0xffffff, 0xffeb3b], speed: 520, life: 0.6 });
    this.fx.floatText(px, py - 120, "-1 VIDA", "#ff5252", 52);
    if (this.weapon) {
      this.fx.floatText(px, py - 190, `¡PERDISTE LA ${this.weapon.name}!`, "#ff8a80", 40);
      this.fx.burst(px, py, { count: 12, colors: [0x455a64, 0x90a4ae], speed: 400, life: 0.6, gravity: 900 });
      this.setWeapon(null);
    }
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
    if (this.coinsCollected >= COINS_PER_WORLD) {
      return; // el portal ya está abierto: las monedas de más no cuentan
    }
    // cada moneda cuenta 1 para el portal; el x2 sólo duplica los PUNTOS
    const x2 = this.x2T > 0;
    this.coinsCollected += 1;
    this.totalCoins += 1;
    this.wallet += 1;
    this.tutorial?.event("coin");
    Achievements.add("coins");
    this.refreshArsenal();
    this.addScore(10 * (x2 ? 2 : 1));
    AudioCtl.coin();
    this.fx.burst(c.x, c.y, { count: 8, colors: [0xffeb3b, 0xffc107, 0xffffff], speed: 260, life: 0.4, gravity: 300 });
    this.fx.floatText(c.x, c.y - 30, x2 ? "+1 (x2 pts)" : "+1", "#ffeb3b", 34);
    this.hud.setCoins(this.coinsCollected, this.level === WORLDS);

    // Con 50 monedas aparece el JEFE de este mundo (al vencerlo se abre el portal)
    if (this.coinsCollected >= COINS_PER_WORLD && !this.portal && !this.boss && !this.worldBossBeaten) {
      this.hud.setBarMessage("¡VENCÉ AL JEFE PARA ABRIR EL PORTAL!");
      this.startBoss(WORLD_BOSSES[this.level - 1]);
    }
  }

  /** Portal sin enemigos tras vencer al jefe del mundo (en el último lleva al laboratorio). */
  private openPortal(): void {
    AudioCtl.music(`world${this.level}`); // vuelve la música del mundo
    const toLab = this.level === WORLDS;
    this.portal = new Portal(toLab ? "¡AL LABORATORIO!" : "PORTAL →");
    this.entities.addChild(this.portal);
    Sfx.portal();
    this.hud.setBarMessage(toLab ? "¡PORTAL AL LABORATORIO ABIERTO! → entrá" : "¡PORTAL ABIERTO! → entrá");
    this.hud.showHint(toLab ? `¡Completaste los ${WORLDS} mundos! Entrá al portal para enfrentar al jefe final` : "¡Se abrió el PORTAL! Entrá para viajar al siguiente mundo", 4);
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
    Achievements.unlock("pasos");
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

    // el contador de monedas vuelve a 0 en cada pantalla nueva
    this.coinsCollected = 0;
    this.worldBossBeaten = false;
    for (const b of this.bullets) {
      b.destroy();
    }
    this.bullets = [];
    this.openShop(this.level >= WORLDS ? "LABORATORIO" : `MUNDO ${this.level + 1}`, () => this.advanceWorld());
  }

  /** ARMERÍA entre mundos: se gasta la billetera en un arma para la pantalla siguiente. */
  private openShop(next: string, then: () => void): void {
    this.state = "shop";
    this.afterShop = then;
    this.shop = new Shop(
      this.wallet,
      this.weapon?.id ?? null,
      (id) => {
        this.wallet -= getWeapon(id).price;
        this.setWeapon(id);
        Achievements.add(`w_${id}`);
      },
      () => this.closeShop(),
      next,
    );
    this.addChild(this.shop);
  }

  private closeShop(): void {
    const shop = this.shop;
    if (!shop) {
      return;
    }
    this.shop = null;
    shop.destroy({ children: true });
    this.state = "playing";
    this.fireCd = 0.3; // que el ENTER/F de la tienda no dispare
    this.player.makeInvulnerable(1.5);
    if (this.weapon && !this.gunHintShown) {
      this.gunHintShown = true;
      this.hud.showHint(`¡Tenés ${this.weapon.name}!  Apretá F (o X) para disparar · si perdés una vida, la perdés`, 4.5);
    }
    const then = this.afterShop;
    this.afterShop = null;
    then?.();
  }

  private advanceWorld(): void {
    if (this.level >= WORLDS) {
      this.hud.setCoins(COINS_PER_WORLD, true);
      this.hud.setBarMessage("¡DERROTÁ AL DINO-X!");
      this.hud.setLevel(WORLDS + 1);
      this.startBoss(FINAL_BOSS);
      return;
    }
    const newLevel = this.level + 1;
    this.level = newLevel;
    this.hud.setLevel(newLevel);
    this.hud.setCoins(0, newLevel === WORLDS);
    this.bg.setTheme(newLevel - 1, 0.5);
    AudioCtl.music(`world${newLevel}`);
    this.hud.showBanner(`¡MUNDO ${newLevel}!`, `${LEVEL_NAMES[newLevel - 1]} · ${LEVEL_MESSAGES[newLevel] ?? ""}`, 2.8);
    Sfx.levelUp();
    this.confetti();
  }

  /** Aparece un jefe (el del mundo o el DINO-X final): los demás monstruos se van y queda sólo él. */
  private startBoss(cfg: BossConfig): void {
    const hp = Math.max(2, Math.round(this.diff.bossHp * cfg.hpMul));
    this.boss = new Boss(cfg, hp, this.diff.speed);
    this.bossChip = 0;
    this.boss.on("stunned", () => this.hud.showHint("¡ESTÁ MAREADO!  ¡SALTALE EN LA CABEZA!", 2.2));
    this.entities.addChildAt(this.boss, 0);
    this.hud.showBoss(cfg.name, cfg.color);
    AudioCtl.music(cfg.final ? "final" : "boss");
    this.hud.setBossHp(this.boss.hp, this.boss.maxHp);
    if (cfg.final) {
      this.finalReached = true;
      this.bg.setTheme(LAB_THEME, 0.5);
      this.alarmT = 2.6;
      this.hud.showBanner("¡ALERTA!", cfg.intro, 3);
    } else {
      Sfx.bossVoice(cfg.voice);
      this.shake(14, 0.5);
      this.hud.showBanner("¡JEFE DEL MUNDO!", `${cfg.name} · ${cfg.intro}`, 3);
    }
    this.hud.showHint("Esquivá sus ataques.  Cuando choque contra la pared y quede mareado, ¡saltale en la cabeza!", 6);
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

  /** Salto en la cabeza del jefe mareado. */
  private hitBoss(boss: Boss): void {
    this.player.bounce();
    this.player.vy = -1150;
    this.player.makeInvulnerable(1);
    this.fx.burst(this.player.x, this.player.y, { count: 30, colors: [0xffffff, 0xffeb3b, 0x76ff03], speed: 600, life: 0.7 });
    this.damageBoss(boss);
  }

  /** Le saca una vida al jefe (por salto o por las balas acumuladas). */
  private damageBoss(boss: Boss): void {
    boss.hit();
    this.addScore(300);
    Sfx.stomp();
    this.shake(18, 0.35);
    this.hitStop = 0.1;
    this.hud.setBossHp(boss.hp, boss.maxHp);
    this.fx.floatText(boss.x, boss.y - 260, boss.hp > 0 ? "¡PUM!" : "¡K.O.!", "#ffeb3b", 64);
    if (boss.hp <= 0) {
      this.bossesBeaten++;
      Achievements.add("bosses");
      if (boss.cfg.final) {
        Achievements.unlock("campeon");
        if (this.livesLost === 0 && this.credits >= START_CREDITS) {
          Achievements.unlock("intocable");
        }
        if (this.diff.id === "dificil") {
          Achievements.unlock("leyenda");
        }
      }
      this.bossChip = 0;
      if (boss.cfg.final) {
        this.bossDefeated = true;
        this.addScore(2000);
      } else {
        this.worldBossBeaten = true;
        this.addScore(800);
        this.wallet += BOSS_BOUNTY;
        this.refreshArsenal();
        this.fx.floatText(boss.x, boss.y - 340, `+${BOSS_BOUNTY} A LA BILLETERA`, "#ffeb3b", 44);
      }
      this.hud.showBanner(`¡VENCISTE AL ${boss.cfg.final ? "DINO-X" : boss.cfg.name}!`, "", 2.4);
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
      coins: this.totalCoins,
      level: this.level,
      reachedBoss: this.finalReached,
      bosses: this.bossesBeaten,
      stomps: this.stomps,
      time: this.elapsed,
      characterId: this.def.id,
      difficulty: this.diff.id,
      bossDefeated: this.bossDefeated,
      best: Math.max(best, this.score),
      newRecord,
      runId: this.runId,
    };
    if (won) {
      Storage.saveRun(null);
      // premio: el personaje rojinegro
      if (this.bossDefeated && Storage.unlock("rojinegro")) {
        stats.unlocked = getCharacter("rojinegro").name;
      }
    } else {
      // para CONTINUAR desde este mundo (si quedan fichas)
      const run: RunState = {
        runId: this.runId,
        characterId: this.def.id,
        difficulty: this.diff.id,
        world: this.level,
        lab: this.finalReached,
        wallet: this.wallet,
        score: this.score,
        totalCoins: this.totalCoins,
        stomps: this.stomps,
        elapsed: this.elapsed,
        // si ya había vencido al jefe de este mundo pero no entró al portal, lo vuelve a pelear
        bosses: this.bossesBeaten - (this.worldBossBeaten ? 1 : 0),
        credits: this.credits,
      };
      stats.run = run;
      Storage.saveRun(this.credits > 0 ? run : null);
    }
    this.state = "done"; // congela hasta que se aplique el cambio de escena
    SceneManager.change(won ? new WinScene(stats) : new FinalScene(stats));
  }

  // ------------------------------------------------------------------ debug

  /** Para la demo: una fila de monedas a ras del piso entrando por la derecha (hay que agarrarlas). */
  public debugCoinRow(n: number): void {
    for (let i = 0; i < n; i++) {
      const c = new Coin(WIDTH + 60 + i * 64, GROUND_Y - 45);
      this.coins.push(c);
      this.entities.addChild(c);
    }
  }

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
