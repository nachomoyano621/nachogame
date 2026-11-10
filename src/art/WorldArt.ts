import { AbstractRenderer, Graphics, LINE_CAP, LINE_JOIN, Rectangle, Texture } from "pixi.js";

/** Arte de los monstruos propios de cada mundo (generado por código al iniciar). */
export interface WorldArtBank {
  scorpion: Texture[];
  crab: Texture[];
  jelly: Texture[];
  snake: Texture[];
  salamander: Texture[];
  lava: Texture;
  alien: Texture[];
  ufo: Texture[];
  skull: Texture;
  brickMonster: Texture[];
  brickCopter: Texture[];
  brickGolem: Texture[];
  brickShot: Texture;
  bricksGround: Texture;
}

// ------------------------------------------------------------------ mundo de bloques

/** Ladrillo de juguete: bloque con sombra y "botoncitos" arriba. */
export function drawBrick(g: Graphics, x: number, y: number, w: number, h: number, color: number, studs = true): void {
  const dark = shade(color, 0.72);
  const light = shade(color, 1.18);
  if (studs) {
    const n = Math.max(1, Math.round(w / 34));
    const step = w / n;
    for (let i = 0; i < n; i++) {
      const sx = x + step * (i + 0.5);
      g.beginFill(dark);
      g.drawRoundedRect(sx - step * 0.28, y - 9, step * 0.56, 11, 4);
      g.endFill();
      g.beginFill(light);
      g.drawEllipse(sx, y - 9, step * 0.28, 4.5);
      g.endFill();
    }
  }
  g.beginFill(dark);
  g.drawRoundedRect(x, y, w, h, 6);
  g.endFill();
  g.beginFill(color);
  g.drawRoundedRect(x, y, w, h - 6, 6);
  g.endFill();
  g.beginFill(0xffffff, 0.22);
  g.drawRoundedRect(x + 4, y + 3, w - 8, 5, 3);
  g.endFill();
}

export function shade(color: number, k: number): number {
  const c = (s: number): number => Math.max(0, Math.min(255, Math.round(((color >> s) & 0xff) * k)));
  return (c(16) << 16) | (c(8) << 8) | c(0);
}

function blockEyes(g: Graphics, x1: number, x2: number, y: number, r: number, angry: boolean): void {
  g.beginFill(0xffffff);
  g.drawRoundedRect(x1 - r, y - r, r * 2, r * 2, 3);
  g.drawRoundedRect(x2 - r, y - r, r * 2, r * 2, 3);
  g.endFill();
  g.beginFill(0x111111);
  g.drawRect(x1 - r * 0.9, y - r * 0.3, r * 0.9, r * 1.1);
  g.drawRect(x2 - r * 0.9, y - r * 0.3, r * 0.9, r * 1.1);
  g.endFill();
  if (angry) {
    g.lineStyle({ width: 4, color: 0x111111, ...ROUND });
    g.moveTo(x1 - r * 1.2, y - r * 1.5);
    g.lineTo(x1 + r, y - r * 0.9);
    g.moveTo(x2 + r * 1.2, y - r * 1.5);
    g.lineTo(x2 - r, y - r * 0.9);
    g.lineStyle(0);
  }
}

function drawBrickMonster(g: Graphics, p: number): void {
  // patitas
  drawBrick(g, p ? 22 : 30, 98, 26, 20, 0x424242, false);
  drawBrick(g, p ? 78 : 68, 98, 26, 20, 0x424242, false);
  drawBrick(g, 12, 58, 100, 42, 0xe53935);
  drawBrick(g, 26, 22, 72, 38, 0xd32f2f);
  blockEyes(g, 48, 76, 40, 8, true);
  g.beginFill(0x111111);
  g.drawRect(46, 76, 34, 6);
  g.endFill();
}

function drawBrickCopter(g: Graphics, p: number): void {
  // hélice
  g.beginFill(0x616161);
  g.drawRect(66, 14, 8, 26);
  g.endFill();
  g.beginFill(0x90a4ae);
  if (p) {
    g.drawRoundedRect(14, 8, 112, 10, 5);
  } else {
    g.drawRoundedRect(46, 8, 48, 10, 5);
  }
  g.endFill();
  drawBrick(g, 18, 46, 104, 46, 0xfdd835);
  blockEyes(g, 52, 88, 66, 8, false);
  g.beginFill(0x2979ff);
  g.drawRoundedRect(8, 76, 20, 14, 4);
  g.drawRoundedRect(112, 76, 20, 14, 4);
  g.endFill();
}

function drawBrickGolem(g: Graphics, p: number): void {
  // piernas
  drawBrick(g, p ? 54 : 62, 196, 44, 62, 0x1e88e5, false);
  drawBrick(g, p ? 130 : 122, 196, 44, 62, 0x1e88e5, false);
  // brazos
  const a = p ? 8 : 0;
  drawBrick(g, 2, 104 + a, 42, 84, 0x43a047);
  drawBrick(g, 184, 104 - a, 42, 84, 0x43a047);
  // cuerpo
  drawBrick(g, 40, 100, 148, 100, 0xe53935);
  g.beginFill(0xfdd835);
  g.drawCircle(114, 150, 16);
  g.endFill();
  // cabeza
  drawBrick(g, 66, 30, 96, 70, 0xfdd835);
  blockEyes(g, 96, 132, 62, 11, true);
  g.beginFill(0x111111);
  g.drawRect(92, 84, 44, 7);
  g.endFill();
}

function drawBrickShot(g: Graphics): void {
  drawBrick(g, -22, -10, 44, 22, 0xff6d00);
}

function drawBricksGround(g: Graphics): void {
  const colors = [0xe53935, 0xfdd835, 0x1e88e5, 0x43a047, 0xff6d00, 0x8e24aa];
  g.beginFill(0x37474f);
  g.drawRect(0, 0, 256, 112);
  g.endFill();
  let k = 0;
  for (let row = 0; row < 4; row++) {
    const y = 10 + row * 26;
    const off = row % 2 === 0 ? 0 : -32;
    for (let x = off; x < 256; x += 64) {
      drawBrick(g, x + 1, y, 62, 25, colors[k++ % colors.length], row === 0);
    }
  }
}

export const WArt = {} as WorldArtBank;

const ROUND = { cap: LINE_CAP.ROUND, join: LINE_JOIN.ROUND };

// ------------------------------------------------------------------ desierto

function drawScorpion(g: Graphics, p: number): void {
  const c = 0xd9a441;
  const d = 0x8d5a1b;
  const ty = p ? 3 : 0;
  g.lineStyle({ width: 4, color: d, ...ROUND });
  for (let i = 0; i < 4; i++) {
    const x = 62 + i * 16;
    const k = (i + p) % 2 ? 6 : -6;
    g.moveTo(x, 78);
    g.lineTo(x - 10 + k, 97);
  }
  g.lineStyle(0);
  // cola enroscada con aguijón
  g.beginFill(c);
  for (const [x, y, r] of [[122, 72, 12], [136, 58, 11], [142, 42, 10], [136, 27, 9], [122, 18, 8]]) {
    g.drawCircle(x, y + ty * (1 - y / 80), r);
  }
  g.endFill();
  g.beginFill(0x3e2723);
  g.drawPolygon([116, 14 + ty * 0.8, 98, 22 + ty * 0.8, 114, 28 + ty * 0.8]);
  g.endFill();
  // cuerpo
  g.beginFill(c);
  g.drawEllipse(88, 72, 40, 16);
  g.endFill();
  g.beginFill(d);
  for (const x of [72, 88, 104]) {
    g.drawRect(x, 60, 3, 22);
  }
  g.endFill();
  // cabeza y pinzas
  g.beginFill(c);
  g.drawEllipse(48, 72, 14, 12);
  g.endFill();
  g.lineStyle({ width: 7, color: c, ...ROUND });
  g.moveTo(44, 70);
  g.lineTo(26, 58 - p * 5);
  g.moveTo(46, 78);
  g.lineTo(24, 86 + p * 3);
  g.lineStyle(0);
  g.beginFill(c);
  g.drawPolygon([28, 58 - p * 5, 4, 46 - p * 5, 12, 58 - p * 5, 2, 64 - p * 5, 24, 68 - p * 5]);
  g.drawPolygon([26, 86 + p * 3, 2, 78 + p * 3, 10, 88 + p * 3, 2, 96 + p * 3, 24, 94 + p * 3]);
  g.endFill();
  g.beginFill(0x000000);
  g.drawCircle(42, 66, 2.6);
  g.drawCircle(50, 65, 2.6);
  g.endFill();
}

/** Cráneo del desierto: se agarra y se lanza. */
function drawSkull(g: Graphics): void {
  g.beginFill(0xf5f0e1);
  g.drawEllipse(0, -6, 26, 22);
  g.drawRoundedRect(-15, 4, 30, 18, 6);
  g.endFill();
  g.beginFill(0xd7ccc8);
  g.drawEllipse(8, -14, 10, 6);
  g.endFill();
  g.beginFill(0x3e2723);
  g.drawEllipse(-10, -4, 7, 8);
  g.drawEllipse(10, -4, 7, 8);
  g.drawPolygon([0, 4, -4, 11, 4, 11]);
  g.endFill();
  g.lineStyle({ width: 2, color: 0x8d6e63 });
  for (let x = -9; x <= 9; x += 6) {
    g.moveTo(x, 13);
    g.lineTo(x, 22);
  }
  g.lineStyle({ width: 2, color: 0x5d4037, ...ROUND });
  g.moveTo(-4, -27);
  g.lineTo(-8, -18);
  g.lineTo(-3, -13);
  g.lineStyle(0);
}

// ------------------------------------------------------------------ océano

function drawCrab(g: Graphics, p: number): void {
  const c = 0xe53935;
  const d = 0xb71c1c;
  g.lineStyle({ width: 5, color: d, ...ROUND });
  for (let i = 0; i < 3; i++) {
    const off = (i + p) % 2 ? 6 : -6;
    g.moveTo(55, 70 + i * 6);
    g.lineTo(24 + off, 96);
    g.moveTo(95, 70 + i * 6);
    g.lineTo(126 - off, 96);
  }
  // brazos
  g.lineStyle({ width: 8, color: c, ...ROUND });
  g.moveTo(48, 60);
  g.lineTo(26, 36 - p * 6);
  g.moveTo(102, 60);
  g.lineTo(124, 36 - p * 6);
  // ojos con antenitas
  g.lineStyle({ width: 4, color: d, ...ROUND });
  g.moveTo(66, 50);
  g.lineTo(62, 30);
  g.moveTo(84, 50);
  g.lineTo(88, 30);
  g.lineStyle(0);
  g.beginFill(c);
  g.drawEllipse(75, 68, 38, 24);
  g.drawCircle(24, 30 - p * 6, 14);
  g.drawCircle(126, 30 - p * 6, 14);
  g.endFill();
  g.beginFill(0xffcdd2);
  g.drawPolygon([16, 18 - p * 6, 26, 30 - p * 6, 12, 28 - p * 6]);
  g.drawPolygon([134, 18 - p * 6, 124, 30 - p * 6, 138, 28 - p * 6]);
  g.endFill();
  g.beginFill(0xffffff);
  g.drawCircle(62, 28, 7);
  g.drawCircle(88, 28, 7);
  g.endFill();
  g.beginFill(0x000000);
  g.drawCircle(63, 29, 3.2);
  g.drawCircle(87, 29, 3.2);
  g.endFill();
  g.lineStyle(3, 0x7f0000);
  g.arc(75, 72, 10, 0.2, Math.PI - 0.2);
  g.lineStyle(0);
}

function drawJelly(g: Graphics, p: number): void {
  for (let i = 0; i < 6; i++) {
    g.lineStyle({ width: 4, color: 0xf48fb1, alpha: 0.85, ...ROUND });
    const x0 = 28 + i * 13;
    g.moveTo(x0, 60);
    for (let y = 70; y <= 150; y += 10) {
      g.lineTo(x0 + Math.sin(y * 0.09 + p * Math.PI + i) * 7, y);
    }
  }
  g.lineStyle(0);
  g.beginFill(0xce93d8, 0.9);
  g.moveTo(14, 62);
  g.arc(60, 62, 46, Math.PI, 0);
  g.closePath();
  g.endFill();
  g.beginFill(0xba68c8);
  for (let x = 18; x <= 102; x += 12) {
    g.drawCircle(x, 63, 6);
  }
  g.endFill();
  g.beginFill(0xf3e5f5, 0.8);
  g.drawEllipse(42, 34, 10, 6);
  g.drawCircle(78, 44, 5);
  g.endFill();
  g.beginFill(0x4a148c);
  g.drawCircle(48, 50, 4);
  g.drawCircle(72, 50, 4);
  g.endFill();
}

// ------------------------------------------------------------------ selva

function drawSnake(g: Graphics, p: number): void {
  const pts: number[] = [];
  for (let x = 46; x <= 172; x += 6) {
    pts.push(x, 62 + Math.sin(x * 0.07 + p * Math.PI) * 8);
  }
  g.lineStyle({ width: 20, color: 0x2e7d32, ...ROUND });
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.lineStyle({ width: 7, color: 0xc0ca33, ...ROUND });
  g.moveTo(pts[0], pts[1] + 2);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1] + 2);
  g.lineStyle(0);
  g.beginFill(0x1b5e20);
  for (let i = 4; i < pts.length - 4; i += 6) g.drawCircle(pts[i], pts[i + 1] - 5, 3.5);
  g.endFill();
  // cabeza
  g.beginFill(0x388e3c);
  g.drawEllipse(36, 56, 24, 16);
  g.endFill();
  g.beginFill(0xffeb3b);
  g.drawCircle(30, 50, 5);
  g.endFill();
  g.beginFill(0x000000);
  g.drawEllipse(30, 50, 1.5, 4);
  g.endFill();
  // lengua bífida
  g.lineStyle({ width: 3, color: 0xd50000, ...ROUND });
  g.moveTo(13, 60);
  g.lineTo(5, 60);
  g.lineTo(1, 56 - p * 2);
  g.moveTo(5, 60);
  g.lineTo(1, 64 + p * 2);
  g.lineStyle(0);
}

// ------------------------------------------------------------------ volcán

function drawSalamander(g: Graphics, p: number): void {
  const c = 0xff5722;
  // patas
  g.lineStyle({ width: 7, color: 0xbf360c, ...ROUND });
  const k = p ? 8 : -8;
  for (const [x, s] of [[62, 1], [78, -1], [108, 1], [122, -1]]) {
    g.moveTo(x, 68);
    g.lineTo(x + k * s, 86);
  }
  g.lineStyle(0);
  // cola
  g.beginFill(c);
  g.drawPolygon([132, 56, 178, 46 + p * 8, 132, 72]);
  g.drawEllipse(92, 62, 48, 16);
  g.drawEllipse(40, 58, 24, 14);
  g.endFill();
  g.beginFill(0xffab91);
  g.drawEllipse(90, 70, 38, 6);
  g.endFill();
  // llamas en el lomo y la cola
  g.beginFill(0xffd600);
  g.drawPolygon([68, 50, 76, 26 - p * 6, 84, 50]);
  g.drawPolygon([92, 48, 100, 20 + p * 4, 108, 48]);
  g.drawPolygon([114, 50, 120, 30 - p * 4, 128, 52]);
  g.drawPolygon([172, 46 + p * 8, 186, 28, 178, 52 + p * 8]);
  g.endFill();
  g.beginFill(0xff6d00);
  g.drawPolygon([71, 50, 76, 36 - p * 6, 81, 50]);
  g.drawPolygon([95, 48, 100, 32 + p * 4, 105, 48]);
  g.endFill();
  g.beginFill(0xffeb3b);
  g.drawCircle(30, 52, 5);
  g.endFill();
  g.beginFill(0x000000);
  g.drawCircle(29, 52, 2.4);
  g.endFill();
}

function drawLava(g: Graphics): void {
  g.beginFill(0xff3d00, 0.3);
  g.drawCircle(0, 0, 44);
  g.endFill();
  g.beginFill(0xff6d00);
  g.drawCircle(0, 0, 34);
  g.endFill();
  g.beginFill(0xffab00);
  g.drawCircle(-4, -4, 24);
  g.endFill();
  g.beginFill(0xffe082);
  g.drawCircle(-12, -14, 8);
  g.endFill();
  g.beginFill(0x3e0000);
  g.drawCircle(-10, 2, 5);
  g.drawCircle(10, 2, 5);
  g.endFill();
  g.lineStyle({ width: 4, color: 0x3e0000, ...ROUND });
  g.moveTo(-18, -10);
  g.lineTo(-4, -4);
  g.moveTo(18, -10);
  g.lineTo(4, -4);
  g.lineStyle(0);
}

// ------------------------------------------------------------------ planeta alienígena

function drawAlien(g: Graphics, p: number): void {
  const skin = 0x8bc34a;
  const dark = 0x558b2f;
  // piernas
  g.lineStyle({ width: 9, color: dark, ...ROUND });
  g.moveTo(46, 104);
  g.lineTo(40 + (p ? 10 : -6), 146);
  g.moveTo(64, 104);
  g.lineTo(70 + (p ? -10 : 6), 146);
  // brazos
  g.moveTo(36, 88);
  g.lineTo(18, 74 + (p ? -8 : 6));
  g.moveTo(74, 88);
  g.lineTo(92, 74 + (p ? 6 : -8));
  g.lineStyle(0);
  // cuerpo con traje
  g.beginFill(0x7e57c2);
  g.drawRoundedRect(34, 80, 42, 30, 12);
  g.endFill();
  g.beginFill(0xffd54f);
  g.drawCircle(55, 94, 5);
  g.endFill();
  // cabeza grande
  g.beginFill(skin);
  g.drawEllipse(55, 48, 40, 34);
  g.endFill();
  // antenas
  g.lineStyle({ width: 4, color: dark, ...ROUND });
  g.moveTo(38, 20);
  g.lineTo(28, 2);
  g.moveTo(72, 20);
  g.lineTo(82, 2);
  g.lineStyle(0);
  g.beginFill(0xff4081);
  g.drawCircle(28, 2, 6);
  g.drawCircle(82, 2, 6);
  g.endFill();
  // ojos enormes
  g.beginFill(0x000000);
  g.drawPolygon([24, 44, 46, 40, 48, 56, 32, 60]);
  g.drawPolygon([86, 44, 64, 40, 62, 56, 78, 60]);
  g.endFill();
  g.beginFill(0xffffff, 0.9);
  g.drawCircle(36, 46, 3.5);
  g.drawCircle(70, 46, 3.5);
  g.endFill();
  g.lineStyle(3, dark);
  g.moveTo(48, 70);
  g.lineTo(62, 70);
  g.lineStyle(0);
}

function drawUfo(g: Graphics, p: number): void {
  // rayo de luz
  g.beginFill(0xb2ff59, 0.18);
  g.drawPolygon([60, 78, 120, 78, 150, 130, 30, 130]);
  g.endFill();
  // cúpula con alien adentro
  g.beginFill(0x80deea, 0.55);
  g.drawEllipse(90, 42, 34, 30);
  g.endFill();
  g.beginFill(0x8bc34a);
  g.drawEllipse(90, 46, 14, 13);
  g.endFill();
  g.beginFill(0x000000);
  g.drawEllipse(84, 45, 4, 6);
  g.drawEllipse(96, 45, 4, 6);
  g.endFill();
  g.beginFill(0xffffff, 0.7);
  g.drawEllipse(78, 30, 8, 5);
  g.endFill();
  // plato
  g.lineStyle(3, 0x455a64);
  g.beginFill(0xb0bec5);
  g.drawEllipse(90, 64, 86, 22);
  g.endFill();
  g.lineStyle(0);
  g.beginFill(0x78909c);
  g.drawEllipse(90, 74, 50, 10);
  g.endFill();
  const colors = [0xff1744, 0xffea00, 0x00e676, 0x2979ff, 0xe040fb];
  for (let i = 0; i < 5; i++) {
    g.beginFill(colors[(i + p * 2) % colors.length]);
    g.drawCircle(30 + i * 30, 66, 6);
    g.endFill();
  }
}

export function buildWorldArt(r: AbstractRenderer): void {
  const bake = (draw: (g: Graphics) => void, region: Rectangle): Texture => {
    const g = new Graphics();
    draw(g);
    const t = r.generateTexture(g, { region, resolution: 2 });
    g.destroy();
    return t;
  };
  const two = (draw: (g: Graphics, p: number) => void, region: Rectangle): Texture[] => [bake((g) => draw(g, 0), region), bake((g) => draw(g, 1), region)];

  WArt.scorpion = two(drawScorpion, new Rectangle(0, 0, 160, 100));
  WArt.crab = two(drawCrab, new Rectangle(0, 10, 150, 90));
  WArt.jelly = two(drawJelly, new Rectangle(0, 10, 120, 145));
  WArt.snake = two(drawSnake, new Rectangle(0, 30, 180, 56));
  WArt.salamander = two(drawSalamander, new Rectangle(0, 14, 190, 76));
  WArt.lava = bake(drawLava, new Rectangle(-46, -46, 92, 92));
  WArt.alien = two(drawAlien, new Rectangle(0, -6, 110, 154));
  WArt.ufo = two(drawUfo, new Rectangle(0, 8, 180, 124));
  WArt.skull = bake(drawSkull, new Rectangle(-30, -30, 60, 56));
  WArt.brickMonster = two(drawBrickMonster, new Rectangle(0, 8, 124, 112));
  WArt.brickCopter = two(drawBrickCopter, new Rectangle(0, 0, 140, 96));
  WArt.brickGolem = two(drawBrickGolem, new Rectangle(0, 16, 228, 244));
  WArt.brickShot = bake(drawBrickShot, new Rectangle(-24, -22, 48, 36));
  WArt.bricksGround = bake(drawBricksGround, new Rectangle(0, 0, 256, 112));
}
