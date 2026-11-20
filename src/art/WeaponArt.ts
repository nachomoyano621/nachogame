import { AbstractRenderer, Graphics, Rectangle, Texture } from "pixi.js";

/** Dibujos de las armas (apuntando a la derecha, empuñadura en 0,0) y de sus balas. */
export interface WeaponArtBank {
  pistol: Texture;
  revolver: Texture;
  shotgun: Texture;
  smg: Texture;
  bazooka: Texture;
  bullet: Texture;
  pellet: Texture;
  rocket: Texture;
}

export const WpArt = {} as WeaponArtBank;

function drawPistol(g: Graphics): void {
  g.lineStyle(3, 0x1c252b);
  g.beginFill(0x455a64);
  g.drawRoundedRect(-4, -16, 56, 14, 4);
  g.endFill();
  g.beginFill(0x37474f);
  g.drawPolygon([0, -4, 16, -4, 12, 22, -6, 22]);
  g.endFill();
  g.lineStyle(0);
  g.beginFill(0x90a4ae);
  g.drawRect(4, -14, 40, 3);
  g.endFill();
}

function drawRevolver(g: Graphics): void {
  g.lineStyle(3, 0x263238);
  g.beginFill(0xb0bec5);
  g.drawRoundedRect(14, -14, 64, 10, 3);
  g.endFill();
  g.beginFill(0x90a4ae);
  g.drawCircle(20, -6, 12);
  g.endFill();
  g.beginFill(0x6d4c41);
  g.drawPolygon([2, -6, 16, -6, 12, 24, -8, 24]);
  g.endFill();
  g.lineStyle(0);
  g.beginFill(0x546e7a);
  for (const a of [0, 2.1, 4.2]) {
    g.drawCircle(20 + Math.cos(a) * 6, -6 + Math.sin(a) * 6, 2.5);
  }
  g.endFill();
}

function drawShotgun(g: Graphics): void {
  g.lineStyle(3, 0x1b1b1b);
  g.beginFill(0x8d6e63);
  g.drawPolygon([-40, -8, 0, -12, 4, 4, -36, 12]);
  g.endFill();
  g.beginFill(0x37474f);
  g.drawRoundedRect(0, -14, 92, 10, 3);
  g.endFill();
  g.beginFill(0xa1887f);
  g.drawRoundedRect(36, -4, 30, 10, 3);
  g.endFill();
  g.beginFill(0x37474f);
  g.drawPolygon([4, -4, 14, -4, 12, 16, 0, 16]);
  g.endFill();
  g.lineStyle(0);
}

function drawSmg(g: Graphics): void {
  g.lineStyle(3, 0x0d0d0d);
  g.beginFill(0x263238);
  g.drawRoundedRect(-6, -18, 60, 20, 4);
  g.endFill();
  g.beginFill(0x37474f);
  g.drawRect(54, -12, 26, 8);
  g.endFill();
  g.beginFill(0x212121);
  g.drawPolygon([22, 2, 34, 2, 40, 30, 28, 30]);
  g.drawPolygon([0, -2, 12, -2, 8, 20, -4, 20]);
  g.drawPolygon([-6, -14, -30, -10, -30, 0, -6, -2]);
  g.endFill();
  g.lineStyle(0);
  g.beginFill(0xff6d00);
  g.drawRect(4, -14, 8, 3);
  g.endFill();
}

function drawBazooka(g: Graphics): void {
  g.lineStyle(3, 0x1b2e10);
  g.beginFill(0x558b2f);
  g.drawRoundedRect(-40, -22, 130, 26, 8);
  g.endFill();
  g.beginFill(0x33691e);
  g.drawRect(-44, -24, 10, 30);
  g.drawRect(84, -24, 10, 30);
  g.drawRect(20, -24, 8, 30);
  g.endFill();
  g.beginFill(0x37474f);
  g.drawRect(30, -34, 18, 12);
  g.drawPolygon([0, 4, 12, 4, 10, 24, -2, 24]);
  g.endFill();
  g.lineStyle(0);
  g.beginFill(0xffeb3b);
  g.drawCircle(-30, -9, 4);
  g.endFill();
}

function drawBullet(g: Graphics): void {
  g.beginFill(0xffd54f, 0.35);
  g.drawRoundedRect(-22, -5, 30, 10, 5);
  g.endFill();
  g.beginFill(0xffc107);
  g.drawRoundedRect(-6, -4, 16, 8, 4);
  g.endFill();
  g.beginFill(0xffffff);
  g.drawCircle(6, 0, 2.5);
  g.endFill();
}

function drawPellet(g: Graphics): void {
  g.beginFill(0xff8f00, 0.35);
  g.drawCircle(0, 0, 8);
  g.endFill();
  g.beginFill(0xffb300);
  g.drawCircle(0, 0, 5);
  g.endFill();
}

function drawRocket(g: Graphics): void {
  g.lineStyle(2, 0x263238);
  g.beginFill(0x90a4ae);
  g.drawRoundedRect(-20, -6, 32, 12, 5);
  g.endFill();
  g.beginFill(0xe53935);
  g.drawPolygon([12, -6, 24, 0, 12, 6]);
  g.endFill();
  g.beginFill(0x455a64);
  g.drawPolygon([-20, -6, -28, -12, -16, -6]);
  g.drawPolygon([-20, 6, -28, 12, -16, 6]);
  g.endFill();
  g.lineStyle(0);
}

export function buildWeaponArt(r: AbstractRenderer): void {
  const bake = (draw: (g: Graphics) => void, region: Rectangle): Texture => {
    const g = new Graphics();
    draw(g);
    const t = r.generateTexture(g, { region, resolution: 2 });
    g.destroy();
    return t;
  };
  WpArt.pistol = bake(drawPistol, new Rectangle(-12, -22, 70, 50));
  WpArt.revolver = bake(drawRevolver, new Rectangle(-12, -22, 96, 50));
  WpArt.shotgun = bake(drawShotgun, new Rectangle(-46, -20, 144, 40));
  WpArt.smg = bake(drawSmg, new Rectangle(-34, -24, 118, 58));
  WpArt.bazooka = bake(drawBazooka, new Rectangle(-50, -40, 148, 68));
  WpArt.bullet = bake(drawBullet, new Rectangle(-24, -7, 36, 14));
  WpArt.pellet = bake(drawPellet, new Rectangle(-9, -9, 18, 18));
  WpArt.rocket = bake(drawRocket, new Rectangle(-30, -14, 56, 28));
}
