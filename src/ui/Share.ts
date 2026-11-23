import { AnimatedSprite, Container, Graphics, Rectangle, Text } from "pixi.js";
import { WORLDS, getDifficulty } from "../config";
import { SceneManager } from "../core/SceneManager";
import { getCharacter, scaleFor } from "../game/characters";
import { GameStats } from "../game/types";
import { style } from "./styles";
import { TextButton } from "./Button";

const W = 1080;
const H = 1080;

/** Arma la tarjeta del récord (imagen cuadrada para mandar por WhatsApp). */
function buildCard(stats: GameStats): Container {
  const c = new Container();
  const g = new Graphics();
  g.beginFill(0x111111);
  g.drawRect(0, 0, W, H);
  g.endFill();
  // franjas rojinegras en diagonal
  for (let i = -14; i < 20; i++) {
    if (i % 2 !== 0) continue;
    g.beginFill(0xb71c1c);
    g.drawPolygon([i * 90, 0, i * 90 + 90, 0, i * 90 + 90 - H, H, i * 90 - H, H]);
    g.endFill();
  }
  g.beginFill(0x000000, 0.62);
  g.drawRoundedRect(70, 70, W - 140, H - 140, 50);
  g.endFill();
  g.lineStyle(8, 0xff1744);
  g.drawRoundedRect(70, 70, W - 140, H - 140, 50);
  c.addChild(g);

  const title = new Text("TOMI GAME", style({ fontSize: 120, fill: ["#ff5252", "#b71c1c"], stroke: "#000000", strokeThickness: 16 }));
  title.anchor.set(0.5);
  title.position.set(W / 2, 190);
  c.addChild(title);

  const won = stats.bossDefeated;
  const head = new Text(won ? "¡GANÉ!" : "MI RÉCORD", style({ fontSize: 70, fill: won ? "#69f0ae" : "#ffd54f", strokeThickness: 10 }));
  head.anchor.set(0.5);
  head.position.set(W / 2, 310);
  c.addChild(head);

  const def = getCharacter(stats.characterId);
  const frames = def.frames();
  const hero = new AnimatedSprite(frames, false);
  hero.anchor.set(0.5, 1);
  hero.scale.set(scaleFor(def, frames) * 2.1);
  hero.position.set(W / 2, 655);
  c.addChild(hero);

  const score = new Text(`${stats.score}`, style({ fontSize: 150, fill: ["#fff59d", "#ffb300"], stroke: "#3e0000", strokeThickness: 16 }));
  score.anchor.set(0.5);
  score.position.set(W / 2, 735);
  c.addChild(score);
  const pts = new Text("PUNTOS", style({ fontSize: 44, strokeThickness: 7 }));
  pts.anchor.set(0.5);
  pts.position.set(W / 2, 830);
  c.addChild(pts);

  const where = won ? "¡Vencí al DINO-X!" : stats.reachedBoss ? "Llegué al LABORATORIO" : `Llegué al MUNDO ${stats.level} de ${WORLDS}`;
  const sub = new Text(`${def.name} · ${getDifficulty(stats.difficulty).name}\n${where} · Jefes: ${stats.bosses}`, style({ fontSize: 38, fill: "#eceff1", strokeThickness: 6, align: "center" }));
  sub.anchor.set(0.5);
  sub.position.set(W / 2, 915);
  c.addChild(sub);
  return c;
}

/** Renderiza la tarjeta a un canvas de W x H (con el recuadro exacto). */
function cardCanvas(card: Container): HTMLCanvasElement {
  const r = SceneManager.renderer;
  const tex = r.generateTexture(card, { region: new Rectangle(0, 0, W, H), resolution: 1 });
  const canvas = r.plugins.extract.canvas(tex) as HTMLCanvasElement;
  tex.destroy(true);
  card.destroy({ children: true });
  return canvas;
}

/** Texto del mensaje (con el link al juego). */
export function shareText(stats: GameStats): string {
  const url = `${location.origin}${location.pathname}`;
  const diff = getDifficulty(stats.difficulty).name;
  return stats.bossDefeated
    ? `¡Gané Tomi Game en ${diff} con ${stats.score} puntos! ¿Me superás? ${url}`
    : `¡Hice ${stats.score} puntos en Tomi Game (${diff})! ¿Me superás? ${url}`;
}

/**
 * Comparte el récord: en el celular abre el menú de compartir con la imagen (WhatsApp, etc.);
 * si el navegador no deja compartir archivos, descarga la imagen y abre WhatsApp con el texto.
 * Devuelve qué hizo (para mostrar un aviso).
 */
export async function shareRecord(stats: GameStats): Promise<"shared" | "whatsapp" | "cancel"> {
  const card = buildCard(stats);
  const canvas = cardCanvas(card);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  const text = shareText(stats);
  const file = blob ? new File([blob], "tomi-game-record.png", { type: "image/png" }) : null;
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  try {
    if (file && nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], text, title: "Tomi Game" });
      return "shared";
    }
  } catch (e) {
    if ((e as { name?: string }).name === "AbortError") {
      return "cancel";
    }
  }
  // compu (o navegador sin compartir archivos): baja la imagen y abre WhatsApp con el mensaje
  if (blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tomi-game-record.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  return "whatsapp";
}

/** Sólo para pruebas: la tarjeta como data URL. */
export function shareCardDataUrl(stats: GameStats): string {
  const card = buildCard(stats);
  const canvas = cardCanvas(card);
  return canvas.toDataURL("image/png");
}

/** Botón "COMPARTIR" con su aviso: lo usan la pantalla de Game Over y la de victoria. */
export function makeShareButton(host: Container, stats: GameStats, x: number, y: number): () => void {
  const toast = new Text("", style({ fontSize: 26, fill: "#b9f6ca", strokeThickness: 5 }));
  toast.anchor.set(1, 0);
  toast.position.set(x + 160, y + 40);
  let busy = false;
  const run = (): void => {
    if (busy) return;
    busy = true;
    void shareRecord(stats).then((how) => {
      busy = false;
      toast.text = how === "whatsapp" ? "Imagen guardada · se abrió WhatsApp" : how === "shared" ? "¡Compartido!" : "";
    });
  };
  const btn = new TextButton("📤 COMPARTIR (S)", run, { width: 320, height: 64, fontSize: 26, color: 0x25d366 });
  btn.position.set(x, y);
  host.addChild(btn, toast);
  return run;
}
