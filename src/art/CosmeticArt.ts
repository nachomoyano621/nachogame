import { AbstractRenderer, Graphics, Rectangle, Texture } from "pixi.js";

/** Ropa del ropero: sombreros (apoyados en y = 0, centrados) y formas de las estelas. */
export interface CosmeticArtBank {
  gorro: Texture;
  gorra: Texture;
  galera: Texture;
  vaquero: Texture;
  cuernos: Texture;
  corona: Texture;
  star: Texture;
  heart: Texture;
}

export const CosArt = {} as CosmeticArtBank;

/** Gorro de lana a bastones rojinegros con pompón (diseño propio). */
function drawGorro(g: Graphics): void {
  g.lineStyle(3, 0x111111);
  g.beginFill(0xd50000);
  g.drawPolygon([-34, 0, -30, -30, -18, -48, 0, -54, 18, -48, 30, -30, 34, 0]);
  g.endFill();
  g.lineStyle(0);
  g.beginFill(0x111111);
  for (const x of [-22, -4, 14]) {
    g.drawPolygon([x, -2, x + 9, -2, x + 7, -46, x + 1, -48]);
  }
  g.endFill();
  g.lineStyle(3, 0x111111);
  g.beginFill(0xffffff);
  g.drawRoundedRect(-37, -10, 74, 14, 6);
  g.drawCircle(0, -58, 10);
  g.endFill();
}

function drawGorra(g: Graphics): void {
  g.lineStyle(3, 0x0d2b6b);
  g.beginFill(0x1e88e5);
  g.drawPolygon([-30, 0, -28, -24, -14, -38, 6, -40, 24, -30, 30, 0]);
  g.endFill();
  g.beginFill(0x1565c0);
  g.drawPolygon([24, -4, 56, -2, 54, 6, 26, 6]);
  g.endFill();
  g.lineStyle(0);
  g.beginFill(0xffffff);
  g.drawCircle(-2, -38, 4);
  g.drawRoundedRect(-14, -24, 22, 10, 4);
  g.endFill();
}

function drawGalera(g: Graphics): void {
  g.lineStyle(3, 0x000000);
  g.beginFill(0x212121);
  g.drawRoundedRect(-44, -8, 88, 12, 5);
  g.drawRect(-26, -66, 52, 60);
  g.endFill();
  g.lineStyle(0);
  g.beginFill(0xd50000);
  g.drawRect(-26, -20, 52, 10);
  g.endFill();
}

function drawVaquero(g: Graphics): void {
  g.lineStyle(3, 0x4e342e);
  g.beginFill(0xa1887f);
  g.drawEllipse(0, -4, 56, 12);
  g.endFill();
  g.beginFill(0x8d6e63);
  g.drawPolygon([-28, -8, -24, -40, -8, -46, 0, -40, 8, -46, 24, -40, 28, -8]);
  g.endFill();
  g.lineStyle(0);
  g.beginFill(0x3e2723);
  g.drawRect(-28, -16, 56, 7);
  g.endFill();
}

function drawCuernos(g: Graphics): void {
  g.lineStyle(3, 0x4a0000);
  g.beginFill(0xff1744);
  g.drawPolygon([-30, 0, -40, -34, -18, -8]);
  g.drawPolygon([30, 0, 40, -34, 18, -8]);
  g.endFill();
  g.lineStyle(4, 0x4a0000);
  g.moveTo(-30, 2);
  g.lineTo(30, 2);
}

function drawCorona(g: Graphics): void {
  g.lineStyle(3, 0x8d6e00);
  g.beginFill(0xffd600);
  g.drawPolygon([-34, 0, -38, -38, -18, -18, 0, -46, 18, -18, 38, -38, 34, 0]);
  g.endFill();
  g.lineStyle(0);
  g.beginFill(0xff1744);
  g.drawCircle(0, -14, 6);
  g.endFill();
  g.beginFill(0x2979ff);
  g.drawCircle(-20, -10, 4);
  g.drawCircle(20, -10, 4);
  g.endFill();
}

function drawStar(g: Graphics): void {
  const pts: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 12 : 5;
    pts.push(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.beginFill(0xffffff);
  g.drawPolygon(pts);
  g.endFill();
}

function drawHeart(g: Graphics): void {
  g.beginFill(0xffffff);
  g.drawCircle(-5, -3, 6);
  g.drawCircle(5, -3, 6);
  g.drawPolygon([-11, -1, 11, -1, 0, 12]);
  g.endFill();
}

export function buildCosmeticArt(r: AbstractRenderer): void {
  const bake = (draw: (g: Graphics) => void, region: Rectangle): Texture => {
    const g = new Graphics();
    draw(g);
    const t = r.generateTexture(g, { region, resolution: 2 });
    g.destroy();
    return t;
  };
  CosArt.gorro = bake(drawGorro, new Rectangle(-40, -70, 80, 76));
  CosArt.gorra = bake(drawGorra, new Rectangle(-34, -44, 92, 52));
  CosArt.galera = bake(drawGalera, new Rectangle(-47, -70, 94, 76));
  CosArt.vaquero = bake(drawVaquero, new Rectangle(-60, -50, 120, 58));
  CosArt.cuernos = bake(drawCuernos, new Rectangle(-44, -38, 88, 44));
  CosArt.corona = bake(drawCorona, new Rectangle(-42, -50, 84, 54));
  CosArt.star = bake(drawStar, new Rectangle(-13, -13, 26, 26));
  CosArt.heart = bake(drawHeart, new Rectangle(-12, -10, 24, 24));
}
