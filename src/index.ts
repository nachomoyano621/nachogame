import * as PIXI from "pixi.js";
import { Application, Graphics, Loader, Text } from "pixi.js";
import "@pixi/sound";
import { assets } from "./Componentes/assets";
import { Art, buildArt } from "./art/ProceduralArt";
import { WArt, buildWorldArt } from "./art/WorldArt";
import { WORLD_ENEMIES } from "./game/worldEnemies";
import { HEIGHT, WIDTH } from "./config";
import { AudioCtl } from "./core/AudioCtl";
import { Music } from "./core/Music";
import { Sfx } from "./core/Sfx";
import { SceneManager } from "./core/SceneManager";
import { TitleScene } from "./Scenas/TitleScene";
import { runDemo } from "./demo/Demo";
import { style } from "./ui/styles";
import { Keyboard } from "./utils/Keyboard";

const app = new Application({
  view: document.getElementById("pixi-canvas") as HTMLCanvasElement,
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,
  backgroundColor: 0x000000,
  width: WIDTH,
  height: HEIGHT,
});

Keyboard.initialize();

// Escala el canvas para que entre en la ventana manteniendo la relación 16:9 (letterbox).
function resize(): void {
  const scale = Math.min(window.innerWidth / WIDTH, window.innerHeight / HEIGHT);
  const w = Math.round(WIDTH * scale);
  const h = Math.round(HEIGHT * scale);
  app.view.style.width = `${w}px`;
  app.view.style.height = `${h}px`;
  app.view.style.marginLeft = `${Math.floor((window.innerWidth - w) / 2)}px`;
  app.view.style.marginTop = `${Math.floor((window.innerHeight - h) / 2)}px`;
}
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", resize);
resize();

// Pantalla de carga
const loading = new Graphics();
const loadingText = new Text("CARGANDO...", style({ fontSize: 48 }));
loadingText.anchor.set(0.5);
loadingText.position.set(WIDTH / 2, HEIGHT / 2 - 60);
app.stage.addChild(loading, loadingText);
function drawProgress(p: number): void {
  loading.clear();
  loading.lineStyle(4, 0xffffff);
  loading.drawRoundedRect(WIDTH / 2 - 400, HEIGHT / 2, 800, 40, 20);
  loading.lineStyle(0);
  loading.beginFill(0xffc107);
  loading.drawRoundedRect(WIDTH / 2 - 394, HEIGHT / 2 + 6, Math.max(28, 788 * p), 28, 14);
  loading.endFill();
}
drawProgress(0);

Loader.shared.add(assets);
Loader.shared.onProgress.add((l) => drawProgress(l.progress / 100));
Loader.shared.load(() => {
  app.stage.removeChild(loading, loadingText);
  loading.destroy();
  loadingText.destroy();

  buildArt(app.renderer);
  buildWorldArt(app.renderer);
  AudioCtl.init();
  SceneManager.init(app);
  SceneManager.change(new TitleScene());

  // Modo demo automático: ?demo (y ?demo&record para grabar el video)
  const params = new URLSearchParams(window.location.search);
  if (params.has("demo")) {
    void runDemo(app, params.has("record"));
  }
});

// Los navegadores no dejan sonar audio hasta que el usuario interactúa: destrabarlo en la primera tecla/clic
const unlockAudio = (): void => {
  void Sfx.sharedContext()?.resume();
};
window.addEventListener("keydown", unlockAudio);
window.addEventListener("pointerdown", unlockAudio);

// Mute global con M en cualquier pantalla
Keyboard.down.on("KeyM", () => AudioCtl.toggle());

// Acceso para pruebas en local (no se incluye en el build de producción)
declare const process: { env: { NODE_ENV?: string } };
if (process.env.NODE_ENV !== "production") {
  (window as unknown as { __tomi: unknown }).__tomi = { app, SceneManager, Keyboard, Art, PIXI, WArt, WORLD_ENEMIES, Music };
}
