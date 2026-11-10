import { AbstractRenderer, Container, Graphics, LINE_CAP, Rectangle, Sprite, Texture, TilingSprite } from "pixi.js";
import { Art } from "../art/ProceduralArt";
import { WArt, drawBrick } from "../art/WorldArt";
import { GROUND_Y, HEIGHT, WIDTH, rand } from "../config";

/** Un escenario: capas con parallax que se repiten cada WIDTH px. */
class Scenery extends Container {
  public readonly layers: { c: Container; factor: number }[] = [];
  public readonly alarms: Graphics[] = [];

  public addLayer(c: Container, factor: number): void {
    this.layers.push({ c, factor });
    this.addChild(c);
  }

  public scroll(offset: number): void {
    for (const l of this.layers) {
      if (l.factor > 0) {
        l.c.x = -((offset * l.factor) % WIDTH);
      }
    }
  }
}

interface ThemeFx {
  emberColors: number[];
  emberUp: boolean;
  streakRate: number;
  groundTint: number;
  ground?: "dirt" | "pier" | "bricks";
}

// ------------------------------------------------------------------ helpers de dibujo

function skyGradient(top: number, bottom: number): Graphics {
  const g = new Graphics();
  const bands = 48;
  for (let i = 0; i < bands; i++) {
    const k = i / (bands - 1);
    g.beginFill(lerpColor(top, bottom, k));
    g.drawRect(0, (HEIGHT / bands) * i, WIDTH, HEIGHT / bands + 1);
    g.endFill();
  }
  return g;
}

/** Cordillera que se repite exacto cada WIDTH px (frecuencias enteras). */
function ridge(color: number, baseY: number, amp: number, k1: number, k2: number, seed: number): Graphics {
  const g = new Graphics();
  const pts: number[] = [0, GROUND_Y + 20];
  for (let x = 0; x <= WIDTH * 2; x += 24) {
    const a = (x / WIDTH) * Math.PI * 2;
    const n = 0.55 * Math.sin(a * k1 + seed) + 0.3 * Math.sin(a * k2 + seed * 2.1) + 0.15 * Math.sin(a * (k1 + k2) + seed * 0.7);
    pts.push(x, baseY - amp * (0.5 + 0.5 * n));
  }
  pts.push(WIDTH * 2, GROUND_Y + 20);
  g.beginFill(color);
  g.drawPolygon(pts);
  g.endFill();
  return g;
}

function stars(count: number, maxY: number): Graphics {
  const g = new Graphics();
  for (let i = 0; i < count; i++) {
    g.beginFill(0xffffff, rand(0.3, 1));
    g.drawCircle(rand(0, WIDTH), rand(0, maxY), rand(1, 2.8));
    g.endFill();
  }
  return g;
}

function lerpColor(a: number, b: number, k: number): number {
  const ch = (c: number, s: number): number => (c >> s) & 0xff;
  const mix = (s: number): number => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * k);
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

/** Repite un dibujo en x y en x+WIDTH para que el scroll sea continuo. */
function twice(draw: (g: Graphics, ox: number) => void): Graphics {
  const g = new Graphics();
  draw(g, 0);
  draw(g, WIDTH);
  return g;
}

// ------------------------------------------------------------------ escenarios

function imageTheme(): Scenery {
  const s = new Scenery();
  const tex = Texture.from("fondo");
  const layer = new Container();
  const a = new Sprite(tex);
  a.width = WIDTH;
  a.height = HEIGHT;
  const b = new Sprite(tex);
  b.scale.x = -1;
  b.width = WIDTH;
  b.height = HEIGHT;
  b.x = WIDTH * 2;
  const c = new Sprite(tex);
  c.width = WIDTH;
  c.height = HEIGHT;
  c.x = WIDTH * 2;
  layer.addChild(a, b, c);
  // la imagen espejada tiene período 2*WIDTH: la manejamos aparte
  s.addChild(layer);
  s.layers.push({ c: layer, factor: -0.25 });
  return s;
}

function desertTheme(): Scenery {
  const s = new Scenery();
  s.addLayer(skyGradient(0xff6e40, 0xffd180), 0);
  const sun = new Graphics();
  sun.beginFill(0xfff59d, 0.25);
  sun.drawCircle(1350, 470, 210);
  sun.endFill();
  sun.beginFill(0xfff176);
  sun.drawCircle(1350, 470, 150);
  sun.endFill();
  s.addLayer(sun, 0);
  s.addLayer(ridge(0xd17a4a, 760, 330, 2, 5, 1.3), 0.12);
  s.addLayer(ridge(0xa4552f, 880, 170, 3, 7, 4.1), 0.3);
  s.addLayer(
    twice((g, ox) => {
      g.beginFill(0x5d3a1a);
      for (const x of [200, 760, 1310, 1700]) {
        const X = x + ox;
        g.drawRoundedRect(X, GROUND_Y - 190, 34, 200, 16);
        g.drawRoundedRect(X - 40, GROUND_Y - 130, 30, 70, 14);
        g.drawRoundedRect(X - 40, GROUND_Y - 80, 60, 26, 12);
        g.drawRoundedRect(X + 44, GROUND_Y - 160, 30, 80, 14);
        g.drawRoundedRect(X + 14, GROUND_Y - 100, 60, 26, 12);
      }
      g.endFill();
    }),
    0.6,
  );
  return s;
}

function oceanTheme(): Scenery {
  const s = new Scenery();
  s.addLayer(skyGradient(0x0288d1, 0xb3e5fc), 0);
  const sun = new Graphics();
  sun.beginFill(0xfffde7, 0.3);
  sun.drawCircle(1500, 180, 140);
  sun.endFill();
  sun.beginFill(0xfff9c4);
  sun.drawCircle(1500, 180, 90);
  sun.endFill();
  s.addLayer(sun, 0);
  s.addLayer(
    twice((g, ox) => {
      g.beginFill(0xffffff, 0.9);
      for (const [x, y, w] of [[200, 160, 1], [760, 110, 1.3], [1250, 260, 0.8], [1700, 140, 1.1]]) {
        const X = x + ox;
        g.drawEllipse(X, y, 90 * w, 30 * w);
        g.drawEllipse(X - 50 * w, y + 10, 60 * w, 24 * w);
        g.drawEllipse(X + 55 * w, y + 8, 64 * w, 26 * w);
      }
      g.endFill();
    }),
    0.05,
  );
  // islita con palmera
  s.addLayer(
    twice((g, ox) => {
      const X = 520 + ox;
      g.beginFill(0x00695c);
      g.drawEllipse(X, 640, 170, 40);
      g.endFill();
      g.beginFill(0x3e2723);
      g.drawPolygon([X - 6, 630, X + 18, 470, X + 26, 470, X + 8, 630]);
      g.endFill();
      g.beginFill(0x1b5e20);
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI / 2 + (k - 2.5) * 0.55;
        g.drawPolygon([X + 22, 470, X + 22 + Math.cos(a - 0.15) * 110, 470 + Math.sin(a - 0.15) * 60 + 40, X + 22 + Math.cos(a + 0.15) * 110, 470 + Math.sin(a + 0.15) * 60 + 40]);
      }
      g.endFill();
    }),
    0.08,
  );
  // mar
  const sea = new Graphics();
  const bands = 24;
  for (let i = 0; i < bands; i++) {
    sea.beginFill(lerpColor(0x29b6f6, 0x01579b, i / (bands - 1)));
    sea.drawRect(0, 640 + ((GROUND_Y - 640) / bands) * i, WIDTH, (GROUND_Y - 640) / bands + 1);
    sea.endFill();
  }
  sea.beginFill(0xe1f5fe, 0.8);
  sea.drawRect(0, 638, WIDTH, 4);
  sea.endFill();
  s.addLayer(sea, 0);
  // olas
  s.addLayer(
    twice((g, ox) => {
      g.lineStyle(4, 0xffffff, 0.55);
      for (const [y, step, off] of [[680, 160, 0], [740, 200, 60], [820, 240, 20], [910, 280, 120]]) {
        for (let x = off; x < WIDTH; x += step) {
          g.moveTo(x + ox, y);
          g.quadraticCurveTo(x + ox + 30, y - 14, x + ox + 60, y);
        }
      }
      g.lineStyle(0);
    }),
    0.35,
  );
  // aleta que asoma a lo lejos
  s.addLayer(
    twice((g, ox) => {
      g.beginFill(0x263238);
      g.drawPolygon([1250 + ox, 760, 1280 + ox, 710, 1300 + ox, 760]);
      g.endFill();
    }),
    0.5,
  );
  return s;
}

function jungleTheme(): Scenery {
  const s = new Scenery();
  s.addLayer(skyGradient(0x0b132b, 0x1c5d4a), 0);
  s.addLayer(stars(140, 600), 0);
  const moon = new Graphics();
  moon.beginFill(0xe0f2f1, 0.18);
  moon.drawCircle(1500, 230, 120);
  moon.endFill();
  moon.beginFill(0xf1faee);
  moon.drawCircle(1500, 230, 78);
  moon.endFill();
  moon.beginFill(0xcfd8dc);
  moon.drawCircle(1475, 210, 14);
  moon.drawCircle(1525, 255, 10);
  moon.endFill();
  s.addLayer(moon, 0);
  s.addLayer(ridge(0x1b4332, 780, 260, 3, 6, 2.2), 0.12);
  s.addLayer(ridge(0x0e2a20, 880, 160, 4, 9, 0.4), 0.3);
  s.addLayer(
    twice((g, ox) => {
      for (const x of [90, 520, 980, 1420, 1800]) {
        const X = x + ox;
        g.beginFill(0x061a12);
        g.drawPolygon([X - 10, GROUND_Y, X + 6, GROUND_Y - 330, X + 22, GROUND_Y]);
        g.endFill();
        // hojas de palmera
        g.beginFill(0x08261a);
        for (let k = 0; k < 6; k++) {
          const a = -Math.PI / 2 + (k - 2.5) * 0.5;
          g.drawPolygon([X + 6, GROUND_Y - 330, X + 6 + Math.cos(a - 0.15) * 150, GROUND_Y - 330 + Math.sin(a - 0.15) * 90 + 60, X + 6 + Math.cos(a + 0.15) * 150, GROUND_Y - 330 + Math.sin(a + 0.15) * 90 + 60]);
        }
        g.endFill();
      }
    }),
    0.6,
  );
  return s;
}

function volcanoTheme(): Scenery {
  const s = new Scenery();
  s.addLayer(skyGradient(0x1a0505, 0xff5722), 0);
  const volcano = new Graphics();
  volcano.beginFill(0x3a1010);
  volcano.drawPolygon([700, GROUND_Y, 1080, 300, 1240, 300, 1650, GROUND_Y]);
  volcano.endFill();
  volcano.beginFill(0xff6d00, 0.35);
  volcano.drawEllipse(1160, 290, 160, 60);
  volcano.endFill();
  volcano.beginFill(0xffab00);
  volcano.drawEllipse(1160, 300, 82, 14);
  volcano.endFill();
  volcano.beginFill(0xff3d00);
  volcano.drawPolygon([1140, 305, 1180, 305, 1230, 520, 1205, 700, 1170, 520]);
  volcano.drawPolygon([1120, 305, 1150, 305, 1090, 560, 1060, 620]);
  volcano.endFill();
  s.addLayer(volcano, 0);
  s.addLayer(ridge(0x2a0b0b, 870, 200, 4, 7, 3.3), 0.3);
  s.addLayer(
    twice((g, ox) => {
      g.beginFill(0x120404);
      for (const x of [150, 640, 1100, 1560]) {
        const X = x + ox;
        g.drawPolygon([X, GROUND_Y, X + 40, GROUND_Y - 150, X + 70, GROUND_Y - 90, X + 110, GROUND_Y - 200, X + 160, GROUND_Y]);
      }
      g.endFill();
    }),
    0.6,
  );
  return s;
}

function meteorTheme(): Scenery {
  const s = new Scenery();
  s.addLayer(skyGradient(0x07011a, 0x5a189a), 0);
  s.addLayer(stars(260, 800), 0);
  const planet = new Graphics();
  planet.beginFill(0xff8fab, 0.15);
  planet.drawCircle(420, 260, 170);
  planet.endFill();
  planet.beginFill(0xc77dff);
  planet.drawCircle(420, 260, 120);
  planet.endFill();
  planet.beginFill(0x9d4edd);
  planet.drawEllipse(390, 230, 60, 22);
  planet.drawEllipse(450, 300, 40, 14);
  planet.endFill();
  planet.lineStyle(10, 0xe0aaff, 0.8);
  planet.drawEllipse(420, 260, 220, 40);
  s.addLayer(planet, 0);
  s.addLayer(ridge(0x3c096c, 800, 260, 2, 5, 5.2), 0.12);
  s.addLayer(ridge(0x240046, 900, 140, 5, 8, 1.7), 0.3);
  return s;
}

/** Cápsula rota: vidrio astillado, líquido derramado, fragmentos y marcas de garras. */
function brokenTank(g: Graphics, X: number): void {
  g.beginFill(0x37474f);
  g.drawRect(X + 60, 138, 28, 300);
  g.drawRoundedRect(X - 10, 420, 170, 30, 8);
  g.drawRoundedRect(X - 10, 860, 170, 40, 8);
  g.endFill();
  // interior vacío
  g.beginFill(0x061a14, 0.95);
  g.drawRect(X + 4, 455, 142, 405);
  g.endFill();
  // restos de vidrio con bordes dentados (arriba y a los costados)
  g.lineStyle(4, 0x80cbc4, 0.8);
  g.beginFill(0x4db6ac, 0.25);
  g.drawPolygon([X, 450, X + 150, 450, X + 150, 520, X + 128, 492, X + 112, 545, X + 90, 500, X + 70, 560, X + 52, 505, X + 30, 540, X + 14, 498, X, 530]);
  g.drawPolygon([X, 860, X, 700, X + 18, 740, X + 10, 790, X + 34, 820, X + 30, 860]);
  g.drawPolygon([X + 150, 860, X + 150, 730, X + 132, 770, X + 140, 810, X + 118, 860]);
  g.endFill();
  g.lineStyle(0);
  // marcas de garras
  g.lineStyle({ width: 5, color: 0x000000, alpha: 0.6, cap: LINE_CAP.ROUND });
  for (let k = 0; k < 3; k++) {
    g.moveTo(X + 50 + k * 18, 600);
    g.lineTo(X + 70 + k * 18, 700);
  }
  g.lineStyle(0);
  // líquido verde derramado y charco en el piso
  g.beginFill(0x00e676, 0.55);
  g.drawPolygon([X + 30, 860, X + 120, 860, X + 150, 930, X + 10, 930]);
  g.drawEllipse(X + 80, GROUND_Y - 34, 170, 14);
  g.endFill();
  // fragmentos de vidrio en el piso
  g.beginFill(0xb2dfdb, 0.85);
  for (const [dx, dy, s] of [[-60, -40, 10], [-20, -48, 7], [170, -44, 9], [210, -38, 6], [120, -50, 8], [40, -52, 6]]) {
    g.drawPolygon([X + dx, GROUND_Y + dy, X + dx + s, GROUND_Y + dy - s, X + dx + s * 1.6, GROUND_Y + dy + 2]);
  }
  g.endFill();
  // cartel de alerta
  g.beginFill(0xffd600);
  g.drawRoundedRect(X + 20, 380, 110, 30, 6);
  g.endFill();
  g.beginFill(0x000000);
  g.drawPolygon([X + 30, 404, X + 40, 386, X + 50, 404]);
  g.drawRect(X + 58, 392, 62, 6);
  g.endFill();
}

/** Mundo de bloques de juguete: ciudad de ladrillos de colores, árboles de bloques y nubes cuadradas. */
function blockTheme(): Scenery {
  const s = new Scenery();
  s.addLayer(skyGradient(0x4fc3f7, 0xe1f5fe), 0);
  const sun = new Graphics();
  drawBrick(sun, 1440, 120, 120, 90, 0xfdd835);
  s.addLayer(sun, 0);
  // nubes de bloques blancos
  s.addLayer(
    twice((g, ox) => {
      for (const [x, y] of [[180, 170], [760, 110], [1250, 230]]) {
        drawBrick(g, x + ox, y, 140, 40, 0xffffff);
        drawBrick(g, x + ox + 40, y - 40, 100, 40, 0xffffff);
      }
    }),
    0.05,
  );
  // ciudad de torres de ladrillos
  const colors = [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0xff6d00, 0x8e24aa];
  s.addLayer(
    twice((g, ox) => {
      let k = 0;
      for (const [x, w, floors] of [[40, 160, 7], [260, 120, 10], [420, 200, 5], [680, 140, 9], [880, 180, 6], [1120, 130, 11], [1300, 220, 4], [1580, 150, 8], [1760, 140, 6]]) {
        for (let f = 0; f < floors; f++) {
          drawBrick(g, x + ox, GROUND_Y - 40 - (f + 1) * 48, w, 46, colors[k++ % colors.length], f === floors - 1);
        }
        // ventanitas
        g.beginFill(0xffffff, 0.55);
        for (let f = 1; f < floors; f += 2) {
          g.drawRoundedRect(x + ox + w * 0.2, GROUND_Y - 40 - f * 48 - 30, w * 0.2, 16, 3);
          g.drawRoundedRect(x + ox + w * 0.6, GROUND_Y - 40 - f * 48 - 30, w * 0.2, 16, 3);
        }
        g.endFill();
      }
    }),
    0.15,
  );
  // árboles de bloques adelante
  s.addLayer(
    twice((g, ox) => {
      for (const x of [140, 620, 1100, 1560]) {
        drawBrick(g, x + ox + 30, GROUND_Y - 130, 40, 130, 0x6d4c41, false);
        drawBrick(g, x + ox, GROUND_Y - 200, 100, 70, 0x2e7d32);
        drawBrick(g, x + ox + 20, GROUND_Y - 250, 60, 50, 0x388e3c);
      }
    }),
    0.5,
  );
  return s;
}

function labTheme(): Scenery {
  const s = new Scenery();
  s.addLayer(skyGradient(0x061417, 0x12302f), 0);
  const wall = twice((g, ox) => {
    g.lineStyle(4, 0x1f4a4d);
    for (let x = 0; x < WIDTH; x += 240) {
      g.moveTo(x + ox, 0);
      g.lineTo(x + ox, GROUND_Y);
    }
    g.moveTo(ox, 330);
    g.lineTo(ox + WIDTH, 330);
    g.lineStyle(0);
    // caños
    g.beginFill(0x455a64);
    g.drawRect(ox, 110, WIDTH, 28);
    g.endFill();
    g.beginFill(0x37474f);
    for (let x = 60; x < WIDTH; x += 240) {
      g.drawRect(x + ox, 100, 14, 48);
    }
    g.endFill();
    // tanques: algunos sanos (con monstruos adentro) y otros ROTOS (se escaparon)
    let idx = 0;
    for (let x = 120; x < WIDTH; x += 480) {
      const X = x + ox;
      if (idx++ % 2 === 1) {
        brokenTank(g, X);
        continue;
      }
      g.beginFill(0x37474f);
      g.drawRect(X + 60, 138, 28, 300);
      g.drawRoundedRect(X - 10, 420, 170, 30, 8);
      g.drawRoundedRect(X - 10, 860, 170, 40, 8);
      g.endFill();
      g.lineStyle(5, 0x80cbc4, 0.8);
      g.beginFill(0x0b3d2e, 0.9);
      g.drawRoundedRect(X, 450, 150, 410, 24);
      g.endFill();
      g.lineStyle(0);
      g.beginFill(0x00e676, 0.35);
      g.drawRoundedRect(X + 8, 540, 134, 312, 18);
      g.endFill();
      g.beginFill(0xb9f6ca, 0.6);
      for (let k = 0; k < 7; k++) {
        g.drawCircle(X + 25 + ((k * 37) % 110), 560 + ((k * 53) % 260), 5 + (k % 3) * 3);
      }
      g.endFill();
      // silueta de criatura flotando adentro
      g.beginFill(0x00331f, 0.75);
      g.drawEllipse(X + 75, 690, 38, 70);
      g.drawCircle(X + 75, 600, 30);
      g.drawPolygon([X + 52, 585, X + 40, 555, X + 62, 578]);
      g.drawPolygon([X + 98, 585, X + 110, 555, X + 88, 578]);
      g.endFill();
      g.beginFill(0xff1744, 0.8);
      g.drawCircle(X + 64, 598, 4);
      g.drawCircle(X + 86, 598, 4);
      g.endFill();
      g.beginFill(0xffffff, 0.12);
      g.drawRoundedRect(X + 14, 465, 18, 370, 9);
      g.endFill();
    }
    // franja de peligro
    for (let x = 0; x < WIDTH; x += 60) {
      g.beginFill(x % 120 === 0 ? 0xffd600 : 0x111111);
      g.drawPolygon([x + ox, GROUND_Y - 30, x + ox + 60, GROUND_Y - 30, x + ox + 30, GROUND_Y, x + ox - 30, GROUND_Y]);
      g.endFill();
    }
  });
  s.addLayer(wall, 0.5);
  for (let i = 0; i < 4; i++) {
    const lamp = new Graphics();
    lamp.beginFill(0xff1744, 0.25);
    lamp.drawCircle(0, 0, 60);
    lamp.endFill();
    lamp.beginFill(0xff1744);
    lamp.drawCircle(0, 0, 22);
    lamp.endFill();
    lamp.position.set(240 + i * 480, 60);
    s.alarms.push(lamp);
    s.addChild(lamp);
  }
  return s;
}

const THEME_FX: ThemeFx[] = [
  { emberColors: [0xff6d00, 0xffab00, 0xff3d00], emberUp: true, streakRate: 0.4, groundTint: 0xffffff },
  { emberColors: [0xffe0b2, 0xffcc80, 0xfff3e0], emberUp: false, streakRate: 0.5, groundTint: 0xffd8a8 },
  { emberColors: [0xffffff, 0xb3e5fc, 0xe1f5fe], emberUp: true, streakRate: 0, groundTint: 0xffffff, ground: "pier" },
  { emberColors: [0xc6ff00, 0xeeff41, 0xb2ff59], emberUp: true, streakRate: 0.8, groundTint: 0x8fb08a },
  { emberColors: [0xff6d00, 0xff3d00, 0xffd600], emberUp: true, streakRate: 1.0, groundTint: 0xffb0a0 },
  { emberColors: [0xffffff, 0xe0aaff, 0xc77dff], emberUp: true, streakRate: 2.2, groundTint: 0xc0a8e8 },
  { emberColors: [0xe53935, 0xfdd835, 0x1e88e5, 0x43a047], emberUp: false, streakRate: 0, groundTint: 0xffffff, ground: "bricks" },
  { emberColors: [0x76ff03, 0x00e676, 0xb2ff59], emberUp: true, streakRate: 0, groundTint: 0x90a4ae },
];

export const LEVEL_NAMES = ["VALLE DE LOS DINOS", "DESIERTO AL ATARDECER", "OCÉANO PROFUNDO", "SELVA DE NOCHE", "VOLCÁN EN ERUPCIÓN", "PLANETA ALIENÍGENA", "MUNDO DE BLOQUES", "LABORATORIO SECRETO"];

interface Ember {
  spr: Sprite;
  vy: number;
  phase: number;
  sway: number;
}

interface Streak {
  g: Graphics;
  vx: number;
  vy: number;
  life: number;
}

/**
 * Fondo con un escenario distinto por nivel (+ el laboratorio del jefe), con parallax,
 * fundido entre escenarios, partículas ambientales y estrellas fugaces.
 */
export class Background extends Container {
  private readonly themes: Scenery[];
  private readonly sky = new Container();
  private readonly embersLayer = new Container();
  private readonly ground: TilingSprite;
  private readonly embers: Ember[] = [];
  private streaks: Streak[] = [];
  private offset = 0;
  private current = 0;
  private previous = -1;
  private fade = 1;
  private fadeTime = 1.5;
  private streakTimer = 1;
  private t = 0;

  constructor() {
    super();
    this.themes = [imageTheme(), desertTheme(), oceanTheme(), jungleTheme(), volcanoTheme(), meteorTheme(), blockTheme(), labTheme()];
    this.themes.forEach((th, i) => {
      th.visible = i === 0;
      this.addChild(th);
    });
    this.addChild(this.sky, this.embersLayer);

    for (let i = 0; i < 45; i++) {
      const spr = new Sprite(Art.particle);
      spr.anchor.set(0.5);
      spr.scale.set(rand(0.25, 0.7));
      spr.position.set(rand(0, WIDTH), rand(0, GROUND_Y));
      spr.alpha = rand(0.3, 0.8);
      this.embersLayer.addChild(spr);
      this.embers.push({ spr, vy: rand(25, 70), phase: rand(0, 6), sway: rand(10, 35) });
    }

    this.ground = new TilingSprite(Art.ground, WIDTH, HEIGHT - GROUND_Y + 8);
    this.ground.y = GROUND_Y - 4;
    this.addChild(this.ground);
    this.applyFx();
  }

  /** 0..5 = mundos, 6 = laboratorio del jefe. */
  public setTheme(index: number, fadeSeconds = 1.5): void {
    this.fadeTime = fadeSeconds;
    if (index === this.current) {
      return;
    }
    if (this.previous >= 0 && this.previous !== index) {
      this.themes[this.previous].visible = false; // por si un fundido anterior no terminó
    }
    this.previous = this.current;
    this.current = index;
    const next = this.themes[index];
    next.visible = true;
    next.alpha = 0;
    this.addChildAt(next, this.getChildIndex(this.themes[this.previous]) + 1);
    this.fade = 0;
    this.applyFx();
  }

  /** Foto en miniatura de un mundo (para la pantalla de título). */
  public snapshot(renderer: AbstractRenderer, index: number, resolution = 0.25): Texture {
    this.themes.forEach((t, k) => {
      t.visible = k === index;
      t.alpha = 1;
    });
    this.current = index;
    this.applyFx();
    this.sky.visible = false;
    this.embersLayer.visible = false;
    const tex = renderer.generateTexture(this, { region: new Rectangle(0, 0, WIDTH, HEIGHT), resolution });
    this.sky.visible = true;
    this.embersLayer.visible = true;
    return tex;
  }

  private applyFx(): void {
    const fx = THEME_FX[this.current];
    this.embers.forEach((e, i) => (e.spr.tint = fx.emberColors[i % fx.emberColors.length]));
    this.ground.tint = fx.groundTint;
    this.ground.texture = fx.ground === "pier" ? Art.pier : fx.ground === "bricks" ? WArt.bricksGround : Art.ground;
  }

  public update(dt: number, worldSpeed: number): void {
    this.t += dt;
    const dx = worldSpeed * dt;
    this.offset += dx;
    this.ground.tilePosition.x -= dx;

    for (const th of this.themes) {
      if (!th.visible) {
        continue;
      }
      th.scroll(this.offset);
      // la capa de imagen espejada (factor negativo) tiene período 2*WIDTH
      for (const l of th.layers) {
        if (l.factor < 0) {
          l.c.x = -((this.offset * -l.factor) % (WIDTH * 2));
        }
      }
      for (const lamp of th.alarms) {
        lamp.alpha = Math.sin(this.t * 8) > 0 ? 1 : 0.15;
      }
    }

    if (this.fade < 1) {
      this.fade = Math.min(1, this.fade + dt / this.fadeTime);
      this.themes[this.current].alpha = this.fade;
      if (this.fade >= 1 && this.previous >= 0) {
        this.themes[this.previous].visible = false;
      }
    }

    const fx = THEME_FX[this.current];
    for (const e of this.embers) {
      e.spr.y += (fx.emberUp ? -1 : 0.4) * e.vy * dt;
      e.spr.x += Math.sin(this.t * 1.5 + e.phase) * e.sway * dt - dx * (fx.emberUp ? 0.4 : 1.2);
      if (e.spr.y < -10 || e.spr.x < -10 || e.spr.y > GROUND_Y + 40) {
        e.spr.y = fx.emberUp ? GROUND_Y + rand(0, 40) : rand(0, GROUND_Y);
        e.spr.x = rand(0, WIDTH + 200);
      }
    }

    if (fx.streakRate > 0) {
      this.streakTimer -= dt * fx.streakRate;
      if (this.streakTimer <= 0) {
        this.streakTimer = rand(1.2, 3);
        this.spawnStreak();
      }
    }
    for (let i = this.streaks.length - 1; i >= 0; i--) {
      const s = this.streaks[i];
      s.life -= dt;
      s.g.x += s.vx * dt;
      s.g.y += s.vy * dt;
      s.g.alpha = Math.min(1, s.life * 2);
      if (s.life <= 0) {
        s.g.destroy();
        this.streaks.splice(i, 1);
      }
    }
  }

  private spawnStreak(): void {
    const g = new Graphics();
    const len = rand(120, 260);
    const ang = rand(0.45, 0.75);
    const ux = -Math.cos(ang);
    const uy = Math.sin(ang);
    for (let k = 0; k < 6; k++) {
      g.lineStyle(2 + k * 1.2, k < 3 ? 0xff9100 : 0xffe082, 0.12 + k * 0.14);
      g.moveTo(-ux * len * (1 - k / 6), -uy * len * (1 - k / 6));
      g.lineTo(0, 0);
    }
    g.lineStyle(0);
    g.beginFill(0xfff3e0);
    g.drawCircle(0, 0, 5);
    g.endFill();
    g.position.set(rand(WIDTH * 0.3, WIDTH + 200), rand(-40, 380));
    const v = rand(700, 1100);
    this.sky.addChild(g);
    this.streaks.push({ g, vx: ux * v, vy: uy * v, life: rand(0.8, 1.3) });
  }
}
