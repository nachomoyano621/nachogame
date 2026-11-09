import { utils } from "pixi.js";

/** Teclas a las que les evitamos el comportamiento por defecto (scroll de la página). */
const PREVENT = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"]);

/**
 * Estado global del teclado.
 * - `down` / `up` emiten el `code` de la tecla y además el evento genérico "key".
 * - Los controles táctiles usan `press` / `release` para simular teclas.
 */
export class Keyboard {
  public static readonly state: Map<string, boolean> = new Map();
  public static readonly down: utils.EventEmitter = new utils.EventEmitter();
  public static readonly up: utils.EventEmitter = new utils.EventEmitter();

  public static readonly KEYS = {
    ENTER: "Enter",
  };

  private static initialized = false;

  private constructor() {}

  public static initialize(): void {
    if (Keyboard.initialized) {
      return;
    }
    Keyboard.initialized = true;
    document.addEventListener("keydown", Keyboard.onKeyDown);
    document.addEventListener("keyup", Keyboard.onKeyUp);
    // Si la ventana pierde el foco, soltamos todo para que no queden teclas "pegadas".
    window.addEventListener("blur", Keyboard.releaseAll);
  }

  public static isDown(...codes: string[]): boolean {
    for (const c of codes) {
      if (Keyboard.state.get(c)) {
        return true;
      }
    }
    return false;
  }

  public static press(code: string): void {
    if (Keyboard.state.get(code)) {
      return; // ignoramos auto-repeat
    }
    Keyboard.state.set(code, true);
    Keyboard.down.emit(code);
    Keyboard.down.emit("key", code);
  }

  public static release(code: string): void {
    if (!Keyboard.state.get(code)) {
      return;
    }
    Keyboard.state.set(code, false);
    Keyboard.up.emit(code);
    Keyboard.up.emit("key", code);
  }

  public static releaseAll(): void {
    for (const [code, isDown] of Keyboard.state) {
      if (isDown) {
        Keyboard.release(code);
      }
    }
  }

  private static onKeyDown(e: KeyboardEvent): void {
    if (PREVENT.has(e.code)) {
      e.preventDefault();
    }
    Keyboard.press(e.code);
  }

  private static onKeyUp(e: KeyboardEvent): void {
    Keyboard.release(e.code);
  }
}
