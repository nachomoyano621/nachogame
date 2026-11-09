import { AnimatedSprite, Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";
import { DOWN_KEYS, GROUND_Y, LEFT_KEYS, RIGHT_KEYS, WIDTH } from "../config";
import { Keyboard } from "../utils/Keyboard";
import { CharacterDef, scaleFor } from "./characters";

/**
 * Jugador con física propia: doble/triple salto, salto variable (soltar antes = salto corto),
 * coyote time, buffer de salto, caída rápida, invulnerabilidad y escudo.
 * Emite "jump" (air: boolean) y "land".
 */
export class Player extends Container {
  public static readonly GRAVITY = 2400;
  private static readonly MAX_FALL = 1700;

  public vx = 0;
  public vy = 0;
  public prevY = GROUND_Y;
  public onGround = true;
  public dead = false;
  /** true mientras planea (personajes con glide). */
  public gliding = false;

  private jumpsLeft: number;
  private coyote = 0;
  private jumpBuffer = 0;
  private jumpHeld = false;
  private invulnT = 0;
  private t = 0;
  private facing = 1;
  private squash = 1;
  private shieldOn = false;

  private readonly sprite: AnimatedSprite;
  private readonly baseScale: number;
  private readonly shieldG = new Graphics();
  private readonly carry = new Sprite(Texture.EMPTY);

  constructor(public readonly def: CharacterDef) {
    super();
    const frames = def.frames();
    this.sprite = new AnimatedSprite(frames, false);
    this.sprite.anchor.set(0.5, 1);
    this.baseScale = scaleFor(def, frames);
    this.sprite.scale.set(this.baseScale);
    this.sprite.animationSpeed = 0.2;
    this.sprite.play();
    this.addChild(this.sprite);

    // burbuja del escudo rojinegro
    this.shieldG.lineStyle(6, 0xff1744, 0.9);
    this.shieldG.beginFill(0xd50000, 0.18);
    this.shieldG.drawCircle(0, 0, Math.max(def.height * 0.62, 95));
    this.shieldG.endFill();
    this.shieldG.y = -def.height * 0.5;
    this.shieldG.visible = false;
    this.addChild(this.shieldG);

    this.carry.anchor.set(0.5);
    this.carry.y = -def.height - 34;
    this.carry.visible = false;
    this.addChild(this.carry);

    this.jumpsLeft = def.maxJumps;
    this.position.set(320, GROUND_Y);
  }

  public get invulnerable(): boolean {
    return this.invulnT > 0 || this.dead;
  }

  public get hasShield(): boolean {
    return this.shieldOn;
  }

  /** 1 = mira a la derecha, -1 = a la izquierda. */
  public get dir(): number {
    return this.facing;
  }

  /** Muestra (o saca) el objeto que lleva sobre la cabeza, ej: el cráneo. */
  public setCarry(tex: Texture | null): void {
    this.carry.texture = tex ?? Texture.EMPTY;
    this.carry.visible = tex !== null;
  }

  public pressJump(): void {
    this.jumpHeld = true;
    this.jumpBuffer = 0.13;
  }

  public releaseJump(): void {
    this.jumpHeld = false;
  }

  /** Rebote al aplastar un enemigo: recupera los saltos en el aire. */
  public bounce(): void {
    this.vy = -this.def.jump * 0.75;
    this.jumpsLeft = this.def.maxJumps - 1;
    this.squash = 1.25;
  }

  public makeInvulnerable(seconds: number): void {
    this.invulnT = seconds;
  }

  public setShield(on: boolean): void {
    this.shieldOn = on;
    this.shieldG.visible = on;
  }

  public die(): void {
    this.dead = true;
    this.gliding = false;
    this.setShield(false);
    this.vy = -950;
    this.vx = 0;
    this.sprite.stop();
    this.sprite.alpha = 1;
  }

  public getHitbox(): Rectangle {
    const { w, h } = this.def.hitbox;
    return new Rectangle(this.x - w / 2, this.y - h, w, h);
  }

  public update(dt: number): void {
    this.t += dt;
    this.prevY = this.y;

    if (this.dead) {
      this.vy += Player.GRAVITY * dt;
      this.y += this.vy * dt;
      this.rotation += 7 * dt * this.facing;
      return;
    }

    // --- horizontal
    const dir = (Keyboard.isDown(...RIGHT_KEYS) ? 1 : 0) - (Keyboard.isDown(...LEFT_KEYS) ? 1 : 0);
    const target = dir * this.def.speed;
    this.vx += (target - this.vx) * Math.min(1, dt * (this.onGround ? 18 : 9));
    if (dir !== 0) {
      this.facing = dir;
    }

    // --- saltos
    this.jumpBuffer -= dt;
    this.coyote -= dt;
    if (this.jumpBuffer > 0) {
      if (this.onGround || this.coyote > 0) {
        this.doJump(false);
      } else if (this.jumpsLeft > 0) {
        this.doJump(true);
      }
    }

    // --- gravedad (más fuerte si soltás el salto o apretás abajo)
    let g = Player.GRAVITY;
    if (this.vy < 0 && !this.jumpHeld) {
      g *= 2.1;
    }
    if (!this.onGround && Keyboard.isDown(...DOWN_KEYS)) {
      g *= 2.3;
    }
    this.vy = Math.min(this.vy + g * dt, Player.MAX_FALL);
    this.gliding = !!this.def.glide && !this.onGround && this.jumpHeld && this.vy > 0 && !Keyboard.isDown(...DOWN_KEYS);
    if (this.gliding) {
      this.vy = Math.min(this.vy, 150);
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.y >= GROUND_Y) {
      this.y = GROUND_Y;
      this.vy = 0;
      if (!this.onGround) {
        this.onGround = true;
        this.squash = 0.78;
        this.emit("land");
      }
      this.jumpsLeft = this.def.maxJumps;
      this.coyote = 0.1;
    } else if (this.onGround) {
      this.onGround = false;
    }

    this.x = Math.max(50, Math.min(WIDTH - 50, this.x));

    this.animate(dt);
  }

  private doJump(air: boolean): void {
    this.vy = -this.def.jump * (air ? 0.9 : 1);
    if (air) {
      this.jumpsLeft--;
    } else {
      this.jumpsLeft = this.def.maxJumps - 1;
    }
    this.onGround = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.squash = 1.28;
    this.emit("jump", air);
  }

  private animate(dt: number): void {
    const moving = Math.abs(this.vx) > 25;
    if (this.def.runCycle) {
      if (!this.onGround) {
        this.sprite.gotoAndStop(2);
      } else if (moving) {
        if (!this.sprite.playing) {
          this.sprite.play();
        }
        this.sprite.animationSpeed = 0.28;
      } else {
        this.sprite.gotoAndStop(0);
      }
    } else {
      this.sprite.animationSpeed = moving ? 0.32 : 0.12;
    }
    this.sprite.update(dt * 60);

    // squash & stretch
    this.squash += (1 - this.squash) * Math.min(1, dt * 12);
    this.sprite.scale.set(this.facing * this.baseScale * (2 - this.squash), this.baseScale * this.squash);

    // parpadeo de invulnerabilidad
    if (this.invulnT > 0) {
      this.invulnT -= dt;
      this.sprite.alpha = Math.floor(this.t * 18) % 2 === 0 ? 0.25 : 1;
    } else {
      this.sprite.alpha = 1;
    }

    if (this.carry.visible) {
      this.carry.y = -this.def.height - 34 + Math.sin(this.t * 6) * 5;
      this.carry.rotation = Math.sin(this.t * 3) * 0.15;
    }

    if (this.shieldOn) {
      const pulse = 1 + Math.sin(this.t * 6) * 0.04;
      this.shieldG.scale.set(pulse);
      this.shieldG.alpha = 0.75 + Math.sin(this.t * 9) * 0.2;
    }
  }
}
