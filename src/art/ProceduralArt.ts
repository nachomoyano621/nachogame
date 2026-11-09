import { AbstractRenderer, Container, Graphics, LINE_CAP, LINE_JOIN, Rectangle, Text, Texture } from "pixi.js";
import { style } from "../ui/styles";

/**
 * Texturas generadas por código al iniciar (personajes y enemigos nuevos,
 * power-ups, partículas y el piso). Así no dependemos de imágenes extra.
 */
export interface ArtBank {
  ninja: Texture[];
  robot: Texture[];
  astro: Texture[];
  meteor: Texture;
  acid: Texture;
  mosasaur: Texture[];
  pier: Texture;
  bat: Texture[];
  eagle: Texture[];
  vulture: Texture[];
  boulder: Texture;
  ground: Texture;
  particle: Texture;
  heart: Texture;
  heartEmpty: Texture;
  powerHeart: Texture;
  powerShield: Texture;
  powerMagnet: Texture;
  powerX2: Texture;
  iconShield: Texture;
  iconMagnet: Texture;
  iconX2: Texture;
}

export const Art = {} as ArtBank;

let renderer: AbstractRenderer;

function bake(obj: Container, region: Rectangle): Texture {
  const tex = renderer.generateTexture(obj, { region, resolution: 2 });
  obj.destroy({ children: true });
  return tex;
}

/** Dibuja un segmento redondeado. ang = 0 apunta hacia abajo, positivo hacia adelante (+x). */
function limb(g: Graphics, x: number, y: number, len: number, ang: number, w: number, color: number): [number, number] {
  const ex = x + Math.sin(ang) * len;
  const ey = y + Math.cos(ang) * len;
  g.lineStyle({ width: w, color, cap: LINE_CAP.ROUND, join: LINE_JOIN.ROUND });
  g.moveTo(x, y);
  g.lineTo(ex, ey);
  g.lineStyle(0);
  return [ex, ey];
}

function leg(g: Graphics, hx: number, hy: number, k: number, color: number, len = 28, w = 11): void {
  const thigh = k * 0.75;
  const knee = limb(g, hx, hy, len, thigh, w, color);
  const shin = thigh - 0.2 - Math.max(0, -k) * 0.9;
  limb(g, knee[0], knee[1], len, shin, w - 1, color);
}

function arm(g: Graphics, sx: number, sy: number, k: number, color: number, hand: number): void {
  const upper = k * 0.9;
  const elbow = limb(g, sx, sy, 20, upper, 8, color);
  const end = limb(g, elbow[0], elbow[1], 18, upper + 1.1, 7, color);
  g.beginFill(hand);
  g.drawCircle(end[0], end[1], 5);
  g.endFill();
}

// ---------------------------------------------------------------- personajes

function drawNinja(g: Graphics, p: number): void {
  const s = Math.sin(p * Math.PI * 2);
  const c = Math.cos(p * Math.PI * 2);
  const body = 0x252a4a;
  const dark = 0x14172e;
  const skin = 0xf1c27d;
  const red = 0xe63946;
  const b = Math.abs(c) * 4;

  // katana en la espalda
  g.lineStyle({ width: 5, color: 0xcfd8dc, cap: LINE_CAP.ROUND });
  g.moveTo(34, 112 - b);
  g.lineTo(78, 54 - b);
  g.lineStyle({ width: 8, color: 0x5d4037, cap: LINE_CAP.ROUND });
  g.moveTo(78, 54 - b);
  g.lineTo(90, 38 - b);
  g.lineStyle(0);

  leg(g, 58, 112 - b, -s, dark);
  arm(g, 56, 74 - b, s, dark, dark);

  g.beginFill(body);
  g.drawRoundedRect(42, 62 - b, 36, 54, 14);
  g.endFill();
  g.beginFill(red);
  g.drawRect(42, 100 - b, 36, 7);
  g.endFill();

  leg(g, 62, 112 - b, s, body);

  // cabeza
  g.beginFill(body);
  g.drawCircle(62, 42 - b, 21);
  g.endFill();
  g.beginFill(skin);
  g.drawRoundedRect(55, 34 - b, 28, 12, 5);
  g.endFill();
  g.beginFill(0x000000);
  g.drawCircle(68, 40 - b, 2.8);
  g.drawCircle(77, 40 - b, 2.8);
  g.endFill();
  g.lineStyle({ width: 2.5, color: 0x000000 });
  g.moveTo(64, 34 - b);
  g.lineTo(71, 36 - b);
  g.moveTo(74, 36 - b);
  g.lineTo(81, 34 - b);
  g.lineStyle(0);

  // vincha con las colas al viento
  g.beginFill(red);
  g.drawRect(41, 24 - b, 42, 7);
  g.drawPolygon([43, 25 - b, 16, 16 - b + s * 7, 18, 25 - b + s * 7, 43, 31 - b]);
  g.drawPolygon([43, 27 - b, 14, 30 - b - s * 6, 17, 37 - b - s * 6, 43, 31 - b]);
  g.endFill();

  arm(g, 66, 74 - b, -s, body, dark);
}

function drawRobot(g: Graphics, p: number): void {
  const a = p * Math.PI * 2;
  const s = Math.sin(a);
  const b = Math.abs(Math.sin(a * 2)) * 3;
  const metal = 0xb0bec5;
  const edge = 0x455a64;

  // rueda
  g.beginFill(0x263238);
  g.drawCircle(65, 144, 25);
  g.endFill();
  g.beginFill(0x78909c);
  g.drawCircle(65, 144, 15);
  g.endFill();
  g.lineStyle({ width: 4, color: 0x37474f, cap: LINE_CAP.ROUND });
  for (let i = 0; i < 3; i++) {
    const ang = a + (i * Math.PI * 2) / 3;
    g.moveTo(65, 144);
    g.lineTo(65 + Math.cos(ang) * 14, 144 + Math.sin(ang) * 14);
  }
  g.lineStyle(0);
  g.beginFill(0xffca28);
  g.drawCircle(65, 144, 4);
  g.endFill();

  // soporte
  g.beginFill(0x78909c);
  g.drawRect(59, 108 - b, 12, 24);
  g.endFill();

  arm(g, 36, 74 - b, s * 0.6, 0x78909c, 0xffca28);

  // cuerpo
  g.lineStyle(4, edge);
  g.beginFill(metal);
  g.drawRoundedRect(30, 60 - b, 70, 54, 12);
  g.endFill();
  g.lineStyle(0);
  g.beginFill(0x263238);
  g.drawRoundedRect(44, 72 - b, 42, 24, 6);
  g.endFill();
  const lights = [0x00e676, 0xffea00, 0xff1744];
  for (let i = 0; i < 3; i++) {
    g.beginFill(lights[(i + Math.floor(p * 4)) % 3]);
    g.drawCircle(53 + i * 12, 84 - b, 4);
    g.endFill();
  }

  // cabeza
  g.lineStyle(4, edge);
  g.beginFill(0xcfd8dc);
  g.drawRoundedRect(36, 14 - b, 60, 42, 12);
  g.endFill();
  g.lineStyle(0);
  g.beginFill(0x0b2a3a);
  g.drawRoundedRect(44, 24 - b, 46, 20, 8);
  g.endFill();
  g.beginFill(0x00e5ff);
  g.drawRoundedRect(70 + s * 4, 28 - b, 14, 12, 4);
  g.endFill();
  g.beginFill(0xffffff, 0.8);
  g.drawRect(74 + s * 4, 30 - b, 4, 4);
  g.endFill();

  // antena
  g.lineStyle({ width: 4, color: 0x78909c });
  g.moveTo(66, 14 - b);
  g.lineTo(66, 2 - b);
  g.lineStyle(0);
  g.beginFill(0xff1744);
  g.drawCircle(66, 2 - b, 6);
  g.endFill();

  arm(g, 94, 74 - b, -s * 0.6, 0x90a4ae, 0xffca28);
}

function drawAstro(g: Graphics, p: number): void {
  const s = Math.sin(p * Math.PI * 2);
  const b = Math.abs(Math.cos(p * Math.PI * 2)) * 4;
  const suit = 0xf5f7fa;
  const shade = 0xc9d3db;
  const edge = 0x78909c;

  // mochila cohete
  g.lineStyle(3, 0x8d3a1e);
  g.beginFill(0xff7043);
  g.drawRoundedRect(18, 60 - b, 26, 50, 9);
  g.endFill();
  g.lineStyle(0);
  g.beginFill(0x546e7a);
  g.drawRect(22, 108 - b, 18, 9);
  g.endFill();
  g.beginFill(0xffd54f);
  g.drawCircle(31, 72 - b, 4);
  g.endFill();

  leg(g, 58, 114 - b, -s, shade, 26, 14);
  arm(g, 54, 76 - b, s, shade, edge);

  g.lineStyle(3, edge);
  g.beginFill(suit);
  g.drawRoundedRect(38, 62 - b, 46, 56, 16);
  g.endFill();
  g.lineStyle(0);
  g.beginFill(0x37474f);
  g.drawRoundedRect(48, 78 - b, 26, 16, 4);
  g.endFill();
  g.beginFill(0xff1744);
  g.drawCircle(55, 86 - b, 3);
  g.endFill();
  g.beginFill(0x00e676);
  g.drawCircle(66, 86 - b, 3);
  g.endFill();

  leg(g, 64, 114 - b, s, suit, 26, 14);

  // casco
  g.lineStyle(3, edge);
  g.beginFill(suit);
  g.drawCircle(64, 38 - b, 27);
  g.endFill();
  g.lineStyle(0);
  g.beginFill(0x1565c0);
  g.drawEllipse(73, 38 - b, 17, 14);
  g.endFill();
  g.beginFill(0x64b5f6);
  g.drawEllipse(76, 41 - b, 10, 7);
  g.endFill();
  g.beginFill(0xffffff, 0.85);
  g.drawEllipse(67, 32 - b, 5, 3.5);
  g.endFill();
  g.lineStyle({ width: 3, color: edge });
  g.moveTo(50, 14 - b);
  g.lineTo(46, 2 - b);
  g.lineStyle(0);
  g.beginFill(0xffd54f);
  g.drawCircle(46, 2 - b, 4);
  g.endFill();

  arm(g, 70, 76 - b, -s, suit, edge);
}

function drawMeteor(g: Graphics): void {
  g.beginFill(0xff6d00, 0.25);
  g.drawCircle(0, 0, 58);
  g.endFill();
  g.beginFill(0xffab00, 0.4);
  g.drawCircle(0, 0, 46);
  g.endFill();
  const jitter = [1, 0.9, 1.05, 0.93, 1, 0.88, 1.04, 0.95, 0.98, 0.9];
  const pts: number[] = [];
  jitter.forEach((j, i) => {
    const a = (i / jitter.length) * Math.PI * 2;
    pts.push(Math.cos(a) * 36 * j, Math.sin(a) * 36 * j);
  });
  g.lineStyle(4, 0x3e2723);
  g.beginFill(0x4e342e);
  g.drawPolygon(pts);
  g.endFill();
  g.lineStyle({ width: 4, color: 0xff9100, cap: LINE_CAP.ROUND });
  g.moveTo(-20, -8);
  g.lineTo(-4, 2);
  g.lineTo(10, -14);
  g.moveTo(4, 18);
  g.lineTo(20, 10);
  g.lineStyle(0);
  g.beginFill(0xffd180, 0.8);
  g.drawCircle(-12, -16, 6);
  g.endFill();
}

function drawMosasaur(g: Graphics, open: number): void {
  const body = 0x2f5d75;
  const dark = 0x1f4256;
  const belly = 0xbcd4de;
  // cola
  g.beginFill(dark);
  g.drawPolygon([370, 86, 440, 34, 424, 88, 440, 140]);
  g.endFill();
  // aletas de atrás
  g.beginFill(dark);
  g.drawPolygon([290, 118, 268, 164, 318, 126]);
  g.drawPolygon([180, 116, 150, 160, 206, 126]);
  g.endFill();
  // cuerpo
  g.beginFill(body);
  g.drawEllipse(250, 88, 150, 42);
  g.drawEllipse(140, 86, 56, 30);
  g.endFill();
  g.beginFill(belly);
  g.drawEllipse(240, 106, 130, 18);
  g.endFill();
  g.beginFill(dark);
  for (const [x, y, r] of [[200, 64, 7], [240, 58, 9], [285, 62, 7], [325, 70, 6], [165, 70, 5]]) {
    g.drawCircle(x, y, r);
  }
  g.endFill();
  // boca abierta
  const o = open;
  g.beginFill(0x7f0000);
  g.drawPolygon([14, 90 - o * 0.3, 118, 88, 118, 104, 20, 106 + o]);
  g.endFill();
  // mandíbula superior
  g.beginFill(body);
  g.drawPolygon([118, 62, 60, 66, 8, 80, 10, 92 - o * 0.3, 118, 92]);
  g.endFill();
  // mandíbula inferior
  g.beginFill(belly);
  g.drawPolygon([118, 102, 18, 108 + o, 22, 120 + o, 124, 120]);
  g.endFill();
  // dientes filosos
  g.beginFill(0xffffff);
  for (let x = 16; x < 112; x += 9) {
    const yTop = 92 - o * 0.3 + ((x - 16) / 96) * (o * 0.3);
    g.drawPolygon([x, yTop - 1, x + 6, yTop - 1, x + 3, yTop + 11]);
    const yBot = 108 + o - ((x - 16) / 96) * o;
    g.drawPolygon([x + 4, yBot + 1, x + 10, yBot + 1, x + 7, yBot - 10]);
  }
  g.endFill();
  // ojo
  g.beginFill(0xffeb3b);
  g.drawCircle(98, 74, 7);
  g.endFill();
  g.beginFill(0x000000);
  g.drawEllipse(98, 74, 2, 6);
  g.endFill();
  g.lineStyle({ width: 3, color: 0x10232e });
  g.moveTo(86, 64);
  g.lineTo(108, 68);
  g.lineStyle(0);
}

// ---------------------------------------------------------------- enemigos

function drawBat(g: Graphics, flap: number): void {
  const wing = 0x4a148c;
  const w = flap; // -1 alas arriba, 1 alas abajo
  const cx = 80;
  const cy = 50;
  g.beginFill(wing);
  g.drawPolygon([cx - 12, cy - 6, cx - 72, cy - 18 + w * 34, cx - 58, cy + 8 + w * 20, cx - 44, cy + 2 + w * 10, cx - 32, cy + 14 + w * 8, cx - 16, cy + 10]);
  g.drawPolygon([cx + 12, cy - 6, cx + 72, cy - 18 + w * 34, cx + 58, cy + 8 + w * 20, cx + 44, cy + 2 + w * 10, cx + 32, cy + 14 + w * 8, cx + 16, cy + 10]);
  g.endFill();
  g.beginFill(0x7b1fa2);
  g.drawEllipse(cx, cy + 2, 20, 24);
  g.drawPolygon([cx - 16, cy - 12, cx - 12, cy - 34, cx - 4, cy - 18]);
  g.drawPolygon([cx + 16, cy - 12, cx + 12, cy - 34, cx + 4, cy - 18]);
  g.endFill();
  g.beginFill(0xffeb3b);
  g.drawCircle(cx - 8, cy - 4, 6);
  g.drawCircle(cx + 8, cy - 4, 6);
  g.endFill();
  g.beginFill(0xd50000);
  g.drawCircle(cx - 8, cy - 3, 2.5);
  g.drawCircle(cx + 8, cy - 3, 2.5);
  g.endFill();
  g.beginFill(0xffffff);
  g.drawPolygon([cx - 6, cy + 10, cx - 2, cy + 10, cx - 4, cy + 17]);
  g.drawPolygon([cx + 2, cy + 10, cx + 6, cy + 10, cx + 4, cy + 17]);
  g.endFill();
}

interface BirdPalette {
  body: number;
  wing: number;
  back: number;
  tail: number;
  head: number;
  beak: number;
}

const EAGLE: BirdPalette = { body: 0x5d4037, wing: 0x4e342e, back: 0x3e2723, tail: 0xeeeeee, head: 0xffffff, beak: 0xffb300 };
/** Buitre del desierto: plumas oscuras y cabeza pelada rosada. */
const VULTURE: BirdPalette = { body: 0x2b1d1a, wing: 0x1f1412, back: 0x140c0a, tail: 0x3e2723, head: 0xf48fb1, beak: 0xbdbdbd };

function drawEagle(g: Graphics, up: boolean, pal: BirdPalette = EAGLE): void {
  const brown = pal.body;
  const wing = pal.wing;
  // ala de atrás
  g.beginFill(pal.back);
  if (up) {
    g.drawPolygon([100, 55, 130, 4, 152, 14, 122, 58]);
  } else {
    g.drawPolygon([100, 62, 130, 104, 152, 96, 122, 60]);
  }
  g.endFill();
  // cola
  g.beginFill(pal.tail);
  g.drawPolygon([132, 56, 172, 44, 176, 60, 172, 76, 132, 66]);
  g.endFill();
  // cuerpo
  g.beginFill(brown);
  g.drawEllipse(96, 60, 44, 18);
  g.endFill();
  if (pal === VULTURE) {
    // collar de plumas blancas del buitre
    g.beginFill(0xf5f5f5);
    g.drawEllipse(66, 58, 12, 14);
    g.endFill();
  }
  // cabeza
  g.beginFill(pal.head);
  g.drawCircle(52, 50, 17);
  g.endFill();
  g.beginFill(pal.beak);
  g.drawPolygon([38, 44, 16, 54, 36, 60]);
  g.endFill();
  g.beginFill(0x000000);
  g.drawCircle(47, 46, 3.2);
  g.endFill();
  g.lineStyle({ width: 3, color: 0x000000 });
  g.moveTo(42, 40);
  g.lineTo(54, 43);
  g.lineStyle(0);
  // garras
  g.lineStyle({ width: 4, color: 0xffb300, cap: LINE_CAP.ROUND });
  g.moveTo(90, 74);
  g.lineTo(84, 88);
  g.moveTo(104, 74);
  g.lineTo(100, 88);
  g.lineStyle(0);
  // ala de adelante
  g.beginFill(wing);
  if (up) {
    g.drawPolygon([78, 56, 96, 0, 124, 6, 108, 58]);
  } else {
    g.drawPolygon([78, 62, 96, 110, 124, 104, 108, 60]);
  }
  g.endFill();
}

function drawBoulder(g: Graphics): void {
  const r = 52;
  const jitter = [1, 0.93, 1.04, 0.95, 1.02, 0.9, 1.05, 0.96, 1, 0.92, 1.03, 0.97];
  const pts: number[] = [];
  jitter.forEach((j, i) => {
    const a = (i / jitter.length) * Math.PI * 2;
    pts.push(Math.cos(a) * r * j, Math.sin(a) * r * j);
  });
  g.lineStyle(5, 0x3e342c);
  g.beginFill(0x7d6e60);
  g.drawPolygon(pts);
  g.endFill();
  g.lineStyle(0);
  g.beginFill(0xa1887f, 0.55);
  g.drawCircle(-16, -18, 16);
  g.endFill();
  g.beginFill(0x5d4e42);
  g.drawCircle(18, 14, 8);
  g.drawCircle(-10, 22, 5);
  g.endFill();
  g.lineStyle({ width: 4, color: 0x3e342c, cap: LINE_CAP.ROUND });
  g.moveTo(-30, 4);
  g.lineTo(-8, 8);
  g.lineTo(4, -10);
  g.moveTo(24, -26);
  g.lineTo(30, -6);
  g.lineStyle(0);
}

// ---------------------------------------------------------------- iconos

function drawHeart(g: Graphics, cx: number, cy: number, s: number, color: number, alpha = 1): void {
  g.beginFill(color, alpha);
  g.drawCircle(cx - s * 0.5, cy - s * 0.25, s * 0.56);
  g.drawCircle(cx + s * 0.5, cy - s * 0.25, s * 0.56);
  g.drawPolygon([cx - s * 1.03, cy - s * 0.08, cx + s * 1.03, cy - s * 0.08, cx, cy + s * 1.05]);
  g.endFill();
  if (alpha === 1) {
    g.beginFill(0xffffff, 0.55);
    g.drawEllipse(cx - s * 0.55, cy - s * 0.4, s * 0.2, s * 0.13);
    g.endFill();
  }
}

/**
 * Escudo rojinegro de homenaje a Colón: estrella dorada arriba y "COLÓN" cruzado.
 * Es un diseño propio con los colores del club, no una copia del escudo oficial.
 */
function colonShield(cx: number, cy: number, s: number): Container {
  const c = new Container();
  const g = new Graphics();
  const pts = [0, -1, 0.85, -0.65, 0.75, 0.25, 0, 1, -0.75, 0.25, -0.85, -0.65];
  const P = (k: number): number[] => pts.map((v, i) => (i % 2 === 0 ? cx + v * s * k : cy + v * s * k));
  // mitad roja (izquierda) y mitad negra (derecha)
  g.beginFill(0x111111);
  g.drawPolygon(P(1));
  g.endFill();
  g.beginFill(0xd50000);
  g.drawPolygon([cx, cy - s, cx - 0.85 * s, cy - 0.65 * s, cx - 0.75 * s, cy + 0.25 * s, cx, cy + s]);
  g.endFill();
  g.lineStyle(Math.max(2.5, s * 0.1), 0xffffff);
  g.drawPolygon(P(1));
  g.lineStyle(0);
  // estrella dorada ARRIBA del escudo
  g.lineStyle(2, 0x7f5f00);
  g.beginFill(0xffd600);
  g.drawPolygon(starPoints(cx, cy - s * 1.3, s * 0.36, s * 0.16));
  g.endFill();
  g.lineStyle(0);
  c.addChild(g);
  const t = new Text("COLÓN", style({ fontSize: Math.round(s * 0.46), fill: "#ffffff", stroke: "#000000", strokeThickness: Math.max(2, Math.round(s * 0.1)) }));
  t.anchor.set(0.5);
  t.position.set(cx, cy - s * 0.1);
  c.addChild(t);
  return c;
}

function drawMagnet(g: Graphics, cx: number, cy: number, s: number): void {
  const r = s * 0.55;
  const w = s * 0.42;
  g.lineStyle({ width: w, color: 0xe53935, cap: LINE_CAP.BUTT });
  g.moveTo(cx + r, cy);
  g.arc(cx, cy, r, 0, Math.PI);
  g.lineTo(cx - r, cy - s * 0.5);
  g.moveTo(cx + r, cy);
  g.lineTo(cx + r, cy - s * 0.5);
  g.lineStyle({ width: w, color: 0xcfd8dc, cap: LINE_CAP.BUTT });
  g.moveTo(cx - r, cy - s * 0.5);
  g.lineTo(cx - r, cy - s * 0.92);
  g.moveTo(cx + r, cy - s * 0.5);
  g.lineTo(cx + r, cy - s * 0.92);
  g.lineStyle(0);
}

function starPoints(cx: number, cy: number, ro: number, ri: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? ro : ri;
    pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return pts;
}

function x2Icon(cx: number, cy: number, s: number): Container {
  const c = new Container();
  const g = new Graphics();
  g.lineStyle(4, 0xff6f00);
  g.beginFill(0xffd600);
  g.drawPolygon(starPoints(cx, cy, s, s * 0.5));
  g.endFill();
  c.addChild(g);
  const t = new Text("x2", style({ fontSize: s * 0.62, fill: "#b71c1c", stroke: "#ffffff", strokeThickness: 4 }));
  t.anchor.set(0.5);
  t.position.set(cx, cy + s * 0.08);
  c.addChild(t);
  return c;
}

function bubble(content: Container): Container {
  const c = new Container();
  const g = new Graphics();
  g.lineStyle(4, 0xffffff, 0.9);
  g.beginFill(0xffffff, 0.22);
  g.drawCircle(45, 45, 40);
  g.endFill();
  g.lineStyle(0);
  g.beginFill(0xffffff, 0.6);
  g.drawEllipse(30, 24, 10, 6);
  g.endFill();
  c.addChild(g, content);
  return c;
}

function gfx(draw: (g: Graphics) => void): Graphics {
  const g = new Graphics();
  draw(g);
  return g;
}

export function buildArt(r: AbstractRenderer): void {
  renderer = r;

  const frames = (n: number, draw: (g: Graphics, i: number) => void, region: Rectangle): Texture[] => {
    const out: Texture[] = [];
    for (let i = 0; i < n; i++) {
      out.push(bake(gfx((g) => draw(g, i)), region));
    }
    return out;
  };

  Art.ninja = frames(8, (g, i) => drawNinja(g, i / 8), new Rectangle(0, 0, 120, 170));
  Art.robot = frames(8, (g, i) => drawRobot(g, i / 8), new Rectangle(0, -6, 130, 176));
  Art.astro = frames(8, (g, i) => drawAstro(g, i / 8), new Rectangle(0, -8, 130, 178));
  Art.meteor = bake(gfx(drawMeteor), new Rectangle(-60, -60, 120, 120));
  Art.acid = bake(
    gfx((g) => {
      g.beginFill(0x76ff03, 0.25);
      g.drawCircle(0, 0, 30);
      g.endFill();
      g.beginFill(0x64dd17);
      g.drawCircle(0, 0, 20);
      g.endFill();
      g.beginFill(0xccff90);
      g.drawCircle(-5, -5, 9);
      g.endFill();
      g.beginFill(0xffffff, 0.8);
      g.drawCircle(-8, -8, 4);
      g.endFill();
    }),
    new Rectangle(-32, -32, 64, 64),
  );
  Art.mosasaur = frames(2, (g, i) => drawMosasaur(g, i === 0 ? 8 : 22), new Rectangle(0, 20, 450, 160));
  Art.pier = bake(
    gfx((g) => {
      g.beginFill(0x0277bd);
      g.drawRect(0, 0, 256, 112);
      g.endFill();
      g.beginFill(0x4fc3f7, 0.6);
      for (const [x, y] of [[60, 60], [190, 80], [120, 96], [10, 90]]) {
        g.drawEllipse(x, y, 22, 3);
      }
      g.endFill();
      g.beginFill(0x4e342e);
      g.drawRect(40, 16, 22, 96);
      g.drawRect(168, 16, 22, 96);
      g.endFill();
      g.beginFill(0x8d6e63);
      g.drawRect(0, 0, 256, 22);
      g.endFill();
      g.beginFill(0xbcaaa4);
      g.drawRect(0, 0, 256, 5);
      g.endFill();
      g.beginFill(0x5d4037);
      for (let x = 0; x < 256; x += 64) {
        g.drawRect(x, 0, 3, 22);
      }
      g.drawRect(0, 20, 256, 3);
      g.endFill();
    }),
    new Rectangle(0, 0, 256, 112),
  );
  Art.bat = frames(3, (g, i) => drawBat(g, [-1, 0.1, 1][i]), new Rectangle(0, -20, 160, 120));
  Art.eagle = frames(2, (g, i) => drawEagle(g, i === 0), new Rectangle(0, -6, 180, 122));
  Art.vulture = frames(2, (g, i) => drawEagle(g, i === 0, VULTURE), new Rectangle(0, -6, 180, 122));
  Art.boulder = bake(gfx(drawBoulder), new Rectangle(-60, -60, 120, 120));

  Art.particle = bake(
    gfx((g) => {
      g.beginFill(0xffffff);
      g.drawCircle(0, 0, 8);
      g.endFill();
    }),
    new Rectangle(-8, -8, 16, 16),
  );

  Art.ground = bake(
    gfx((g) => {
      g.beginFill(0x3b2420);
      g.drawRect(0, 0, 256, 112);
      g.endFill();
      g.beginFill(0x6b3f2a);
      g.drawRect(0, 0, 256, 18);
      g.endFill();
      g.beginFill(0xa0603e);
      g.drawRect(0, 0, 256, 5);
      g.endFill();
      const stones = [
        [30, 44, 14, 8],
        [92, 72, 10, 6],
        [150, 46, 18, 9],
        [212, 86, 12, 7],
        [60, 96, 9, 5],
        [190, 34, 8, 5],
        [122, 100, 14, 6],
      ];
      for (const [x, y, w, h] of stones) {
        g.beginFill(0x55332a);
        g.drawEllipse(x, y, w, h);
        g.endFill();
        g.beginFill(0x7a4b3a);
        g.drawEllipse(x - w * 0.3, y - h * 0.3, w * 0.4, h * 0.35);
        g.endFill();
      }
    }),
    new Rectangle(0, 0, 256, 112),
  );

  Art.heart = bake(gfx((g) => drawHeart(g, 30, 28, 22, 0xff1744)), new Rectangle(0, 0, 60, 56));
  Art.heartEmpty = bake(gfx((g) => drawHeart(g, 30, 28, 22, 0x000000, 0.45)), new Rectangle(0, 0, 60, 56));

  const iconRegion = new Rectangle(0, 0, 90, 90);
  Art.powerHeart = bake(bubble(gfx((g) => drawHeart(g, 45, 45, 22, 0xff1744))), iconRegion);
  Art.powerShield = bake(bubble(colonShield(45, 52, 24)), iconRegion);
  Art.powerMagnet = bake(bubble(gfx((g) => drawMagnet(g, 45, 52, 40))), iconRegion);
  Art.powerX2 = bake(bubble(x2Icon(45, 46, 28)), iconRegion);

  Art.iconShield = bake(colonShield(45, 54, 30), iconRegion);
  Art.iconMagnet = bake(gfx((g) => drawMagnet(g, 45, 56, 52)), iconRegion);
  Art.iconX2 = bake(x2Icon(45, 46, 38), iconRegion);
}
